import { describe, expect, test } from "vitest";
import { decideAccess, DEMO_PRINCIPAL_ID, isDemoAllowed, parseList } from "@/modules/auth/access";

const base = { allowedUserIds: [] as string[], allowedEmails: [] as string[], demoAllowed: false };

describe("server-side access decisions", () => {
  test("demo mode never applies in production", () => {
    expect(isDemoAllowed({ FEATURE_DEMO_MODE: "true", NODE_ENV: "production" })).toBe(false);
    expect(isDemoAllowed({ FEATURE_DEMO_MODE: "true", NODE_ENV: "development" })).toBe(true);
    expect(isDemoAllowed({ FEATURE_DEMO_MODE: "false", NODE_ENV: "development" })).toBe(false);
  });

  test("the demo principal is only an admin when demo mode is allowed", () => {
    expect(decideAccess({ ...base, userId: DEMO_PRINCIPAL_ID }).role).toBe("guest");
    expect(decideAccess({ ...base, userId: DEMO_PRINCIPAL_ID, demoAllowed: true }).role).toBe("admin");
  });

  test("a signed-in user is not an admin by default in production", () => {
    const access = decideAccess({ ...base, userId: "user_123", email: "someone@example.com" });
    expect(access).toEqual({ role: "user", permissions: ["user"] });
  });

  test("admins come from the allowlists or Clerk public metadata", () => {
    expect(decideAccess({ ...base, userId: "user_123", allowedUserIds: ["user_123"] }).role).toBe("admin");
    expect(decideAccess({ ...base, userId: "user_9", email: "Admin@GLA.ac.in", allowedEmails: parseList("admin@gla.ac.in, other@x.y") }).role).toBe("admin");
    expect(decideAccess({ ...base, userId: "user_9", metadataRole: "admin" }).role).toBe("admin");
    expect(decideAccess({ ...base, userId: "user_9", metadataRole: "ADMIN " }).role).toBe("user");
  });

  test("anonymous requests are guests", () => {
    expect(decideAccess({ ...base, userId: null, demoAllowed: true })).toEqual({ role: "guest", permissions: [] });
  });
});
