import { createApiRoute } from "@/server/api";
import { examOptRepository } from "@/server/examopt/repository";

export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, async () => {
    const counts = await examOptRepository.counts();
    const warnings = [
      ...(counts.rooms.total === 0 ? ["Add at least one room."] : []),
      ...(counts.timeSlots.total === 0 ? ["Add at least one time slot."] : []),
      ...(counts.subjects.total === 0 ? ["Add at least one subject."] : []),
      ...(counts.studentGroups.total === 0 ? ["Add at least one student group."] : []),
      ...(counts.students.enrollments === 0 ? ["Import student-subject enrollments; without them no conflicts can be detected."] : []),
    ];
    return { ...counts, dataQuality: { status: warnings.length ? "NEEDS_DATA" : "READY_FOR_SCHEDULING_INPUT", warnings } };
  });
}
