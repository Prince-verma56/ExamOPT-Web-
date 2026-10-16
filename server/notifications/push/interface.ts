export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushNotificationProvider {
  /**
   * Send a push notification to a specific user
   * Resolves the user's registered devices and sends appropriately
   */
  send(payload: PushNotificationPayload): Promise<void>;
  
  /**
   * Send a push notification directly to a device token
   */
  sendToToken(token: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
}
