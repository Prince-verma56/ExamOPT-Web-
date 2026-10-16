import { createApiRoute } from '@/server/api';
import { db } from '@/server/db';
import { z } from 'zod';

const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

export async function GET(req: Request) {
  return createApiRoute(
    { req, requireAuth: true, schema: PaginationSchema },
    async (ctx, input) => {
      const skip = (input.page - 1) * input.pageSize;
      
      const [total, items] = await Promise.all([
        db.notification.count({ where: { userId: ctx.userId! } }),
        db.notification.findMany({
          where: { userId: ctx.userId! },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.pageSize,
        }),
      ]);

      return {
        items,
        page: input.page,
        pageSize: input.pageSize,
        total,
        totalPages: Math.ceil(total / input.pageSize),
      };
    }
  );
}
