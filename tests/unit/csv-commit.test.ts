import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * The commit path of CSV import against an in-memory stand-in for PostgREST.
 * It implements just enough of PostgREST's semantics (POST insert, upsert with
 * merge-duplicates or ignore-duplicates on a conflict key, DELETE by `in.()`)
 * to check what the service sends, what ends up stored, and what it verifies.
 */

type Row = Record<string, unknown>;
const fake = vi.hoisted(() => ({
  tables: {} as Record<string, Row[]>,
  calls: [] as { table: string; method: string; query: Record<string, string>; prefer: string[]; rows: number }[],
  failOn: null as string | null,
}));

const KEYS: Record<string, string[]> = { rooms: ["room_id"], student_enrollments: ["roll_no"], student_subject_enrollments: ["roll_no", "subject_id"], timeslots: ["slot_id"], subjects: ["subject_id"], student_groups: ["group_id"], faculty: ["faculty_id"] };
const matches = (row: Row, query: Record<string, string>) => Object.entries(query).every(([col, cond]) => {
  if (["select", "order", "limit", "offset", "on_conflict"].includes(col)) return true;
  const inMatch = cond.match(/^in\.\((.*)\)$/);
  if (inMatch) return inMatch[1].split(",").map((v) => v.replace(/^"|"$/g, "")).includes(String(row[col]));
  if (cond.startsWith("eq.")) return String(row[col]) === cond.slice(3);
  return true;
});

vi.mock("@/lib/supabase", () => ({
  querySupabase: async (table: string, options: { method?: string; query?: Record<string, string>; body?: unknown; prefer?: string[] } = {}) => {
    const { method = "GET", query = {}, body, prefer = [] } = options;
    const rows = fake.tables[table] ?? (fake.tables[table] = []);
    fake.calls.push({ table, method, query, prefer, rows: Array.isArray(body) ? body.length : 0 });
    if (fake.failOn === `${method} ${table}`) return { data: null, error: new Error("Supabase error (500): simulated failure") };
    if (method === "GET") {
      const out = rows.filter((r) => matches(r, query));
      const offset = Number(query.offset ?? 0), limit = Number(query.limit ?? out.length);
      // Like an HTTP response: copies, never references to the stored rows.
      return { data: structuredClone(out.slice(offset, offset + limit)), error: null };
    }
    if (method === "DELETE") {
      const removed = rows.filter((r) => matches(r, query));
      fake.tables[table] = rows.filter((r) => !matches(r, query));
      return { data: removed, error: null };
    }
    const keyOf = (r: Row) => (KEYS[table] ?? ["id"]).map((k) => String(r[k])).join("|");
    const incoming = body as Row[];
    const written: Row[] = [];
    // One statement: validate every row first, then apply all of them.
    for (const r of incoming) {
      const existing = rows.find((x) => keyOf(x) === keyOf(r));
      if (existing && !query.on_conflict) return { data: null, error: new Error("Supabase error (409): duplicate key value violates unique constraint (23505)") };
    }
    for (const r of incoming) {
      const existing = rows.find((x) => keyOf(x) === keyOf(r));
      if (existing && prefer.includes("resolution=ignore-duplicates")) continue;
      if (existing) Object.assign(existing, r); else rows.push({ ...r });
      written.push(r);
    }
    return { data: written, error: null };
  },
}));
vi.mock("@/server/audit", () => ({ auditService: { audit: vi.fn() } }));
vi.mock("@/server/scheduling/loader", async () => {
  const { referenceRawDataset } = await import("@/server/scheduling/reference-dataset");
  const { querySupabase } = await import("@/lib/supabase");
  class SchedulingServiceError extends Error { constructor(public code: string, message: string, public status = 500) { super(message); } }
  return {
    SchedulingServiceError,
    fetchAllRows: async (table: string, _select: string, _order: string, filters: Record<string, string> = {}) => (await querySupabase<Row[]>(table, { query: filters })).data ?? [],
    loadRawDataset: async () => {
      const raw = referenceRawDataset("normal");
      return { ...raw, rooms: fake.tables.rooms, studentGroups: fake.tables.student_groups, students: fake.tables.student_enrollments, enrollments: fake.tables.student_subject_enrollments };
    },
  };
});

