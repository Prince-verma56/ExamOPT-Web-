import { isFeatureEnabled } from '@/config/features';

export type EventPayload = Record<string, any>;

export interface InternalEvent<T extends EventPayload = EventPayload> {
  type: string;
  payload: T;
  timestamp: string;
  metadata?: Record<string, any>;
}

type EventHandler<T extends EventPayload = EventPayload> = (event: InternalEvent<T>) => void | Promise<void>;

/**
 * Universal Event Bus
 * Simple in-memory pub/sub for internal application events.
 * Do NOT use this for cross-instance or distributed messaging.
 * Useful for decoupling modules (e.g., triggering a background job when a user signs up).
 */
export class EventBus {
  private static instance: EventBus;
  private listeners: Map<string, EventHandler<any>[]> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe<T extends EventPayload>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.listeners.get(eventType);
      if (handlers) {
        this.listeners.set(
          eventType,
          handlers.filter((h) => h !== handler)
        );
      }
    };
  }

  public async publish<T extends EventPayload>(eventType: string, payload: T, metadata?: Record<string, any>): Promise<void> {
    const event: InternalEvent<T> = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const handlers = this.listeners.get(eventType) || [];
    
    // Execute handlers concurrently without awaiting them to block the publisher
    // However, catching errors is essential so they don't crash the process
    handlers.forEach(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(`[EventBus] Error handling event ${eventType}:`, error);
      }
    });
  }
}

export const eventBus = EventBus.getInstance();
