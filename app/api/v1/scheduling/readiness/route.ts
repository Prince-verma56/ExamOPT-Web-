import { createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";

export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, () => schedulingService.readiness());
}
