import { RealtimeProvider, RealtimeEvent } from '../interface';

export class MockRealtimeProvider implements RealtimeProvider {
  private listeners: Map<string, Array<(event: RealtimeEvent) => void>> = new Map();

  async publish<T>(channel: string, event: Omit<RealtimeEvent<T>, 'timestamp' | 'channel'>): Promise<void> {
    const fullEvent: RealtimeEvent<T> = {
      ...event,
      channel,
      timestamp: new Date().toISOString(),
    };

    console.log(`[MockRealtime] Publishing to ${channel}:`, fullEvent.type);

    const handlers = this.listeners.get(channel) || [];
    handlers.forEach(handler => {
      try {
        handler(fullEvent as RealtimeEvent<unknown>);
      } catch (err) {
        console.error(`[MockRealtime] Error in handler for channel ${channel}:`, err);
      }
    });
  }

  subscribe(channel: string, handler: (event: RealtimeEvent) => void): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, []);
    }
    this.listeners.get(channel)!.push(handler);

    return () => {
      const handlers = this.listeners.get(channel);
      if (handlers) {
        this.listeners.set(channel, handlers.filter(h => h !== handler));
      }
    };
  }
}
