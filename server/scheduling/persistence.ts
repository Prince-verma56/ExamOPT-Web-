import "server-only";

import { querySupabase } from "@/lib/supabase";
import type { AlgorithmId, Diagnostic, EngineConfig, RunOutcome } from "./domain";
import type { RunResult } from "./engine";
import { fetchAllRows, SchedulingServiceError } from "./loader";
import type { ScheduleMetrics } from "./metrics";
import type { ValidationReport } from "./validator";

/**
 * Persistence for scheduling runs in the canonical tables:
 * `scheduling_runs`, `scheduled_exams` (one row per exam: UNIQUE(run_id,
 * subject_id)) and `schedule_conflicts`.
 *
 * PostgREST offers no multi-statement transactions, so writes follow a
 * commit-marker protocol: the run row is created with
 * `metadata_json.persistence = "writing"`, assignments and conflicts are each
 * inserted in one atomic bulk statement, and only then is the marker set to
 * "committed". Any failure deletes what was written. Readers ignore engine runs
 * that never reached "committed", so a partial write is never shown as a
 * completed schedule.
 */

type DbStatus = "FEASIBLE" | "INFEASIBLE" | "PARTIAL" | "TIMEOUT";

/** `scheduling_runs.status` has a CHECK constraint, so detailed outcomes live in metadata. */
const DB_STATUS: Record<Exclude<RunOutcome, "INVALID_INPUT">, DbStatus> = {
  FEASIBLE: "FEASIBLE", INFEASIBLE: "INFEASIBLE", PARTIAL: "PARTIAL", SEARCH_LIMIT: "TIMEOUT", INVALID: "PARTIAL",
};

