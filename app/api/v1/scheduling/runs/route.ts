import { createApiRoute } from "@/server/api";
import { ALGORITHM_IDS } from "@/server/scheduling/domain";
import { engineConfigSchema } from "@/server/scheduling/schemas";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

// Runs execute synchronously; the per-algorithm time limit is capped at 10 s.
export const maxDuration = 60;

const runSchema = z.object({
  algorithms: z.array(z.enum(ALGORITHM_IDS as [string, ...string[]])).min(1).max(3)
    .refine((list) => new Set(list).size === list.length, "Each algorithm can be selected once."),
  config: engineConfigSchema.optional(),
}).strict();

const listSchema = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });

export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: listSchema }, async (_ctx, input) => ({ runs: await schedulingService.listRuns(input.limit) }));
}

export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: runSchema, rateLimit: { limit: 30, windowSeconds: 60 } },
    // The triggering user comes from the verified session, never from the request body.
    (ctx, input) => schedulingService.execute(input.algorithms as (typeof ALGORITHM_IDS)[number][], input.config, ctx.userId),
  );
}
