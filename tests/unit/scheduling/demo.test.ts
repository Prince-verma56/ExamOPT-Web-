import { describe, expect, test } from "vitest";
import { welshPowellOrder } from "@/server/scheduling/conflict-graph";
import { bottleneckScenario, DEMO_SCENARIOS, diffAssignments, repairCandidate, runArena, SCENARIO_META, simulate, type DemoSource } from "@/server/scheduling/demo";
import { ALGORITHM_IDS, type SchedulingInput } from "@/server/scheduling/domain";
import { mergeConfig, prepareDataset, runAlgorithm } from "@/server/scheduling/engine";
import { campusMini, oddCycle, pairedTwelve, tamperCampusMiniSchedule } from "@/server/scheduling/fixtures";
import { normalizeDataset } from "@/server/scheduling/normalize";
import { referenceRawDataset } from "@/server/scheduling/reference-dataset";
import { TraceRecorder } from "@/server/scheduling/trace";
import { validateSchedule } from "@/server/scheduling/validator";

const reference = () => normalizeDataset(referenceRawDataset("normal"));
const config = mergeConfig();

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

const traced = (input: SchedulingInput, id: (typeof ALGORITHM_IDS)[number], limit?: number, cfg = config) => {
  const recorder = new TraceRecorder(limit);
  const result = runAlgorithm(prepareDataset(input), id, cfg, { trace: recorder });
  return { result, trace: recorder.result() };
};

describe("conflict graph used by the Demo Studio", () => {
  test("is built from enrollments: the documented fixture pairs carry their real shared counts", () => {
    const { model } = prepareDataset(campusMini());
    const e = (id: string) => model.examIndex.get(id)!;
    expect(model.graph.shared[e("BCA-101")][e("BCA-102")]).toBe(40);
    expect(model.graph.shared[e("MCA-101")][e("MCA-102P")]).toBe(60);
    // 6 backlog students link the semester-3 cohort to BCA-101.
    expect(model.graph.shared[e("BCA-101")][e("BCA-301")]).toBe(6);
    expect(model.graph.backlogShared[e("BCA-101")][e("BCA-301")]).toBe(6);
    expect(model.graph.shared[e("BCA-101")][e("MCA-101")]).toBe(0);
  });
});

