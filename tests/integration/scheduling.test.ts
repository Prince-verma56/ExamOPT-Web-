/**
 * Integration tests against the live Supabase project.
 *
 *   EXAMOPT_INTEGRATION=1 npx vitest run tests/integration
 *     Read-only: loads the dataset, solves it in memory, re-validates saved runs.
 *   EXAMOPT_INTEGRATION_WRITE=1 (in addition)
 *     Also executes and persists one backtracking run, then reads it back.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const enabled = process.env.EXAMOPT_INTEGRATION === "1";
const writes = process.env.EXAMOPT_INTEGRATION_WRITE === "1";
const envFile = path.resolve(__dirname, "../../.env");
if (enabled && fs.existsSync(envFile)) process.loadEnvFile(envFile);

describe.skipIf(!enabled)("scheduling against Supabase", () => {
  test("loads the canonical C10 dataset through the data layer", async () => {
    const { loadRawDataset } = await import("@/server/scheduling/loader");
    const { normalizeDataset } = await import("@/server/scheduling/normalize");
    const { prepareDataset } = await import("@/server/scheduling/engine");
    const dataset = prepareDataset(normalizeDataset(await loadRawDataset()));
    expect(dataset.model.exams.length).toBeGreaterThan(0);
    expect(dataset.input.enrollments.length).toBeGreaterThan(1000); // paging beyond PostgREST's 1,000-row default
    expect(dataset.preflight.hasDataErrors).toBe(false);
  }, 60_000);

  test("every algorithm's output is accepted only if the validator agrees", async () => {
    const { schedulingService } = await import("@/server/scheduling/service");
    const readiness = await schedulingService.readiness();
    const { loadRawDataset } = await import("@/server/scheduling/loader");
    const { normalizeDataset } = await import("@/server/scheduling/normalize");
    const { prepareDataset, runAlgorithm } = await import("@/server/scheduling/engine");
    const { validateSchedule } = await import("@/server/scheduling/validator");
    const dataset = prepareDataset(normalizeDataset(await loadRawDataset()));
    expect(dataset.fingerprint).toBe(readiness.fingerprint);
    for (const id of ["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"] as const) {
      const result = runAlgorithm(dataset, id);
      const independent = validateSchedule(dataset.input, result.assignments);
      if (result.outcome === "FEASIBLE") expect(independent.valid).toBe(true);
      expect(independent.placementViolationCount).toBe(0);
    }
  }, 60_000);

  test("saved runs are listed, re-validated live and comparable", async () => {
    const { schedulingService } = await import("@/server/scheduling/service");
    const runs = await schedulingService.listRuns(20);
    expect(runs.length).toBeGreaterThan(0);
    const withAssignments = runs.find((r) => r.scheduledExams > 0)!;
    const detail = await schedulingService.runDetail(withAssignments.runId);
    expect(detail.assignments).toHaveLength(withAssignments.scheduledExams);
    expect(detail.liveValidation.checks).toHaveLength(10);
    const compare = await schedulingService.compare(runs.slice(0, 3).map((r) => r.runId));
    expect(compare.runs.map((r) => r.rank)).toEqual(compare.runs.map((_, i) => i + 1));
  }, 60_000);

  test.skipIf(!writes)("persists a run atomically and reads it back", async () => {
    const { schedulingService } = await import("@/server/scheduling/service");
    const { runs } = await schedulingService.execute(["BACKTRACKING"], undefined, "integration-test");
    const [{ runId, persisted, result }] = runs;
    expect(persisted).toBe(true);
    const detail = await schedulingService.runDetail(runId!);
    expect(detail.summary).toMatchObject({ source: "engine", outcome: result.outcome, scheduledExams: result.assignments.length });
    expect(detail.assignments.map((a) => `${a.examId}@${a.slotId}/${a.roomId}`).sort())
      .toEqual(result.assignments.map((a) => `${a.examId}@${a.slotId}/${a.roomId}`).sort());
    expect(detail.liveValidation.valid).toBe(result.outcome === "FEASIBLE");
  }, 60_000);
});
