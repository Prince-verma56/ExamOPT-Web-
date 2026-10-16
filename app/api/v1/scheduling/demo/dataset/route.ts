import { createApiRoute } from "@/server/api";
import { demoDatasetSchema } from "@/server/scheduling/schemas";
import { schedulingService } from "@/server/scheduling/service";

/** Judge Demo: readiness, preflight and conflict graph of the live snapshot or the Test Lab fixture. Read-only. */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: demoDatasetSchema }, (_ctx, input) => schedulingService.demoDataset(input.source));
}
