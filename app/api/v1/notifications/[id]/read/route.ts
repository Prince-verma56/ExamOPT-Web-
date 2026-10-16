import { createApiRoute } from '@/server/api';
import { notificationService } from '@/server/notifications';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return createApiRoute(
    { req, requireAuth: true },
    async (ctx) => {
      const success = await notificationService.markAsRead(resolvedParams.id, ctx.userId!);
      return { success };
    }
  );
}
