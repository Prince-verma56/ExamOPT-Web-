/* eslint-disable @typescript-eslint/no-explicit-any */
 
export interface AIContext {
  userId?: string | null;
  sessionId?: string | null;
  conversationId?: string | null;
  channel: 'text' | 'voice' | 'agent';
  locale: string;
  timezone: string;
  role: string;
  permissions: string[];
  recentHistory?: any[]; // To be strongly typed with Message later
  memoryRefs?: string[];
  domain?: string;
  metadata?: Record<string, any>;
  images?: string[];
  audio?: string[];
  documents?: string[];
}

/**
 * Normalizes input identity into an AIContext object.
 * This ensures the LLM never dictates the permissions, only the server does.
 */
export function buildAIContext(options: Partial<AIContext> & { channel: 'text' | 'voice' | 'agent' }): AIContext {
  return {
    userId: options.userId || null,
    sessionId: options.sessionId || null,
    conversationId: options.conversationId || null,
    channel: options.channel,
    locale: options.locale || 'en-US',
    timezone: options.timezone || 'UTC',
    role: options.role || 'guest',
    permissions: options.permissions || [],
    recentHistory: options.recentHistory || [],
    memoryRefs: options.memoryRefs || [],
    domain: options.domain || 'general',
    metadata: options.metadata || {},
    images: options.images || [],
    audio: options.audio || [],
    documents: options.documents || [],
  };
}

