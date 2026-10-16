/* eslint-disable @typescript-eslint/no-explicit-any */
 
export interface AIObservabilityEvent {
  timestamp: Date;
  requestType: 'generate' | 'stream' | 'structured' | 'embed';
  provider: string;
  model: string;
  latencyMs: number;
  tokens?: number;
  toolCalls?: string[];
  error?: any;
}

export class ObservabilityLogger {
  logEvent(event: AIObservabilityEvent) {
    if (process.env.LANGSMITH_TRACING === 'true') {
      // In a real implementation, this would sync with LangSmith / Tracing provider
      console.log(`[LangSmith Trace] [${event.requestType}] ${event.provider}/${event.model} - ${event.latencyMs}ms`);
    } else {
      console.log(`[AI Observability] [${event.requestType}] ${event.provider}/${event.model} - ${event.latencyMs}ms`);
    }
  }
}

export const aiLogger = new ObservabilityLogger();

