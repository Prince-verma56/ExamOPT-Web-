import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Authorization of the Judge Demo routes, through the real `createApiRoute`
 * wrapper. Clerk is replaced by a controllable session; the service is a spy
 * so these tests only decide who may reach it.
 */

const session = vi.hoisted(() => ({ userId: null as string | null, email: null as string | null, role: undefined as unknown }));
const service = vi.hoisted(() => ({
  demoDataset: vi.fn(async () => ({ ok: true })),
  demoArena: vi.fn(async () => ({ ok: true })),
  demoSimulate: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => ({ userId: session.userId }),
  clerkClient: async () => ({
    users: { getUser: async () => ({ primaryEmailAddress: { emailAddress: session.email }, emailAddresses: [], publicMetadata: { role: session.role } }) },
  }),
}));
vi.mock("@/modules/auth/student-links", () => ({ resolveStudentRollNo: async () => null }));
vi.mock("@/server/scheduling/service", () => ({ schedulingService: service }));

const dataset = await import("@/app/api/v1/scheduling/demo/dataset/route");
const arena = await import("@/app/api/v1/scheduling/demo/arena/route");
const simulate = await import("@/app/api/v1/scheduling/demo/simulate/route");

const post = (path: string, body: unknown) => new Request(`http://localhost/api/v1/scheduling/demo/${path}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const validArena = { source: "fixture", algorithms: ["BACKTRACKING"] };
const validSimulate = { source: "fixture", scenario: "STUDENT_OVERLAP", baselineAlgorithm: "BACKTRACKING" };

const env = { ...process.env };
let counter = 0;

describe("Judge Demo route authorization", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_demo";
    process.env.EXAMOPT_ADMIN_EMAILS = "admin@example.com";
    delete process.env.FEATURE_DEMO_MODE;
    // A fresh user id per test keeps the profile cache and rate limiter independent.
    counter++;
    Object.values(service).forEach((fn) => fn.mockClear());
  });
  afterEach(() => { process.env = { ...env }; });

  test("anonymous requests are refused with 401 and never reach the service", async () => {
    session.userId = null;
    expect((await dataset.GET(new Request("http://localhost/api/v1/scheduling/demo/dataset?source=live"))).status).toBe(401);
    expect((await arena.POST(post("arena", validArena))).status).toBe(401);
    expect((await simulate.POST(post("simulate", validSimulate))).status).toBe(401);
    Object.values(service).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });

  test("signed-in non-administrators (students) are refused with 403", async () => {
    session.userId = `user_student_${counter}`; session.email = "student@example.com"; session.role = "student";
    expect((await dataset.GET(new Request("http://localhost/api/v1/scheduling/demo/dataset?source=live"))).status).toBe(403);
    expect((await arena.POST(post("arena", validArena))).status).toBe(403);
    expect((await simulate.POST(post("simulate", validSimulate))).status).toBe(403);
    Object.values(service).forEach((fn) => expect(fn).not.toHaveBeenCalled());
  });

  test("a role claimed in the request body is rejected, not trusted", async () => {
    session.userId = `user_student_${counter}`; session.email = "student@example.com"; session.role = undefined;
    expect((await simulate.POST(post("simulate", { ...validSimulate, role: "admin" }))).status).toBe(403);
    session.userId = `user_admin_${counter}`; session.email = "admin@example.com";
    expect((await simulate.POST(post("simulate", { ...validSimulate, role: "admin" }))).status).toBe(400);
    expect(service.demoSimulate).not.toHaveBeenCalled();
  });

  test("administrators reach the service; unknown sources and scenarios are rejected", async () => {
    session.userId = `user_admin_${counter}`; session.email = "admin@example.com"; session.role = undefined;
    expect((await dataset.GET(new Request("http://localhost/api/v1/scheduling/demo/dataset?source=fixture"))).status).toBe(200);
    expect((await arena.POST(post("arena", validArena))).status).toBe(200);
    expect((await simulate.POST(post("simulate", validSimulate))).status).toBe(200);
    expect(service.demoDataset).toHaveBeenCalledWith("fixture");
    expect((await dataset.GET(new Request("http://localhost/api/v1/scheduling/demo/dataset?source=production"))).status).toBe(400);
    expect((await simulate.POST(post("simulate", { ...validSimulate, scenario: "DROP_TABLES" }))).status).toBe(400);
    expect((await arena.POST(post("arena", { ...validArena, config: { maxNodes: 10_000_000 } }))).status).toBe(400);
  });

  test("Clerk metadata role admin is honoured", async () => {
    session.userId = `user_meta_${counter}`; session.email = "someone@example.com"; session.role = "admin";
    expect((await arena.POST(post("arena", validArena))).status).toBe(200);
  });
});
