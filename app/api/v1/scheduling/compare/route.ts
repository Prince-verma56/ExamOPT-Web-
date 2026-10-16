import { createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

const compareSchema = z.object({
  runIds: z.string().transform((value) => [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))])
    .pipe(z.array(z.string().regex(/^[A-Za-z0-9-]{1,64}$/)).min(1).max(8)),
});

export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: compareSchema }, (_ctx, input) => schedulingService.compare(input.runIds));
}
