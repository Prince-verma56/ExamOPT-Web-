export interface RealtimeEvent<T = unknown> {
  type: string;
  channel: string;
  payload: T;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface RealtimeProvider {
  /**
   * Publishes an event to a specific channel.
   */
  publish<T>(channel: string, event: Omit<RealtimeEvent<T>, 'timestamp' | 'channel'>): Promise<void>;
  
  /**
   * Subscribes to a specific channel (server-side tracking if applicable).
   */
  subscribe(channel: string, handler: (event: RealtimeEvent) => void): () => void;
}
