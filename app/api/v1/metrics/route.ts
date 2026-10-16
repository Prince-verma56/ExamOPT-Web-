import { createApiRoute } from "@/server/api";
import { examOptRepository } from "@/server/examopt/repository";

export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true }, async () => {
    const counts = await examOptRepository.counts();
    const warnings = [
      ...(counts.rooms.total === 0 ? ["Add at least one active room."] : []),
      ...(counts.timeSlots.available === 0 ? ["Add at least one available time slot."] : []),
      ...(counts.subjects.total === 0 ? ["Add at least one subject."] : []),
      ...(counts.studentGroups.total === 0 ? ["Add at least one student group."] : []),
    ];
    return { ...counts, dataQuality: { status: warnings.length ? "NEEDS_DATA" : "READY_FOR_SCHEDULING_INPUT", warnings } };
  });
}
