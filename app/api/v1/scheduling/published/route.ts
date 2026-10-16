import { createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";

/**
 * The active published timetable for any signed-in user (web and mobile).
 * It holds exams, rooms, slots and invigilators only: no student data, no drafts.
 */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true }, () => schedulingService.publishedSchedule());
}
