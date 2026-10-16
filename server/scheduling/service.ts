import "server-only";

import { auditService } from "@/server/audit";
import { ALGORITHMS } from "./algorithms";
import { validateDataQuality, validateTableInContext, type QualityTableName, type QualityTables } from "./data-quality";
import { ALGORITHM_IDS, DEFAULT_CONFIG, type AlgorithmId, type EngineConfig } from "./domain";
import { compareRunResults, mergeConfig, prepareDataset, runAlgorithm, type PreparedDataset, type RunResult } from "./engine";
import { exportCsv, type ExportKind, type ExportRow } from "./export";
import { validateInvigilation } from "./invigilation";
import { loadRawDataset, loadStudent, SchedulingServiceError, type LoadedDataset } from "./loader";
import { bottleneckScenario, cloneInput, DemoScenarioError, runArena, SCENARIO_META, simulate, type DemoSource, type SimulationRequest } from "./demo";
import { campusMini } from "./fixtures";
import { computeMetrics } from "./metrics";
import { normalizeDataset } from "./normalize";
import { runStore, type Publication, type RunSummary, type StoredAssignment } from "./persistence";
import { publishGate } from "./publication";
import { parseCsv, referenceRawDataset } from "./reference-dataset";
import { buildStudentDayAvailability } from "./student-calendar";
import { runTestLab, TEST_CASES } from "./test-lab";
import { validateSchedule } from "./validator";

export { SchedulingServiceError };

export type ConfigOverrides = Partial<Omit<EngineConfig, "weights">> & { weights?: Partial<EngineConfig["weights"]> };

async function loadAll(): Promise<{ raw: LoadedDataset; dataset: PreparedDataset }> {
  const raw = await loadRawDataset();
  return { raw, dataset: prepareDataset(normalizeDataset(raw)) };
}

async function loadDataset(): Promise<PreparedDataset> {
  return (await loadAll()).dataset;
}

function qualityTables(raw: LoadedDataset): QualityTables {
  return { rooms: raw.rooms, timeslots: raw.timeslots, faculty: raw.faculty, subjects: raw.subjects, studentGroups: raw.studentGroups, students: raw.students, enrollments: raw.enrollments };
}

function describeAlgorithms() {
  return ALGORITHM_IDS.map((id) => {
    const { name, version, family, summary, complete } = ALGORITHMS[id];
    return { id, name, version, family, summary, complete };
  });
}

function enrichAssignments(dataset: PreparedDataset, assignments: { id?: string; examId: string; slotId: string; roomId: string; assignedStudents?: number; facultyId?: string | null }[]) {
  const { model } = dataset;
  const faculty = new Map((dataset.input.invigilators ?? []).map((f) => [f.id, f]));
  return assignments.map((a) => {
    const e = model.examIndex.get(a.examId), s = model.slotIndex.get(a.slotId), r = model.roomIndex.get(a.roomId);
    const exam = e !== undefined ? model.exams[e] : null, slot = s !== undefined ? model.slots[s] : null, room = r !== undefined ? model.rooms[r] : null;
    const invigilator = a.facultyId ? faculty.get(a.facultyId) : undefined;
    return {
      id: a.id ?? `${a.examId}@${a.slotId}`, examId: a.examId, slotId: a.slotId, roomId: a.roomId,
      examName: exam?.name ?? null, program: exam?.program ?? null, semester: exam?.semester ?? null, durationMinutes: exam?.durationMinutes ?? null,
      requiresLab: exam?.requiredRoomType === "LAB", fixedSlotId: exam?.fixedSlotId ?? null,
      students: e !== undefined ? model.graph.studentCount[e] : null, storedStudents: a.assignedStudents ?? null,
      date: slot?.date ?? null, startMinutes: slot?.startMinutes ?? null, endMinutes: slot?.endMinutes ?? null, session: slot?.session ?? null, slotLabel: slot?.label ?? null,
      roomName: room?.name ?? null, roomType: room?.roomType ?? null, roomCapacity: room?.capacity ?? null,
      facultyId: a.facultyId ?? null, facultyName: invigilator?.name ?? null, facultyDepartment: invigilator?.department ?? null,
    };
  });
}

type EnrichedAssignment = ReturnType<typeof enrichAssignments>[number];

