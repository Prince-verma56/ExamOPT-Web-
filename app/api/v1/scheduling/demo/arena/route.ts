import { createApiRoute } from "@/server/api";
import { demoArenaSchema } from "@/server/scheduling/schemas";
import { schedulingService } from "@/server/scheduling/service";

export const maxDuration = 60;

/** Judge Demo: run the chosen algorithms on one snapshot with execution traces. In memory; nothing is saved. */
export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: demoArenaSchema, rateLimit: { limit: 30, windowSeconds: 60 } },
    (_ctx, input) => schedulingService.demoArena(input.source, input.algorithms, input.config, input.benchmark ?? true),
  );
}
