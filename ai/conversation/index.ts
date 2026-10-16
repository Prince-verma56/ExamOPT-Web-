/* eslint-disable @typescript-eslint/no-explicit-any */
 
export type ChannelType = 'text' | 'voice' | 'agent';
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AIMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface AIConversation {
  id: string;
  userId: string | null;
  channel: ChannelType;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

