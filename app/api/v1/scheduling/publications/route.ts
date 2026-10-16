import { createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";

/** Publication history, newest version first. */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, async () => ({ publications: await schedulingService.publications() }));
}
