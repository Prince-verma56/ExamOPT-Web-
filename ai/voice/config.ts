/* eslint-disable @typescript-eslint/no-explicit-any */
 
export interface VoiceConfiguration {
  provider: 'vapi' | 'mock';
  assistantId?: string;
  voiceId?: string;
  language: string;
  transcriber?: string;
  model?: string;
  temperature?: number;
  firstMessage?: string;
  silenceTimeout?: number;
  maxDuration?: number;
  metadata?: Record<string, any>;
}

export function getVoiceConfiguration(): VoiceConfiguration {
  return {
    provider: (process.env.NEXT_PUBLIC_VOICE_MODE as 'vapi' | 'mock') || 'mock',
    assistantId: process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID,
    language: 'en-US',
    // these would typically be passed to Vapi during server-side assistant creation/override
    model: process.env.NEXT_PUBLIC_VOICE_MODEL || 'gpt-4o-mini',
  };
}

