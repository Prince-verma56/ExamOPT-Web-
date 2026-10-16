import { createApiRoute } from '@/server/api';
import { db } from '@/server/db/index';
import { getJobQueue } from '@/server/jobs';

export async function GET(req: Request) {
  return createApiRoute(
    { req, requireAuth: false },
    async (ctx) => {
      // Light health check
      let dbStatus = 'disconnected';
      try {
        await db.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
      } catch (e) {
        dbStatus = 'error';
      }

      return {
        status: 'ok',
        environment: process.env.NODE_ENV,
        services: {
          database: dbStatus,
          jobs: 'active',
        },
        uptime: process.uptime(),
      };
    }
  );
}
