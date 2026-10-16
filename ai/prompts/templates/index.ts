import { AIContext } from '../../context';

export function getContextTemplate(context: AIContext): string {
  return `
[CONTEXT INJECTION]
User Role: ${context.role}
Local Timezone: ${context.timezone}
Domain: ${context.domain}
${context.metadata?.retrievedKnowledge ? `Retrieved Knowledge: ${context.metadata.retrievedKnowledge.join('\n')}` : ''}
`;
}
