import { RealtimeProvider, RealtimeEvent } from '../interface';

export class SSERealtimeProvider implements RealtimeProvider {
  // In-memory mapping of user/channel to their response controller
  private connections: Map<string, Array<ReadableStreamDefaultController>> = new Map();

  async publish<T>(channel: string, event: Omit<RealtimeEvent<T>, 'timestamp' | 'channel'>): Promise<void> {
    const fullEvent: RealtimeEvent<T> = {
      ...event,
      channel,
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(fullEvent);
    const message = `data: ${payloadString}\n\n`;

    const controllers = this.connections.get(channel) || [];
    controllers.forEach(controller => {
      try {
        controller.enqueue(new TextEncoder().encode(message));
      } catch (err) {
        console.error(`[SSE] Failed to send to connection on channel ${channel}`);
      }
    });
  }

  subscribe(channel: string, handler: (event: RealtimeEvent) => void): () => void {
    // Subscribing server-side via this interface isn't typical for SSE unless it's a loopback
    throw new Error('Server-side subscribe is not supported for SSE provider. Use the API endpoint.');
  }

  /**
   * Registers a client connection to a channel.
   * Returns a cleanup function.
   */
  addConnection(channel: string, controller: ReadableStreamDefaultController): () => void {
    if (!this.connections.has(channel)) {
      this.connections.set(channel, []);
    }
    this.connections.get(channel)!.push(controller);

    return () => {
      const controllers = this.connections.get(channel);
      if (controllers) {
        this.connections.set(
          channel,
          controllers.filter(c => c !== controller)
        );
      }
    };
  }
}
