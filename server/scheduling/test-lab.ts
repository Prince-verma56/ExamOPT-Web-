import { validateDataQuality } from "./data-quality";
import { ALGORITHM_IDS, type AlgorithmId, type Diagnostic, type Invigilator, type RunOutcome, type SchedulingInput } from "./domain";
import { mergeConfig, prepareDataset, runAlgorithm, type RunResult } from "./engine";
import { campusMini, cohort, exam, oddCycle, pairedTwelve, room, slot, tamperCampusMiniSchedule } from "./fixtures";
import { allocateInvigilators, validateInvigilation } from "./invigilation";
import { normalizeDataset } from "./normalize";
import { publishGate } from "./publication";
import { referenceQualityTables, referenceRawDataset, REFERENCE_VARIANTS, type ReferenceVariant } from "./reference-dataset";
import { validateSchedule, type ViolationCode } from "./validator";

export interface TestCaseResult {
  id: string;
  name: string;
  category: string;
  expected: string;
  actual: string;
  passed: boolean;
  durationMs: number;
  runs: { algorithm: AlgorithmId; outcome: RunOutcome; scheduled: number; total: number; durationMs: number; searchNodes: number | null }[];
  diagnostics: Diagnostic[];
  checks: { label: string; passed: boolean }[];
}

interface TestCase {
  id: string;
  name: string;
  category: "Feasible" | "Conflicts" | "Capacity" | "Constraints" | "Data quality" | "Search" | "Validator" | "Reference" | "Invigilation" | "Publication";
  expected: string;
  run(): { checks: { label: string; passed: boolean }[]; actual: string; runs?: RunResult[]; diagnostics?: Diagnostic[] };
}

const runAll = (input: SchedulingInput, config = mergeConfig()) => {
  const dataset = prepareDataset(input);
  return ALGORITHM_IDS.map((algorithm) => runAlgorithm(dataset, algorithm, config));
};
const outcomes = (runs: RunResult[]) => runs.map((r) => `${r.algorithm}: ${r.outcome}`).join(" · ");
const slotOf = (run: RunResult, examId: string) => run.assignments.find((a) => a.examId === examId)?.slotId;
const codes = (diagnostics: Diagnostic[]) => [...new Set(diagnostics.map((d) => d.code))];

function infeasibleCase(id: string, name: string, category: TestCase["category"], code: Diagnostic["code"], build: () => SchedulingInput): TestCase {
  return {
    id, name, category,
    expected: `Every algorithm reports INFEASIBLE, established by a necessary-condition check (${code}); no schedule is produced.`,
    run() {
      const runs = runAll(build());
      return {
        runs, diagnostics: runs[0].diagnostics, actual: `${outcomes(runs)} · diagnostics: ${codes(runs[0].diagnostics).join(", ")}`,
        checks: [
          { label: "All outcomes are INFEASIBLE", passed: runs.every((r) => r.outcome === "INFEASIBLE") },
          { label: "Evidence is a necessary-condition check", passed: runs.every((r) => r.infeasibilityEvidence === "necessary-condition") },
          { label: `${code} diagnostic reported`, passed: runs[0].diagnostics.some((d) => d.code === code && d.provesInfeasible) },
          { label: "No assignments produced", passed: runs.every((r) => r.assignments.length === 0) },
        ],
      };
    },
  };
}