interface RunRow {
  run_id: string;
  algorithm: AlgorithmId;
  status: DbStatus;
  total_exams: number;
  scheduled_exams: number;
  unscheduled_exams: number;
  hard_conflicts: number;
  soft_score: number | string;
  execution_time_ms: number | string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

interface EngineMetadata {
  engine: "examopt-scheduler";
  engineVersion: string;
  algorithmVersion: string;
  persistence: "writing" | "committed";
  outcome: RunOutcome;
  infeasibilityEvidence: string | null;
  datasetFingerprint: string;
  config: EngineConfig;
  searchNodes: number | null;
  colorsUsed: number | null;
  startedAt: string;
  completedAt: string;
  triggeredBy: string | null;
  validation: ValidationReport | null;
  metrics: ScheduleMetrics | null;
  diagnostics: Diagnostic[];
  unscheduledExamIds: string[];
  slots_used: number;
  room_utilization_pct: number;
  soft_score_semantics: "penalty_lower_is_better";
}

export interface RunSummary {
  runId: string;
  algorithm: AlgorithmId;
  source: "engine" | "legacy";
  outcome: RunOutcome;
  dbStatus: DbStatus;
  createdAt: string;
  totalExams: number;
  scheduledExams: number;
  unscheduledExams: number;
  hardViolations: number;
  /** Engine runs: weighted soft penalty (lower is better). Null for legacy runs. */
  softPenalty: number | null;
  /** Legacy runs stored a 0-100 score of unknown derivation; shown for reference only. */
  legacySoftScore: number | null;
  executionTimeMs: number;
  searchNodes: number | null;
  datasetFingerprint: string | null;
  infeasibilityEvidence: string | null;
  validation: { valid: boolean; violationCount: number; placementViolationCount: number } | null;
  metrics: ScheduleMetrics | null;
  diagnostics: Diagnostic[];
  config: EngineConfig | null;
  engineVersion: string | null;
  published: { publishedId: string; version: number; title: string; isActive: boolean; publishedAt: string } | null;
}

export interface StoredAssignment {
  id: string;
  examId: string;
  slotId: string;
  roomId: string;
  assignedStudents: number;
  facultyId: string | null;
}

async function write<T>(table: string, method: "POST" | "PATCH" | "DELETE", options: { body?: unknown; query?: Record<string, string> }) {
  const result = await querySupabase<T>(table, { method, useServiceRole: true, ...options });
  if (result.error) throw new SchedulingServiceError("PERSISTENCE_FAILED", `Could not write to ${table}.`, 502);
  return result.data;
}

function newRunId(now: Date) {
  const stamp = now.toISOString().replace(/[-:T]/g, "").slice(0, 14);
  return `RUN-${stamp}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;
}

export const runStore = {
  canPersist(result: RunResult) {
    return result.outcome !== "INVALID_INPUT";
  },

  async save(result: RunResult, triggeredBy: string | null): Promise<string> {
    if (result.outcome === "INVALID_INPUT") throw new SchedulingServiceError("NOT_PERSISTABLE", "Runs rejected by input validation are not stored.", 422);
    if (result.outcome === "FEASIBLE" && !result.validation?.valid) throw new SchedulingServiceError("INVARIANT_BROKEN", "Refusing to store an unvalidated schedule as feasible.", 500);
    const runId = newRunId(new Date(result.startedAt));
    const metrics = result.metrics;
    const metadata: EngineMetadata = {
      engine: "examopt-scheduler", engineVersion: result.engineVersion, algorithmVersion: result.algorithmVersion, persistence: "writing",
      outcome: result.outcome, infeasibilityEvidence: result.infeasibilityEvidence, datasetFingerprint: result.datasetFingerprint, config: result.config,
      searchNodes: result.searchNodes, colorsUsed: result.colorsUsed, startedAt: result.startedAt, completedAt: result.completedAt, triggeredBy,
      validation: result.validation, metrics, diagnostics: result.diagnostics.slice(0, 100), unscheduledExamIds: result.unscheduledExamIds,
      slots_used: metrics?.slotsUsed ?? 0, room_utilization_pct: metrics?.seatFillPct ?? 0, soft_score_semantics: "penalty_lower_is_better",
    };
    await write("scheduling_runs", "POST", { body: {
      run_id: runId, algorithm: result.algorithm, status: DB_STATUS[result.outcome],
      total_exams: result.totalExams, scheduled_exams: result.assignments.length, unscheduled_exams: result.unscheduledExamIds.length,
      hard_conflicts: result.validation?.placementViolationCount ?? 0, soft_score: metrics?.softPenalty.total ?? 0,
      execution_time_ms: result.durationMs, metadata_json: metadata,
    } });

    try {
      if (result.assignments.length) {
        await write("scheduled_exams", "POST", { body: result.assignments.map((a) => ({
          id: `ALLOC-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, run_id: runId, subject_id: a.examId, slot_id: a.slotId, room_id: a.roomId, assigned_students: a.students,
        })) });
      }
      const conflictRows = [
        ...(result.validation?.violations ?? []).filter((v) => v.examIds.length).map((v) => ({ run_id: runId, conflict_type: v.code, subject_id_1: v.examIds[0], subject_id_2: v.examIds[1] ?? null, entity_id: v.roomIds[0] ?? v.slotIds[0] ?? null, description: v.message })),
        ...result.diagnostics.filter((d) => d.severity === "error" && d.examIds?.length).map((d) => ({ run_id: runId, conflict_type: d.code, subject_id_1: d.examIds![0], subject_id_2: d.examIds![1] ?? null, entity_id: d.roomIds?.[0] ?? d.slotIds?.[0] ?? null, description: d.message })),
      ].slice(0, 200);
      if (conflictRows.length) await write("schedule_conflicts", "POST", { body: conflictRows });
      await write("scheduling_runs", "PATCH", { query: { run_id: `eq.${runId}` }, body: { metadata_json: { ...metadata, persistence: "committed" } } });
    } catch (error) {
      // Compensating rollback. If this also fails, the run stays marked "writing" and is never read back.
      await Promise.allSettled([
        write("scheduled_exams", "DELETE", { query: { run_id: `eq.${runId}` } }),
        write("schedule_conflicts", "DELETE", { query: { run_id: `eq.${runId}` } }),
      ]);
      await write("scheduling_runs", "DELETE", { query: { run_id: `eq.${runId}` } }).catch(() => undefined);
      throw error;
    }
    return runId;
  },

  async list(limit = 50): Promise<RunSummary[]> {
    const [runs, published] = await Promise.all([
      querySupabase<RunRow[]>("scheduling_runs", { useServiceRole: true, query: { select: "*", order: "created_at.desc", limit: String(limit) } }),
      this.published(),
    ]);
    if (runs.error || !runs.data) throw new SchedulingServiceError("DATA_SOURCE_UNAVAILABLE", "Could not read scheduling runs.", 503);
    return runs.data.map((row) => toSummary(row, published.get(row.run_id) ?? null)).filter((run): run is RunSummary => run !== null);
  },

  async get(runId: string): Promise<{ summary: RunSummary; assignments: StoredAssignment[]; metadata: Record<string, unknown> | null } | null> {
    const [runs, published] = await Promise.all([
      querySupabase<RunRow[]>("scheduling_runs", { useServiceRole: true, query: { select: "*", run_id: `eq.${runId}`, limit: "1" } }),
      this.published(),
    ]);
    if (runs.error) throw new SchedulingServiceError("DATA_SOURCE_UNAVAILABLE", "Could not read the scheduling run.", 503);
    const row = runs.data?.[0];
    const summary = row ? toSummary(row, published.get(row.run_id) ?? null) : null;
    if (!row || !summary) return null;
    const rows = await fetchAllRows<{ id: string; subject_id: string; slot_id: string; room_id: string; assigned_students: number; assigned_faculty_id: string | null }>(
      "scheduled_exams", "id,subject_id,slot_id,room_id,assigned_students,assigned_faculty_id", "subject_id.asc,id.asc", { run_id: `eq.${runId}` },
    );
    return {
      summary, metadata: row.metadata_json,
      assignments: rows.map((r) => ({ id: r.id, examId: r.subject_id, slotId: r.slot_id, roomId: r.room_id, assignedStudents: r.assigned_students, facultyId: r.assigned_faculty_id })),
    };
  },

  async published() {
    const result = await querySupabase<{ published_id: string; version: number; run_id: string; title: string; is_active: boolean; published_at: string }[]>(
      "published_schedules", { useServiceRole: true, query: { select: "published_id,version,run_id,title,is_active,published_at", order: "version.desc" } },
    );
    const map = new Map<string, RunSummary["published"]>();
    for (const row of result.data ?? []) {
      if (!map.has(row.run_id)) map.set(row.run_id, { publishedId: row.published_id, version: row.version, title: row.title, isActive: row.is_active, publishedAt: row.published_at });
    }
    return map;
  },
};

