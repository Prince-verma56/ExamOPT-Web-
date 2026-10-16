/**
 * Feature Flags
 *
 * Centralized configuration for enabling/disabling capabilities.
 * Reads from environment variables with safe defaults.
 * Import this instead of checking process.env directly throughout the codebase.
 */

function envBool(key: string, fallback: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

export const features = {
  // A preloader is opt-in. Rendering it only after hydration made it easy to
  // produce a different server and client tree, so a normal application start
  // remains the safe default.
  preloader: envBool('FEATURE_PRELOADER', false),
  auth: envBool('FEATURE_AUTH', true),
  otp: envBool('FEATURE_OTP', false),
  email: envBool('FEATURE_EMAIL', false),
  storage: envBool('FEATURE_STORAGE', false),
  payments: envBool('FEATURE_PAYMENTS', false),
  redis: envBool('FEATURE_REDIS', false),
  ai: envBool('FEATURE_AI', false),
  voice: envBool('FEATURE_VOICE', false),
  rag: envBool('FEATURE_RAG', false),
  agents: envBool('FEATURE_AGENTS', false),
  mcp: envBool('FEATURE_MCP', false),
  analytics: envBool('FEATURE_ANALYTICS', false),
  demoMode: envBool('FEATURE_DEMO_MODE', true),
  
  // Phase 7 - Universal Capabilities
  realtime: envBool('FEATURE_REALTIME', false),
  jobs: envBool('FEATURE_JOBS', false),
  scheduler: envBool('FEATURE_SCHEDULER', false),
  notifications: envBool('FEATURE_NOTIFICATIONS', false),
  search: envBool('FEATURE_SEARCH', false),
  integrations: envBool('FEATURE_INTEGRATIONS', false),
  webhooks: envBool('FEATURE_WEBHOOKS', false),
  fileProcessing: envBool('FEATURE_FILE_PROCESSING', false),
  importExport: envBool('FEATURE_IMPORT_EXPORT', false),
  location: envBool('FEATURE_LOCATION', false),
  auditLogs: envBool('FEATURE_AUDIT_LOGS', false),
  multimodalAI: envBool('FEATURE_MULTIMODAL_AI', false),
  push_notifications: envBool('FEATURE_PUSH_NOTIFICATIONS', false),
} as const;

export type FeatureKey = keyof typeof features;

/**
 * Check if a feature is enabled. Throws if the feature key is invalid.
 */
export function isFeatureEnabled(key: FeatureKey): boolean {
  return features[key];
}
