import { createApiRoute } from "@/server/api";

/**
 * The current caller's safe access summary. It lets the web app explain an
 * authorization failure without exposing another user's account details.
 */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true }, async (ctx) => ({
    userId: ctx.userId,
    email: ctx.email,
    role: ctx.role,
    permissions: ctx.permissions,
    canManageWorkspace: ctx.permissions.includes("admin"),
    profileAvailable: ctx.profileAvailable,
    identity: ctx.identity,
    isLinked: Boolean(ctx.identity.rollNo),
  }));
}
