import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { applyFixes, detectEntity, suggestFixes } from "@/server/examopt/csv-fixes";
import { ENTITY_SPECS, exportEntityCsv, IMPORT_ENTITIES, planImport, templateCsv, type ImportContext, type ImportEntity } from "@/server/examopt/csv-import";
import { referenceQualityTables, referenceRawDataset } from "@/server/scheduling/reference-dataset";

type Row = Record<string, unknown>;

/** The reference GLA dataset shaped like the live database rows (typed columns), per table. */
function database() {
  const raw = referenceRawDataset("normal");
  const q = referenceQualityTables("normal");
  const rooms = (q.rooms as Row[]).map((r) => ({ room_id: r.room_id, name: r.name, building: r.building, capacity: Number(r.capacity), room_type: r.room_type, unavailable_slots: r.unavailable_slots ?? "" }));
  const timeslots = raw.timeslots.map((t) => ({ ...t }));
  const subjects = raw.subjects.map((s) => ({ ...s }));
  const student_groups = (q.studentGroups as Row[]).map((g) => ({ group_id: g.group_id, name: g.name, program: g.program, semester: Number(g.semester), is_backlog_group: g.is_backlog_group === "1", student_count: Number(g.student_count) }));
  const student_enrollments = (q.students as Row[]).map((s) => ({ roll_no: s.roll_no, student_name: `Student ${s.roll_no}`, group_id: s.group_id, has_backlog: s.has_backlog, enrolled_subject_ids: s.enrolled_subject_ids }));
  const faculty = raw.faculty!.map((f) => ({ ...f }));
  const enrollments = new Map<string, Set<string>>();
  for (const e of raw.enrollments) { if (!enrollments.has(e.roll_no)) enrollments.set(e.roll_no, new Set()); enrollments.get(e.roll_no)!.add(e.subject_id); }
  return { tables: { rooms, timeslots, subjects, student_groups, student_enrollments, faculty } as Record<string, Row[]>, enrollments, quality: q };
}

function context(entity: ImportEntity, db = database()): ImportContext {
  return {
    existing: db.tables[ENTITY_SPECS[entity].table],
    slotIds: new Set(db.tables.timeslots.map((s) => String(s.slot_id))),
    subjectIds: new Set(db.tables.subjects.map((s) => String(s.subject_id))),
    groupIds: new Set(db.tables.student_groups.map((g) => String(g.group_id))),
    slots: db.tables.timeslots.map((s) => ({ slot_id: String(s.slot_id), exam_date: String(s.exam_date), session: String(s.session) })),
    enrollments: db.enrollments,
    quality: db.quality,
  };
}

const codes = (plan: ReturnType<typeof planImport>) => plan.errors.map((e) => e.code);

describe("CSV templates and export", () => {
  test("templates are header-only in the canonical column order", () => {
    expect(templateCsv("rooms").trim()).toBe("room_id,name,building,capacity,room_type,unavailable_slots");
    expect(templateCsv("students").trim()).toBe("roll_no,student_name,group_id,has_backlog,subject_ids");
  });

  test.each(IMPORT_ENTITIES)("%s: an export re-imports with every row unchanged (round trip)", (entity) => {
    const db = database();
    const csv = exportEntityCsv(entity, db.tables[ENTITY_SPECS[entity].table], db.enrollments);
    const plan = planImport(entity, "upsert", csv, context(entity, db));
    expect(plan.errors).toEqual([]);
    expect(plan.parsedRows).toBe(db.tables[ENTITY_SPECS[entity].table].length);
    expect(plan.summary).toMatchObject({ create: 0, update: 0, unchanged: plan.parsedRows, enrollmentsToAdd: 0 });
    expect(plan.canCommit).toBe(false); // nothing to write
  });

  test("export quotes values containing commas and keeps pipes for slot lists", () => {
    const csv = exportEntityCsv("rooms", [{ room_id: "X-1", name: "Hall, North", building: "B", capacity: 10, room_type: "THEORY", unavailable_slots: "D1-M|D2-E" }]);
    expect(csv.split("\n")[1]).toBe('X-1,"Hall, North",B,10,THEORY,D1-M|D2-E');
  });
});

