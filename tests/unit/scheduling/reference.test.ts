/**
 * Equivalence with the reference backend (hackvision/backend/tests), run on
 * the reference GLA dataset and edge-case files rebuilt in memory.
 */
import { describe, expect, test } from "vitest";
import { validateDataQuality, validateTableInContext } from "@/server/scheduling/data-quality";
import { ALGORITHM_IDS } from "@/server/scheduling/domain";
import { prepareDataset, runAlgorithm } from "@/server/scheduling/engine";
import { exportCsv, twelveHour, type ExportRow } from "@/server/scheduling/export";
import { allocateInvigilators, preferredDepartment, validateInvigilation } from "@/server/scheduling/invigilation";
import { referenceQualityScore } from "@/server/scheduling/metrics";
import { normalizeDataset } from "@/server/scheduling/normalize";
import { parseCsv, referenceQualityTables, referenceRawDataset, referenceStudents, REFERENCE_VARIANTS } from "@/server/scheduling/reference-dataset";

const normal = () => prepareDataset(normalizeDataset(referenceRawDataset("normal")));

describe("reference dataset", () => {
  test("matches the reference generator: 355 students, 1,735 enrollments, 8 groups", () => {
    const students = referenceStudents();
    expect(students).toHaveLength(355);
    expect(students[0].roll_no).toBe("GLA26-BCA-0001");
    expect(students.find((s) => s.group_id === "GRP-BCADS-S3")!.roll_no).toBe("GLA26-DS-0061");
    expect(referenceRawDataset().enrollments).toHaveLength(1735);
  });
});

describe("test_algorithms.py equivalents", () => {
  test("conflict graph carries the backlog edges (20 and 25 shared students)", () => {
    const { model } = normal();
    const at = (id: string) => model.examIndex.get(id)!;
    expect(model.graph.shared[at("MCA-101")][at("BCA-101")]).toBe(20);
    expect(model.graph.shared[at("BCADS-501")][at("BCADS-301")]).toBe(25);
    expect(model.graph.backlogShared[at("MCA-101")][at("BCA-101")]).toBe(20);
  });

  test("Welsh-Powell schedules all 24 exams with no clash", () => {
    const dataset = normal();
    const run = runAlgorithm(dataset, "WELSH_POWELL");
    expect(run.outcome).toBe("FEASIBLE");
    expect(run.validation?.placementViolationCount).toBe(0);
    expect(run.assignments).toHaveLength(24);
    const slotOf = new Map(run.assignments.map((a) => [a.examId, a.slotId]));
    for (const { a, b } of dataset.model.graph.edges) expect(slotOf.get(dataset.model.exams[a].id)).not.toBe(slotOf.get(dataset.model.exams[b].id));
  });

  test("backtracking is feasible, explores nodes, respects capacity and laboratories", () => {
    const dataset = normal();
    const run = runAlgorithm(dataset, "BACKTRACKING");
    expect(run.outcome).toBe("FEASIBLE");
    expect(run.searchNodes).toBeGreaterThan(0);
    for (const a of run.assignments) {
      expect(a.roomCapacity).toBeGreaterThanOrEqual(a.students);
      expect(a.roomId.includes("LAB")).toBe(a.examId.endsWith("P"));
    }
  });

  test("all three algorithms run on the same snapshot", () => {
    const dataset = normal();
    const runs = ALGORITHM_IDS.map((id) => runAlgorithm(dataset, id));
    expect(new Set(runs.map((r) => r.datasetFingerprint)).size).toBe(1);
    expect(runs.map((r) => r.algorithm)).toEqual(["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"]);
    // A heuristic failure is never reported as proof of infeasibility.
    for (const r of runs) if (r.outcome !== "FEASIBLE") expect(r.outcome).toBe("PARTIAL");
  });
});

