import { VoiceProvider } from './interface';
import { VapiProvider } from './providers/vapi';
import { MockVoiceProvider } from './providers/mock';
import { getVoiceConfiguration } from './config';
import { isFeatureEnabled } from '../../config/features';

let voiceProviderInstance: VoiceProvider | null = null;

export function getVoiceProvider(): VoiceProvider {
  if (voiceProviderInstance) {
    return voiceProviderInstance;
  }

  if (!isFeatureEnabled('voice')) {
    console.warn('[Voice Factory] Voice is disabled, using MockProvider.');
    voiceProviderInstance = new MockVoiceProvider();
    return voiceProviderInstance;
  }

  const config = getVoiceConfiguration();

  switch (config.provider) {
    case 'vapi':
      voiceProviderInstance = new VapiProvider();
      break;
    case 'mock':
    default:
      voiceProviderInstance = new MockVoiceProvider();
      break;
  }

  return voiceProviderInstance;
}
