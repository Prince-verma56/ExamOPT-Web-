import { createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";

/** Preflight validation of the live dataset. Synthetic edge cases run through POST /api/v1/scheduling/test-lab. */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, async () => {
    const readiness = await schedulingService.readiness();
    return { status: readiness.status, fingerprint: readiness.fingerprint, counts: readiness.counts, preflight: readiness.preflight };
  });
}
