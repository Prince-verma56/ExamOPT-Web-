export type CapabilityCategory = 'core' | 'ai' | 'client' | 'infrastructure';

export interface CapabilityDef {
  id: string;
  name: string;
  category: CapabilityCategory;
  requires: string[];
  env: string[];
  description?: string;
}

export const CAPABILITIES: CapabilityDef[] = [
  // CORE
  { id: 'auth', name: 'Authentication', category: 'core', requires: [], env: ['NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'] },
  { id: 'database', name: 'PostgreSQL', category: 'core', requires: [], env: ['DATABASE_URL'] },
  { id: 'storage', name: 'Storage', category: 'core', requires: [], env: [] },
  { id: 'email', name: 'Email', category: 'core', requires: [], env: ['SMTP_HOST'] },
  { id: 'otp', name: 'OTP', category: 'core', requires: ['auth'], env: [] },
  { id: 'payments', name: 'Payments', category: 'core', requires: ['webhooks', 'auditLogs'], env: ['STRIPE_SECRET_KEY'] },
  { id: 'search', name: 'Search', category: 'core', requires: ['database'], env: [] },
  { id: 'realtime', name: 'Realtime', category: 'core', requires: [], env: [] },
  { id: 'notifications', name: 'Notifications', category: 'core', requires: ['database'], env: [] },
  { id: 'jobs', name: 'Background Jobs', category: 'core', requires: ['database'], env: [] },
  { id: 'scheduler', name: 'Scheduler', category: 'core', requires: ['database'], env: [] },
  { id: 'webhooks', name: 'Webhooks', category: 'core', requires: [], env: [] },
  { id: 'integrations', name: 'Integrations', category: 'core', requires: [], env: [] },
  { id: 'fileProcessing', name: 'File Processing', category: 'core', requires: ['storage'], env: [] },
  { id: 'importExport', name: 'Import / Export', category: 'core', requires: [], env: [] },
  { id: 'location', name: 'Maps / Location', category: 'core', requires: [], env: ['GOOGLE_MAPS_API_KEY'] },
  { id: 'auditLogs', name: 'Audit Logs', category: 'core', requires: ['database'], env: [] },
  
  // AI
  { id: 'ai', name: 'AI Generation', category: 'ai', requires: [], env: ['OPENAI_API_KEY'] },
  { id: 'structuredOutput', name: 'Structured Output', category: 'ai', requires: ['ai'], env: [] },
  { id: 'toolCalling', name: 'Tool Calling', category: 'ai', requires: ['ai'], env: [] },
  { id: 'agents', name: 'Agents', category: 'ai', requires: ['ai', 'toolCalling'], env: [] },
  { id: 'rag', name: 'RAG', category: 'ai', requires: ['ai', 'database', 'fileProcessing'], env: [] },
  { id: 'memory', name: 'Memory', category: 'ai', requires: ['ai', 'database'], env: [] },
  { id: 'multimodal', name: 'Multimodal', category: 'ai', requires: ['ai'], env: [] },
  { id: 'voice', name: 'Voice', category: 'ai', requires: ['ai'], env: ['VAPI_API_KEY'] },
  { id: 'langgraph', name: 'LangGraph', category: 'ai', requires: ['agents'], env: [] },
  { id: 'mcp', name: 'MCP', category: 'ai', requires: ['ai'], env: [] },
  { id: 'evaluation', name: 'LangSmith / Evaluation', category: 'ai', requires: ['ai'], env: ['LANGSMITH_API_KEY'] },

  // CLIENT
  { id: 'nextjs', name: 'Next.js', category: 'client', requires: [], env: [] },
  { id: 'flutter', name: 'Flutter', category: 'client', requires: ['auth'], env: [] },

  // INFRASTRUCTURE
  { id: 'redis', name: 'Redis', category: 'infrastructure', requires: [], env: ['REDIS_URL'] },
  { id: 'workerProcess', name: 'Worker Process', category: 'infrastructure', requires: ['jobs'], env: [] },
  { id: 'schedulerProcess', name: 'Scheduler Process', category: 'infrastructure', requires: ['scheduler'], env: [] },
];

export function resolveDependencies(selectedIds: string[]): string[] {
  const result = new Set<string>(selectedIds);
  let changed = true;

  while (changed) {
    changed = false;
    for (const id of Array.from(result)) {
      const cap = CAPABILITIES.find(c => c.id === id);
      if (cap) {
        for (const req of cap.requires) {
          if (!result.has(req)) {
            result.add(req);
            changed = true;
          }
        }
      }
    }
  }

  return Array.from(result);
}
