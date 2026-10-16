 
 
import { describe, it, expect, vi } from 'vitest';
import { persistentRag } from '../../ai/rag/persistence';
import { buildAIContext } from '../../ai/context';

// Mock dependencies
vi.mock('@/server/db', () => ({
  db: {
    document: {
      create: vi.fn().mockResolvedValue({ id: 'doc-123' }),
    },
    $executeRaw: vi.fn().mockResolvedValue(true),
    $queryRaw: vi.fn().mockResolvedValue([
      { content: 'Confidential org data' }
    ])
  }
}));

vi.mock('../../ai/core/factory', () => ({
  getAIProvider: () => ({
    embed: vi.fn().mockResolvedValue({ embeddings: [Array(1536).fill(0.1)] })
  })
}));

describe('Persistent RAG', () => {
  it('should restrict retrieval based on userId if context is provided', async () => {
    const context = buildAIContext({
      channel: 'text',
      userId: 'user-1',
      role: 'user',
    });

    const results = await persistentRag.retrieve('test query', 3, context);
    expect(results).toContain('Confidential org data');
  });

  it('should correctly format context metadata when assembleContext is called', async () => {
    const context = buildAIContext({
      channel: 'text',
      userId: 'user-1',
      role: 'user',
    });

    const newContext = await persistentRag.assembleContext('test query', context);
    expect(newContext.metadata?.retrievedKnowledge).toContain('Confidential org data');
  });
});