describe("CSV validation (dry run)", () => {
  test("rejects unknown and missing columns at line 1", () => {
    const plan = planImport("rooms", "insert", "room_id,name,seats\nX-1,Hall,10\n", context("rooms"));
    expect(codes(plan)).toEqual(expect.arrayContaining(["UNKNOWN_COLUMN", "MISSING_COLUMN"]));
    expect(plan.errors.every((e) => e.line === 1)).toBe(true);
    expect(plan.canCommit).toBe(false);
  });

  test("reports row-level errors with line numbers and fields", () => {
    const csv = [
      "room_id,name,building,capacity,room_type,unavailable_slots",
      "NEW-1,Hall A,,abc,THEORY,",       // line 2: capacity not an integer
      "NEW-2,Hall B,,0,THEORY,",         // line 3: capacity out of range
      "NEW-3,Hall C,,40,AUDITORIUM,",    // line 4: bad type
      "NEW-4,Hall D,,40,LAB,D9-Z",       // line 5: unknown slot
      "AB11-101,Dup,,40,THEORY,",        // line 6: exists (insert mode)
    ].join("\n");
    const plan = planImport("rooms", "insert", csv, context("rooms"));
    const at = (line: number) => plan.errors.filter((e) => e.line === line).map((e) => `${e.field}:${e.code}`);
    expect(at(2)).toEqual(["capacity:INVALID_INTEGER"]);
    expect(at(3)).toEqual(["capacity:OUT_OF_RANGE"]);
    expect(at(4)).toEqual(["room_type:INVALID_VALUE"]);
    expect(at(5)).toEqual(["unavailable_slots:UNKNOWN_SLOT"]);
    expect(at(6)).toEqual(["room_id:ALREADY_EXISTS"]);
    expect(plan).toMatchObject({ parsedRows: 5, invalidRows: 5, validRows: 0, canCommit: false });
  });

  test("duplicate keys in one file fail on every occurrence", () => {
    const plan = planImport("rooms", "upsert", "room_id,name,capacity,room_type\nNEW-1,A,40,THEORY\nnew-1,B,50,THEORY\n", context("rooms"));
    expect(plan.duplicateKeys).toEqual(["NEW-1"]);
    expect(plan.errors.filter((e) => e.code === "DUPLICATE_KEY").map((e) => e.line)).toEqual([2, 3]);
  });

  test("time slots: one session per date, valid dates and time ranges", () => {
    const csv = "slot_id,day_number,exam_date,session,time_range\nD6-M,6,2026-10-19,MORNING,09:30 AM - 12:30 PM\nD6-E,6,2026-02-30,EVENING,02:00 PM - 05:00 PM\nD7-M,7,2026-10-27,MORNING,12:30 PM - 09:30 AM\n";
    const plan = planImport("timeslots", "insert", csv, context("timeslots"));
    expect(plan.errors.map((e) => `${e.line}:${e.code}`)).toEqual(["2:DUPLICATE_DATE_SESSION", "3:INVALID_DATE", "4:INVALID_TIME_RANGE"]);
  });

  test("subjects: references, enums, duration and contradictory constraints", () => {
    const csv = "subject_id,name,program,semester,duration_hours,requires_lab,fixed_slot,unavailable_slots,enrolled_students\nNEW-101,A,BBA,1,3,false,,,0\nNEW-102,B,BCA,9,4,maybe,,,0\nNEW-103,C,BCA,1,3,false,D1-M,D1-M,0\nNEW-104,D,BCA,1,3,false,D99,,0\n";
    const plan = planImport("subjects", "insert", csv, context("subjects"));
    expect(plan.errors.map((e) => `${e.line}:${e.field}:${e.code}`)).toEqual([
      "2:program:INVALID_VALUE", "3:semester:OUT_OF_RANGE", "3:duration_hours:OUT_OF_RANGE", "3:requires_lab:INVALID_BOOLEAN", "4:fixed_slot:CONTRADICTORY_CONSTRAINTS", "5:fixed_slot:UNKNOWN_SLOT",
    ]);
  });

  test("students: unknown group and subjects are refused (no malformed enrollments)", () => {
    const csv = "roll_no,student_name,group_id,has_backlog,subject_ids\nT-1,Test,GRP-NOPE,false,BCA-101\nT-2,Test,GRP-BCA-S1,false,BCA-101|NOPE-999\n";
    const plan = planImport("students", "insert", csv, context("students"));
    expect(plan.errors.map((e) => `${e.line}:${e.code}`)).toEqual(["2:UNKNOWN_GROUP", "3:UNKNOWN_SUBJECT"]);
  });

  test("malformed CSV is reported, not thrown", () => {
    const plan = planImport("rooms", "insert", 'room_id,name,capacity,room_type\n"X-1,unterminated,10,THEORY\n', context("rooms"));
    expect(codes(plan)).toEqual(["INVALID_CSV"]);
  });
});