describe("execution traces", () => {
  const inputs = { campusMini, reference, oddCycle, pairedTwelve };

  test.each(Object.entries(inputs).flatMap(([name, build]) => ALGORITHM_IDS.map((id) => [name, id, build] as const)))(
    "%s / %s: tracing does not change the result",
    (_name, id, build) => {
      const plain = runAlgorithm(prepareDataset(build()), id, config);
      const { result, trace } = traced(build(), id);
      expect(result.assignments).toEqual(plain.assignments);
      expect(result.outcome).toBe(plain.outcome);
      expect(result.searchNodes).toBe(plain.searchNodes);
      expect(trace.events[0].type).toBe("run_started");
      expect(trace.events.at(-1)!.type).toBe("run_completed");
    },
  );

  test("every assignment in the result appears as a slot_assigned event, and only known ids are referenced", () => {
    const input = reference();
    for (const id of ALGORITHM_IDS) {
      const { result, trace } = traced(input, id);
      const examIds = new Set(input.exams.map((e) => e.id)), slotIds = new Set(input.slots.map((s) => s.id)), roomIds = new Set(input.rooms.map((r) => r.id));
      for (const event of trace.events) {
        if (event.examId) expect(examIds.has(event.examId)).toBe(true);
        if (event.slotId) expect(slotIds.has(event.slotId)).toBe(true);
        if (event.roomId) expect(roomIds.has(event.roomId)).toBe(true);
      }
      // Replaying slot_assigned / backtrack reproduces the final schedule.
      const state = new Map<string, string>();
      for (const event of trace.events) {
        if (event.type === "slot_assigned") state.set(event.examId!, `${event.slotId}/${event.roomId}`);
        if (event.type === "backtrack") state.delete(event.examId!);
      }
      if (result.outcome === "FEASIBLE") expect(Object.fromEntries(state)).toEqual(Object.fromEntries(result.assignments.map((a) => [a.examId, `${a.slotId}/${a.roomId}`])));
    }
  });

  test("never contains student identifiers", () => {
    const input = reference();
    const students = [...new Set(input.enrollments.map((e) => e.studentId))];
    const text = JSON.stringify(ALGORITHM_IDS.map((id) => traced(input, id).trace));
    expect(students.length).toBeGreaterThan(100);
    expect(students.some((s) => text.includes(s))).toBe(false);
  });

  test("First-Fit takes exams in identifier order and uses first-fit rooms", () => {
    const input = campusMini();
    const { trace } = traced(input, "FIRST_FIT");
    const selected = trace.events.filter((e) => e.type === "exam_selected").map((e) => e.examId);
    expect(selected).toEqual([...input.exams.map((e) => e.id)].sort());
    expect(trace.events.filter((e) => e.type === "room_selected").every((e) => e.data?.policy === "first-fit")).toBe(true);
  });

  test("First-Fit leaves an exam unscheduled on the reference data and the trace says why", () => {
    const { result, trace } = traced(reference(), "FIRST_FIT");
    expect(result.outcome).toBe("PARTIAL");
    const unscheduled = trace.events.filter((e) => e.type === "exam_unscheduled");
    expect(unscheduled.map((e) => e.examId)).toEqual(result.unscheduledExamIds);
    expect(trace.events.some((e) => e.type === "candidate_rejected" && e.reason === "STUDENT_CLASH" && (e.relatedExamIds?.length ?? 0) > 0)).toBe(true);
  });

  test("Welsh-Powell records its degree order and opens one slot per colour", () => {
    const input = reference();
    const dataset = prepareDataset(input);
    const { result, trace } = traced(input, "WELSH_POWELL");
    const ordered = trace.events.find((e) => e.type === "exam_ordered")!;
    expect(ordered.data?.order).toEqual(welshPowellOrder(dataset.model.graph, dataset.model.exams).map((e) => dataset.model.exams[e].id));
    expect(trace.events.filter((e) => e.type === "slot_opened")).toHaveLength(dataset.model.slots.length);
    expect(trace.events.filter((e) => e.type === "room_selected").every((e) => e.data?.policy === "best-fit")).toBe(true);
    expect(trace.events.at(-1)!.data?.colorsUsed).toBe(result.colorsUsed);
  });

  test("Backtracking records MRV picks, forward-check failures and backtracks when proving infeasibility", () => {
    const { result, trace } = traced(oddCycle(), "BACKTRACKING");
    expect(result.outcome).toBe("INFEASIBLE");
    const types = new Set(trace.events.map((e) => e.type));
    expect(types.has("exam_selected")).toBe(true);
    expect(types.has("forward_check_failed") || types.has("backtrack")).toBe(true);
    expect(trace.events.at(-1)!.data?.stop).toBe("exhausted");
    const considered = trace.events.filter((e) => e.type === "candidate_considered");
    expect(considered.at(-1)!.node).toBe(result.searchNodes);
  });

  test("Backtracking reports the search limit without claiming infeasibility", () => {
    const { result, trace } = traced(pairedTwelve(), "BACKTRACKING", undefined, mergeConfig({ maxNodes: 5 }));
    expect(result.outcome).toBe("SEARCH_LIMIT");
    expect(trace.events.some((e) => e.type === "search_limit_reached")).toBe(true);
    expect(trace.events.at(-1)!.data?.stop).toBe("limit");
  });

  test("is bounded and still ends with the run summary", () => {
    const { trace } = traced(reference(), "WELSH_POWELL", 20);
    expect(trace.truncated).toBe(true);
    expect(trace.events).toHaveLength(21);
    expect(trace.dropped).toBe(trace.emitted - 21);
    expect(trace.events.at(-1)!.type).toBe("run_completed");
  });
});

describe("algorithm arena", () => {
  test("runs every algorithm once, traced, on separate copies; the optional benchmark is a separate untraced run", () => {
    const input = deepFreeze(reference());
    const { entries, ranking } = runArena(input, [...ALGORITHM_IDS], config, { benchmark: true });
    expect(entries.map((e) => e.result.algorithm)).toEqual(ALGORITHM_IDS);
    expect(entries.every((e) => e.benchmark?.sameResult === true)).toBe(true);
    expect(entries.every((e) => e.trace.events.at(-1)!.data?.assigned === e.result.assignments.length)).toBe(true);
    expect(runArena(input, ["WELSH_POWELL"], config).entries[0].benchmark).toBeNull();
    for (const e of entries) expect(validateSchedule(input, e.result.assignments).placementViolationCount).toBe(0);
    const outcome = Object.fromEntries(entries.map((e) => [e.result.algorithm, e.result.outcome]));
    expect(outcome.FIRST_FIT).toBe("PARTIAL");
    expect(ranking.at(-1)).toBe("FIRST_FIT");
  });
});

