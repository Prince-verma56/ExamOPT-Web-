import { PushNotificationPayload, PushNotificationProvider } from './interface';
import { db } from '@/server/db';
import { isFeatureEnabled } from '@/config/features';

export class MockPushNotificationProvider implements PushNotificationProvider {
  async send(payload: PushNotificationPayload): Promise<void> {
    console.log(`[MockPush] Sending to user ${payload.userId}: ${payload.title} - ${payload.body}`);
  }

  async sendToToken(token: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    console.log(`[MockPush] Sending to token ${token}: ${title} - ${body}`);
  }
}

export class FCMPushNotificationProvider implements PushNotificationProvider {
  async send(payload: PushNotificationPayload): Promise<void> {
    // 1. Fetch all devices for this user
    const devices = await db.deviceRegistration.findMany({
      where: { userId: payload.userId }
    });

    if (devices.length === 0) return;

    // 2. Map and send to all tokens
    for (const device of devices) {
      await this.sendToToken(device.token, payload.title, payload.body, payload.data);
    }
  }

  async sendToToken(token: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    // A real implementation would use Firebase Admin SDK:
    // admin.messaging().send({ token, notification: { title, body }, data });
    console.log(`[FCMPush] Sending real FCM to ${token}: ${title}`);
  }
}

let activeProvider: PushNotificationProvider | null = null;

export function getPushProvider(): PushNotificationProvider {
  if (activeProvider) return activeProvider;

  const mode = process.env.PUSH_MODE || 'mock';
  
  if (mode === 'real' && isFeatureEnabled('push_notifications')) {
    activeProvider = new FCMPushNotificationProvider();
  } else {
    activeProvider = new MockPushNotificationProvider();
  }

  return activeProvider;
}
