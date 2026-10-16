import "server-only";

import { ALGORITHMS } from "./algorithms";
import { ALGORITHM_IDS, DEFAULT_CONFIG, type AlgorithmId, type EngineConfig } from "./domain";
import { compareRunResults, mergeConfig, prepareDataset, runAlgorithm, type PreparedDataset, type RunResult } from "./engine";
import { loadRawDataset, SchedulingServiceError } from "./loader";
import { normalizeDataset } from "./normalize";
import { runStore, type RunSummary } from "./persistence";
import { runTestLab } from "./test-lab";
import { validateSchedule } from "./validator";

export { SchedulingServiceError };

export type ConfigOverrides = Partial<Omit<EngineConfig, "weights">> & { weights?: Partial<EngineConfig["weights"]> };

async function loadDataset(): Promise<PreparedDataset> {
  return prepareDataset(normalizeDataset(await loadRawDataset()));
}

function describeAlgorithms() {
  return ALGORITHM_IDS.map((id) => {
    const { name, version, family, summary, complete } = ALGORITHMS[id];
    return { id, name, version, family, summary, complete };
  });
}

function enrichAssignments(dataset: PreparedDataset, assignments: { id?: string; examId: string; slotId: string; roomId: string; assignedStudents?: number }[]) {
  const { model } = dataset;
  return assignments.map((a) => {
    const e = model.examIndex.get(a.examId), s = model.slotIndex.get(a.slotId), r = model.roomIndex.get(a.roomId);
    const exam = e !== undefined ? model.exams[e] : null, slot = s !== undefined ? model.slots[s] : null, room = r !== undefined ? model.rooms[r] : null;
    return {
      id: a.id ?? `${a.examId}@${a.slotId}`, examId: a.examId, slotId: a.slotId, roomId: a.roomId,
      examName: exam?.name ?? null, program: exam?.program ?? null, semester: exam?.semester ?? null, durationMinutes: exam?.durationMinutes ?? null,
      requiresLab: exam?.requiredRoomType === "LAB", fixedSlotId: exam?.fixedSlotId ?? null,
      students: e !== undefined ? model.graph.studentCount[e] : null, storedStudents: a.assignedStudents ?? null,
      date: slot?.date ?? null, startMinutes: slot?.startMinutes ?? null, endMinutes: slot?.endMinutes ?? null, session: slot?.session ?? null, slotLabel: slot?.label ?? null,
      roomName: room?.name ?? null, roomType: room?.roomType ?? null, roomCapacity: room?.capacity ?? null,
    };
  });
}