describe("CSV write plans", () => {
  test("a valid new room is planned as a create with a stable plan hash", () => {
    const csv = "room_id,name,building,capacity,room_type,unavailable_slots\nZZ-TEST-1,Test Hall,,70,theory,D1-M|d2-e\n";
    const a = planImport("rooms", "insert", csv, context("rooms"));
    const b = planImport("rooms", "insert", csv, context("rooms"));
    expect(a.errors).toEqual([]);
    expect(a.rows[0]).toMatchObject({ action: "create", key: "ZZ-TEST-1", values: { room_id: "ZZ-TEST-1", building: "AB-XI CSED Block", capacity: 70, room_type: "THEORY", unavailable_slots: "D1-M|D2-E" } });
    expect(a.canCommit).toBe(true);
    expect(a.planHash).toBe(b.planHash);
  });

  test("upsert updates only changed rows and reports the changed fields; blank optional cells keep current values", () => {
    const csv = "room_id,name,building,capacity,room_type,unavailable_slots\nAB11-103,CSED Block AB-XI Room 103,,70,THEORY,\nAB11-201,CSED Block AB-XI Room 201,AB-XI CSED Block,100,THEORY,\n";
    const plan = planImport("rooms", "upsert", csv, context("rooms"));
    expect(plan.rows.map((r) => [r.key, r.action, r.changedFields])).toEqual([["AB11-103", "update", ["capacity"]], ["AB11-201", "unchanged", []]]);
    expect(plan.rows[0].values.building).toBe("AB-XI CSED Block");
  });

  test("changing a room's type is flagged as a warning", () => {
    const plan = planImport("rooms", "upsert", "room_id,name,capacity,room_type\nAB11-101,CSED Block AB-XI Room 101,80,LAB\n", context("rooms"));
    expect(plan.warnings.map((w) => w.code)).toContain("ROOM_TYPE_CHANGE");
  });

  test("students: enrollments are additive; omitted existing subjects are kept and reported", () => {
    const csv = "roll_no,student_name,group_id,has_backlog,subject_ids\nGLA26-BCA-0001,Student GLA26-BCA-0001,GRP-BCA-S1,false,BCA-101|BCA-301\n";
    const plan = planImport("students", "upsert", csv, context("students"));
    expect(plan.errors).toEqual([]);
    expect(plan.rows[0].addSubjects).toEqual(["BCA-301"]);
    expect(plan.rows[0].keptSubjects).toEqual(["BCA-102", "BCA-103", "BCA-104P"]);
    expect(plan.rows[0].values.enrolled_subject_ids).toBe("BCA-101,BCA-102,BCA-103,BCA-104P,BCA-301");
    expect(plan.warnings.map((w) => w.code)).toEqual(["ENROLLMENTS_KEPT"]);
    expect(plan.summary.enrollmentsToAdd).toBe(1);
  });

  test("the dataset quality check blocks an import that breaks the data as a whole", () => {
    // Every row is valid on its own, but shrinking every theory room leaves large subjects without a room big enough.
    const db = database();
    const theory = db.tables.rooms.filter((r) => r.room_type === "THEORY");
    const csv = ["room_id,name,capacity,room_type", ...theory.map((r) => `${r.room_id},${r.name},40,THEORY`)].join("\n");
    const plan = planImport("rooms", "upsert", csv, context("rooms", db));
    expect(plan.errors).toEqual([]);
    expect(plan.quality!.newErrors.map((e) => e.code)).toContain("CAPACITY_OVERFLOW");
    expect(plan.canCommit).toBe(false);
  });
});

