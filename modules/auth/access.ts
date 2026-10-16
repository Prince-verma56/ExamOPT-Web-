/**
 * Server-side role resolution for API routes.
 *
 * - Demo mode (FEATURE_DEMO_MODE=true) only applies outside production. There
 *   every session, including the anonymous demo principal, is an administrator.
 * - In production, administrators are users listed in EXAMOPT_ADMIN_USER_IDS or
 *   EXAMOPT_ADMIN_EMAILS, or whose Clerk publicMetadata.role is "admin". Every
 *   other signed-in user is a plain user. Roles never come from the client.
 */

export const DEMO_PRINCIPAL_ID = "demo-admin-session";

export interface AccessDecisionInput {
  userId: string | null;
  demoAllowed: boolean;
  email?: string | null;
  metadataRole?: unknown;
  allowedUserIds: string[];
  allowedEmails: string[];
}

export interface Access {
  role: "admin" | "user" | "guest";
  permissions: string[];
}

const ADMIN: Access = { role: "admin", permissions: ["admin", "user"] };
const USER: Access = { role: "user", permissions: ["user"] };
const GUEST: Access = { role: "guest", permissions: [] };

export function isDemoAllowed(env: Record<string, string | undefined> = process.env) {
  return env.FEATURE_DEMO_MODE === "true" && env.NODE_ENV !== "production";
}

export function parseList(value: string | undefined) {
  return (value ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}

export function decideAccess(input: AccessDecisionInput): Access {
  if (!input.userId) return GUEST;
  if (input.userId === DEMO_PRINCIPAL_ID) return input.demoAllowed ? ADMIN : GUEST;
  if (input.demoAllowed) return ADMIN;
  if (input.allowedUserIds.includes(input.userId.toLowerCase())) return ADMIN;
  if (input.email && input.allowedEmails.includes(input.email.toLowerCase())) return ADMIN;
  if (input.metadataRole === "admin") return ADMIN;
  return USER;
}

/**
 * Student and faculty linkage. A signed-in account is linked to a roll number
 * or faculty id only through Clerk `publicMetadata` (`rollNo` / `facultyId`),
 * which users cannot edit themselves; it is read server-side. Request
 * parameters are never proof of identity.
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
 * must name one; everyone else gets only their own linked record.
 */
export function decideTimetableAccess(kind: "student" | "faculty", caller: { role: Access["role"]; identity: LinkedIdentity }, requested?: string | null): TimetableDecision {
  const label = kind === "student" ? "roll number" : "faculty id";
  if (caller.role === "guest") return { allowed: false, status: 401, code: "UNAUTHORIZED", message: "Sign in to view a timetable." };
  const own = kind === "student" ? caller.identity.rollNo : caller.identity.facultyId;
  const asked = requested === undefined || requested === null || requested === "" ? null : normalizeIdentifier(requested);
  if (requested && !asked) return { allowed: false, status: 400, code: "VALIDATION_ERROR", message: `That is not a valid ${label}.` };
  if (caller.role === "admin") {
    const id = asked ?? own;
    return id ? { allowed: true, id } : { allowed: false, status: 400, code: "VALIDATION_ERROR", message: `Administrators must specify a ${label}.` };
  }
  if (!own) return { allowed: false, status: 403, code: "NOT_LINKED", message: `Your account is not linked to a ${kind} record. Ask the examination office to link your ${label}.` };
  if (asked && asked !== own) return { allowed: false, status: 403, code: "FORBIDDEN", message: `You can only view your own ${kind === "student" ? "timetable" : "invigilation duties"}.` };
  return { allowed: true, id: own };
}