/** A reference edge-case file: the data quality report must flag `qualityCode`, and the engine must refuse it for the stated reason. */
function referenceEdgeCase(variant: ReferenceVariant, name: string, qualityCodes: string[], engine: { outcome: RunOutcome; codes: Diagnostic["code"][]; extraBigCourseStudents?: number; note?: string }): TestCase {
  return {
    id: `reference-${variant.replace(/_/g, "-")}`, name, category: "Reference",
    expected: `Reference file ${REFERENCE_VARIANTS[variant].file}: the data quality report fails with ${qualityCodes.join(", ")} (as in the reference tests), and every algorithm reports ${engine.outcome} with ${engine.codes.join(" or ")}.${engine.note ? ` ${engine.note}` : ""}`,
    run() {
      const quality = validateDataQuality(referenceQualityTables(variant));
      const found = new Set(quality.errors.map((e) => e.code));
      const runs = runAll(normalizeDataset(referenceRawDataset(variant, { extraBigCourseStudents: engine.extraBigCourseStudents })));
      const diagCodes = codes(runs[0].diagnostics);
      return {
        runs, diagnostics: runs[0].diagnostics,
        actual: `quality: ${quality.status}, score ${quality.readinessScore}, errors ${[...found].join(", ")} · ${outcomes(runs)} · ${diagCodes.join(", ")}`,
        checks: [
          { label: "Data quality report fails", passed: !quality.isValid && quality.status === "VALIDATION_FAILED" },
          ...qualityCodes.map((code) => ({ label: `Reference code ${code} reported`, passed: found.has(code) })),
          { label: `All outcomes ${engine.outcome}`, passed: runs.every((r) => r.outcome === engine.outcome) },
          { label: `Engine reports ${engine.codes.join(" or ")}`, passed: engine.codes.some((c) => diagCodes.includes(c)) },
          { label: "No schedule produced", passed: runs.every((r) => r.assignments.length === 0) },
        ],
      };
    },
  };
}

const sharedBetween = (input: SchedulingInput, a: string, b: string) => {
  const of = (id: string) => new Set(input.enrollments.filter((e) => e.examId === id).map((e) => e.studentId));
  const sa = of(a), sb = of(b);
  return [...sa].filter((s) => sb.has(s)).length;
};

