/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { expect, test, describe } from 'vitest';
import { toolRegistry } from '../../ai/tools/registry';
import { buildAIContext } from '../../ai/context';
import { z } from 'zod';

describe('AI Tool Registry', () => {
  test('registers and retrieves tool', () => {
    const tool = {
      name: 'testTool',
      description: 'A test tool',
      schema: z.object({ input: z.string() }),
      permissionLevel: 'READ' as const,
      executor: async (i: any) => i.input,
    };
    
    toolRegistry.register(tool);
    const retrieved = toolRegistry.getTool('testTool');
    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('testTool');
  });

  test('enforces permissions', () => {
    const adminTool = {
      name: 'adminTool',
      description: 'Admin only',
      schema: z.object({}),
      permissionLevel: 'DESTRUCTIVE' as const,
      executor: async () => 'done',
    };
    toolRegistry.register(adminTool);

    const guestContext = buildAIContext({ channel: 'text', role: 'guest' });
    const adminContext = buildAIContext({ channel: 'text', role: 'admin' });

    expect(toolRegistry.hasPermission(guestContext, adminTool)).toBe(false);
    expect(toolRegistry.hasPermission(adminContext, adminTool)).toBe(true);
  });

  test('executes tool if permitted', async () => {
    const echoTool = {
      name: 'echo',
      description: 'Echo',
      schema: z.object({ text: z.string() }),
      permissionLevel: 'READ' as const,
      executor: async (i: any) => i.text,
    };
    toolRegistry.register(echoTool);

    const ctx = buildAIContext({ channel: 'text' });
    const result = await toolRegistry.executeTool('echo', { text: 'hello' }, ctx);
    expect(result).toBe('hello');
  });

  test('throws if unpermitted', async () => {
    const privateTool = {
      name: 'private',
      description: 'Private',
      schema: z.object({}),
      permissionLevel: 'DESTRUCTIVE' as const,
      executor: async () => 'secret',
    };
    toolRegistry.register(privateTool);

    const ctx = buildAIContext({ channel: 'text', role: 'guest' });
    await expect(toolRegistry.executeTool('private', {}, ctx)).rejects.toThrow(/Unauthorized/);
  });
});

