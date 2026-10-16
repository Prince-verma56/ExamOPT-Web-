/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AIContext } from '../context';

export interface AIMemoryItem {
  id: string;
  content: string;
  sourceId?: string; // e.g. conversationId or documentId
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface AIMemoryStore {
  /** Save a new piece of memory */
  remember(content: string, context: AIContext, metadata?: Record<string, any>): Promise<AIMemoryItem>;
  
  /** Retrieve relevant memories based on a query and context */
  retrieve(query: string, context: AIContext, limit?: number): Promise<AIMemoryItem[]>;
  
  /** Forget (delete) a specific memory item */
  forget(id: string, context: AIContext): Promise<boolean>;
}

export class MockMemoryStore implements AIMemoryStore {
  private memories: AIMemoryItem[] = [];

  async remember(content: string, context: AIContext, metadata?: Record<string, any>): Promise<AIMemoryItem> {
    const item: AIMemoryItem = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      content,
      sourceId: context.conversationId || undefined,
      createdAt: new Date(),
      metadata,
    };
    this.memories.push(item);
    return item;
  }

  async retrieve(query: string, context: AIContext, limit: number = 5): Promise<AIMemoryItem[]> {
    // In a mock, just return recent items related to this user/session if possible
    // A real implementation would use vector search (pgvector)
    return this.memories.slice(-limit);
  }

  async forget(id: string, context: AIContext): Promise<boolean> {
    const initialLength = this.memories.length;
    this.memories = this.memories.filter(m => m.id !== id);
    return this.memories.length < initialLength;
  }
}