const { csvService } = await import("@/server/examopt/csv-service");
const { referenceQualityTables } = await import("@/server/scheduling/reference-dataset");

function seed() {
  const q = referenceQualityTables("normal");
  fake.tables = {
    rooms: (q.rooms as Row[]).map((r) => ({ room_id: r.room_id, name: r.name, building: r.building, capacity: Number(r.capacity), room_type: r.room_type, unavailable_slots: r.unavailable_slots ?? "" })),
    student_groups: (q.studentGroups as Row[]).map((g) => ({ group_id: g.group_id, name: g.name, program: g.program, semester: Number(g.semester), is_backlog_group: g.is_backlog_group === "1", student_count: Number(g.student_count) })),
    student_enrollments: (q.students as Row[]).map((s) => ({ roll_no: s.roll_no, student_name: `Student ${s.roll_no}`, group_id: s.group_id, has_backlog: s.has_backlog, enrolled_subject_ids: s.enrolled_subject_ids })),
    student_subject_enrollments: (q.enrollments as Row[]).map((e, i) => ({ id: i + 1, roll_no: e.roll_no, subject_id: e.subject_id })),
  };
  fake.calls = [];
  fake.failOn = null;
}

const ROOM_CSV = "room_id,name,building,capacity,room_type,unavailable_slots\nZZ-TEST-1,Test Hall,,70,THEORY,D1-M\nAB11-103,CSED Block AB-XI Room 103,,70,THEORY,\n";
const writes = () => fake.calls.filter((c) => c.method !== "GET");

