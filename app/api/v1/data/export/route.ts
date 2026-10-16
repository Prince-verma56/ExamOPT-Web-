import { createApiRoute } from "@/server/api";
import { exportSchema } from "@/server/examopt/csv-schemas";
import { csvService } from "@/server/examopt/csv-service";

/** Canonical CSV export of a table (or its header-only template), in the import format. */
export async function GET(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: exportSchema },
    async (_ctx, input) => (input.template ? csvService.template(input.entity) : csvService.exportEntity(input.entity)),
  );
}
