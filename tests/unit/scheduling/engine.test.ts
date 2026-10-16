import { describe, expect, test } from "vitest";
import { ALGORITHMS } from "@/server/scheduling/algorithms";
import { buildConflictGraph, graphStats } from "@/server/scheduling/conflict-graph";
import { ALGORITHM_IDS, type SchedulingInput } from "@/server/scheduling/domain";
import { classifyOutcome, compareRunResults, fingerprintInput, mergeConfig, prepareDataset, runAlgorithm } from "@/server/scheduling/engine";
import { campusMini, cohort, exam, oddCycle, pairedTwelve, room, slot } from "@/server/scheduling/fixtures";
import { computeMetrics } from "@/server/scheduling/metrics";
import { normalizeDataset, parseClock, parseSlotList, parseTimeRange } from "@/server/scheduling/normalize";
import { validateSchedule } from "@/server/scheduling/validator";

describe("normalisation", () => {
  test("parses 12- and 24-hour clocks and time ranges", () => {
    expect(parseClock("09:30 AM")).toBe(570);
    expect(parseClock("12:30 PM")).toBe(750);
    expect(parseClock("12:00 AM")).toBe(0);
    expect(parseClock("14:00")).toBe(840);
    expect(parseClock("25:00")).toBeNaN();
    expect(parseTimeRange("02:00 PM - 05:00 PM")).toEqual({ start: 840, end: 1020 });
  });

  test("splits delimited slot lists and drops blanks and repeats", () => {
    expect(parseSlotList("D1-M|D4-E")).toEqual(["D1-M", "D4-E"]);
    expect(parseSlotList("D1-M, D3-E;D1-M")).toEqual(["D1-M", "D3-E"]);
    expect(parseSlotList("")).toEqual([]);
    expect(parseSlotList(null)).toEqual([]);
  });

  test("maps raw C10 rows and derives backlog enrollments", () => {
    const input = normalizeDataset({
      rooms: [{ room_id: "L1", name: "Lab", capacity: 90, room_type: "LAB", unavailable_slots: "D1-M" }],
      timeslots: [{ slot_id: "D1-M", exam_date: "2026-10-19", session: "MORNING", time_range: "09:30 AM - 12:30 PM", day_number: 1 }],
      subjects: [
        { subject_id: "BCA-104P", name: "Lab", program: "BCA", semester: 1, duration_hours: 2, requires_lab: true, fixed_slot: null, unavailable_slots: "D1-M", enrolled_students: 1 },
        { subject_id: "MCA-101", name: "DSA", program: "MCA", semester: 1, duration_hours: 3, requires_lab: false, fixed_slot: "D1-M", unavailable_slots: "", enrolled_students: 1 },
      ],
      studentGroups: [{ group_id: "MCA-BRIDGE", program: "MCA", semester: 1 }],
      students: [{ roll_no: "S1", group_id: "MCA-BRIDGE" }],
      enrollments: [{ roll_no: "S1", subject_id: "BCA-104P" }, { roll_no: "S1", subject_id: "MCA-101" }],
    });
    expect(input.exams[0]).toMatchObject({ id: "BCA-104P", durationMinutes: 120, requiredRoomType: "LAB", unavailableSlotIds: ["D1-M"] });
    expect(input.exams[1]).toMatchObject({ fixedSlotId: "D1-M", requiredRoomType: "THEORY" });
    expect(input.rooms[0]).toMatchObject({ roomType: "LAB", unavailableSlotIds: ["D1-M"] });
    expect(input.slots[0]).toMatchObject({ startMinutes: 570, endMinutes: 750, date: "2026-10-19" });
    expect(input.enrollments.map((e) => e.isBacklog)).toEqual([true, false]);
  });
});

