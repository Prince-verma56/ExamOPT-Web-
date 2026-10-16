import { createApiRoute } from '@/server/api';
import { notificationService } from '@/server/notifications';

export async function POST(req: Request) {
  return createApiRoute(
    { req, requireAuth: true },
    async (ctx) => {
      const success = await notificationService.markAllAsRead(ctx.userId!);
      return { success };
    }
  );
}
