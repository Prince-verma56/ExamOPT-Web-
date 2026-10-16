import { ApiRouteError, createApiRoute } from "@/server/api";
import { decideTimetableAccess, type Access } from "@/modules/auth/access";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

const StudentLookupSchema = z.object({ rollNo: z.string().trim().max(40).optional() }).strict();

/**
 * Kept for existing clients; same behaviour as GET /api/v1/timetable/student.
 * It used to answer anonymous requests with generated sample data. It now
 * requires sign-in and returns the caller's own published exams (any roll
 * number for administrators).
 */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, schema: StudentLookupSchema }, (ctx, input) => {
    const decision = decideTimetableAccess("student", { role: ctx.role as Access["role"], identity: ctx.identity }, input.rollNo);
    if (!decision.allowed) throw new ApiRouteError(decision.code, decision.message, decision.status);
    return schedulingService.studentTimetable(decision.id);
  });
}
