import { createApiRoute } from "@/server/api";
import { demoSimulateSchema } from "@/server/scheduling/schemas";
import { schedulingService } from "@/server/scheduling/service";

export const maxDuration = 60;

/**
 * Judge Demo conflict simulator: inject a violation into a copy of a real
 * schedule, validate it, optionally correct and revalidate. Sandbox only:
 * nothing is written to the canonical tables or the publication.
 */
export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: demoSimulateSchema, rateLimit: { limit: 60, windowSeconds: 60 } },
    (_ctx, { source, config, ...request }) => schedulingService.demoSimulate(source, request, config),
  );
}
