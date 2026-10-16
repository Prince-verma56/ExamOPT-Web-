import { createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";

/** Latest engine run per algorithm, ranked feasibility-first. */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, async () => {
    const runs = await schedulingService.listRuns(200);
    const latest = ["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"].map((algorithm) => runs.find((r) => r.source === "engine" && r.algorithm === algorithm)).filter((r) => r !== undefined);
    return schedulingService.compare(latest.map((r) => r.runId));
  });
}
