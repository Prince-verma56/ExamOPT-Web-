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
    // Invigilators are persisted in scheduled_exams.assigned_faculty_id and re-validated live.
    expect(detail.assignments.map((a) => `${a.examId}:${a.facultyId}`).sort()).toEqual(result.assignments.map((a) => `${a.examId}:${a.facultyId}`).sort());
    expect(detail.liveInvigilation?.valid).toBe(true);
    // A fresh feasible engine run passes the publication gate (nothing is published here).
    expect(detail.publishable).toEqual({ allowed: true, rejections: [] });
    const csv = await schedulingService.exportCsv("timetable", runId!);
    expect(csv.csv.trim().split("\n")).toHaveLength(result.assignments.length + 1);
  }, 60_000);

  test("the live dataset is the reference GLA dataset (same fingerprint) and passes data quality", async () => {
    const { schedulingService } = await import("@/server/scheduling/service");
    const { prepareDataset } = await import("@/server/scheduling/engine");
    const { normalizeDataset } = await import("@/server/scheduling/normalize");
    const { referenceRawDataset } = await import("@/server/scheduling/reference-dataset");
    const [{ fingerprint, report }] = await Promise.all([schedulingService.dataQuality()]);
    expect(fingerprint).toBe(prepareDataset(normalizeDataset(referenceRawDataset("normal"))).fingerprint);
    expect(report).toMatchObject({ isValid: true, readinessScore: 100 });
  }, 60_000);

  test("legacy runs are refused by the publication gate", async () => {
    const { schedulingService } = await import("@/server/scheduling/service");
    const legacy = (await schedulingService.listRuns(200)).find((r) => r.source === "legacy" && r.scheduledExams > 0);
    if (!legacy) return;
    const detail = await schedulingService.runDetail(legacy.runId);
    expect(detail.publishable.allowed).toBe(false);
    expect(detail.publishable.rejections.map((r) => r.code)).toContain("LEGACY_RUN");
  }, 60_000);

  test("published, student and faculty timetables come from the active publication", async () => {
    const { schedulingService } = await import("@/server/scheduling/service");
    const published = await schedulingService.publishedSchedule();
    if (!published.publication) return expect(published.status).toBe("NO_PUBLISHED_SCHEDULE");
    const student = await schedulingService.studentTimetable("GLA26-BCA-0001");
    expect(student.student.subjectIds).toEqual(["BCA-101", "BCA-102", "BCA-103", "BCA-104P"]);
    expect(student.exams.every((e) => student.student.subjectIds.includes(e.examId))).toBe(true);
    expect(student.clashes).toEqual([]);
    expect(student.publication?.version).toBe(published.publication.version);
    const faculty = await schedulingService.facultyTimetable("FAC-101");
    expect(faculty.duties.every((d) => d.facultyId === "FAC-101")).toBe(true);
    await expect(schedulingService.studentTimetable("GLA26-NOPE-9999")).rejects.toMatchObject({ status: 404 });
  }, 60_000);

  /** Changes the live active timetable, so it only runs when explicitly requested. */
  test.skipIf(!process.env.EXAMOPT_INTEGRATION_PUBLISH)("publishes a fresh feasible run as a new version", async () => {
    const { schedulingService } = await import("@/server/scheduling/service");
    const before = await schedulingService.publications();
    const { runs } = await schedulingService.execute(["BACKTRACKING"], undefined, "integration-test");
    const result = await schedulingService.publish(runs[0].runId!, "Integration test publication", { userId: "integration-test", email: null });
    expect(result.publication).toMatchObject({ version: Math.max(0, ...before.map((p) => p.version)) + 1, isActive: true, runId: runs[0].runId });
    const after = await schedulingService.publications();
    expect(after.filter((p) => p.isActive).map((p) => p.version)).toEqual([result.publication.version]);
    expect(after).toHaveLength(before.length + 1);
  }, 60_000);
});
