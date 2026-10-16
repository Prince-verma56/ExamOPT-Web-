import { z } from 'zod';

export const IntegrationEventSchema = z.object({
  id: z.string(),
  provider: z.string(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.string(),
});

export type IntegrationEvent = z.infer<typeof IntegrationEventSchema>;

export interface WebhookHandler {
  provider: string;
  
  /**
   * Verifies the incoming request signature.
   */
  verifySignature(req: Request, rawBody: string): Promise<boolean>;

  /**
   * Normalizes the provider-specific payload into a generic IntegrationEvent.
   */
  normalize(rawPayload: unknown): IntegrationEvent;
}
