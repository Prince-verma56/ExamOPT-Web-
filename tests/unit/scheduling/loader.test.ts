import { beforeEach, describe, expect, test, vi } from "vitest";

const queries = vi.hoisted(() => [] as { table: string; select: string }[]);

vi.mock("@/lib/supabase", () => ({
  querySupabase: async (table: string, options: { query?: Record<string, string> } = {}) => {
    queries.push({ table, select: options.query?.select ?? "" });
    return { data: [], error: null };
  },
}));

const { loadRawDataset, loadStudent } = await import("@/server/scheduling/loader");

describe("scheduling dataset loader", () => {
  beforeEach(() => queries.splice(0));

  test("does not make scheduling data depend on the optional student-linking email column", async () => {
    await loadRawDataset();

    const studentQuery = queries.find((query) => query.table === "student_enrollments");
    expect(studentQuery).toBeDefined();
    expect(studentQuery?.select.split(",")).not.toContain("student_email");
  });

  test("keeps personal timetable lookups compatible with databases before the email migration", async () => {
    await loadStudent("GLA26-BCA-0001");

    const studentQuery = queries.find((query) => query.table === "student_enrollments");
    expect(studentQuery).toBeDefined();
    expect(studentQuery?.select.split(",")).not.toContain("student_email");
  });
});
