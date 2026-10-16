import { ALGORITHMS, type SolverResult } from "./algorithms";
import { graphStats, type GraphStats } from "./conflict-graph";
import {
  DEFAULT_CONFIG, ENGINE_VERSION,
  type AlgorithmId, type Assignment, type Diagnostic, type EngineConfig, type InfeasibilityEvidence, type RunOutcome, type SchedulingInput,
} from "./domain";
import { allocateInvigilators, validateInvigilation, type InvigilationReport } from "./invigilation";
import { computeMetrics, type ScheduleMetrics } from "./metrics";
import { buildModel, type SchedulingModel } from "./model";
import { runPreflight, type PreflightResult } from "./preflight";
import type { TraceRecorder } from "./trace";
import { validateSchedule, type ValidationReport } from "./validator";

export interface PreparedDataset {
  input: SchedulingInput;
  model: SchedulingModel;
  preflight: PreflightResult;
  graph: GraphStats;
  fingerprint: string;
}

export interface AssignmentDetail extends Assignment {
  students: number;
  roomCapacity: number;
  /** Allocated invigilator, or null when none was eligible or no faculty data was supplied. */
  facultyId: string | null;
}

export interface RunResult {
  algorithm: AlgorithmId;
  algorithmName: string;
  algorithmVersion: string;
  engineVersion: string;
  outcome: RunOutcome;
  infeasibilityEvidence: InfeasibilityEvidence | null;
  solverRan: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  searchNodes: number | null;
  colorsUsed: number | null;
  config: EngineConfig;
  datasetFingerprint: string;
  totalExams: number;
  assignments: AssignmentDetail[];
  unscheduledExamIds: string[];
  validation: ValidationReport | null;
  metrics: ScheduleMetrics | null;
  /** Null when the input has no faculty roster or the solver did not run. */
  invigilation: InvigilationReport | null;
  diagnostics: Diagnostic[];
}

