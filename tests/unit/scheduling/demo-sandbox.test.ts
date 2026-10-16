import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Sandbox isolation at the service boundary. The loader is replaced by an
 * in-memory copy of the reference GLA tables and every persistence and audit
 * method is a spy: the Demo Studio may read the dataset, but must never save
 * a run, publish, or write an audit record.
 */

const store = vi.hoisted(() => ({
  save: vi.fn(), publish: vi.fn(), list: vi.fn(), get: vi.fn(), publications: vi.fn(), activePublication: vi.fn(),
}));
const audit = vi.hoisted(() => ({ audit: vi.fn() }));
const loads = vi.hoisted(() => ({ count: 0, snapshot: "" }));

vi.mock("@/server/scheduling/persistence", () => ({ runStore: store }));
vi.mock("@/server/audit", () => ({ auditService: audit }));
vi.mock("@/server/scheduling/loader", async () => {
  const { referenceRawDataset } = await import("@/server/scheduling/reference-dataset");
  class SchedulingServiceError extends Error {
    constructor(public readonly code: string, message: string, public readonly status = 500, public readonly details?: unknown) { super(message); }
  }
  const raw = referenceRawDataset("normal");
  loads.snapshot = JSON.stringify(raw);
  return {
    SchedulingServiceError,
    loadRawDataset: async () => { loads.count++; return raw; },
    loadStudent: async () => null,
    fetchAllRows: async () => [],
  };
});

const { schedulingService } = await import("@/server/scheduling/service");
const { DEMO_SCENARIOS } = await import("@/server/scheduling/demo");

describe("Judge Demo sandbox isolation", () => {
  beforeEach(() => {
    Object.values(store).forEach((fn) => fn.mockClear());
    audit.audit.mockClear();
    loads.count = 0;
  });

  test("dataset, arena and every simulator scenario and correction read data but never persist, publish or audit", async () => {
    for (const source of ["live", "fixture"] as const) {
      const dataset = await schedulingService.demoDataset(source);
      expect(dataset.persisted).toBe(false);
      await schedulingService.demoArena(source, ["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"]);
      for (const scenario of DEMO_SCENARIOS) {
        for (const strategy of ["repair", "restore", "regenerate"] as const) {
          const result = await schedulingService.demoSimulate(source, { scenario, baselineAlgorithm: "BACKTRACKING", resolution: { strategy } });
          expect(result?.persisted).toBe(false);
          expect(result?.mode).toBe("SANDBOX SIMULATION — NOT SAVED TO LIVE DATA");
        }
      }
    }
    for (const fn of Object.values(store)) expect(fn).not.toHaveBeenCalled();
    expect(audit.audit).not.toHaveBeenCalled();
    expect(loads.count).toBeGreaterThan(0);
  });

  test("the loaded tables are unchanged after simulations", async () => {
    await schedulingService.demoSimulate("live", { scenario: "COMBINED", baselineAlgorithm: "BACKTRACKING", resolution: { strategy: "repair" } });
    const { loadRawDataset } = await import("@/server/scheduling/loader");
    expect(JSON.stringify(await loadRawDataset())).toBe(loads.snapshot);
  });

  test("live readiness reports real counts and recognises the reference dataset", async () => {
    const dataset = await schedulingService.demoDataset("live");
    expect(dataset.counts).toMatchObject({ exams: 24, rooms: 15, slots: 10, students: 355, enrollments: 1735 });
    expect(dataset.matchesReferenceDataset).toBe(true);
    expect(dataset.graph.nodes).toHaveLength(24);
    expect(dataset.graph.edges.length).toBe(dataset.graph.stats.edgeCount);
  });

  test("scenario errors surface as typed client errors, not server failures", async () => {
    await expect(schedulingService.demoSimulate("fixture", { scenario: "STUDENT_OVERLAP", baselineAlgorithm: "BACKTRACKING", targets: { examId: "BCA-101", otherExamId: "MCA-101" } }))
      .rejects.toMatchObject({ code: "INVALID_TARGET", status: 400 });
    await expect(schedulingService.demoSimulate("live", { scenario: "STUDENT_OVERLAP", baselineAlgorithm: "FIRST_FIT" }))
      .rejects.toMatchObject({ code: "BASELINE_NOT_FEASIBLE", status: 422 });
  });
});