function toSummary(row: RunRow, published: RunSummary["published"]): RunSummary | null {
  const meta = row.metadata_json as Partial<EngineMetadata> | null;
  const isEngine = meta?.engine === "examopt-scheduler";
  if (isEngine && meta.persistence !== "committed") return null;
  const legacyOutcome: Record<DbStatus, RunOutcome> = { FEASIBLE: "FEASIBLE", INFEASIBLE: "INFEASIBLE", PARTIAL: "PARTIAL", TIMEOUT: "SEARCH_LIMIT" };
  return {
    runId: row.run_id, algorithm: row.algorithm, source: isEngine ? "engine" : "legacy",
    outcome: isEngine ? meta.outcome! : legacyOutcome[row.status], dbStatus: row.status, createdAt: row.created_at,
    totalExams: row.total_exams, scheduledExams: row.scheduled_exams, unscheduledExams: row.unscheduled_exams, hardViolations: row.hard_conflicts,
    softPenalty: isEngine ? Number(row.soft_score) : null, legacySoftScore: isEngine ? null : Number(row.soft_score),
    executionTimeMs: Number(row.execution_time_ms), searchNodes: isEngine ? meta.searchNodes ?? null : null,
    datasetFingerprint: isEngine ? meta.datasetFingerprint ?? null : null, infeasibilityEvidence: isEngine ? meta.infeasibilityEvidence ?? null : null,
    validation: isEngine && meta.validation ? { valid: meta.validation.valid, violationCount: meta.validation.violationCount, placementViolationCount: meta.validation.placementViolationCount } : null,
    metrics: isEngine ? meta.metrics ?? null : null, diagnostics: isEngine ? meta.diagnostics ?? [] : [],
    config: isEngine ? meta.config ?? null : null, engineVersion: isEngine ? meta.engineVersion ?? null : null, published,
  };
}
