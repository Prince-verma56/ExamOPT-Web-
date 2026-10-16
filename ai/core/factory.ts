import { AIProvider } from './interface';
import { OpenAIAdapter } from '../providers/openai';
import { MockAIProvider } from '../providers/mock';
import { isFeatureEnabled } from '../../config/features';

let aiProviderInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (aiProviderInstance) {
    return aiProviderInstance;
  }

  if (!isFeatureEnabled('ai')) {
    console.warn('[AI Factory] AI is disabled, using MockProvider.');
    aiProviderInstance = new MockAIProvider();
    return aiProviderInstance;
  }

  const providerName = process.env.AI_PROVIDER || 'mock';

  switch (providerName.toLowerCase()) {
    case 'openai':
      aiProviderInstance = new OpenAIAdapter();
      break;
    case 'mock':
    default:
      aiProviderInstance = new MockAIProvider();
      break;
  }

  return aiProviderInstance;
}
