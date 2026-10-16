/**
 * AI Tool Permission System
 *
 * Every AI tool must declare its permission level.
 * Dangerous actions require server-side confirmation.
 */

export const ToolPermission = {
  READ: 'READ',
  WRITE: 'WRITE',
  DESTRUCTIVE: 'DESTRUCTIVE',
  FINANCIAL: 'FINANCIAL',
  EXTERNAL: 'EXTERNAL',
} as const;

export type ToolPermissionLevel = (typeof ToolPermission)[keyof typeof ToolPermission];

export interface ToolDefinition {
  name: string;
  description: string;
  permission: ToolPermissionLevel;
  parameters: Record<string, unknown>; // Zod schema or JSON schema
  execute: (params: unknown) => Promise<unknown>;
}

/**
 * Tools with these permissions require explicit confirmation
 * before execution.
 */
export const DANGEROUS_PERMISSIONS: ToolPermissionLevel[] = [
  ToolPermission.DESTRUCTIVE,
  ToolPermission.FINANCIAL,
  ToolPermission.EXTERNAL,
];

export function requiresConfirmation(permission: ToolPermissionLevel): boolean {
  return DANGEROUS_PERMISSIONS.includes(permission);
}
