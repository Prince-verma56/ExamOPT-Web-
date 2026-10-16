import { createApiRoute } from '@/server/api';
import { db } from '@/server/db/index';
import { getJobQueue } from '@/server/jobs';
import { examOptRepository } from '@/server/examopt/repository';

export async function GET(req: Request) {
  return createApiRoute(
    { req, requireAuth: false },
    async (ctx) => {
      // The template database and the scheduling data source are distinct
      // integrations. Report both so the frontend never mistakes a healthy
      // application process for a scheduler that can read its live dataset.
      const [database, schedulingData] = await Promise.all([
        (async () => {
          try {
            await db.$queryRaw`SELECT 1`;
            return 'connected' as const;
          } catch {
            return 'error' as const;
          }
        })(),
        examOptRepository.health(),
      ]);

      return {
        status: database === 'connected' && schedulingData.connected ? 'ok' : 'degraded',
        environment: process.env.NODE_ENV,
        services: {
          database,
          schedulingData,
          jobs: 'active',
        },
        uptime: process.uptime(),
      };
    }
  );
}