describe("test_data_validation.py equivalents", () => {
  test("normal dataset: valid, readiness 100", () => {
    const report = validateDataQuality(referenceQualityTables("normal"));
    expect(report).toMatchObject({ isValid: true, readinessScore: 100, status: "READY_FOR_OPTIMIZATION" });
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  test("corrupted input is rejected with the reference codes", () => {
    const report = validateDataQuality(referenceQualityTables("invalid_corrupted"));
    expect(report.isValid).toBe(false);
    const codes = new Set(report.errors.map((e) => e.code));
    for (const code of ["DUPLICATE_SUBJECT_ID", "NEGATIVE_ENROLLMENT", "CONTRADICTORY_CONSTRAINTS", "FOREIGN_KEY_NOT_FOUND", "MISSING_NAME", "INVALID_PROGRAM"]) expect(codes).toContain(code);
    expect(report.warnings.map((w) => w.code)).toContain("UNUSUAL_DURATION");
  });

  test("lab bottleneck and capacity overflow are detected", () => {
    expect(validateDataQuality(referenceQualityTables("lab_bottleneck")).errors.map((e) => e.code)).toContain("LAB_BOTTLENECK");
    const overflow = validateDataQuality(referenceQualityTables("capacity_overflow"));
    expect(overflow.errors.map((e) => e.code)).toContain("CAPACITY_OVERFLOW");
    expect(overflow.warnings.map((w) => w.code)).toContain("ENROLLMENT_COUNT_MISMATCH");
  });

  test("readiness score is 100 - 20 x errors - 5 x warnings, floored at 0", () => {
    const report = validateDataQuality(referenceQualityTables("capacity_overflow"));
    expect(report.readinessScore).toBe(Math.max(0, 100 - 20 * report.errors.length - 5 * report.warnings.length));
  });

  test("a partial subjects upload skips the enrollment cross-check instead of flooding it", () => {
    const report = validateTableInContext(referenceQualityTables("normal"), "subjects", parseCsv(REFERENCE_VARIANTS.invalid_corrupted.csv));
    expect(report.errors.filter((e) => e.table === "student_enrollments")).toEqual([]);
    expect(report.diagnostics.join(" ")).toContain("skipped");
  });

  test("the engine refuses the edge-case files for the right reasons", () => {
    const outcome = (variant: Parameters<typeof referenceRawDataset>[0], extra = 0) => {
      const run = runAlgorithm(prepareDataset(normalizeDataset(referenceRawDataset(variant, { extraBigCourseStudents: extra }))), "BACKTRACKING");
      return { outcome: run.outcome, codes: run.diagnostics.map((d) => d.code) };
    };
    expect(outcome("invalid_corrupted").outcome).toBe("INVALID_INPUT");
    expect(outcome("lab_bottleneck")).toMatchObject({ outcome: "INFEASIBLE" });
    expect(outcome("capacity_overflow", 570).codes).toContain("ROOM_CAPACITY_BOTTLENECK");
    // The declared 650 alone does not change actual enrollments, so the schedule is still feasible.
    expect(outcome("capacity_overflow").outcome).toBe("FEASIBLE");
  });
});

describe("reference quality score (optimizer.py _compute_soft_score)", () => {
  test("feasible and infeasible formulas", () => {
    expect(referenceQualityScore({ scheduledExams: 24, totalExams: 24, seatFillPct: 87.2, slotsUsed: 10, totalSlots: 10 }, true)).toBe(64.88);
    expect(referenceQualityScore({ scheduledExams: 24, totalExams: 24, seatFillPct: 86.3, slotsUsed: 6, totalSlots: 10 }, true)).toBe(76.52);
    expect(referenceQualityScore({ scheduledExams: 23, totalExams: 24, seatFillPct: 77, slotsUsed: 6, totalSlots: 10 }, false)).toBe(38.33);
  });

  test("a run's metrics carry the score, consistent with its outcome", () => {
    const run = runAlgorithm(normal(), "BACKTRACKING");
    expect(run.metrics?.referenceScore).toBe(referenceQualityScore(run.metrics!, true));
  });
});

describe("invigilation (faculty_allocator.py)", () => {
  test("department preference mirrors the reference", () => {
    expect([preferredDepartment("MCA"), preferredDepartment("BCA"), preferredDepartment("BCA-DS")]).toEqual(["MCA", "BCA", "CSED"]);
  });

  test("feasible reference runs get invigilators that break no rule", () => {
    const run = runAlgorithm(normal(), "BACKTRACKING");
    expect(run.invigilation?.valid).toBe(true);
    expect(run.invigilation?.covered).toBe(24);
    const input = normal().input;
    const unavailable = new Map(input.invigilators!.map((f) => [f.id, f.unavailableSlotIds]));
    for (const a of run.assignments) expect(unavailable.get(a.facultyId!)).not.toContain(a.slotId);
  });

  test("allocation is deterministic and independent of assignment order", () => {
    const { input } = normal();
    const run = runAlgorithm(normal(), "WELSH_POWELL");
    const forward = allocateInvigilators(input, run.assignments);
    const reversed = allocateInvigilators(input, [...run.assignments].reverse());
    const map = (d: typeof forward) => Object.fromEntries(d.map((x) => [x.examId, x.facultyId]));
    expect(map(reversed)).toEqual(map(forward));
    expect(validateInvigilation(input, forward).valid).toBe(true);
  });
});

describe("CSV export (exporter.py)", () => {
  const row = (over: Partial<ExportRow>): ExportRow => ({ examId: "X", examName: "Exam, with comma", program: "BCA", semester: 1, slotId: "D1-M", date: "2026-10-19", session: "morning", startMinutes: 570, endMinutes: 750, durationMinutes: 180, roomId: "R1", roomName: "Room", roomCapacity: 80, students: 60, facultyId: null, facultyName: null, facultyDepartment: null, ...over });

  test("reference columns, sort order, quoting and TBD invigilator", () => {
    const csv = exportCsv("timetable", [row({ examId: "B", slotId: "D2-M", date: "2026-10-20" }), row({ examId: "A" })]);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("exam_date,day_session,slot_id,time_range,subject_id,subject_name,program,semester,room_id,room_name,room_capacity,assigned_faculty_name,assigned_students,duration_hours");
    expect(lines[1]).toBe('2026-10-19,MORNING,D1-M,09:30 AM - 12:30 PM,A,"Exam, with comma",BCA,1,R1,Room,80,TBD,60,3');
    expect(lines[2].startsWith("2026-10-20")).toBe(true);
  });

  test("room sheet computes empty seats", () => {
    const lines = exportCsv("rooms", [row({})]).trim().split("\n");
    expect(lines[0]).toBe("room_id,room_name,slot_id,exam_date,time_range,subject_id,enrolled_students,room_capacity,empty_seats");
    expect(lines[1].endsWith(",60,80,20")).toBe(true);
  });

  test("12-hour clock matches the reference time_range format", () => {
    expect([twelveHour(570), twelveHour(720), twelveHour(840), twelveHour(0)]).toEqual(["09:30 AM", "12:00 PM", "02:00 PM", "12:00 AM"]);
  });
});
