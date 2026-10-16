/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { z } from 'zod';
import { AIContext } from '../context';

export type ToolPermissionLevel = 'READ' | 'WRITE' | 'DESTRUCTIVE' | 'FINANCIAL' | 'EXTERNAL';

export interface AITool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  permissionLevel: ToolPermissionLevel;
  executor: (input: TInput, context: AIContext) => Promise<TOutput>;
}

class ToolRegistry {
  private tools: Map<string, AITool> = new Map();

  register(tool: AITool) {
    if (this.tools.has(tool.name)) {
      console.warn(`[ToolRegistry] Tool ${tool.name} is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): AITool | undefined {
    return this.tools.get(name);
  }

  listTools(): AITool[] {
    return Array.from(this.tools.values());
  }

  hasPermission(context: AIContext, tool: AITool): boolean {
    // Basic mapping of tool permission level to required context roles/permissions.
    // In a real app, this would be highly customized.
    switch (tool.permissionLevel) {
      case 'READ':
        return true; // Everyone can read
      case 'WRITE':
      case 'EXTERNAL':
        return context.role === 'admin' || context.permissions.includes('user'); // authenticated
      case 'DESTRUCTIVE':
      case 'FINANCIAL':
        return context.role === 'admin'; // strictly admin
      default:
        return false;
    }
  }

  async executeTool(name: string, input: any, context: AIContext): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found.`);
    }

    // 1. Authorization & Permission check
    if (!this.hasPermission(context, tool)) {
      throw new Error(`Unauthorized: Context lacks permission to execute ${name}.`);
    }

    // 2. Schema Validation
    const parsedInput = tool.schema.parse(input);

    // 3. Execution
    try {
      const result = await tool.executor(parsedInput, context);
      return result;
    } catch (e) {
      console.error(`[ToolRegistry] Execution failed for ${name}:`, e);
      throw e;
    }
  }
}

export const toolRegistry = new ToolRegistry();

