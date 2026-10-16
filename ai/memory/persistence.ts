/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { db } from '@/server/db';
import { AIContext } from '../context';
import { AIMemoryStore, AIMemoryItem } from './index';

export class PersistentMemoryStore implements AIMemoryStore {
  async remember(content: string, context: AIContext, metadata?: Record<string, any>): Promise<AIMemoryItem> {
    if (!context.userId) {
      throw new Error("Cannot remember without an authenticated userId");
    }

    const item = await db.memory.create({
      data: {
        userId: context.userId,
        content,
        sourceId: context.conversationId || null,
        metadata: metadata || {},
        importance: metadata?.importance || 0,
      }
    });

    return {
      id: item.id,
      content: item.content,
      sourceId: item.sourceId || undefined,
      createdAt: item.createdAt,
      metadata: (item.metadata as any) || undefined,
    };
  }

  async retrieve(query: string, context: AIContext, limit: number = 5): Promise<AIMemoryItem[]> {
    if (!context.userId) return [];

    // Semantic search could be implemented here with pgvector.
    // For now, returning latest important memories.
    const memories = await db.memory.findMany({
      where: { userId: context.userId },
      orderBy: [
        { importance: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    return memories.map(m => ({
      id: m.id,
      content: m.content,
      sourceId: m.sourceId || undefined,
      createdAt: m.createdAt,
      metadata: (m.metadata as any) || undefined,
    }));
  }

  async forget(id: string, context: AIContext): Promise<boolean> {
    if (!context.userId) return false;
    
    // Ensure we only delete memories belonging to this user
    try {
      await db.memory.delete({
        where: { id, userId: context.userId },
      });
      return true;
    } catch {
      return false;
    }
  }
}

