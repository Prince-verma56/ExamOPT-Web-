import { createApiRoute } from "@/server/api";
import { ALGORITHM_IDS } from "@/server/scheduling/domain";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

// Runs execute synchronously; the per-algorithm time limit is capped at 10 s.
export const maxDuration = 60;

const weight = z.number().min(0).max(100);
const runSchema = z.object({
  algorithms: z.array(z.enum(ALGORITHM_IDS as [string, ...string[]])).min(1).max(3)
    .refine((list) => new Set(list).size === list.length, "Each algorithm can be selected once."),
  config: z.object({
    maxNodes: z.number().int().min(1).max(2_000_000).optional(),
    timeLimitMs: z.number().int().min(50).max(10_000).optional(),
    weights: z.object({ sameDay: weight, backToBack: weight, capacityWaste: weight, daysUsed: weight }).partial().optional(),
  }).strict().optional(),
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