describe("trace room detail", () => {
  test("room_selected lists the suitable rooms that were already taken in that slot", () => {
    const { trace } = traced(reference(), "WELSH_POWELL");
    const rooms = trace.events.filter((e) => e.type === "room_selected");
    expect(rooms.length).toBe(24);
    expect(rooms.some((e) => Array.isArray(e.data?.takenRooms) && (e.data!.takenRooms as string[]).length > 0)).toBe(true);
  });
});

describe("scenario catalogue", () => {
  test("every scenario documents condition, expected result, category, remediation and outcome after correction", () => {
    for (const id of DEMO_SCENARIOS) {
      const m = SCENARIO_META[id];
      for (const field of [m.letter, m.condition, m.expected, m.category, m.remediation, m.afterCorrection]) expect(field.length).toBeGreaterThan(0);
    }
    expect(DEMO_SCENARIOS.map((id) => SCENARIO_META[id].letter).join("")).toBe("ABCDEFG");
  });

  test("B: the backlog scenario overlaps two exams of different cohorts linked by backlog students", () => {
    for (const [source, build] of [["fixture", campusMini], ["live", reference]] as const) {
      const input = build();
      const r = simulate(input, { scenario: "BACKLOG_CONFLICT", baselineAlgorithm: "BACKTRACKING", resolution: { strategy: "repair" } }, config, source);
      const v = r.injected.validation.violations;
      expect(v.map((x) => x.code)).toEqual(["STUDENT_OVERLAP"]);
      const [a, b] = v[0].examIds.map((id) => input.exams.find((e) => e.id === id)!);
      expect(a.program !== b.program || a.semester !== b.semester).toBe(true);
      const { model } = prepareDataset(input);
      expect(model.graph.backlogShared[model.examIndex.get(a.id)!][model.examIndex.get(b.id)!]).toBeGreaterThan(0);
      expect(r.resolution!.resolved).toBe(true);
    }
  });

  test("H: preflight proves the squeezed variant infeasible without running a solver; a search limit proves nothing", () => {
    for (const build of [campusMini, reference]) {
      const input = deepFreeze(build());
      const before = JSON.stringify(input);
      const h = bottleneckScenario(input, config);
      expect(h.provenInfeasible).toBe(true);
      expect(h.preflight.some((d) => d.code === "STUDENT_CONFLICT_BOTTLENECK" && d.provesInfeasible)).toBe(true);
      expect(h.runs.every((r) => r.outcome === "INFEASIBLE" && r.evidence === "necessary-condition" && !r.solverRan)).toBe(true);
      expect(h.slots.disjointAfter).toBeLessThan(h.clique.size);
      expect(h.contrast.outcome).toBe("SEARCH_LIMIT");
      expect(h.contrast.evidence).toBeNull();
      expect(h.corrected).toMatchObject({ outcome: "FEASIBLE", valid: true });
      expect(JSON.stringify(input)).toBe(before);
    }
  });
});

