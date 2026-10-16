import { createApiRoute } from '@/server/api';
import { getJobQueue } from '@/server/jobs';
import { z } from 'zod';

const CreateJobSchema = z.object({
  name: z.string(),
  payload: z.record(z.string(), z.unknown()).optional(),
  options: z.object({
    priority: z.number().optional(),
    delay: z.number().optional(),
    retries: z.number().optional(),
  }).optional()
});

export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, schema: CreateJobSchema },
    async (ctx, input) => {
      const queue = getJobQueue();
      const dummyDef = {
        name: input.name,
        payloadSchema: z.any(),
        handler: async () => {},
      };
      // For a real implementation, you'd lookup the JobDefinition from a registry by name.
      const jobId = await queue.enqueue(dummyDef, input.payload || {});
      
      return {
        jobId,
        status: 'queued',
      };
    }
  );
}
