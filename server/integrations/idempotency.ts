import { db } from '@/server/db/index';

/**
 * Generic Idempotency System backed by PostgreSQL.
 * Ensures that a given request or event (identified by an idempotency key)
 * is executed only once, regardless of retries.
 */
export class IdempotencyService {
  /**
   * Executes a block of code idempotently.
   * If the key was already processed successfully, returns the previous result.
   * If the key is currently processing, it throws to prevent duplicate execution.
   */
  static async execute<T>(key: string, handler: () => Promise<T>): Promise<T> {
    try {
      // Attempt to create a lock record
      const record = await db.idempotencyKey.upsert({
        where: { key },
        create: {
          key,
          status: 'processing',
        },
        update: {},
      });

      if (record.status === 'completed') {
        return record.result as T;
      }
      if (record.status === 'processing' && record.createdAt.getTime() > Date.now() - 5 * 60 * 1000) {
        // If it's been processing for > 5 minutes, assume it crashed and retry (simplification)
        throw new Error(`[Idempotency] Key ${key} is currently being processed.`);
      }

      // Execute handler
      const result = await handler();

      // Mark as completed
      await db.idempotencyKey.update({
        where: { key },
        data: {
          status: 'completed',
          result: result as any,
        },
      });

      return result;
    } catch (error) {
      // Mark as failed so it can be retried if needed
      await db.idempotencyKey.update({
        where: { key },
        data: {
          status: 'failed',
        },
      });
      throw error;
    }
  }
}