describe("CSV import commit", () => {
  beforeEach(seed);

  test("preview writes nothing", async () => {
    const plan = await csvService.preview("rooms", "upsert", ROOM_CSV);
    expect(plan.summary).toMatchObject({ create: 1, update: 1 });
    expect(writes()).toEqual([]);
  });

  test("upsert commits creates and updates in one statement and verifies them by reading back", async () => {
    const plan = await csvService.preview("rooms", "upsert", ROOM_CSV);
    const result = await csvService.commit("rooms", "upsert", ROOM_CSV, plan.planHash, { userId: "admin" });
    expect(result).toMatchObject({ committed: { created: 1, updated: 1, unchanged: 0 }, verified: true, mismatches: [] });
    expect(writes()).toEqual([{ table: "rooms", method: "POST", query: { on_conflict: "room_id" }, prefer: ["resolution=merge-duplicates"], rows: 2 }]);
    expect(fake.tables.rooms.find((r) => r.room_id === "ZZ-TEST-1")).toMatchObject({ capacity: 70, room_type: "THEORY", unavailable_slots: "D1-M", building: "AB-XI CSED Block" });
    expect(fake.tables.rooms.find((r) => r.room_id === "AB11-103")!.capacity).toBe(70);
  });

  test("an export of the committed data re-imports unchanged", async () => {
    const plan = await csvService.preview("rooms", "upsert", ROOM_CSV);
    await csvService.commit("rooms", "upsert", ROOM_CSV, plan.planHash, { userId: "admin" });
    const exported = await csvService.exportEntity("rooms");
    const again = await csvService.preview("rooms", "upsert", exported.csv);
    expect(again.errors).toEqual([]);
    expect(again.summary).toMatchObject({ create: 0, update: 0, unchanged: fake.tables.rooms.length });
  });

  test("commit refuses when the data changed after the preview (plan hash mismatch)", async () => {
    const plan = await csvService.preview("rooms", "upsert", ROOM_CSV);
    fake.tables.rooms.find((r) => r.room_id === "AB11-103")!.capacity = 75; // someone edits the room meanwhile
    fake.calls = [];
    await expect(csvService.commit("rooms", "upsert", ROOM_CSV, plan.planHash, { userId: "admin" })).rejects.toMatchObject({ code: "PLAN_CHANGED", status: 409 });
    expect(writes()).toEqual([]);
  });

  test("commit refuses a file with errors and writes nothing", async () => {
    const bad = "room_id,name,capacity,room_type\nZZ-1,A,abc,THEORY\n";
    await expect(csvService.commit("rooms", "insert", bad, "00000000", { userId: "admin" })).rejects.toMatchObject({ code: "IMPORT_HAS_ERRORS", status: 422 });
    expect(writes()).toEqual([]);
  });

  test("a failed database write is reported as a failure, never as success", async () => {
    const plan = await csvService.preview("rooms", "upsert", ROOM_CSV);
    fake.failOn = "POST rooms";
    await expect(csvService.commit("rooms", "upsert", ROOM_CSV, plan.planHash, { userId: "admin" })).rejects.toMatchObject({ code: "PERSISTENCE_FAILED" });
    expect(fake.tables.rooms.some((r) => r.room_id === "ZZ-TEST-1")).toBe(false);
  });

  test("students: the record and its new enrollments are written; enrollments are additive", async () => {
    const csv = "roll_no,student_name,group_id,has_backlog,subject_ids\nZZ-STU-1,Test Student,GRP-BCA-S1,false,BCA-101|BCA-102\nGLA26-BCA-0001,Student GLA26-BCA-0001,GRP-BCA-S1,false,BCA-101|BCA-301\n";
    const before = fake.tables.student_subject_enrollments.length;
    const plan = await csvService.preview("students", "upsert", csv);
    const result = await csvService.commit("students", "upsert", csv, plan.planHash, { userId: "admin" });
    expect(result).toMatchObject({ committed: { created: 1, updated: 1, enrollmentsAdded: 3 }, verified: true });
    expect(fake.tables.student_subject_enrollments.length).toBe(before + 3);
    const ofStudent = (roll: string) => fake.tables.student_subject_enrollments.filter((e) => e.roll_no === roll).map((e) => e.subject_id).sort();
    expect(ofStudent("GLA26-BCA-0001")).toEqual(["BCA-101", "BCA-102", "BCA-103", "BCA-104P", "BCA-301"]);
    expect(fake.calls.find((c) => c.table === "student_subject_enrollments" && c.method === "POST")!.prefer).toEqual(["resolution=ignore-duplicates"]);
  });

  test("students: if the enrollment write fails, the student records are restored (compensation)", async () => {
    const csv = "roll_no,student_name,group_id,has_backlog,subject_ids\nZZ-STU-1,Test Student,GRP-BCA-S1,false,BCA-101\nGLA26-BCA-0001,Renamed Student,GRP-BCA-S1,false,BCA-301\n";
    const original = { ...fake.tables.student_enrollments.find((s) => s.roll_no === "GLA26-BCA-0001")! };
    const plan = await csvService.preview("students", "upsert", csv);
    fake.failOn = "POST student_subject_enrollments";
    await expect(csvService.commit("students", "upsert", csv, plan.planHash, { userId: "admin" })).rejects.toMatchObject({ code: "PERSISTENCE_FAILED", message: expect.stringContaining("restored") });
    expect(fake.tables.student_enrollments.some((s) => s.roll_no === "ZZ-STU-1")).toBe(false);
    expect(fake.tables.student_enrollments.find((s) => s.roll_no === "GLA26-BCA-0001")).toMatchObject(original);
  });

  test("insert mode never overwrites: an id added after the preview makes the database refuse the whole statement", async () => {
    const csv = "room_id,name,capacity,room_type\nZZ-A,A,40,THEORY\nZZ-B,B,40,THEORY\n";
    const plan = await csvService.preview("rooms", "insert", csv);
    // A concurrent insert of ZZ-B changes the fresh plan, so the hash check already refuses.
    fake.tables.rooms.push({ room_id: "ZZ-B", name: "other", building: "x", capacity: 10, room_type: "THEORY", unavailable_slots: "" });
    await expect(csvService.commit("rooms", "insert", csv, plan.planHash, { userId: "admin" })).rejects.toMatchObject({ status: expect.any(Number) });
    expect(fake.tables.rooms.some((r) => r.room_id === "ZZ-A")).toBe(false);
  });

  test("template and export are in the canonical format", async () => {
    expect(csvService.template("rooms").csv.trim()).toBe("room_id,name,building,capacity,room_type,unavailable_slots");
    const students = await csvService.exportEntity("students");
    expect(students.csv.split("\n")[0]).toBe("roll_no,student_name,group_id,has_backlog,subject_ids");
    expect(students.csv).toContain("GLA26-BCA-0001,Student GLA26-BCA-0001,GRP-BCA-S1,false,BCA-101|BCA-102|BCA-103|BCA-104P");
  });
});
