import { ApiRouteError, createApiRoute } from "@/server/api";
import { decideTimetableAccess, type Access } from "@/modules/auth/access";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

const querySchema = z.object({ rollNo: z.string().trim().max(40).optional() }).strict();

/**
 * A student's exams from the active published timetable (reference
 * `GET /api/v1/timetable/student`). Students get only the roll number linked to
 * their account; administrators may name any roll number.
 */
export async function GET(req: Request) {
  const response = await createApiRoute({ req, requireAuth: true, schema: querySchema }, (ctx, input) => {
    const decision = decideTimetableAccess("student", { role: ctx.role as Access["role"], identity: ctx.identity }, input.rollNo);
    if (!decision.allowed) throw new ApiRouteError(decision.code, decision.message, decision.status);
    return schedulingService.studentTimetable(decision.id);
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
