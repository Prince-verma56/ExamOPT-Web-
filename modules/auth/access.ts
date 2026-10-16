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
