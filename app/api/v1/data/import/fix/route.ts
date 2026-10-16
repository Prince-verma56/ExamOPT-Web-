import { createApiRoute } from "@/server/api";
import { importFixSchema } from "@/server/examopt/csv-schemas";
import { csvService } from "@/server/examopt/csv-service";

/** Applies chosen fixes to an uploaded CSV and returns the corrected file with a fresh dry run. Nothing is written. */
export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: importFixSchema, rateLimit: { limit: 60, windowSeconds: 60 } },
    (_ctx, input) => csvService.fix(input.entity, input.mode, input.csv, input.actions),
  );
}
