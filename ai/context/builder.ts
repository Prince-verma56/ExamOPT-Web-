 
 
import { AIContext, buildAIContext } from './index';
import { UserService } from '@/modules/users/service';
import { conversationStore } from '../conversation/persistence';
import { PersistentMemoryStore } from '../memory/persistence';
import { persistentRag } from '../rag/persistence';

export interface ContextBuilderOptions {
  channel: 'text' | 'voice' | 'agent';
  conversationId?: string;
  includeMemory?: boolean;
  includeKnowledge?: boolean;
  includeHistory?: boolean;
  knowledgeQuery?: string;
  images?: string[];
  audio?: string[];
  documents?: string[];
  overrides?: Partial<AIContext>;
}

export class AIContextBuilder {
  static async build(options: ContextBuilderOptions): Promise<AIContext> {
    const user = await UserService.getCurrentUser();

    // 1. Base Identity
    let ctx = buildAIContext({
      channel: options.channel,
      userId: user?.id || null,
      role: user?.role || 'guest',
      permissions: user?.role === 'admin' ? ['admin', 'user'] : ['user'],
      conversationId: options.conversationId,
      images: options.images,
      audio: options.audio,
      documents: options.documents,
      ...options.overrides,
    });

    // 2. Conversation History
    if (options.includeHistory && options.conversationId) {
      const conv = await conversationStore.getConversation(options.conversationId);
      if (conv) {
        ctx.recentHistory = conv.messages;
      }
    }

    // 3. Memory
    if (options.includeMemory && user?.id) {
      const memoryStore = new PersistentMemoryStore();
      const memories = await memoryStore.retrieve('general', ctx, 5); // Example query
      if (memories.length > 0) {
        ctx.metadata = ctx.metadata || {};
        ctx.metadata.memories = memories.map(m => m.content);
      }
    }

    // 4. RAG / Retrieved Knowledge
    if (options.includeKnowledge && options.knowledgeQuery) {
      ctx = await persistentRag.assembleContext(options.knowledgeQuery, ctx);
    }

    return ctx;
  }
}

