import { createApiRoute } from '@/server/api';
import { db } from '@/server/db';

export async function GET(req: Request) {
  return createApiRoute(
    { req, requireAuth: true },
    async (ctx) => {
      const unreadCount = await db.notification.count({
        where: {
          userId: ctx.userId!,
          readAt: null,
        },
      });

      return { unreadCount };
    }
  );
}