/** Cases ported from the reference backend's tests and fixtures, plus invigilation and publication. */
const PORTED_CASES: TestCase[] = [
  {
    id: "reference-gla-normal", name: "Reference GLA dataset (equivalence)", category: "Reference",
    expected: "On the reference GLA dataset: BCA-101↔MCA-101 share 20 students and BCADS-301↔BCADS-501 share 25; Welsh-Powell and backtracking are FEASIBLE with 24/24 exams, 0 violations, capacities and laboratories respected; the data quality score is 100; invigilation breaks no rule.",
    run() {
      const input = normalizeDataset(referenceRawDataset("normal"));
      const dataset = prepareDataset(input);
      const runs = ALGORITHM_IDS.map((a) => runAlgorithm(dataset, a));
      const wp = runs.find((r) => r.algorithm === "WELSH_POWELL")!, bt = runs.find((r) => r.algorithm === "BACKTRACKING")!;
      const quality = validateDataQuality(referenceQualityTables("normal"));
      const roomType = new Map(input.rooms.map((r) => [r.id, r.roomType]));
      const labOf = new Set(input.exams.filter((e) => e.requiredRoomType === "LAB").map((e) => e.id));
      const e = dataset.model.examIndex, g = dataset.model.graph;
      const w1 = g.shared[e.get("BCA-101")!][e.get("MCA-101")!], w2 = g.shared[e.get("BCADS-301")!][e.get("BCADS-501")!];
      return {
        runs, diagnostics: runs.flatMap((r) => r.diagnostics),
        actual: `edges BCA-101↔MCA-101 = ${w1}, BCADS-301↔BCADS-501 = ${w2} · ${outcomes(runs)} · quality ${quality.readinessScore} · invigilation ${bt.invigilation?.covered}/${bt.invigilation?.total}`,
        checks: [
          { label: "BCA-101↔MCA-101 share 20 students (reference)", passed: w1 === 20 && sharedBetween(input, "BCA-101", "MCA-101") === 20 },
          { label: "BCADS-301↔BCADS-501 share 25 students (reference)", passed: w2 === 25 },
          { label: "Welsh-Powell FEASIBLE, 24/24, 0 violations", passed: wp.outcome === "FEASIBLE" && wp.assignments.length === 24 && wp.validation?.placementViolationCount === 0 },
          { label: "No conflicting exams share a slot (Welsh-Powell)", passed: g.edges.every(({ a, b }) => wp.assignments.find((x) => x.examId === dataset.model.exams[a].id)?.slotId !== wp.assignments.find((x) => x.examId === dataset.model.exams[b].id)?.slotId) },
          { label: "Backtracking FEASIBLE, 24/24, nodes > 0", passed: bt.outcome === "FEASIBLE" && bt.assignments.length === 24 && (bt.searchNodes ?? 0) > 0 },
          { label: "Capacity respected and labs in LAB rooms (backtracking)", passed: bt.assignments.every((a) => a.roomCapacity >= a.students && (labOf.has(a.examId) ? roomType.get(a.roomId) === "LAB" : roomType.get(a.roomId) === "THEORY")) },
          { label: "Benchmark covers all three algorithms", passed: new Set(runs.map((r) => r.algorithm)).size === 3 },
          { label: "Data quality: valid, readiness 100", passed: quality.isValid && quality.readinessScore === 100 },
          { label: "Invigilation breaks no rule (feasible runs)", passed: runs.filter((r) => r.outcome === "FEASIBLE").every((r) => r.invigilation?.valid === true) },
        ],
      };
    },
  },
  referenceEdgeCase("invalid_corrupted", "Reference corrupted input", ["DUPLICATE_SUBJECT_ID", "NEGATIVE_ENROLLMENT", "CONTRADICTORY_CONSTRAINTS", "FOREIGN_KEY_NOT_FOUND"], { outcome: "INVALID_INPUT", codes: ["DUPLICATE_IDENTIFIER", "MISSING_REFERENCE"] }),
  referenceEdgeCase("lab_bottleneck", "Reference laboratory bottleneck", ["LAB_BOTTLENECK"], { outcome: "INFEASIBLE", codes: ["LABORATORY_UNAVAILABLE", "FIXED_SLOT_CONFLICT"] }),
  referenceEdgeCase("capacity_overflow", "Reference capacity overflow", ["CAPACITY_OVERFLOW"], {
    outcome: "INFEASIBLE", codes: ["ROOM_CAPACITY_BOTTLENECK"], extraBigCourseStudents: 570,
    note: "The engine schedules from actual enrollments, so 570 BCA-101-only students are added to make the declared 650 real.",
  }),
  {
    id: "invigilation-rules", name: "Invigilator allocation rules", category: "Invigilation",
    expected: "Invigilators are never double-booked, never used in an unavailable slot and never pushed past their duty cap; the program's department is preferred; an exam with no eligible invigilator is left uncovered without changing schedule feasibility; a tampered duty list is caught.",
    run() {
      const faculty: Invigilator[] = [
        { id: "F1", name: "F1", department: "BCA", unavailableSlotIds: [], maxDuties: 1 },
        { id: "F2", name: "F2", department: "MCA", unavailableSlotIds: ["S1"], maxDuties: 2 },
        { id: "F3", name: "F3", department: "CSED", unavailableSlotIds: [], maxDuties: 2 },
      ];
      const input: SchedulingInput = {
        slots: [slot("S1", "2026-11-02"), slot("S2", "2026-11-02", "14:00", "17:00")], rooms: [room("R1", 80), room("R2", 80), room("R3", 80)],
        exams: [exam("A-1"), exam("B-1", { program: "MCA" }), exam("C-1", { program: "BCA-DS" }), exam("D-1")],
        enrollments: [], invigilators: faculty,
      };
      const placed = [{ examId: "A-1", slotId: "S1", roomId: "R1" }, { examId: "B-1", slotId: "S1", roomId: "R2" }, { examId: "C-1", slotId: "S1", roomId: "R3" }, { examId: "D-1", slotId: "S2", roomId: "R1" }];
      const duties = allocateInvigilators(input, placed);
      const by = Object.fromEntries(duties.map((d) => [d.examId, d.facultyId]));
      const report = validateInvigilation(input, duties);
      const tampered = validateInvigilation(input, duties.map((d) => ({ ...d, facultyId: d.examId === "C-1" || d.examId === "D-1" ? "F1" : d.examId === "B-1" ? "F2" : d.facultyId })));
      const tamperedCodes = new Set(tampered.violations.map((v) => v.code));
      const shortage = runAlgorithm(prepareDataset({ ...input, exams: [exam("A-1"), exam("D-1")], invigilators: [faculty[0]], enrollments: cohort("X", 10, ["A-1", "D-1"]) }), "BACKTRACKING");
      return {
        runs: [shortage], diagnostics: shortage.diagnostics,
        actual: `A-1→${by["A-1"]}, B-1→${by["B-1"]}, C-1→${by["C-1"] ?? "uncovered"}, D-1→${by["D-1"]} · coverage ${report.covered}/${report.total} · tampered: ${[...tamperedCodes].join(", ")} · shortage run: ${shortage.outcome}`,
        checks: [
          { label: "Department preferred (A-1 → BCA faculty F1)", passed: by["A-1"] === "F1" },
          { label: "Unavailable faculty skipped (B-1 not F2 in S1)", passed: by["B-1"] === "F3" },
          { label: "No eligible invigilator → uncovered (C-1)", passed: by["C-1"] === null && report.uncoveredExamIds.join() === "C-1" },
          { label: "Duty cap respected (D-1 not F1)", passed: by["D-1"] === "F2" },
          { label: "Allocation passes the invigilation validator", passed: report.valid },
          { label: "Tampered duties flag double booking, unavailability and overload", passed: ["INVIGILATOR_DOUBLE_BOOKED", "INVIGILATOR_UNAVAILABLE", "INVIGILATOR_OVERLOADED"].every((c) => tamperedCodes.has(c as never)) },
          { label: "Shortage leaves the schedule FEASIBLE with an INVIGILATOR_SHORTAGE warning", passed: shortage.outcome === "FEASIBLE" && shortage.diagnostics.some((d) => d.code === "INVIGILATOR_SHORTAGE") },
        ],
      };
    },
  },
  {
    id: "publication-gate", name: "Publication gate", category: "Publication",
    expected: "Only an engine-generated FEASIBLE run whose saved assignments still pass validation against today's data (and whose invigilation is valid) can be published; legacy, partial, stale and already-active runs are refused with reasons.",
    run() {
      const ok = { source: "engine" as const, outcome: "FEASIBLE" as RunOutcome, storedValid: true, liveValidation: { valid: true, violationCount: 0 }, invigilation: { valid: true, violations: 0 }, isActivePublication: false };
      const cases = [
        { label: "Feasible, validated engine run is allowed", gate: publishGate(ok), allowed: true, code: null },
        { label: "Legacy run refused (LEGACY_RUN)", gate: publishGate({ ...ok, source: "legacy", storedValid: null }), allowed: false, code: "LEGACY_RUN" },
        { label: "Partial run refused (NOT_FEASIBLE)", gate: publishGate({ ...ok, outcome: "PARTIAL" }), allowed: false, code: "NOT_FEASIBLE" },
        { label: "Run invalid against today's data refused (LIVE_VALIDATION_FAILED)", gate: publishGate({ ...ok, liveValidation: { valid: false, violationCount: 2 } }), allowed: false, code: "LIVE_VALIDATION_FAILED" },
        { label: "Invalid invigilation refused (INVIGILATION_INVALID)", gate: publishGate({ ...ok, invigilation: { valid: false, violations: 1 } }), allowed: false, code: "INVIGILATION_INVALID" },
        { label: "Already active refused (ALREADY_ACTIVE)", gate: publishGate({ ...ok, isActivePublication: true }), allowed: false, code: "ALREADY_ACTIVE" },
      ];
      return {
        actual: cases.map((c) => `${c.gate.allowed ? "allowed" : c.gate.rejections.map((r) => r.code).join("+")}`).join(" · "),
        checks: cases.map((c) => ({ label: c.label, passed: c.gate.allowed === c.allowed && (c.code === null || c.gate.rejections.some((r) => r.code === c.code)) })),
      };
    },
  },
];

