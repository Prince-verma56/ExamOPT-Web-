import { WebhookHandler, IntegrationEvent } from './interface';
import { IdempotencyService } from '../idempotency';
import { eventBus } from '../../events/bus';

export class WebhookService {
  private handlers: Map<string, WebhookHandler> = new Map();

  registerHandler(handler: WebhookHandler) {
    this.handlers.set(handler.provider, handler);
  }

  async processIncoming(provider: string, req: Request, rawBody: string): Promise<void> {
    const handler = this.handlers.get(provider);
    if (!handler) throw new Error(`No webhook handler registered for provider: ${provider}`);

    // 1. Verify Signature
    const isValid = await handler.verifySignature(req, rawBody);
    if (!isValid) throw new Error(`Invalid signature for provider: ${provider}`);

    // 2. Parse Payload
    const rawPayload = JSON.parse(rawBody);

    // 3. Normalize
    const normalizedEvent = handler.normalize(rawPayload);

    // 4. Idempotent Execution
    await IdempotencyService.execute(`webhook-${provider}-${normalizedEvent.id}`, async () => {
      // 5. Emit normalized event internally
      await eventBus.publish(`integration.${provider}.${normalizedEvent.type}`, normalizedEvent);
    });
  }
}

export const webhookService = new WebhookService();
