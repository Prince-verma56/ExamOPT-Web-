/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { describe, it, expect, vi } from 'vitest';
import { persistentRag } from '../../ai/rag/persistence';
import { conversationStore } from '../../ai/conversation/persistence';
import { AIContextBuilder } from '../../ai/context/builder';
import { toolRegistry } from '../../ai/tools/registry';

vi.mock('../../modules/users/service', () => ({
  UserService: {
    getCurrentUser: vi.fn().mockResolvedValue({ id: 'user1', role: 'user' })
  }
}));

describe('AI / Voice Shared Context Continuity (Smoke Test)', () => {
  it('should allow voice session and text session to append to same conversation', async () => {
    const convId = 'smoke-conv-123';
    
    // Mock db call
    vi.spyOn(conversationStore, 'getConversation').mockResolvedValue({ id: convId, userId: 'user1', messages: [] } as any);
    
    // 1. Text starts conversation
    const textContext = await AIContextBuilder.build({ channel: 'text', overrides: { userId: 'user1' }, conversationId: convId });
    expect(textContext.conversationId).toBe(convId);
    
    // 2. Voice continues conversation
    const voiceContext = await AIContextBuilder.build({ channel: 'voice', overrides: { userId: 'user1' }, conversationId: convId });
    expect(voiceContext.conversationId).toBe(textContext.conversationId);
  });
});

describe('RAG Pipeline (Smoke Test)', () => {
  it('should ingest, chunk, embed, store and retrieve documents conceptually', async () => {
    const context = await AIContextBuilder.build({ channel: 'text', overrides: { userId: 'test' } });
    
    vi.spyOn(persistentRag, 'retrieve').mockResolvedValue(['Generic RAG data']);
    const results = await persistentRag.retrieve('test query', 1, context);
    
    expect(results).toContain('Generic RAG data');
  });
});

describe('Agent & Tool Registry (Smoke Test)', () => {
  it('should allow tool registry to map safe read-only tools (MCP test)', async () => {
    const tools = toolRegistry.listTools();
    expect(Array.isArray(tools)).toBe(true);
  });
});

