import { expect, test, describe } from 'vitest';
import { buildAIContext } from '../../ai/context';
import { getContextTemplate } from '../../ai/prompts/templates';

describe('AI Context Engine', () => {
  test('builds context with defaults', () => {
    const ctx = buildAIContext({ channel: 'voice' });
    expect(ctx.channel).toBe('voice');
    expect(ctx.role).toBe('guest');
    expect(ctx.timezone).toBe('UTC');
    expect(ctx.locale).toBe('en-US');
  });

  test('preserves overrides', () => {
    const ctx = buildAIContext({
      channel: 'text',
      role: 'admin',
      timezone: 'America/New_York'
    });
    expect(ctx.role).toBe('admin');
    expect(ctx.timezone).toBe('America/New_York');
  });

  test('context template includes metadata', () => {
    const ctx = buildAIContext({
      channel: 'text',
      role: 'user',
      metadata: { retrievedKnowledge: ['Fact 1', 'Fact 2'] }
    });
    const template = getContextTemplate(ctx);
    expect(template).toContain('Fact 1');
    expect(template).toContain('Fact 2');
    expect(template).toContain('User Role: user');
  });
});
