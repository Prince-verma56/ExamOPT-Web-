import { ApiRouteError, createApiRoute } from "@/server/api";
import { runIdSchema } from "@/server/scheduling/schemas";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

const publishSchema = z.object({ title: z.string().trim().min(3).max(160).optional() }).strict();

/**
 * Publish a run as the new active timetable version. The service re-checks the
 * publication gate on fresh data: engine run, FEASIBLE, passing live validation,
 * valid invigilation. Earlier versions are kept as history.
 */
export async function POST(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: publishSchema, rateLimit: { limit: 10, windowSeconds: 60 } },
    async (ctx, input) => {
      const parsed = runIdSchema.safeParse(runId);
      if (!parsed.success) throw new ApiRouteError("VALIDATION_ERROR", "Invalid run id.", 400);
      return schedulingService.publish(parsed.data, input.title, { userId: ctx.userId, email: ctx.email });
    },
  );
}
