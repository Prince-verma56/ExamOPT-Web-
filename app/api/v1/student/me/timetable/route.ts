import { ApiRouteError, createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";

/**
 * GET /api/v1/student/me/timetable
 *
 * Secure personal timetable endpoint for the authenticated student.
 * Derives student identity strictly from the verified server-side session.
 * Does NOT accept or trust client-supplied roll numbers or query parameters.
 */
export async function GET(req: Request) {
  const response = await createApiRoute({ req, requireAuth: true }, async (ctx) => {
    if (!ctx.userId) {
      throw new ApiRouteError("UNAUTHORIZED", "Sign in to view your examination timetable.", 401);
    }

    const rollNo = ctx.identity.rollNo;
    if (!rollNo) {
      throw new ApiRouteError(
        "NOT_LINKED",
        "Your account is not linked to a student record. Ask the examination administrator to link your roll number.",
        403
      );
    }

    return schedulingService.studentTimetable(rollNo);
  });
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