/** FNV-1a over a canonical serialisation: identical inputs give identical fingerprints. */
export function fingerprintInput(input: SchedulingInput) {
  const canonical = JSON.stringify({
    exams: [...input.exams].sort((a, b) => a.id.localeCompare(b.id)).map((e) => [e.id, e.durationMinutes, e.requiredRoomType, e.fixedSlotId, [...e.unavailableSlotIds].sort()]),
    rooms: [...input.rooms].sort((a, b) => a.id.localeCompare(b.id)).map((r) => [r.id, r.capacity, r.roomType, [...r.unavailableSlotIds].sort()]),
    slots: [...input.slots].sort((a, b) => a.id.localeCompare(b.id)).map((s) => [s.id, s.date, s.startMinutes, s.endMinutes]),
    enrollments: input.enrollments.map((e) => `${e.studentId}|${e.examId}`).sort(),
    // Faculty only joined the input in engine 2.1; omitted when absent so exam-only datasets keep their fingerprint.
    ...(input.invigilators?.length ? { invigilators: [...input.invigilators].sort((a, b) => a.id.localeCompare(b.id)).map((f) => [f.id, f.department, f.maxDuties, [...f.unavailableSlotIds].sort()]) } : {}),
  });
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function prepareDataset(input: SchedulingInput): PreparedDataset {
  const model = buildModel(input);
  return { input, model, preflight: runPreflight(input, model), graph: graphStats(model.graph, model.exams), fingerprint: fingerprintInput(input) };
}

export function mergeConfig(partial?: Partial<Omit<EngineConfig, "weights">> & { weights?: Partial<EngineConfig["weights"]> }): EngineConfig {
  return { ...DEFAULT_CONFIG, ...partial, weights: { ...DEFAULT_CONFIG.weights, ...partial?.weights } };
}

/**
 * FEASIBLE requires the independent validator to pass. Any placement
 * violation makes a run INVALID, whatever the solver reported.
 */
export function classifyOutcome(validation: ValidationReport, solved: Pick<SolverResult, "unscheduledExamIds" | "stop">): { outcome: RunOutcome; evidence: InfeasibilityEvidence | null } {
  if (validation.placementViolationCount > 0) return { outcome: "INVALID", evidence: null };
  if (solved.unscheduledExamIds.length === 0 && validation.valid) return { outcome: "FEASIBLE", evidence: null };
  if (solved.stop === "exhausted") return { outcome: "INFEASIBLE", evidence: "exhaustive-search" };
  if (solved.stop === "limit") return { outcome: "SEARCH_LIMIT", evidence: null };
  return { outcome: "PARTIAL", evidence: null };
}

/** `options.trace` records the solver's decisions (Demo Studio). Omitted everywhere else, so normal runs are unchanged. */
export function runAlgorithm(dataset: PreparedDataset, algorithmId: AlgorithmId, config: EngineConfig = DEFAULT_CONFIG, options: { trace?: TraceRecorder } = {}): RunResult {
  const algorithm = ALGORITHMS[algorithmId];
  const started = new Date();
  const t0 = performance.now();
  const base = {
    algorithm: algorithmId, algorithmName: algorithm.name, algorithmVersion: algorithm.version, engineVersion: ENGINE_VERSION,
    config, datasetFingerprint: dataset.fingerprint, totalExams: dataset.model.exams.length, startedAt: started.toISOString(),
  };
  const finish = () => {
    const durationMs = Math.round((performance.now() - t0) * 1000) / 1000;
    return { completedAt: new Date(started.getTime() + durationMs).toISOString(), durationMs };
  };
  const preflightDiagnostics = dataset.preflight.diagnostics;

  if (dataset.preflight.hasDataErrors || dataset.preflight.provenInfeasible) {
    return {
      ...base, ...finish(),
      outcome: dataset.preflight.hasDataErrors ? "INVALID_INPUT" : "INFEASIBLE",
      infeasibilityEvidence: dataset.preflight.hasDataErrors ? null : "necessary-condition",
      solverRan: false, searchNodes: null, colorsUsed: null, assignments: [],
      unscheduledExamIds: dataset.model.exams.map((exam) => exam.id),
      validation: null, metrics: null, invigilation: null, diagnostics: preflightDiagnostics,
    };
  }

  const solved = algorithm.solve(dataset.model, config, options.trace);
  const timing = finish();
  const validation = validateSchedule(dataset.input, solved.assignments);
  const { outcome, evidence } = classifyOutcome(validation, solved);
  const metrics = computeMetrics(dataset.input, solved.assignments, config.weights, outcome === "FEASIBLE");

  // Invigilators are allocated on the final schedule and checked independently; they never change the outcome.
  const duties = dataset.input.invigilators?.length ? allocateInvigilators(dataset.input, solved.assignments) : null;
  const invigilation = duties ? validateInvigilation(dataset.input, duties) : null;
  const facultyOf = new Map((duties ?? []).map((d) => [d.examId, d.facultyId]));

  const diagnostics = [...preflightDiagnostics.filter((d) => d.severity !== "info"), ...solved.diagnostics];
  if (outcome === "INVALID") {
    diagnostics.push({ code: "VALIDATION_FAILED", severity: "error", kind: "search", message: `The independent validator rejected this schedule with ${validation.placementViolationCount} hard-constraint violation${validation.placementViolationCount > 1 ? "s" : ""}. It must not be published.`, remediation: "Inspect the violations; this indicates a solver defect." });
  }
  if (invigilation?.uncoveredExamIds.length) {
    diagnostics.push({
      code: "INVIGILATOR_SHORTAGE", severity: "warning", kind: "constraint", constraint: "Invigilator availability",
      message: `${invigilation.uncoveredExamIds.length} examination${invigilation.uncoveredExamIds.length > 1 ? "s have" : " has"} no eligible invigilator: every faculty member is busy, unavailable or at their duty cap in that slot.`,
      examIds: invigilation.uncoveredExamIds, remediation: "Raise duty caps, clear faculty unavailability, or add faculty. The exam schedule itself is unaffected.",
    });
  }

  const studentCount = dataset.model.graph.studentCount;
  return {
    ...base, ...timing, outcome, infeasibilityEvidence: evidence, solverRan: true,
    searchNodes: solved.searchNodes, colorsUsed: solved.colorsUsed ?? null,
    assignments: solved.assignments.map((a) => ({
      ...a,
      students: studentCount[dataset.model.examIndex.get(a.examId)!],
      roomCapacity: dataset.model.rooms[dataset.model.roomIndex.get(a.roomId)!].capacity,
      facultyId: facultyOf.get(a.examId) ?? null,
    })),
    unscheduledExamIds: solved.unscheduledExamIds, validation, metrics, invigilation, diagnostics,
  };
}

const OUTCOME_RANK: Record<RunOutcome, number> = { FEASIBLE: 0, PARTIAL: 1, SEARCH_LIMIT: 1, INFEASIBLE: 2, INVALID: 3, INVALID_INPUT: 4 };

/**
 * Ranking used by the comparison table: feasibility first, then fewer
 * unscheduled exams, then lower soft penalty, then faster execution. An
 * invalid schedule can never outrank a valid one, whatever its soft metrics.
 */
export function compareRunResults<T extends { outcome: RunOutcome; unscheduled: number; softPenalty: number | null; durationMs: number }>(a: T, b: T) {
  return OUTCOME_RANK[a.outcome] - OUTCOME_RANK[b.outcome]
    || a.unscheduled - b.unscheduled
    || (a.softPenalty ?? Infinity) - (b.softPenalty ?? Infinity)
    || a.durationMs - b.durationMs;
}