const chronological = (a: EnrichedAssignment, b: EnrichedAssignment) =>
  (a.date ?? "").localeCompare(b.date ?? "") || (a.startMinutes ?? 0) - (b.startMinutes ?? 0) || a.examId.localeCompare(b.examId);

function liveChecks(dataset: PreparedDataset, stored: StoredAssignment[]) {
  const liveValidation = validateSchedule(dataset.input, stored);
  const hasDuties = stored.some((a) => a.facultyId);
  const liveInvigilation = hasDuties && dataset.input.invigilators?.length ? validateInvigilation(dataset.input, stored) : null;
  return { liveValidation, liveInvigilation };
}

function toExportRows(assignments: EnrichedAssignment[]): ExportRow[] {
  return assignments.map((a) => ({
    examId: a.examId, examName: a.examName, program: a.program, semester: a.semester, slotId: a.slotId, date: a.date, session: a.session,
    startMinutes: a.startMinutes, endMinutes: a.endMinutes, durationMinutes: a.durationMinutes, roomId: a.roomId, roomName: a.roomName,
    roomCapacity: a.roomCapacity, students: a.students, facultyId: a.facultyId, facultyName: a.facultyName, facultyDepartment: a.facultyDepartment,
  }));
}

function datasetCounts({ input, model }: PreparedDataset) {
  return {
    exams: model.exams.length, labExams: model.exams.filter((e) => e.requiredRoomType === "LAB").length,
    students: new Set(input.enrollments.map((e) => e.studentId)).size, enrollments: input.enrollments.length,
    backlogEnrollments: input.enrollments.filter((e) => e.isBacklog).length,
    rooms: model.rooms.length, labRooms: model.rooms.filter((r) => r.roomType === "LAB").length, totalSeats: model.rooms.reduce((sum, r) => sum + r.capacity, 0),
    slots: model.slots.length, days: new Set(model.slots.map((s) => s.date)).size,
    fixedSlotExams: model.exams.filter((e) => e.fixedSlotId).length,
    examUnavailabilities: model.exams.reduce((sum, e) => sum + e.unavailableSlotIds.length, 0),
    roomUnavailabilities: model.rooms.reduce((sum, r) => sum + r.unavailableSlotIds.length, 0),
    faculty: input.invigilators?.length ?? 0,
    invigilationCapacity: (input.invigilators ?? []).reduce((sum, f) => sum + f.maxDuties, 0),
  };
}

/** Exam nodes and shared-student edges. Aggregate counts only; no student is identified. */
function graphView({ model, graph }: PreparedDataset) {
  const highly = new Set(graph.highlyConstrainedExamIds);
  return {
    stats: graph,
    nodes: model.exams.map((exam, i) => ({
      id: exam.id, name: exam.name, program: exam.program, semester: exam.semester, students: model.graph.studentCount[i], degree: model.graph.degree[i],
      requiresLab: exam.requiredRoomType === "LAB", fixedSlotId: exam.fixedSlotId, unavailableSlotIds: exam.unavailableSlotIds, highlyConstrained: highly.has(exam.id),
      permittedSlotIds: model.candidateSlots[i].map((s) => model.slots[s].id),
    })),
    edges: model.graph.edges.map(({ a, b, shared, backlogShared }) => ({
      source: model.exams[a].id, target: model.exams[b].id, shared, backlogShared,
      crossCohort: model.exams[a].program !== model.exams[b].program || model.exams[a].semester !== model.exams[b].semester,
    })),
  };
}

let referenceFingerprintCache: string | null = null;
const referenceFingerprint = () => (referenceFingerprintCache ??= prepareDataset(normalizeDataset(referenceRawDataset("normal"))).fingerprint);

/**
 * Judge Demo sandbox input. `live` reads the canonical tables through the
 * normal loader (reads only) and hands back a deep copy; `fixture` is the
 * Test Lab's in-memory `campusMini()`. Neither path can write anything.
 */
async function loadSandbox(source: DemoSource) {
  if (source === "fixture") {
    return { input: campusMini(), raw: null, label: "Test Lab fixture campusMini() (in memory)" };
  }
  const { raw, dataset } = await loadAll();
  return { input: cloneInput(dataset.input), raw, label: "Live Supabase tables, read-only snapshot" };
}

