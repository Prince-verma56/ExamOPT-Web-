import { createApiRoute } from "@/server/api";
import { importCommitSchema } from "@/server/examopt/csv-schemas";
import { csvService } from "@/server/examopt/csv-service";

/**
 * Commits a previewed import. The server rebuilds the plan from fresh data and
 * refuses if it differs from the previewed plan or has any error.
 */
export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: importCommitSchema, rateLimit: { limit: 10, windowSeconds: 60 } },
    (ctx, input) => csvService.commit(input.entity, input.mode, input.csv, input.planHash, { userId: ctx.userId }),
  );
}
