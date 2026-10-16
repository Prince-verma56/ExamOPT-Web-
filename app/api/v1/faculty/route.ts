import { createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";

/** Faculty roster from the canonical `faculty` table, with duty load in the active published timetable. */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, () => schedulingService.facultyRoster());
}