export const TEST_CASES: TestCase[] = [
  {
    id: "feasible-baseline", name: "Normal feasible schedule", category: "Feasible",
    expected: "All three algorithms produce a FEASIBLE schedule that the independent validator accepts with zero violations.",
    run() {
      const runs = runAll(campusMini());
      return {
        runs, actual: outcomes(runs),
        checks: [
          { label: "All outcomes FEASIBLE", passed: runs.every((r) => r.outcome === "FEASIBLE") },
          { label: "Validator passed every schedule", passed: runs.every((r) => r.validation?.valid === true && r.validation.violationCount === 0) },
          { label: "Every exam scheduled", passed: runs.every((r) => r.assignments.length === r.totalExams) },
        ],
      };
    },
  },
  {
    id: "shared-student", name: "Two exams sharing one student", category: "Conflicts",
    expected: "The conflict graph contains an edge with weight 1, and every algorithm places the two exams in different slots.",
    run() {
      const input: SchedulingInput = {
        slots: [slot("S1", "2026-11-02"), slot("S2", "2026-11-03")], rooms: [room("R1", 60), room("R2", 60)],
        exams: [exam("X-101"), exam("Y-201")],
        enrollments: [...cohort("A", 30, ["X-101"]), ...cohort("B", 30, ["Y-201"]), { studentId: "SHARED-1", examId: "X-101", groupId: null, isBacklog: false }, { studentId: "SHARED-1", examId: "Y-201", groupId: null, isBacklog: false }],
      };
      const dataset = prepareDataset(input);
      const runs = ALGORITHM_IDS.map((a) => runAlgorithm(dataset, a));
      const edge = dataset.model.graph.edges[0];
      return {
        runs, actual: `edges: ${dataset.model.graph.edges.length} (weight ${edge?.shared ?? 0}) · ${runs.map((r) => `${r.algorithm}: ${slotOf(r, "X-101")} / ${slotOf(r, "Y-201")}`).join(" · ")}`,
        checks: [
          { label: "Exactly one conflict edge of weight 1", passed: dataset.model.graph.edges.length === 1 && edge.shared === 1 },
          { label: "Exams placed in different slots", passed: runs.every((r) => slotOf(r, "X-101") && slotOf(r, "Y-201") && slotOf(r, "X-101") !== slotOf(r, "Y-201")) },
          { label: "All outcomes FEASIBLE", passed: runs.every((r) => r.outcome === "FEASIBLE") },
        ],
      };
    },
  },
  {
    id: "backlog-cross-semester", name: "Cross-semester backlog conflict", category: "Conflicts",
    expected: "Normalisation flags the backlog enrollment, the graph links the semester-3 and semester-5 exams, and they are never scheduled together.",
    run() {
      const input = normalizeDataset({
        rooms: [{ room_id: "R1", name: "R1", capacity: 80, room_type: "THEORY", unavailable_slots: "" }, { room_id: "R2", name: "R2", capacity: 80, room_type: "THEORY", unavailable_slots: "" }],
        timeslots: [{ slot_id: "D1-M", exam_date: "2026-11-02", session: "MORNING", time_range: "09:30 AM - 12:30 PM", day_number: 1 }, { slot_id: "D1-E", exam_date: "2026-11-02", session: "EVENING", time_range: "02:00 PM - 05:00 PM", day_number: 1 }],
        subjects: [
          { subject_id: "DS-301", name: "Sem 3 subject", program: "BCA-DS", semester: 3, duration_hours: 3, requires_lab: false, fixed_slot: null, unavailable_slots: "", enrolled_students: 0 },
          { subject_id: "DS-501", name: "Sem 5 subject", program: "BCA-DS", semester: 5, duration_hours: 3, requires_lab: false, fixed_slot: null, unavailable_slots: "", enrolled_students: 0 },
        ],
        studentGroups: [{ group_id: "S3", program: "BCA-DS", semester: 3 }, { group_id: "S5", program: "BCA-DS", semester: 5 }, { group_id: "S5-BL", program: "BCA-DS", semester: 5, is_backlog_group: true }],
        students: [{ roll_no: "S3-1", group_id: "S3" }, { roll_no: "S5-1", group_id: "S5" }, { roll_no: "BL-1", group_id: "S5-BL" }],
        enrollments: [{ roll_no: "S3-1", subject_id: "DS-301" }, { roll_no: "S5-1", subject_id: "DS-501" }, { roll_no: "BL-1", subject_id: "DS-501" }, { roll_no: "BL-1", subject_id: "DS-301" }],
      });
      const dataset = prepareDataset(input);
      const runs = ALGORITHM_IDS.map((a) => runAlgorithm(dataset, a));
      const edge = dataset.model.graph.edges[0];
      return {
        runs, actual: `backlog enrollments: ${input.enrollments.filter((e) => e.isBacklog).map((e) => `${e.studentId}→${e.examId}`).join(", ")} · edge backlog weight ${edge?.backlogShared ?? 0} · ${outcomes(runs)}`,
        checks: [
          { label: "Only BL-1 → DS-301 marked as backlog", passed: input.enrollments.filter((e) => e.isBacklog).map((e) => `${e.studentId}|${e.examId}`).join() === "BL-1|DS-301" },
          { label: "Graph edge carries the backlog student", passed: edge?.shared === 1 && edge.backlogShared === 1 },
          { label: "Exams in different slots", passed: runs.every((r) => slotOf(r, "DS-301") !== slotOf(r, "DS-501")) },
          { label: "All outcomes FEASIBLE", passed: runs.every((r) => r.outcome === "FEASIBLE") },
        ],
      };
    },
  },
  infeasibleCase("capacity-overflow", "Room-capacity overflow", "Capacity", "ROOM_CAPACITY_BOTTLENECK", () => ({
    slots: [slot("S1", "2026-11-02"), slot("S2", "2026-11-03")], rooms: [room("R1", 150), room("R2", 120)],
    exams: [exam("BIG-101"), exam("SMALL-102")], enrollments: [...cohort("BIG", 200, ["BIG-101"]), ...cohort("S", 40, ["SMALL-102"])],
  })),
  infeasibleCase("lab-unavailable", "Required laboratory unavailable", "Constraints", "LABORATORY_UNAVAILABLE", () => ({
    slots: [slot("S1", "2026-11-02"), slot("S2", "2026-11-03")], rooms: [room("R1", 80), room("LAB-1", 80, "LAB", ["S1", "S2"])],
    exams: [exam("PRAC-101P", { requiredRoomType: "LAB", durationMinutes: 120 }), exam("THEORY-102")], enrollments: [...cohort("A", 40, ["PRAC-101P", "THEORY-102"])],
  })),
  infeasibleCase("fixed-slot-conflict", "Fixed-slot conflict", "Constraints", "FIXED_SLOT_CONFLICT", () => ({
    slots: [slot("S1", "2026-11-02"), slot("S2", "2026-11-03")], rooms: [room("R1", 80), room("R2", 80)],
    exams: [exam("FX-101", { fixedSlotId: "S1" }), exam("FX-102", { fixedSlotId: "S1" })], enrollments: cohort("A", 30, ["FX-101", "FX-102"]),
  })),
  {
    id: "unavailable-slot", name: "Unavailable time slot respected", category: "Constraints",
    expected: "An exam barred from S1 and S2 is placed in S3 by every algorithm, and the validator catches a forced placement in S1.",
    run() {
      const input: SchedulingInput = {
        slots: [slot("S1", "2026-11-02"), slot("S2", "2026-11-03"), slot("S3", "2026-11-04")], rooms: [room("R1", 80), room("R2", 80)],
        exams: [exam("U-101", { unavailableSlotIds: ["S1", "S2"] }), exam("U-102")], enrollments: cohort("A", 30, ["U-101", "U-102"]),
      };
      const runs = runAll(input);
      const forced = validateSchedule(input, [{ examId: "U-101", slotId: "S1", roomId: "R1" }, { examId: "U-102", slotId: "S2", roomId: "R1" }]);
      return {
        runs, actual: `${runs.map((r) => `${r.algorithm}: U-101 → ${slotOf(r, "U-101")}`).join(" · ")} · forced S1: ${forced.violations.map((v) => v.code).join(", ")}`,
        checks: [
          { label: "U-101 placed in S3 by every algorithm", passed: runs.every((r) => slotOf(r, "U-101") === "S3") },
          { label: "All outcomes FEASIBLE", passed: runs.every((r) => r.outcome === "FEASIBLE") },
          { label: "Validator flags EXAM_SLOT_UNAVAILABLE for a forced S1 placement", passed: !forced.valid && forced.violations.some((v) => v.code === "EXAM_SLOT_UNAVAILABLE") },
        ],
      };
    },
  },
  infeasibleCase("insufficient-rooms", "Insufficient available rooms", "Capacity", "ROOM_CAPACITY_BOTTLENECK", () => ({
    slots: [slot("S1", "2026-11-02")], rooms: [room("R1", 80), room("R2", 80)],
    exams: [exam("I-101"), exam("I-102"), exam("I-103")], enrollments: [...cohort("A", 20, ["I-101"]), ...cohort("B", 20, ["I-102"]), ...cohort("C", 20, ["I-103"])],
  })),
  {
    id: "invalid-input", name: "Invalid and duplicate input", category: "Data quality",
    expected: "Preflight reports DUPLICATE_IDENTIFIER, MISSING_REFERENCE and INVALID_DATA; every run is INVALID_INPUT and no solver executes.",
    run() {
      const input: SchedulingInput = {
        slots: [slot("S1", "2026-11-02"), { ...slot("S2", "2026-11-03"), endMinutes: 9 * 60 }], rooms: [room("R1", 80)],
        exams: [exam("D-101"), exam("D-101", { name: "Duplicate" })], enrollments: [...cohort("A", 10, ["D-101"]), ...cohort("B", 5, ["GHOST-999"])],
      };
      const runs = runAll(input);
      const found = codes(runs[0].diagnostics);
      return {
        runs, diagnostics: runs[0].diagnostics, actual: `${outcomes(runs)} · ${found.join(", ")}`,
        checks: [
          { label: "All outcomes INVALID_INPUT", passed: runs.every((r) => r.outcome === "INVALID_INPUT") },
          { label: "Solver did not run", passed: runs.every((r) => !r.solverRan) },
          { label: "Duplicate, missing-reference and invalid-data errors reported", passed: ["DUPLICATE_IDENTIFIER", "MISSING_REFERENCE", "INVALID_DATA"].every((c) => found.includes(c as Diagnostic["code"])) },
        ],
      };
    },
  },
  infeasibleCase("over-constrained-clique", "Over-constrained: 4 mutually conflicting exams, 3 slots", "Constraints", "STUDENT_CONFLICT_BOTTLENECK", () => ({
    slots: [slot("S1", "2026-11-02"), slot("S2", "2026-11-03"), slot("S3", "2026-11-04")], rooms: [room("R1", 80), room("R2", 80)],
    exams: [exam("K-1"), exam("K-2"), exam("K-3"), exam("K-4")], enrollments: cohort("A", 25, ["K-1", "K-2", "K-3", "K-4"]),
  })),
  {
    id: "odd-cycle-search-proof", name: "Impossible case proven by exhaustive search", category: "Search",
    expected: "Preflight finds no violated bound. Backtracking exhausts the search and reports INFEASIBLE; the heuristics report PARTIAL, never INFEASIBLE.",
    run() {
      const runs = runAll(oddCycle());
      const bt = runs.find((r) => r.algorithm === "BACKTRACKING")!;
      return {
        runs, diagnostics: bt.diagnostics, actual: `${outcomes(runs)} · backtracking evidence: ${bt.infeasibilityEvidence ?? "none"}`,
        checks: [
          { label: "Preflight raised no infeasibility proof", passed: runs.every((r) => r.solverRan) },
          { label: "Backtracking: INFEASIBLE by exhaustive search", passed: bt.outcome === "INFEASIBLE" && bt.infeasibilityEvidence === "exhaustive-search" },
          { label: "Heuristics: PARTIAL (no infeasibility claim)", passed: runs.filter((r) => r.algorithm !== "BACKTRACKING").every((r) => r.outcome === "PARTIAL" && r.infeasibilityEvidence === null) },
        ],
      };
    },
  },
  {
    id: "search-timeout", name: "Search limit reached", category: "Search",
    expected: "With a deliberately tiny 5-node budget on a feasible 12-exam instance, backtracking reports SEARCH_LIMIT, not INFEASIBLE.",
    run() {
      const dataset = prepareDataset(pairedTwelve());
      const limited = runAlgorithm(dataset, "BACKTRACKING", mergeConfig({ maxNodes: 5 }));
      const full = runAlgorithm(dataset, "BACKTRACKING");
      return {
        runs: [limited], diagnostics: limited.diagnostics, actual: `5-node budget: ${limited.outcome} (${limited.searchNodes} nodes, ${limited.assignments.length}/12 placed) · default budget: ${full.outcome}`,
        checks: [
          { label: "Outcome is SEARCH_LIMIT", passed: limited.outcome === "SEARCH_LIMIT" },
          { label: "SEARCH_LIMIT_REACHED diagnostic reported", passed: limited.diagnostics.some((d) => d.code === "SEARCH_LIMIT_REACHED") },
          { label: "No infeasibility claimed", passed: limited.infeasibilityEvidence === null },
          { label: "Same instance is FEASIBLE with the default budget", passed: full.outcome === "FEASIBLE" },
        ],
      };
    },
  },
  {
    id: "independent-validation", name: "Independent validation", category: "Validator",
    expected: "The validator accepts a solver's schedule, then detects student overlap, room double-booking and capacity breaches in a tampered copy.",
    run() {
      const input = campusMini();
      const run = runAlgorithm(prepareDataset(input), "BACKTRACKING");
      const clean = validateSchedule(input, run.assignments);
      // BCA-102 onto BCA-101's slot and room (40 shared students), MCA-102P (60) into LAB-50, and a duplicate BCA-301.
      const tampered = tamperCampusMiniSchedule(run.assignments);
      const report = validateSchedule(input, tampered);
      const found = new Set(report.violations.map((v) => v.code));
      const expectCodes: ViolationCode[] = ["STUDENT_OVERLAP", "ROOM_DOUBLE_BOOKED", "ROOM_CAPACITY_EXCEEDED", "DUPLICATE_ASSIGNMENT"];
      return {
        runs: [run], actual: `solver schedule: ${clean.valid ? "valid" : "invalid"} · tampered: ${report.violationCount} violations (${[...found].join(", ")})`,
        checks: [
          { label: "Solver schedule passes all 10 rules", passed: clean.valid && clean.checks.every((c) => c.passed) },
          ...expectCodes.map((code) => ({ label: `Tampered copy flags ${code}`, passed: found.has(code) })),
          { label: "Overlap reported as a student count only", passed: report.violations.filter((v) => v.code === "STUDENT_OVERLAP").every((v) => typeof v.studentCount === "number" && !v.message.includes("BCA1-")) },
        ],
      };
    },
  },
  {
    id: "deterministic", name: "Deterministic output", category: "Feasible",
    expected: "Running each algorithm twice on identical input and configuration yields identical assignments.",
    run() {
      const a = runAll(campusMini()), b = runAll(campusMini());
      const same = a.every((run, i) => JSON.stringify(run.assignments) === JSON.stringify(b[i].assignments));
      return { runs: a, actual: same ? "Assignments identical across repeated runs" : "Assignments differed", checks: [{ label: "Identical assignments", passed: same }, { label: "Identical dataset fingerprint", passed: a[0].datasetFingerprint === b[0].datasetFingerprint }] };
    },
  },
  ...PORTED_CASES,
];

export function runTestLab(caseIds?: string[]): TestCaseResult[] {
  return TEST_CASES.filter((c) => !caseIds?.length || caseIds.includes(c.id)).map((testCase) => {
    const t0 = performance.now();
    let result: ReturnType<TestCase["run"]>;
    try {
      result = testCase.run();
    } catch (error) {
      result = { actual: `Threw: ${error instanceof Error ? error.message : String(error)}`, checks: [{ label: "Completed without throwing", passed: false }] };
    }
    const durationMs = Math.round((performance.now() - t0) * 100) / 100;
    return {
      id: testCase.id, name: testCase.name, category: testCase.category, expected: testCase.expected, actual: result.actual,
      passed: result.checks.every((c) => c.passed), checks: result.checks, durationMs,
      runs: (result.runs ?? []).map((r) => ({ algorithm: r.algorithm, outcome: r.outcome, scheduled: r.assignments.length, total: r.totalExams, durationMs: r.durationMs, searchNodes: r.searchNodes })),
      diagnostics: result.diagnostics ?? (result.runs ?? []).flatMap((r) => r.diagnostics).filter((d, i, all) => all.findIndex((x) => x.message === d.message) === i),
    };
  });
}
