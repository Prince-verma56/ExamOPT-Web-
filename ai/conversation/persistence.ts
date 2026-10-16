/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { db } from '@/server/db';
import { AIConversation, AIMessage, ChannelType, MessageRole } from './index';

export class ConversationStore {
  async createConversation(userId: string | null, channel: ChannelType, metadata?: any): Promise<AIConversation> {
    const conv = await db.conversation.create({
      data: {
        userId,
        channel,
        metadata: metadata || {},
      },
    });

    return {
      id: conv.id,
      userId: conv.userId,
      channel: conv.channel as ChannelType,
      messages: [],
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      metadata: (conv.metadata as any) || {},
    };
  }

  async getConversation(id: string): Promise<AIConversation | null> {
    const conv = await db.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!conv) return null;

    return {
      id: conv.id,
      userId: conv.userId,
      channel: conv.channel as ChannelType,
      messages: conv.messages.map(m => ({
        id: m.id,
        role: m.role as MessageRole,
        content: m.content,
        createdAt: m.createdAt,
        metadata: (m.metadata as any) || undefined,
      })),
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      metadata: (conv.metadata as any) || {},
    };
  }

  async addMessage(conversationId: string, role: MessageRole, content: string, metadata?: any): Promise<AIMessage> {
    // Get current max sequence
    const lastMsg = await db.message.findFirst({
      where: { conversationId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true },
    });
    const nextSeq = lastMsg ? lastMsg.sequence + 1 : 0;

    const msg = await db.message.create({
      data: {
        conversationId,
        role,
        content,
        sequence: nextSeq,
        metadata: metadata || {},
      },
    });

    return {
      id: msg.id,
      role: msg.role as MessageRole,
      content: msg.content,
      createdAt: msg.createdAt,
      metadata: (msg.metadata as any) || undefined,
    };
  }
}

export const conversationStore = new ConversationStore();