describe("conflict graph", () => {
  test("counts shared students per exam pair from actual enrollments", () => {
    const exams = [exam("A"), exam("B"), exam("C")];
    const graph = buildConflictGraph(exams, [...cohort("X", 3, ["A", "B"]), ...cohort("Y", 2, ["B", "C"]), ...cohort("Z", 4, ["C"])]);
    expect(graph.edges).toEqual([{ a: 0, b: 1, shared: 3, backlogShared: 0 }, { a: 1, b: 2, shared: 2, backlogShared: 0 }]);
    expect(graph.studentCount).toEqual([3, 5, 6]);
    expect(graph.degree).toEqual([1, 2, 1]);
  });

  test("ignores duplicate enrollment rows and unknown exams", () => {
    const graph = buildConflictGraph([exam("A"), exam("B")], [...cohort("X", 2, ["A", "B"]), ...cohort("X", 2, ["A", "B"]), ...cohort("Q", 1, ["GHOST"])]);
    expect(graph.edges[0].shared).toBe(2);
    expect(graph.studentCount).toEqual([2, 2]);
  });

  test("reports clique lower bound and Welsh-Powell upper bound", () => {
    const input = oddCycle();
    const stats = graphStats(buildConflictGraph(input.exams, input.enrollments), input.exams);
    expect(stats.edgeCount).toBe(5);
    expect(stats.cliqueLowerBound).toBe(2);
    expect(stats.welshPowellColors).toBe(3);
    expect(stats.isolatedExamIds).toEqual([]);
  });
});

describe("algorithms", () => {
  test.each(ALGORITHM_IDS)("%s schedules the reference fixture feasibly and validly", (id) => {
    const input = campusMini();
    const result = runAlgorithm(prepareDataset(input), id);
    expect(result.outcome).toBe("FEASIBLE");
    expect(result.assignments).toHaveLength(input.exams.length);
    // Never trust the engine's own verdict: validate again here.
    expect(validateSchedule(input, result.assignments).valid).toBe(true);
    const placed = new Map(result.assignments.map((a) => [a.examId, a]));
    expect(placed.get("BCA-302")!.slotId).toBe("D2-E"); // fixed slot
    expect(placed.get("BCA-102")!.slotId).not.toBe("D2-M"); // unavailable slot
    expect(placed.get("BCA-103P")!.roomId.startsWith("LAB")).toBe(true); // laboratory
  });

  test.each(ALGORITHM_IDS)("%s is deterministic", (id) => {
    const a = runAlgorithm(prepareDataset(campusMini()), id);
    const b = runAlgorithm(prepareDataset(campusMini()), id);
    expect(a.assignments).toEqual(b.assignments);
  });

  test("Welsh-Powell and backtracking allocate the smallest room that fits (best fit)", () => {
    const input: SchedulingInput = { slots: [slot("S1", "2026-11-02")], rooms: [room("BIG", 200), room("FIT", 45), room("MID", 60)], exams: [exam("E1")], enrollments: cohort("A", 40, ["E1"]) };
    for (const id of ["WELSH_POWELL", "BACKTRACKING"] as const) expect(runAlgorithm(prepareDataset(input), id).assignments[0].roomId).toBe("FIT");
    // The baseline takes the first suitable room in id order.
    expect(runAlgorithm(prepareDataset(input), "FIRST_FIT").assignments[0].roomId).toBe("BIG");
  });

  test("never double-books a room within a slot", () => {
    const input: SchedulingInput = { slots: [slot("S1", "2026-11-02"), slot("S2", "2026-11-03")], rooms: [room("R1", 80)], exams: [exam("E1"), exam("E2")], enrollments: [...cohort("A", 10, ["E1"]), ...cohort("B", 10, ["E2"])] };
    for (const id of ALGORITHM_IDS) {
      const result = runAlgorithm(prepareDataset(input), id);
      expect(new Set(result.assignments.map((a) => a.slotId)).size).toBe(2);
    }
  });

  test("respects overlapping (not only identical) slots for students and rooms", () => {
    const input: SchedulingInput = {
      slots: [slot("A", "2026-11-02", "09:00", "12:00"), slot("B", "2026-11-02", "11:00", "14:00"), slot("C", "2026-11-02", "14:00", "17:00")],
      rooms: [room("R1", 80)], exams: [exam("E1"), exam("E2")], enrollments: cohort("S", 5, ["E1", "E2"]),
    };
    for (const id of ALGORITHM_IDS) {
      const result = runAlgorithm(prepareDataset(input), id);
      expect(result.outcome).toBe("FEASIBLE");
      const slots = result.assignments.map((a) => a.slotId).sort();
      expect(slots).not.toEqual(["A", "B"]);
    }
  });

  test("backtracking proves an odd cycle infeasible; heuristics only report PARTIAL", () => {
    const dataset = prepareDataset(oddCycle());
    expect(dataset.preflight.provenInfeasible).toBe(false);
    const bt = runAlgorithm(dataset, "BACKTRACKING");
    expect(bt).toMatchObject({ outcome: "INFEASIBLE", infeasibilityEvidence: "exhaustive-search" });
    expect(bt.diagnostics.some((d) => d.code === "SEARCH_EXHAUSTED")).toBe(true);
    for (const id of ["FIRST_FIT", "WELSH_POWELL"] as const) {
      const r = runAlgorithm(dataset, id);
      expect(r.outcome).toBe("PARTIAL");
      expect(r.infeasibilityEvidence).toBeNull();
      expect(r.diagnostics.every((d) => d.code === "UNSCHEDULED_EXAM" && !d.provesInfeasible)).toBe(true);
    }
  });

  test("a node budget produces SEARCH_LIMIT, never INFEASIBLE", () => {
    const result = runAlgorithm(prepareDataset(pairedTwelve()), "BACKTRACKING", mergeConfig({ maxNodes: 5 }));
    expect(result.outcome).toBe("SEARCH_LIMIT");
    expect(result.searchNodes).toBeLessThanOrEqual(6);
    expect(result.infeasibilityEvidence).toBeNull();
  });

  test("every registered algorithm shares the same contract", () => {
    for (const id of ALGORITHM_IDS) {
      const algorithm = ALGORITHMS[id];
      expect(algorithm.id).toBe(id);
      expect(typeof algorithm.solve).toBe("function");
    }
    expect(ALGORITHMS.BACKTRACKING.complete).toBe(true);
    expect(ALGORITHMS.FIRST_FIT.complete || ALGORITHMS.WELSH_POWELL.complete).toBe(false);
  });
});

