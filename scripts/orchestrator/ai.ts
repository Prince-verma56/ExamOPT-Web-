import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { AIAnalysisSchema, AIAnalysisResult } from './schema';
import { CAPABILITIES } from './registry';

// Check if we have an API key configured for orchestrator
export function isAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY || !!process.env.AI_ORCHESTRATOR_PROVIDER;
}

export async function analyzeProblem(problem: string, clients: string[], timeLimit: string): Promise<AIAnalysisResult | null> {
  if (!isAIConfigured()) {
    console.warn('[Orchestrator] No AI provider configured. Falling back to manual mode.');
    return null;
  }

  // Create provider based on env
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_ORCHESTRATOR_KEY || '',
  });

  const availableCaps = CAPABILITIES.map(c => `- ${c.id}: ${c.name} (${c.category})`).join('\n');

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o'), // fallback to gpt-4o if not specified
      schema: AIAnalysisSchema,
      prompt: `You are an expert software architect planning a hackathon project. 
The developer provided the following problem statement:
"${problem}"

Target Clients: ${clients.join(', ')}
Time Limit: ${timeLimit} hours

Your task is to analyze this problem and output a structured project plan.
Be conservative. ONLY recommend capabilities that are strictly necessary or highly beneficial for the problem.
Do not over-engineer. Prefer existing abstractions (Next.js, Postgres, existing AI providers).

Available Capabilities:
${availableCaps}

Provide a thoughtful, realistic, and strict analysis.
`
    });
    
    return object;
  } catch (err) {
    console.error('[Orchestrator AI Error]', err);
    return null;
  }
}