export const schedulingService = {
  async readiness() {
    const dataset = await loadDataset();
    const { input, model, preflight, graph, fingerprint } = dataset;
    const errors = preflight.diagnostics.filter((d) => d.severity === "error").length;
    const warnings = preflight.diagnostics.filter((d) => d.severity === "warning").length;
    return {
      fingerprint, loadedAt: new Date().toISOString(),
      status: preflight.hasDataErrors ? "BLOCKED_BY_DATA" : preflight.provenInfeasible ? "PROVEN_INFEASIBLE" : warnings ? "READY_WITH_WARNINGS" : "READY",
      counts: {
        exams: model.exams.length, labExams: model.exams.filter((e) => e.requiredRoomType === "LAB").length,
        students: new Set(input.enrollments.map((e) => e.studentId)).size, enrollments: input.enrollments.length,
        backlogEnrollments: input.enrollments.filter((e) => e.isBacklog).length,
        rooms: model.rooms.length, labRooms: model.rooms.filter((r) => r.roomType === "LAB").length, totalSeats: model.rooms.reduce((sum, r) => sum + r.capacity, 0),
        slots: model.slots.length, days: new Set(model.slots.map((s) => s.date)).size,
        fixedSlotExams: model.exams.filter((e) => e.fixedSlotId).length,
        examUnavailabilities: model.exams.reduce((sum, e) => sum + e.unavailableSlotIds.length, 0),
        roomUnavailabilities: model.rooms.reduce((sum, r) => sum + r.unavailableSlotIds.length, 0),
      },
      preflight: { errors, warnings, hasDataErrors: preflight.hasDataErrors, provenInfeasible: preflight.provenInfeasible, diagnostics: preflight.diagnostics },
      graph, algorithms: describeAlgorithms(), defaults: DEFAULT_CONFIG,
    };
  },

  async conflictGraph() {
    const { model, graph, fingerprint } = await loadDataset();
    const highly = new Set(graph.highlyConstrainedExamIds);
    return {
      fingerprint, stats: graph,
      nodes: model.exams.map((exam, i) => ({
        id: exam.id, name: exam.name, program: exam.program, semester: exam.semester, students: model.graph.studentCount[i], degree: model.graph.degree[i],
        requiresLab: exam.requiredRoomType === "LAB", fixedSlotId: exam.fixedSlotId, unavailableSlotIds: exam.unavailableSlotIds, highlyConstrained: highly.has(exam.id),
      })),
      edges: model.graph.edges.map(({ a, b, shared, backlogShared }) => ({
        source: model.exams[a].id, target: model.exams[b].id, shared, backlogShared,
        crossCohort: model.exams[a].program !== model.exams[b].program || model.exams[a].semester !== model.exams[b].semester,
      })),
    };
  },

  async execute(algorithms: AlgorithmId[], overrides: ConfigOverrides | undefined, triggeredBy: string | null) {
    const dataset = await loadDataset();
    const config = mergeConfig(overrides);
    const runs: { runId: string | null; persisted: boolean; persistenceError: string | null; result: RunResult }[] = [];
    for (const algorithm of algorithms) {
      const result = runAlgorithm(dataset, algorithm, config);
      let runId: string | null = null, persistenceError: string | null = null;
      if (result.outcome !== "INVALID_INPUT") {
        try { runId = await runStore.save(result, triggeredBy); }
        catch (error) { persistenceError = error instanceof Error ? error.message : "Persistence failed."; }
      }
      runs.push({ runId, persisted: runId !== null, persistenceError, result });
    }
    return { fingerprint: dataset.fingerprint, config, runs };
  },

  listRuns(limit?: number) {
    return runStore.list(limit);
  },

  async runDetail(runId: string) {
    const [stored, dataset] = await Promise.all([runStore.get(runId), loadDataset()]);
    if (!stored) throw new SchedulingServiceError("NOT_FOUND", "Scheduling run not found.", 404);
    // Re-validate against today's data: catches legacy runs and data edits made after the run.
    const liveValidation = validateSchedule(dataset.input, stored.assignments);
    const assigned = new Set(stored.assignments.map((a) => a.examId));
    return {
      summary: stored.summary,
      currentFingerprint: dataset.fingerprint,
      dataChangedSinceRun: stored.summary.datasetFingerprint === null ? null : stored.summary.datasetFingerprint !== dataset.fingerprint,
      liveValidation,
      assignments: enrichAssignments(dataset, stored.assignments),
      unscheduled: dataset.model.exams.filter((e) => !assigned.has(e.id)).map((e) => ({ examId: e.id, examName: e.name, program: e.program, semester: e.semester })),
      slots: dataset.model.slots,
      rooms: dataset.model.rooms,
    };
  },

  async compare(runIds: string[]) {
    const all = await runStore.list(200);
    const runs = runIds.map((id) => all.find((r) => r.runId === id)).filter((r): r is RunSummary => Boolean(r));
    const missing = runIds.filter((id) => !runs.some((r) => r.runId === id));
    const fingerprints = new Set(runs.map((r) => r.datasetFingerprint));
    const ranked = [...runs].sort((a, b) => compareRunResults(
      { outcome: a.outcome, unscheduled: a.unscheduledExams, softPenalty: a.softPenalty, durationMs: a.executionTimeMs },
      { outcome: b.outcome, unscheduled: b.unscheduledExams, softPenalty: b.softPenalty, durationMs: b.executionTimeMs },
    ));
    return {
      sameDataset: runs.length > 0 && fingerprints.size === 1 && !fingerprints.has(null),
      missing,
      ranking: "Feasible (validator-passed) runs first, then fewest unscheduled exams, then lowest soft penalty, then fastest.",
      runs: ranked.map((run, i) => ({ rank: i + 1, ...run })),
    };
  },

  testLab(caseIds?: string[]) {
    const t0 = performance.now();
    const results = runTestLab(caseIds);
    return { results, passed: results.filter((r) => r.passed).length, total: results.length, durationMs: Math.round((performance.now() - t0) * 100) / 100 };
  },

  /** Assignments of a run (default: the active published run, else the newest feasible engine run). */
  async scheduleView(runId?: string) {
    let target = runId;
    if (!target) {
      const runs = await runStore.list(200);
      target = runs.find((r) => r.published?.isActive)?.runId ?? runs.find((r) => r.source === "engine" && r.outcome === "FEASIBLE")?.runId;
      if (!target) throw new SchedulingServiceError("NOT_FOUND", "No published or feasible scheduling run exists yet.", 404);
    }
    return this.runDetail(target);
  },
};
