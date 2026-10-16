/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { toolRegistry, AITool } from '../tools/registry';
import { AIContext } from '../context';

/**
 * MCP Adapter
 * 
 * Maps internal tools to MCP Tool interfaces and vice versa,
 * ensuring all external MCP requests pass through the same
 * authorization model (AIContext -> ToolRegistry).
 */
export class MCPAdapter {
  
  /**
   * Retrieves all available internal tools as MCP-formatted tool definitions.
   * Filters tools based on the user's role in the provided AIContext.
   */
  async getMCPTools(context: AIContext) {
    const tools = toolRegistry.listTools();
    
    // Filter tools user has access to
    const allowedTools = tools.filter((tool: AITool) => {
      // Very basic mock check. In reality, toolRegistry should have `hasPermission(context, tool)`
      return toolRegistry.hasPermission(context, tool);
    });

    return allowedTools.map((tool: AITool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: {
        type: "object",
        properties: {}, // Would normally convert zod schema to JSON schema here
      }
    }));
  }

  /**
   * Executes an internal tool on behalf of an MCP client.
   * Context MUST be provided by the server, not the client.
   */
  async executeMCPTool(toolName: string, args: any, context: AIContext) {
    return await toolRegistry.executeTool(toolName, args, context);
  }
}

export const mcpAdapter = new MCPAdapter();

