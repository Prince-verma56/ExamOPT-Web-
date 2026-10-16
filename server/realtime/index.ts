import { isFeatureEnabled } from '@/config/features';
import { RealtimeProvider } from './interface';
import { MockRealtimeProvider } from './providers/mock';
import { SSERealtimeProvider } from './providers/sse';

let activeProvider: RealtimeProvider | null = null;

export function getRealtimeProvider(): RealtimeProvider {
  if (!isFeatureEnabled('realtime')) {
    if (!activeProvider) activeProvider = new MockRealtimeProvider();
    return activeProvider;
  }

  if (!activeProvider) {
    // Use SSE provider for real implementation
    activeProvider = new SSERealtimeProvider();
  }

  return activeProvider;
}

// Type guard to access SSE specific methods
export function isSSEProvider(provider: RealtimeProvider): provider is SSERealtimeProvider {
  return provider instanceof SSERealtimeProvider;
}
