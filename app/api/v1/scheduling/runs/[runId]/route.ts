import { createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

const runIdSchema = z.string().regex(/^[A-Za-z0-9-]{1,64}$/);

export async function GET(req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, async () => {
    const parsed = runIdSchema.safeParse(runId);
    if (!parsed.success) throw Object.assign(new Error("Invalid run id."), { code: "VALIDATION_ERROR", status: 400 });
    return schedulingService.runDetail(parsed.data);
  });
}
