import { toolRegistry } from './registry';
import { z } from 'zod';

// Example generic tool
toolRegistry.register({
  name: 'getCurrentTime',
  description: 'Returns the current server time in ISO format',
  schema: z.object({}),
  permissionLevel: 'READ',
  executor: async (input, context) => {
    return { time: new Date().toISOString(), timezone: context.timezone };
  }
});

// Example authenticated tool
toolRegistry.register({
  name: 'getUserProfile',
  description: 'Returns the profile of the current authenticated user',
  schema: z.object({}),
  permissionLevel: 'READ',
  executor: async (input, context) => {
    if (!context.userId) {
      throw new Error("Unauthenticated");
    }
    return { userId: context.userId, role: context.role };
  }
});
