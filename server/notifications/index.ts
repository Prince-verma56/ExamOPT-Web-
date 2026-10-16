import { z } from 'zod';
import { db } from '@/server/db/index';
import { getRealtimeProvider } from '../realtime';
import { getPushProvider } from './push';
import { isFeatureEnabled } from '@/config/features';

export const NotificationSchema = z.object({
  userId: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  channel: z.enum(['in-app', 'email', 'push']).default('in-app'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type NotificationPayload = z.infer<typeof NotificationSchema>;

export interface NotificationService {
  notify(payload: NotificationPayload): Promise<void>;
  markAsRead(id: string, userId: string): Promise<boolean>;
  markAllAsRead(userId: string): Promise<boolean>;
}

export class DefaultNotificationService implements NotificationService {
  async notify(payload: NotificationPayload): Promise<void> {
    if (!isFeatureEnabled('notifications')) {
      console.log(`[Notifications Disabled] Would notify user ${payload.userId}: ${payload.title}`);
      return;
    }

    // 1. Persist if in-app
    if (payload.channel === 'in-app') {
      const record = await db.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          channel: payload.channel,
          metadata: (payload.metadata as Record<string, any>) ?? {},
        },
      });

      // 2. Realtime broadcast
      if (isFeatureEnabled('realtime')) {
        const realtime = getRealtimeProvider();
        await realtime.publish(`user-${payload.userId}`, {
          type: 'notification',
          payload: record,
        });
      }
    }

    // 3. Email
    if (payload.channel === 'email' && isFeatureEnabled('email')) {
      // Send email via email provider
    }

    // 4. Push
    if (payload.channel === 'push') {
      const pushProvider = getPushProvider();
      await pushProvider.send({
        userId: payload.userId,
        title: payload.title,
        body: payload.message,
        data: payload.metadata as Record<string, string>,
      });
    }
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    if (!isFeatureEnabled('notifications')) return false;

    const res = await db.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    return res.count > 0;
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    if (!isFeatureEnabled('notifications')) return false;

    const res = await db.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count > 0;
  }
}

export const notificationService = new DefaultNotificationService();
