import { ApiRouteError, createApiRoute } from "@/server/api";
import { decideTimetableAccess, type Access } from "@/modules/auth/access";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

const querySchema = z.object({ facultyId: z.string().trim().max(40).optional() }).strict();

/**
 * A faculty member's invigilation duties from the active published timetable
 * (reference `GET /api/v1/timetable/faculty`). Faculty get only their own
 * linked record; administrators may name any faculty id.
 */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, schema: querySchema }, (ctx, input) => {
    const decision = decideTimetableAccess("faculty", { role: ctx.role as Access["role"], identity: ctx.identity }, input.facultyId);
    if (!decision.allowed) throw new ApiRouteError(decision.code, decision.message, decision.status);
    return schedulingService.facultyTimetable(decision.id);
  });
}
