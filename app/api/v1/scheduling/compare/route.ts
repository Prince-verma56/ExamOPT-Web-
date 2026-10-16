import { createApiRoute } from "@/server/api";
import { engineConfigSchema, runIdSchema } from "@/server/scheduling/schemas";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

export const maxDuration = 60;

const compareSchema = z.object({
  runIds: z.string().transform((value) => [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))])
    .pipe(z.array(runIdSchema).min(1).max(8)),
});

const benchmarkSchema = z.object({ config: engineConfigSchema.optional() }).strict();

/** Compare saved runs. */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: compareSchema }, (_ctx, input) => schedulingService.compare(input.runIds));
}

/** Benchmark every algorithm on the current dataset, in memory. Nothing is saved (reference `compare_all`). */
export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: benchmarkSchema, rateLimit: { limit: 20, windowSeconds: 60 } },
    (_ctx, input) => schedulingService.benchmark(input.config),
  );
}
