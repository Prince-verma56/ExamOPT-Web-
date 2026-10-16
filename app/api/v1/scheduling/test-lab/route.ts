import { createApiRoute } from "@/server/api";
import { schedulingService } from "@/server/scheduling/service";
import { z } from "zod";

const testLabSchema = z.object({ caseIds: z.array(z.string().max(64)).max(32).optional() }).strict();

export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, requiredPermissions: ["admin"], schema: testLabSchema, rateLimit: { limit: 30, windowSeconds: 60 } },
    async (_ctx, input) => schedulingService.testLab(input.caseIds),
  );
}