describe("conflict simulator", () => {
  const sources: [DemoSource, () => SchedulingInput][] = [["fixture", campusMini], ["live", reference]];

  test.each(sources.flatMap(([source, build]) => DEMO_SCENARIOS.filter((s) => s !== "COMBINED").map((s) => [source, s, build] as const)))(
    "%s / %s injects exactly the targeted rule and the validator reports it",
    (source, scenario, build) => {
      const r = simulate(build(), { scenario, baselineAlgorithm: "BACKTRACKING" }, config, source);
      expect(r.baseline.validation?.valid).toBe(true);
      expect(r.injected.validation.valid).toBe(false);
      expect(r.injected.hitTarget).toBe(true);
      expect(r.injected.validation.violations.every((v) => r.injection.targetCodes.includes(v.code))).toBe(true);
      expect(r.injection.changes.length).toBeGreaterThan(0);
      expect(r.injected.changedFromSource.map((d) => d.examId)).toEqual([...new Set(r.injection.changes.map((c) => c.examId))].sort());
    },
  );

  test("shared-student overlap on the fixture's documented pair reports 40 students", () => {
    const r = simulate(campusMini(), { scenario: "STUDENT_OVERLAP", baselineAlgorithm: "BACKTRACKING", targets: { examId: "BCA-101", otherExamId: "BCA-102" } }, config, "fixture");
    const overlap = r.injected.explained.find((v) => v.code === "STUDENT_OVERLAP")!;
    expect(overlap.examIds).toEqual(["BCA-101", "BCA-102"]);
    expect(overlap.studentCount).toBe(40);
    expect(overlap.alternatives.length).toBeGreaterThan(0);
  });

  test("capacity overflow on the fixture is the Test Lab's 60 students in the 50-seat LAB-50", () => {
    const r = simulate(campusMini(), { scenario: "ROOM_CAPACITY_EXCEEDED", baselineAlgorithm: "BACKTRACKING" }, config, "fixture");
    const v = r.injected.explained.find((x) => x.code === "ROOM_CAPACITY_EXCEEDED")!;
    expect(v.examIds).toEqual(["MCA-102P"]);
    expect(v.roomIds).toEqual(["LAB-50"]);
    expect(v.message).toBe(`MCA-102P has 60 students but LAB-50 seats 50.`);
  });

  test("a pair with no shared students is refused as an overlap target", () => {
    expect(() => simulate(campusMini(), { scenario: "STUDENT_OVERLAP", baselineAlgorithm: "BACKTRACKING", targets: { examId: "BCA-101", otherExamId: "MCA-101" } }, config, "fixture")).toThrow(/share no enrolled students/);
  });

  test("an unknown exam id is refused", () => {
    expect(() => simulate(campusMini(), { scenario: "ROOM_TYPE_MISMATCH", baselineAlgorithm: "BACKTRACKING", targets: { examId: "NOPE-1" } }, config, "fixture")).toThrow(/not an examination/);
  });

  test("combined scenario on the fixture is the Test Lab tamper and reports several rules at once", () => {
    const input = campusMini();
    const r = simulate(input, { scenario: "COMBINED", baselineAlgorithm: "BACKTRACKING" }, config, "fixture");
    const expected = validateSchedule(input, tamperCampusMiniSchedule(runAlgorithm(prepareDataset(campusMini()), "BACKTRACKING").assignments));
    expect(r.injection.origin).toBe("test-lab-fixture");
    expect(r.injected.validation.violations).toEqual(expected.violations);
    const codes = new Set(r.injected.validation.violations.map((v) => v.code));
    for (const code of ["STUDENT_OVERLAP", "ROOM_DOUBLE_BOOKED", "ROOM_CAPACITY_EXCEEDED", "DUPLICATE_ASSIGNMENT"] as const) expect(codes.has(code)).toBe(true);
  });

  test("combined scenario on the live-shaped data chains independent injections", () => {
    const r = simulate(reference(), { scenario: "COMBINED", baselineAlgorithm: "BACKTRACKING" }, config, "live");
    expect(new Set(r.injection.changes.map((c) => c.examId)).size).toBe(r.injection.changes.length);
    expect(new Set(r.injected.validation.violations.map((v) => v.code)).size).toBeGreaterThanOrEqual(2);
  });

  test.each(["repair", "restore", "regenerate"] as const)("%s correction is revalidated and passes", (strategy) => {
    for (const [source, build] of sources) {
      for (const scenario of DEMO_SCENARIOS) {
        const r = simulate(build(), { scenario, baselineAlgorithm: "BACKTRACKING", resolution: { strategy, algorithm: "WELSH_POWELL" } }, config, source);
        expect(r.resolution!.corrected.validation.valid).toBe(true);
        expect(r.resolution!.resolved).toBe(true);
        expect(r.resolution!.changedFromInjected.length).toBeGreaterThan(0);
      }
    }
  });

  test("repair moves only the tampered exams and fixes a room problem with a room change", () => {
    const r = simulate(campusMini(), { scenario: "ROOM_CAPACITY_EXCEEDED", baselineAlgorithm: "BACKTRACKING", resolution: { strategy: "repair" } }, config, "fixture");
    expect(r.resolution!.changedFromInjected.map((d) => d.examId)).toEqual(["MCA-102P"]);
    const injectedSlot = r.injection.changes[0].to.slotId;
    expect(r.resolution!.steps[0].to?.slotId).toBe(injectedSlot);
    expect(r.resolution!.steps[0].to?.roomId).not.toBe("LAB-50");
  });

  test("a failed repair stays visible as a validation failure", () => {
    // One slot, one room: BCA-like exam B cannot be re-placed once A holds the only (slot, room).
    const dataset = prepareDataset({ ...campusMini(), slots: campusMini().slots.slice(0, 1), rooms: campusMini().rooms.slice(0, 1), exams: campusMini().exams.slice(0, 2) });
    const candidate = [{ examId: "BCA-101", slotId: "D1-M", roomId: "R-060" }, { examId: "BCA-102", slotId: "D1-M", roomId: "R-060" }];
    const repaired = repairCandidate(dataset.model, candidate, ["BCA-102"]);
    expect(repaired.steps[0].to).toBeNull();
    const report = validateSchedule(dataset.input, repaired.assignments);
    expect(report.valid).toBe(false);
    expect(report.violations.map((v) => v.code)).toEqual(["MISSING_ASSIGNMENT"]);
  });

  test("is deterministic: running (or resetting and re-running) a scenario gives identical candidates", () => {
    const strip = (r: ReturnType<typeof simulate>) => JSON.stringify({ i: r.injection, c: r.injected.assignments, v: r.injected.validation, f: r.resolution?.corrected.assignments });
    for (const [source, build] of sources) {
      const a = simulate(build(), { scenario: "STUDENT_OVERLAP", baselineAlgorithm: "BACKTRACKING", resolution: { strategy: "repair" } }, config, source);
      const b = simulate(build(), { scenario: "STUDENT_OVERLAP", baselineAlgorithm: "BACKTRACKING", resolution: { strategy: "repair" } }, config, source);
      expect(strip(a)).toBe(strip(b));
    }
  });

  test("never modifies its input (deep-frozen input, every scenario and correction)", () => {
    for (const [source, build] of sources) {
      const input = deepFreeze(build());
      const before = JSON.stringify(input);
      for (const scenario of DEMO_SCENARIOS) {
        for (const strategy of ["repair", "restore", "regenerate"] as const) {
          simulate(input, { scenario, baselineAlgorithm: "BACKTRACKING", resolution: { strategy } }, config, source);
        }
      }
      expect(JSON.stringify(input)).toBe(before);
    }
  });

  test("a baseline that is not feasible is refused rather than tampered with", () => {
    expect(() => simulate(reference(), { scenario: "STUDENT_OVERLAP", baselineAlgorithm: "FIRST_FIT" }, config, "live")).toThrow(/did not produce a validator-approved schedule/);
  });

  test("publication: the injected candidate fails the real gate; a corrected one passes it but is still never publishable", () => {
    const r = simulate(reference(), { scenario: "STUDENT_OVERLAP", baselineAlgorithm: "BACKTRACKING", resolution: { strategy: "repair" } }, config, "live");
    expect(r.injected.publication.gate.allowed).toBe(false);
    expect(r.injected.publication.gate.rejections.map((x) => x.code)).toEqual(expect.arrayContaining(["NOT_FEASIBLE", "LIVE_VALIDATION_FAILED"]));
    expect(r.resolution!.publication.gate.allowed).toBe(true);
    expect(r.resolution!.publication.publishable).toBe(false);
    expect(r.injected.publication.publishable).toBe(false);
  });

  test("diffAssignments reports moved, added and removed exams", () => {
    const before = [{ examId: "A", slotId: "S1", roomId: "R1" }, { examId: "B", slotId: "S1", roomId: "R2" }];
    const after = [{ examId: "A", slotId: "S2", roomId: "R1" }, { examId: "C", slotId: "S1", roomId: "R2" }];
    expect(diffAssignments(before, after)).toEqual([
      { examId: "A", before: ["S1 / R1"], after: ["S2 / R1"] },
      { examId: "B", before: ["S1 / R2"], after: [] },
      { examId: "C", before: [], after: ["S1 / R2"] },
    ]);
  });
});
