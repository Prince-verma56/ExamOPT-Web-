import { createApiRoute } from "@/server/api";
import { uploadTableSchema } from "@/server/scheduling/schemas";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

const uploadSchema = z.object({
  table: uploadTableSchema,
  csv: z.string().min(1).max(2_000_000),
}).strict();

/** Data quality report on the live tables (reference `POST /api/data/validate`). */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, () => schedulingService.dataQuality());
}

/** Dry run: validate one CSV table in the context of the live data. Nothing is written. */
export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: uploadSchema, rateLimit: { limit: 30, windowSeconds: 60 } },
    (_ctx, input) => schedulingService.validateUpload(input.table, input.csv),
  );
}
