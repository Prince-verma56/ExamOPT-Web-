/**
 * Student and faculty isolation (reference test_api.py: 401 / 403 / scoping)
 * and the publication gate.
 */
import { describe, expect, test } from "vitest";
import { decideTimetableAccess, identityFromMetadata, normalizeIdentifier } from "@/modules/auth/access";
import { publishGate } from "@/server/scheduling/publication";

const student = { role: "user" as const, identity: { rollNo: "GLA26-BCA-0001", facultyId: null } };
const faculty = { role: "user" as const, identity: { rollNo: null, facultyId: "FAC-101" } };
const admin = { role: "admin" as const, identity: { rollNo: null, facultyId: null } };

describe("timetable access", () => {
  test("anonymous callers are rejected (401)", () => {
    expect(decideTimetableAccess("student", { role: "guest", identity: { rollNo: null, facultyId: null } }, "GLA26-BCA-0001")).toMatchObject({ allowed: false, status: 401 });
  });

  test("a student gets their own record, with or without naming it", () => {
    expect(decideTimetableAccess("student", student)).toEqual({ allowed: true, id: "GLA26-BCA-0001" });
    expect(decideTimetableAccess("student", student, "gla26-bca-0001")).toEqual({ allowed: true, id: "GLA26-BCA-0001" });
  });

  test("a student cannot read another student's timetable by supplying a roll number (403)", () => {
    expect(decideTimetableAccess("student", student, "GLA26-BCA-0002")).toMatchObject({ allowed: false, status: 403, code: "FORBIDDEN" });
  });

  test("a student cannot read faculty duties, and faculty cannot read student timetables", () => {
    expect(decideTimetableAccess("faculty", student, "FAC-101")).toMatchObject({ allowed: false, status: 403 });
    expect(decideTimetableAccess("student", faculty, "GLA26-BCA-0001")).toMatchObject({ allowed: false, status: 403 });
  });

  test("faculty are isolated to their own duties", () => {
    expect(decideTimetableAccess("faculty", faculty)).toEqual({ allowed: true, id: "FAC-101" });
    expect(decideTimetableAccess("faculty", faculty, "FAC-102")).toMatchObject({ allowed: false, status: 403 });
  });

  test("an unlinked account is told it is not linked", () => {
    expect(decideTimetableAccess("student", { role: "user", identity: { rollNo: null, facultyId: null } })).toMatchObject({ allowed: false, status: 403, code: "NOT_LINKED" });
  });

  test("administrators may read any record but must name one", () => {
    expect(decideTimetableAccess("student", admin, "GLA26-BCA-0002")).toEqual({ allowed: true, id: "GLA26-BCA-0002" });
    expect(decideTimetableAccess("faculty", admin, "FAC-102")).toEqual({ allowed: true, id: "FAC-102" });
    expect(decideTimetableAccess("student", admin)).toMatchObject({ allowed: false, status: 400 });
  });

  test("malformed identifiers are rejected before any lookup", () => {
    expect(decideTimetableAccess("student", admin, "x'; drop table")).toMatchObject({ allowed: false, status: 400 });
    expect(normalizeIdentifier("  gla26-bca-0001 ")).toBe("GLA26-BCA-0001");
    expect(normalizeIdentifier("a".repeat(41))).toBeNull();
  });

  test("identity comes only from server-side metadata keys", () => {
    expect(identityFromMetadata({ rollNo: "GLA26-BCA-0001", role: "admin" })).toEqual({ rollNo: "GLA26-BCA-0001", facultyId: null });
    expect(identityFromMetadata({ faculty_id: "fac-101" })).toEqual({ rollNo: null, facultyId: "FAC-101" });
    expect(identityFromMetadata(undefined)).toEqual({ rollNo: null, facultyId: null });
  });
});

describe("publication gate", () => {
  const ok = { source: "engine" as const, outcome: "FEASIBLE" as const, storedValid: true, liveValidation: { valid: true, violationCount: 0 }, invigilation: { valid: true, violations: 0 }, isActivePublication: false };
  const codes = (input: Parameters<typeof publishGate>[0]) => publishGate(input).rejections.map((r) => r.code);

  test("a feasible, validated engine run is publishable", () => {
    expect(publishGate(ok)).toEqual({ allowed: true, rejections: [] });
    expect(publishGate({ ...ok, invigilation: null }).allowed).toBe(true);
  });

  test("anything with a hard-constraint problem is refused", () => {
    expect(codes({ ...ok, outcome: "PARTIAL" })).toContain("NOT_FEASIBLE");
    expect(codes({ ...ok, outcome: "INVALID" })).toContain("NOT_FEASIBLE");
    expect(codes({ ...ok, storedValid: false })).toContain("NOT_VALIDATED");
    expect(codes({ ...ok, liveValidation: { valid: false, violationCount: 3 } })).toContain("LIVE_VALIDATION_FAILED");
    expect(codes({ ...ok, invigilation: { valid: false, violations: 1 } })).toContain("INVIGILATION_INVALID");
  });

  test("legacy runs and the active version are refused", () => {
    expect(codes({ ...ok, source: "legacy", storedValid: null })).toEqual(["LEGACY_RUN"]);
    expect(codes({ ...ok, isActivePublication: true })).toEqual(["ALREADY_ACTIVE"]);
  });
});
