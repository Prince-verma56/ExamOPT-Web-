import { ApiRouteError, createApiRoute } from "@/server/api";
import { exportKindSchema, runIdSchema } from "@/server/scheduling/schemas";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

const exportSchema = z.object({ kind: exportKindSchema.default("timetable"), runId: runIdSchema.optional() }).strict();

/**
 * CSV export (reference `GET /api/v1/timetable/export/csv`). Without a runId it
 * exports the active published timetable, for any signed-in user; a specific
 * run may be a draft, so it requires an administrator. The CSV text is
 * returned in the standard envelope as `data.csv`.
 */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, schema: exportSchema }, (ctx, input) => {
    if (input.runId && !ctx.permissions.includes("admin")) throw new ApiRouteError("FORBIDDEN", "Only administrators can export draft scheduling runs.", 403);
    return schedulingService.exportCsv(input.kind, input.runId);
  });
}
