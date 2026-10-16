/**
 * Server-side role resolution and authorization for ExamOpt Studio.
 *
 * Roles:
 * - ADMIN: Designated administrator account (pvcodingz96@gmail.com configured in
 *   EXAMOPT_ADMIN_EMAILS), users in EXAMOPT_ADMIN_USER_IDS, or users whose Clerk
 *   publicMetadata.role is "admin".
 * - STUDENT: All authenticated non-administrator accounts. Can access their own
 *   linked student timetable and portal routes.
 * - GUEST: Unauthenticated requests.
 *
 * Never trust a role or email submitted by the browser as proof of authorization.
 */

export const DEMO_PRINCIPAL_ID = "demo-admin-session";

export type ApplicationRole = "admin" | "student" | "user" | "guest";

export interface AccessDecisionInput {
  userId: string | null;
  demoAllowed: boolean;
  email?: string | null;
  metadataRole?: unknown;
  allowedUserIds: string[];
  allowedEmails: string[];
}

export interface Access {
  role: ApplicationRole;
  permissions: string[];
}

const ADMIN: Access = { role: "admin", permissions: ["admin", "student", "user"] };
const STUDENT: Access = { role: "student", permissions: ["student", "user"] };
const GUEST: Access = { role: "guest", permissions: [] };

export function isDemoAllowed(env: Record<string, string | undefined> = process.env) {
  return env.FEATURE_DEMO_MODE === "true" && env.NODE_ENV !== "production";
}

export function parseList(value: string | undefined): string[] {
  return (value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

/** Clerk metadata is configured by trusted administrators, but normalizing it
 * keeps role checks resilient to harmless casing or whitespace differences. */
export function isAdminMetadataRole(value: unknown): boolean {
  return typeof value === "string" && value.trim().toLowerCase() === "admin";
}

export function decideAccess(input: AccessDecisionInput): Access {
  if (!input.userId) return GUEST;
  // The anonymous demo principal only becomes admin if demo mode is permitted and no Clerk user is active
  if (input.userId === DEMO_PRINCIPAL_ID) return input.demoAllowed ? ADMIN : GUEST;

  // Real authenticated Clerk account: strictly check admin allowlists or metadata
  const normalizedUserId = input.userId.toLowerCase();
  if (input.allowedUserIds.includes(normalizedUserId)) return ADMIN;

  const normalizedEmail = input.email ? input.email.trim().toLowerCase() : null;
  if (normalizedEmail && input.allowedEmails.includes(normalizedEmail)) return ADMIN;

  if (isAdminMetadataRole(input.metadataRole)) return ADMIN;

  // All other authenticated accounts are STUDENTS
  return STUDENT;
}

/**
 * Student and faculty linkage. A signed-in account is linked to a roll number
 * or faculty id through Clerk `publicMetadata` or server-side mapping registry.
 * Request parameters are never proof of identity.
 */
export interface LinkedIdentity {
  rollNo: string | null;
  facultyId: string | null;
}

export function normalizeIdentifier(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().toUpperCase();
  return /^[A-Z0-9][A-Z0-9-]{0,39}$/.test(id) ? id : null;
}

export function identityFromMetadata(metadata: Record<string, unknown> | null | undefined): LinkedIdentity {
  return {
    rollNo: normalizeIdentifier(metadata?.rollNo ?? metadata?.roll_no),
    facultyId: normalizeIdentifier(metadata?.facultyId ?? metadata?.faculty_id),
  };
}

export type TimetableDecision =
  | { allowed: true; id: string }
  | { allowed: false; status: 400 | 401 | 403; code: string; message: string };

/**
 * Whose timetable a caller may read (reference `resolve_student_authorization`
 * and `resolve_faculty_authorization`). Administrators may read any record and
 * must name one; students get only their own linked record.
 */
export function decideTimetableAccess(
  kind: "student" | "faculty",
  caller: { role: Access["role"]; identity: LinkedIdentity },
  requested?: string | null
): TimetableDecision {
  const label = kind === "student" ? "roll number" : "faculty id";
  if (caller.role === "guest") {
    return { allowed: false, status: 401, code: "UNAUTHORIZED", message: "Sign in to view a timetable." };
  }
  const own = kind === "student" ? caller.identity.rollNo : caller.identity.facultyId;
  const asked = requested === undefined || requested === null || requested === "" ? null : normalizeIdentifier(requested);
  if (requested && !asked) {
    return { allowed: false, status: 400, code: "VALIDATION_ERROR", message: `That is not a valid ${label}.` };
  }
  if (caller.role === "admin") {
    const id = asked ?? own;
    return id ? { allowed: true, id } : { allowed: false, status: 400, code: "VALIDATION_ERROR", message: `Administrators must specify a ${label}.` };
  }
  if (!own) {
    return {
      allowed: false,
      status: 403,
      code: "NOT_LINKED",
      message: `Your account is not linked to a ${kind} record. Ask the examination administrator to link your ${label}.`,
    };
  }
  if (asked && asked !== own) {
    return {
      allowed: false,
      status: 403,
      code: "FORBIDDEN",
      message: `You can only view your own ${kind === "student" ? "timetable" : "invigilation duties"}.`,
    };
  }
  return { allowed: true, id: own };
}

/**
 * Centralized authorization helpers for API routes and server actions.
 */
export class AuthorizationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 403
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function requireAuthenticatedUser(ctx: { userId: string | null }): string {
  if (!ctx.userId) {
    throw new AuthorizationError("UNAUTHORIZED", "Authentication required to access this resource.", 401);
  }
  return ctx.userId;
}

export function requireAdmin(ctx: { role: ApplicationRole; permissions?: string[] }): void {
  if (ctx.role !== "admin" && !ctx.permissions?.includes("admin")) {
    throw new AuthorizationError("FORBIDDEN", "Administrator privileges required.", 403);
  }
}

export function requireStudent(ctx: { role: ApplicationRole; permissions?: string[] }): void {
  if (ctx.role !== "student" && ctx.role !== "admin" && !ctx.permissions?.includes("student")) {
    throw new AuthorizationError("FORBIDDEN", "Student portal access required.", 403);
  }
}

export function requireLinkedStudent(ctx: { identity: LinkedIdentity }): string {
  if (!ctx.identity.rollNo) {
    throw new AuthorizationError("NOT_LINKED", "Your account is not linked to a student record. Ask the examination office to link your roll number.", 403);
  }
  return ctx.identity.rollNo;
}