describe("preflight", () => {
  test("blocks the solver on data errors and separates them from constraint conflicts", () => {
    const input: SchedulingInput = { slots: [slot("S1", "2026-11-02")], rooms: [room("R1", 0)], exams: [exam("E1", { durationMinutes: 0, fixedSlotId: "NOPE" })], enrollments: cohort("A", 2, ["E1"]) };
    const dataset = prepareDataset(input);
    expect(dataset.preflight.hasDataErrors).toBe(true);
    expect(dataset.preflight.diagnostics.every((d) => d.kind === "data")).toBe(true);
    expect(runAlgorithm(dataset, "BACKTRACKING")).toMatchObject({ outcome: "INVALID_INPUT", solverRan: false });
  });

  test("warns when declared enrollment disagrees with actual enrollments", () => {
    const input: SchedulingInput = { slots: [slot("S1", "2026-11-02")], rooms: [room("R1", 80)], exams: [exam("E1", { declaredStudents: 50 })], enrollments: cohort("A", 40, ["E1"]) };
    const d = prepareDataset(input).preflight.diagnostics;
    expect(d).toEqual([expect.objectContaining({ code: "ENROLLMENT_MISMATCH", severity: "warning" })]);
  });
});

describe("independent validator", () => {
  const input: SchedulingInput = {
    slots: [slot("S1", "2026-11-02"), slot("S2", "2026-11-03", "09:30", "11:00")],
    rooms: [room("R1", 30), room("LAB", 80, "LAB", ["S2"])],
    exams: [exam("A", { fixedSlotId: "S1" }), exam("B", { requiredRoomType: "LAB", unavailableSlotIds: ["S1"] })],
    enrollments: [...cohort("X", 40, ["A", "B"])],
  };

  test("flags each rule with record ids and counts students without naming them", () => {
    const report = validateSchedule(input, [
      { examId: "A", slotId: "S2", roomId: "R1" },        // fixed slot, capacity, duration
      { examId: "B", slotId: "S1", roomId: "R1" },        // lab, unavailable
      { examId: "B", slotId: "S2", roomId: "LAB" },       // duplicate, room unavailable, overlap with A in S2
      { examId: "GHOST", slotId: "S1", roomId: "R1" },    // unknown reference
    ]);
    const codes = new Set(report.violations.map((v) => v.code));
    for (const code of ["FIXED_SLOT_VIOLATED", "ROOM_CAPACITY_EXCEEDED", "DURATION_EXCEEDS_SLOT", "ROOM_TYPE_MISMATCH", "EXAM_SLOT_UNAVAILABLE", "DUPLICATE_ASSIGNMENT", "ROOM_SLOT_UNAVAILABLE", "STUDENT_OVERLAP", "UNKNOWN_REFERENCE"] as const) {
      expect(codes, code).toContain(code);
    }
    const overlap = report.violations.find((v) => v.code === "STUDENT_OVERLAP")!;
    expect(overlap.studentCount).toBe(40);
    expect(overlap.message).not.toMatch(/X-0/);
    expect(report.valid).toBe(false);
  });

  test("detects room double-booking and missing assignments", () => {
    const simple: SchedulingInput = { slots: [slot("S1", "2026-11-02")], rooms: [room("R1", 80)], exams: [exam("A"), exam("B"), exam("C")], enrollments: [...cohort("P", 5, ["A"]), ...cohort("Q", 5, ["B"])] };
    const report = validateSchedule(simple, [{ examId: "A", slotId: "S1", roomId: "R1" }, { examId: "B", slotId: "S1", roomId: "R1" }]);
    expect(report.violations.map((v) => v.code).sort()).toEqual(["MISSING_ASSIGNMENT", "ROOM_DOUBLE_BOOKED"]);
    expect(report.placementViolationCount).toBe(1);
    expect(report.checks.find((c) => c.rule === 1)!.passed).toBe(false);
  });

  test("an invalid schedule can never be classified FEASIBLE", () => {
    const simple: SchedulingInput = { slots: [slot("S1", "2026-11-02")], rooms: [room("R1", 80)], exams: [exam("A"), exam("B")], enrollments: cohort("P", 5, ["A", "B"]) };
    const bad = validateSchedule(simple, [{ examId: "A", slotId: "S1", roomId: "R1" }, { examId: "B", slotId: "S1", roomId: "R1" }]);
    // Even if a solver claims a complete schedule, the validator's verdict wins.
    expect(classifyOutcome(bad, { unscheduledExamIds: [], stop: "complete" }).outcome).toBe("INVALID");
  });
});

