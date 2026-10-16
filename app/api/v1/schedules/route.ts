import { createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

const ListSchedulesSchema = z.object({
  runId: z.string().regex(/^[A-Za-z0-9-]{1,64}$/).optional(),
  slotCode: z.string().optional(),
  roomCode: z.string().optional(),
  program: z.string().optional(),
  semester: z.coerce.number().optional(),
  session: z.string().optional(),
});

/** Saved assignments of a run: the given runId, else the active published run, else the newest feasible engine run. */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: ListSchedulesSchema }, async (_ctx, input) => {
    const detail = await schedulingService.scheduleView(input.runId);
    const allocations = detail.assignments.filter((a) =>
      (!input.slotCode || a.slotId === input.slotCode) &&
      (!input.roomCode || a.roomId === input.roomCode) &&
      (!input.program || a.program?.toLowerCase() === input.program.toLowerCase()) &&
      (!input.semester || a.semester === input.semester) &&
      (!input.session || a.session === input.session.toLowerCase()),
    );
    return { totalAllocations: allocations.length, scheduleRun: detail.summary, validation: detail.liveValidation, allocations };
  });
}