describe("CSV conflict resolution", () => {
  const conflicts = () => fs.readFileSync(path.resolve(__dirname, "../../demo/csv/subjects_conflicts.csv"), "utf8");
  const firstAuto = (plan: ReturnType<typeof planImport>, fixes: ReturnType<typeof suggestFixes>) =>
    [...fixes.rows, ...fixes.dataset].flatMap((options) => options.find((o) => o.auto)?.actions ?? []).filter((a) => a.type === "set" || a.type === "removeRow");

  test("detects the table from the header and suggests switching", () => {
    expect(detectEntity(["subject_id", "name", "program", "semester", "duration_hours"])).toBe("subjects");
    expect(detectEntity(["room_id", "name", "capacity", "room_type"])).toBe("rooms");
    expect(detectEntity(["foo"])).toBeNull();
    const csv = conflicts();
    const plan = planImport("student_groups", "insert", csv, context("student_groups"));
    const fixes = suggestFixes("student_groups", plan, csv, context("student_groups"));
    expect(fixes.detectedEntity).toBe("subjects");
    expect(fixes.rows[0][0].actions).toEqual([{ type: "switchEntity", entity: "subjects" }]);
  });

  test("the demo conflicts file: 14 row problems and 3 dataset conflicts, each with a concrete fix", () => {
    const csv = conflicts();
    const ctx = context("subjects");
    const plan = planImport("subjects", "insert", csv, ctx);
    const fixes = suggestFixes("subjects", plan, csv, ctx);
    expect(plan.errors).toHaveLength(14); // 13 rows; the duplicate key is reported on both of its lines
    expect(plan.quality!.newErrors.map((e) => e.code).sort()).toEqual(["CAPACITY_OVERFLOW", "LAB_BOTTLENECK", "LAB_CAPACITY_OVERFLOW"]);
    const label = (code: string) => fixes.rows[plan.errors.findIndex((e) => e.code === code)][0].label;
    expect(label("INVALID_VALUE")).toBe("Use BCA (closest match)");
    expect(label("INVALID_BOOLEAN")).toMatch(/^Set to false/);
    expect(label("CONTRADICTORY_CONSTRAINTS")).toBe("Remove D2-M from the unavailable slots");
    expect(label("INVALID_ID")).toBe("Use DEMO-DS-313");
    const dataset = Object.fromEntries(plan.quality!.newErrors.map((e, i) => [e.code, fixes.dataset[i][0].label]));
    expect(dataset.CAPACITY_OVERFLOW).toBe("Cap the declared enrollment at 150 (largest theory room)");
    expect(dataset.LAB_CAPACITY_OVERFLOW).toBe("Cap the declared enrollment at 100 (largest laboratory)");
    expect(dataset.LAB_BOTTLENECK).toMatch(/^Move DEMO-LAB-508 to D\d-[ME] \(slots with a free laboratory\)$/);
  });

  test("applying the safe fixes leaves only what needs a human (the missing name); typing it makes the file importable", () => {
    const ctx = context("subjects");
    let csv = conflicts();
    let plan = planImport("subjects", "insert", csv, ctx);
    csv = applyFixes(csv, firstAuto(plan, suggestFixes("subjects", plan, csv, ctx))).csv;
    // Dataset conflicts are evaluated on rows that are valid, so a second pass catches any that the first one exposed.
    plan = planImport("subjects", "insert", csv, ctx);
    csv = applyFixes(csv, firstAuto(plan, suggestFixes("subjects", plan, csv, ctx))).csv;
    plan = planImport("subjects", "insert", csv, ctx);
    expect(plan.quality!.newErrors).toEqual([]);
    expect(plan.errors.map((e) => `${e.key}:${e.code}`)).toEqual(["DEMO-BC-308:REQUIRED"]);
    csv = applyFixes(csv, [{ type: "set", line: plan.errors[0].line, field: "name", value: "Blockchain Fundamentals" }]).csv;
    plan = planImport("subjects", "insert", csv, ctx);
    expect(plan.errors).toEqual([]);
    expect(plan.canCommit).toBe(true);
    expect(plan.summary.create).toBe(23); // 24 rows: BCA-101 (already exists) skipped, the duplicate renamed
  });

  test("applyFixes edits cells, removes rows and keeps quoting", () => {
    const csv = 'room_id,name,capacity,room_type\nA-1,"Hall, North",10,THEORY\nA-2,Lab,20,LAB\n';
    const out = applyFixes(csv, [{ type: "set", line: 2, field: "capacity", value: "40" }, { type: "removeRow", line: 3 }]);
    expect(out.applied).toBe(2);
    expect(out.csv).toBe('room_id,name,capacity,room_type\nA-1,"Hall, North",40,THEORY\n');
  });
});