function demoError(error: unknown): never {
  if (error instanceof DemoScenarioError) throw new SchedulingServiceError(error.code, error.message, error.code === "INVALID_TARGET" ? 400 : 422);
  throw error;
}

export const schedulingService = {
  async readiness() {
    const { raw, dataset } = await loadAll();
    const { input, model, preflight, graph, fingerprint } = dataset;
    const errors = preflight.diagnostics.filter((d) => d.severity === "error").length;
    const warnings = preflight.diagnostics.filter((d) => d.severity === "warning").length;
    const quality = validateDataQuality(qualityTables(raw));
    return {
      fingerprint, loadedAt: new Date().toISOString(),
      status: preflight.hasDataErrors ? "BLOCKED_BY_DATA" : preflight.provenInfeasible ? "PROVEN_INFEASIBLE" : warnings ? "READY_WITH_WARNINGS" : "READY",
      counts: datasetCounts(dataset),
      preflight: { errors, warnings, hasDataErrors: preflight.hasDataErrors, provenInfeasible: preflight.provenInfeasible, diagnostics: preflight.diagnostics },
      dataQuality: quality,
      constraints: {
        exams: model.exams.filter((e) => e.fixedSlotId || e.unavailableSlotIds.length).map((e) => ({ id: e.id, name: e.name, requiresLab: e.requiredRoomType === "LAB", fixedSlotId: e.fixedSlotId, unavailableSlotIds: e.unavailableSlotIds })),
        rooms: model.rooms.filter((r) => r.unavailableSlotIds.length).map((r) => ({ id: r.id, name: r.name, roomType: r.roomType, unavailableSlotIds: r.unavailableSlotIds })),
        faculty: (input.invigilators ?? []).map((f) => ({ id: f.id, name: f.name, department: f.department, maxDuties: f.maxDuties, unavailableSlotIds: f.unavailableSlotIds })),
        slots: model.slots.map((s) => ({ id: s.id, date: s.date, session: s.session })),
      },
      graph, algorithms: describeAlgorithms(), defaults: DEFAULT_CONFIG,
    };
  },

  /** Reference data quality report on the live tables. */
  async dataQuality() {
    const { raw, dataset } = await loadAll();
    return { fingerprint: dataset.fingerprint, report: validateDataQuality(qualityTables(raw)) };
  },

  /** Dry run: validate one uploaded CSV table in the context of the live data. Nothing is written. */
  async validateUpload(table: QualityTableName, csv: string) {
    let rows: Record<string, string>[];
    try { rows = parseCsv(csv); }
    catch (error) { throw new SchedulingServiceError("INVALID_CSV", `The file is not valid CSV: ${error instanceof Error ? error.message : "parse error"}.`, 400); }
    if (!rows.length) throw new SchedulingServiceError("INVALID_CSV", "The file has a header but no data rows.", 400);
    if (rows.length > 5000) throw new SchedulingServiceError("INVALID_CSV", "The file has more than 5,000 rows.", 400);
    const { raw } = await loadAll();
    return { table, rowCount: rows.length, columns: Object.keys(rows[0]), report: validateTableInContext(qualityTables(raw), table, rows) };
  },

  async conflictGraph() {
    const dataset = await loadDataset();
    return { fingerprint: dataset.fingerprint, ...graphView(dataset) };
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

  /**
   * Reference `compare_all`: every algorithm on one dataset snapshot, in memory,
   * nothing saved. Reports both rankings: ExamOpt's (feasibility first, then
   * penalty) and the reference's (highest 0-100 score among feasible runs).
   */
  async benchmark(overrides?: ConfigOverrides) {
    const dataset = await loadDataset();
    const config = mergeConfig(overrides);
    const results = ALGORITHM_IDS.map((id) => runAlgorithm(dataset, id, config));
    const rows = results.map((r) => ({
      algorithm: r.algorithm, outcome: r.outcome, infeasibilityEvidence: r.infeasibilityEvidence, scheduled: r.assignments.length, total: r.totalExams,
      unscheduled: r.unscheduledExamIds.length, hardViolations: r.validation?.placementViolationCount ?? null, softPenalty: r.metrics?.softPenalty.total ?? null,
      referenceScore: r.metrics?.referenceScore ?? null, slotsUsed: r.metrics?.slotsUsed ?? null, daysUsed: r.metrics?.daysUsed ?? null,
      seatFillPct: r.metrics?.seatFillPct ?? null, capacityWasteSeats: r.metrics?.capacityWasteSeats ?? null, sameDayExtraExams: r.metrics?.sameDayExtraExams ?? null,
      backToBackPairs: r.metrics?.backToBackPairs ?? null, invigilationCoverage: r.invigilation ? `${r.invigilation.covered}/${r.invigilation.total}` : null,
      durationMs: r.durationMs, searchNodes: r.searchNodes, diagnostics: r.diagnostics,
    }));
    const ranked = [...rows].sort((a, b) => compareRunResults(a, b));
    const feasible = rows.filter((r) => r.outcome === "FEASIBLE");
    const referenceBest = feasible.length ? [...feasible].sort((a, b) => (b.referenceScore ?? 0) - (a.referenceScore ?? 0) || (b.seatFillPct ?? 0) - (a.seatFillPct ?? 0))[0].algorithm : null;
    return {
      fingerprint: dataset.fingerprint, config, persisted: false,
      summary: { totalExams: dataset.model.exams.length, totalSlots: dataset.model.slots.length, totalRooms: dataset.model.rooms.length, recommended: ranked[0]?.outcome === "FEASIBLE" ? ranked[0].algorithm : null, referenceBest },
      ranking: "Feasible (validator-passed) runs first, then fewest unscheduled exams, then lowest soft penalty, then fastest.",
      runs: ranked.map((r, i) => ({ rank: i + 1, ...r })),
    };
  },

  listRuns(limit?: number) {
    return runStore.list(limit);
  },

  async runDetail(runId: string) {
    const [stored, dataset] = await Promise.all([runStore.get(runId), loadDataset()]);
    if (!stored) throw new SchedulingServiceError("NOT_FOUND", "Scheduling run not found.", 404);
    // Re-validate against today's data: catches legacy runs and data edits made after the run.
    const { liveValidation, liveInvigilation } = liveChecks(dataset, stored.assignments);
    // Soft metrics recomputed from the saved assignments, so legacy runs get them too.
    const liveMetrics = computeMetrics(dataset.input, stored.assignments, stored.summary.config?.weights ?? DEFAULT_CONFIG.weights, liveValidation.valid);
    const assigned = new Set(stored.assignments.map((a) => a.examId));
    const gate = publishGate({
      source: stored.summary.source, outcome: stored.summary.outcome, storedValid: stored.summary.validation?.valid ?? null,
      liveValidation, invigilation: liveInvigilation ? { valid: liveInvigilation.valid, violations: liveInvigilation.violations.length } : null,
      isActivePublication: stored.summary.published?.isActive === true,
    });
    return {
      summary: stored.summary,
      currentFingerprint: dataset.fingerprint,
      dataChangedSinceRun: stored.summary.datasetFingerprint === null ? null : stored.summary.datasetFingerprint !== dataset.fingerprint,
      liveValidation,
      liveInvigilation,
      liveMetrics,
      publishable: gate,
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

  /**
   * Publishes a run as the new authoritative timetable version. The gate is
   * re-evaluated here on fresh data, whatever the client was shown.
   */
  async publish(runId: string, title: string | undefined, actor: { userId: string | null; email: string | null }) {
    const detail = await this.runDetail(runId);
    if (!detail.publishable.allowed) {
      throw new SchedulingServiceError("PUBLISH_REJECTED", detail.publishable.rejections.map((r) => r.message).join(" "), 409, { rejections: detail.publishable.rejections });
    }
    const existing = await runStore.publications();
    const nextVersion = Math.max(0, ...existing.map((p) => p.version)) + 1;
    const result = await runStore.publish(runId, title?.trim() || `Examination Timetable (Version ${nextVersion})`, actor.email ?? actor.userId ?? "ExamOpt administrator");
    await auditService.audit({ actorId: actor.userId ?? "unknown", action: "schedule.publish", resource: "scheduling_run", resourceId: runId, metadata: { version: result.publication.version, retired: result.retiredVersions } });
    return result;
  },

  publications(): Promise<Publication[]> {
    return runStore.publications();
  },

  /** The active published timetable, without drafts or diagnostics. Null when nothing is published. */
  async publishedSchedule() {
    const publication = await runStore.activePublication();
    if (!publication) return { status: "NO_PUBLISHED_SCHEDULE" as const, publication: null, valid: null, assignments: [], slots: [] };
    const [stored, dataset] = await Promise.all([runStore.get(publication.runId), loadDataset()]);
    if (!stored) throw new SchedulingServiceError("NOT_FOUND", "The published run no longer exists.", 404);
    const { liveValidation } = liveChecks(dataset, stored.assignments);
    return {
      status: "PUBLISHED" as const, publication,
      /** Whether the published assignments still pass every hard constraint against current data. */
      valid: liveValidation.valid,
      assignments: enrichAssignments(dataset, stored.assignments).sort(chronological),
      slots: dataset.model.slots,
    };
  },

  /** A student's exams from the active published timetable (reference `get_student_timetable`). Access is decided by the caller. */
  async studentTimetable(rollNo: string) {
    const student = await loadStudent(rollNo);
    if (!student) throw new SchedulingServiceError("NOT_FOUND", `No student with roll number ${rollNo}.`, 404);
    const published = await this.publishedSchedule();
    const enrolled = new Set(student.subjectIds);
    const exams = published.assignments.filter((a) => enrolled.has(a.examId));
    const scheduled = new Set(exams.map((a) => a.examId));
    const dailyAvailability = buildStudentDayAvailability(published.slots, exams);
    // Defensive re-check of this student's own clashes (the validator already covers everyone).
    const clashes = exams.flatMap((a, i) => exams.slice(i + 1).filter((b) => a.slotId === b.slotId || (a.date === b.date && (a.startMinutes ?? 0) < (b.endMinutes ?? 0) && (b.startMinutes ?? 0) < (a.endMinutes ?? 0))).map((b) => [a.examId, b.examId]));
    return {
      student, publication: published.publication, status: published.status, valid: published.valid,
      exams: exams.map(({ storedStudents, ...rest }) => rest),
      enrolledCount: enrolled.size, scheduledCount: exams.length,
      dailyAvailability,
      notInPublishedSchedule: [...enrolled].filter((id) => !scheduled.has(id)).sort(),
      clashes,
    };
  },

  /** A faculty member's invigilation duties from the active published timetable (reference `get_faculty_timetable`). */
  async facultyTimetable(facultyId: string) {
    const [published, dataset] = await Promise.all([this.publishedSchedule(), loadDataset()]);
    const faculty = dataset.input.invigilators?.find((f) => f.id === facultyId);
    if (!faculty) throw new SchedulingServiceError("NOT_FOUND", `No faculty member with id ${facultyId}.`, 404);
    const duties = published.assignments.filter((a) => a.facultyId === facultyId);
    return { faculty, publication: published.publication, status: published.status, duties, dutyCount: duties.length, maxDuties: faculty.maxDuties };
  },

  /** Faculty roster with duty load in the active published timetable. */
  async facultyRoster() {
    const [published, dataset] = await Promise.all([this.publishedSchedule(), loadDataset()]);
    const load = new Map<string, number>();
    for (const a of published.assignments) if (a.facultyId) load.set(a.facultyId, (load.get(a.facultyId) ?? 0) + 1);
    return {
      publication: published.publication,
      uncovered: published.assignments.filter((a) => !a.facultyId).map((a) => a.examId),
      faculty: (dataset.input.invigilators ?? []).map((f) => ({ ...f, publishedDuties: load.get(f.id) ?? 0 })),
      slots: dataset.model.slots.map((s) => ({ id: s.id, date: s.date, session: s.session })),
    };
  },

  /** CSV export of a saved run (admin) or of the active published timetable. */
  async exportCsv(kind: ExportKind, runId?: string) {
    let assignments: EnrichedAssignment[], label: string;
    if (runId) {
      const detail = await this.runDetail(runId);
      assignments = detail.assignments; label = runId;
    } else {
      const published = await this.publishedSchedule();
      if (!published.publication) throw new SchedulingServiceError("NOT_FOUND", "No timetable has been published yet.", 404);
      assignments = published.assignments; label = `Published-v${published.publication.version}`;
    }
    if (!assignments.length) throw new SchedulingServiceError("NOT_FOUND", "This schedule has no assignments to export.", 404);
    return { kind, runId: runId ?? null, filename: `ExamOpt_${kind}_${label}.csv`, rows: assignments.length, csv: exportCsv(kind, toExportRows(assignments)) };
  },

  testCases() {
    return TEST_CASES.map(({ id, name, category, expected }) => ({ id, name, category, expected }));
  },

  testLab(caseIds?: string[]) {
    const t0 = performance.now();
    const results = runTestLab(caseIds);
    return { results, passed: results.filter((r) => r.passed).length, total: results.length, durationMs: Math.round((performance.now() - t0) * 100) / 100 };
  },

  /**
   * Judge Demo: the sandbox dataset with readiness, preflight (kept apart from
   * schedule validation) and the conflict graph. Reads only.
   */
  async demoDataset(source: DemoSource) {
    const { input, raw, label } = await loadSandbox(source);
    const dataset = prepareDataset(input);
    const { preflight, model } = dataset;
    const quality = raw ? validateDataQuality(qualityTables(raw)) : null;
    const errors = preflight.diagnostics.filter((d) => d.severity === "error").length;
    const warnings = preflight.diagnostics.filter((d) => d.severity === "warning").length;
    const ready = !preflight.hasDataErrors && !preflight.provenInfeasible && (quality?.isValid ?? true);
    return {
      source, label, synthetic: true, persisted: false as const, fingerprint: dataset.fingerprint, loadedAt: new Date().toISOString(),
      /** Whether the snapshot is exactly the bundled reference GLA dataset (by canonical fingerprint). */
      matchesReferenceDataset: source === "live" ? dataset.fingerprint === referenceFingerprint() : null,
      status: preflight.hasDataErrors ? "BLOCKED_BY_DATA" : preflight.provenInfeasible ? "PROVEN_INFEASIBLE" : !ready ? "NEEDS_ATTENTION" : warnings ? "READY_WITH_WARNINGS" : "READY",
      ready,
      counts: datasetCounts(dataset),
      preflight: { errors, warnings, hasDataErrors: preflight.hasDataErrors, provenInfeasible: preflight.provenInfeasible, diagnostics: preflight.diagnostics },
      dataQuality: quality ? { isValid: quality.isValid, status: quality.status, readinessScore: quality.readinessScore, errors: quality.errors.slice(0, 20), warnings: quality.warnings.slice(0, 20) } : null,
      graph: graphView(dataset),
      slots: model.slots,
      rooms: model.rooms,
      algorithms: describeAlgorithms(),
      scenarios: SCENARIO_META,
      defaults: { maxNodes: DEFAULT_CONFIG.maxNodes, timeLimitMs: DEFAULT_CONFIG.timeLimitMs },
    };
  },

  /** Judge Demo: every chosen algorithm on its own copy of the same snapshot, with execution traces. Nothing is saved. */
  async demoArena(source: DemoSource, algorithms: AlgorithmId[], overrides?: ConfigOverrides, benchmark = true) {
    const { input } = await loadSandbox(source);
    const config = mergeConfig(overrides);
    const { entries, ranking } = runArena(input, algorithms, config, { benchmark });
    return {
      source, persisted: false as const, fingerprint: prepareDataset(input).fingerprint, config, ranking,
      rankingRule: "Validator-passed (FEASIBLE) runs first, then fewest unscheduled exams, then lowest soft penalty, then fastest.",
      entries,
    };
  },

  /** Judge Demo scenario H: a preflight-proven bottleneck on an in-memory variant, contrasted with a search limit. */
  async demoBottleneck(source: DemoSource) {
    const { input } = await loadSandbox(source);
    try {
      return { source, persisted: false as const, mode: "SANDBOX SIMULATION — NOT SAVED TO LIVE DATA", ...bottleneckScenario(input, mergeConfig()) };
    } catch (error) {
      demoError(error);
    }
  },

  /** Judge Demo: baseline, injected conflict, validation, optional correction and revalidation, all in memory. */
  async demoSimulate(source: DemoSource, request: SimulationRequest, overrides?: ConfigOverrides) {
    const { input } = await loadSandbox(source);
    try {
      return { source, persisted: false as const, mode: "SANDBOX SIMULATION — NOT SAVED TO LIVE DATA", ...simulate(input, request, mergeConfig(overrides), source) };
    } catch (error) {
      demoError(error);
    }
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
