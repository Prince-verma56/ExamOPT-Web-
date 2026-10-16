import { describe, expect, test } from "vitest";
import { TEST_CASES, runTestLab } from "@/server/scheduling/test-lab";

describe("Test Lab edge cases", () => {
  const results = runTestLab();

  test("covers every required scenario", () => {
    expect(TEST_CASES.map((c) => c.id)).toEqual([
      "feasible-baseline", "shared-student", "backlog-cross-semester", "capacity-overflow", "lab-unavailable", "fixed-slot-conflict",
      "unavailable-slot", "insufficient-rooms", "invalid-input", "over-constrained-clique", "odd-cycle-search-proof", "search-timeout",
      "independent-validation", "deterministic",
    ]);
  });

  test.each(results.map((r) => [r.id, r] as const))("%s", (_id, result) => {
    const failed = result.checks.filter((c) => !c.passed).map((c) => c.label);
    expect(failed, result.actual).toEqual([]);
    expect(result.passed).toBe(true);
  });

  test("filters by case id", () => {
    expect(runTestLab(["search-timeout"]).map((r) => r.id)).toEqual(["search-timeout"]);
  });
});
