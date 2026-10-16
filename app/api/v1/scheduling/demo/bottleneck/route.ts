import { createApiRoute } from "@/server/api";
import { demoBottleneckSchema } from "@/server/scheduling/schemas";
import { schedulingService } from "@/server/scheduling/service";

export const maxDuration = 60;

/** Judge Demo scenario H: preflight proves a bottleneck on an in-memory variant. Nothing is saved. */
export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: demoBottleneckSchema, rateLimit: { limit: 30, windowSeconds: 60 } },
    (_ctx, input) => schedulingService.demoBottleneck(input.source),
  );
}
