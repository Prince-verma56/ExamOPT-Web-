import { createApiRoute } from "@/server/api";
import { importPreviewSchema } from "@/server/examopt/csv-schemas";
import { csvService } from "@/server/examopt/csv-service";

/** Dry run: validate a CSV file against the current data and return the write plan. Nothing is written. */
export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: importPreviewSchema, rateLimit: { limit: 30, windowSeconds: 60 } },
    (_ctx, input) => csvService.preview(input.entity, input.mode, input.csv),
  );
}