describe("metrics and ranking", () => {
  test("computes documented soft metrics", () => {
    const input: SchedulingInput = {
      slots: [slot("D1-M", "2026-11-02"), slot("D1-E", "2026-11-02", "14:00", "17:00"), slot("D2-M", "2026-11-03")],
      rooms: [room("R1", 50), room("R2", 50)], exams: [exam("A"), exam("B"), exam("C")], enrollments: cohort("S", 10, ["A", "B", "C"]),
    };
    const m = computeMetrics(input, [{ examId: "A", slotId: "D1-M", roomId: "R1" }, { examId: "B", slotId: "D1-E", roomId: "R2" }, { examId: "C", slotId: "D2-M", roomId: "R1" }], { sameDay: 3, backToBack: 1, capacityWaste: 1, daysUsed: 0.5 });
    expect(m).toMatchObject({ slotsUsed: 3, daysUsed: 2, sameDayExtraExams: 10, studentsWithSameDayExams: 10, backToBackPairs: 20, capacityWasteSeats: 120, seatFillPct: 20, compactnessPct: 100 });
    expect(m.gapHistogram).toEqual({ adjacent: 20, gap2: 0, gap3: 0, gap4Plus: 0 });
    expect(m.softPenalty.total).toBe(10 * 3 + 20 * 1 + 1.2 * 1 + 2 * 0.5);
  });

  test("ranks feasibility before soft penalty", () => {
    const rows = [
      { outcome: "PARTIAL" as const, unscheduled: 1, softPenalty: 10, durationMs: 1 },
      { outcome: "FEASIBLE" as const, unscheduled: 0, softPenalty: 900, durationMs: 9 },
      { outcome: "INVALID" as const, unscheduled: 0, softPenalty: 1, durationMs: 1 },
    ];
    expect([...rows].sort(compareRunResults).map((r) => r.outcome)).toEqual(["FEASIBLE", "PARTIAL", "INVALID"]);
  });

  test("fingerprint is order-independent and changes with the data", () => {
    const a = campusMini();
    const b = { ...a, exams: [...a.exams].reverse(), enrollments: [...a.enrollments].reverse() };
    expect(fingerprintInput(a)).toBe(fingerprintInput(b));
    expect(fingerprintInput({ ...a, rooms: a.rooms.map((r) => ({ ...r, capacity: r.capacity + 1 })) })).not.toBe(fingerprintInput(a));
  });
});
