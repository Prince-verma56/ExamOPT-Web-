import { describe, expect, test } from "vitest";
import {
  decideAccess,
  decideTimetableAccess,
  DEMO_PRINCIPAL_ID,
  isAdminMetadataRole,
  isDemoAllowed,
  parseList,
  requireAdmin,
  requireAuthenticatedUser,
  requireLinkedStudent,
  requireStudent,
  AuthorizationError,
} from "@/modules/auth/access";

const base = { allowedUserIds: [] as string[], allowedEmails: [] as string[], demoAllowed: false };

describe("server-side access decisions and role-based authorization", () => {
  test("1. pvcodingz96@gmail.com is recognized as designated administrator", () => {
    const adminEmails = parseList("pvcodingz96@gmail.com");
    const access = decideAccess({
      ...base,
      userId: "user_admin_1",
      email: "pvcodingz96@gmail.com",
      allowedEmails: adminEmails,
    });
    expect(access.role).toBe("admin");
    expect(access.permissions).toContain("admin");
    expect(access.permissions).toContain("student");
  });

  test("2. administrator emails are normalized case-insensitively", () => {
    const adminEmails = parseList("pvcodingz96@gmail.com");
    const access = decideAccess({
      ...base,
      userId: "user_admin_2",
      email: "PVCodingZ96@Gmail.Com ",
      allowedEmails: adminEmails,
    });
    expect(access.role).toBe("admin");
    expect(access.permissions).toContain("admin");
  });

  test("3. non-admin signed-in user is recognized as STUDENT role without admin permissions", () => {
    const adminEmails = parseList("pvcodingz96@gmail.com");
    const access = decideAccess({
      ...base,
      userId: "user_student_123",
      email: "secondary.student@example.com",
      allowedEmails: adminEmails,
    });
    expect(access.role).toBe("student");
    expect(access.permissions).toContain("student");
    expect(access.permissions).not.toContain("admin");
  });

  test("4. anonymous requests are always guests", () => {
    expect(decideAccess({ ...base, userId: null, demoAllowed: true })).toEqual({
      role: "guest",
      permissions: [],
    });
    expect(decideAccess({ ...base, userId: null, demoAllowed: false })).toEqual({
      role: "guest",
      permissions: [],
    });
  });

  test("5. demo principal is only admin when demoAllowed is true and no clerk user is active", () => {
    expect(decideAccess({ ...base, userId: DEMO_PRINCIPAL_ID, demoAllowed: false }).role).toBe("guest");
    expect(decideAccess({ ...base, userId: DEMO_PRINCIPAL_ID, demoAllowed: true }).role).toBe("admin");
  });

  test("6. requireAdmin throws AuthorizationError for student role", () => {
    expect(() => requireAdmin({ role: "student", permissions: ["student", "user"] })).toThrowError(
      AuthorizationError
    );
    expect(() => requireAdmin({ role: "admin", permissions: ["admin", "student"] })).not.toThrow();
  });

  test("7. requireStudent allows student and admin roles", () => {
    expect(() => requireStudent({ role: "student", permissions: ["student"] })).not.toThrow();
    expect(() => requireStudent({ role: "admin", permissions: ["admin", "student"] })).not.toThrow();
    expect(() => requireStudent({ role: "guest", permissions: [] })).toThrowError(AuthorizationError);
  });

  test("8. requireAuthenticatedUser prevents unauthenticated access", () => {
    expect(() => requireAuthenticatedUser({ userId: null })).toThrowError(AuthorizationError);
    expect(requireAuthenticatedUser({ userId: "user_valid" })).toBe("user_valid");
  });

  test("9. requireLinkedStudent enforces linked roll number", () => {
    expect(() => requireLinkedStudent({ identity: { rollNo: null, facultyId: null } })).toThrowError(
      AuthorizationError
    );
    expect(
      requireLinkedStudent({ identity: { rollNo: "GLA26-BCA-0001", facultyId: null } })
    ).toBe("GLA26-BCA-0001");
  });

  test("10. student cannot obtain another student's timetable by passing roll number parameter", () => {
    const studentCaller = {
      role: "student" as const,
      identity: { rollNo: "GLA26-BCA-0001", facultyId: null },
    };

    // Attempting to query another student's timetable
    const decision = decideTimetableAccess("student", studentCaller, "GLA26-BCA-0099");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.status).toBe(403);
      expect(decision.code).toBe("FORBIDDEN");
      expect(decision.message).toContain("You can only view your own timetable");
    }
  });

  test("11. student viewing own timetable succeeds even without parameter", () => {
    const studentCaller = {
      role: "student" as const,
      identity: { rollNo: "GLA26-BCA-0001", facultyId: null },
    };
    const decision = decideTimetableAccess("student", studentCaller, null);
    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.id).toBe("GLA26-BCA-0001");
    }
  });

  test("12. unlinked student cannot access timetable and receives NOT_LINKED status", () => {
    const unlinkedCaller = {
      role: "student" as const,
      identity: { rollNo: null, facultyId: null },
    };
    const decision = decideTimetableAccess("student", unlinkedCaller, null);
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.status).toBe(403);
      expect(decision.code).toBe("NOT_LINKED");
      expect(decision.message).toContain("account is not linked to a student record");
    }
  });

  test("13. administrator can inspect any student roll number", () => {
    const adminCaller = {
      role: "admin" as const,
      identity: { rollNo: null, facultyId: null },
    };
    const decision = decideTimetableAccess("student", adminCaller, "GLA26-BCA-0034");
    expect(decision.allowed).toBe(true);
    if (decision.allowed) {
      expect(decision.id).toBe("GLA26-BCA-0034");
    }
  });

  test("14. administrator lookup requires valid roll number if no own identity", () => {
    const adminCaller = {
      role: "admin" as const,
      identity: { rollNo: null, facultyId: null },
    };
    const decision = decideTimetableAccess("student", adminCaller, "");
    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.status).toBe(400);
      expect(decision.code).toBe("VALIDATION_ERROR");
    }
  });
});
