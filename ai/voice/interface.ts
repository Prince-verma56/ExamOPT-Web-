/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { AIContext } from '../context';

export type VoiceSessionState = 
  | 'idle' 
  | 'connecting' 
  | 'active' 
  | 'listening' 
  | 'processing'
  | 'speaking' 
  | 'ending' 
  | 'ended' 
  | 'error';

export interface VoiceEvent {
  type: 
    | 'call-started' 
    | 'call-ended' 
    | 'user-speech-started' 
    | 'user-speech-ended' 
    | 'assistant-speech-started' 
    | 'assistant-speech-ended' 
    | 'tool-called' 
    | 'tool-completed' 
    | 'error' 
    | 'transcript-updated';
  timestamp: Date;
  payload?: any;
}

export interface VoiceTranscript {
  id: string;
  conversationId: string;
  speaker: 'user' | 'assistant' | 'system' | 'tool';
  text: string;
  timestamp: Date;
  sequence: number;
  metadata?: Record<string, any>;
}

export interface VoiceProviderOptions {
  assistantId?: string;
  context?: AIContext;
  onStateChange?: (state: VoiceSessionState) => void;
  onEvent?: (event: VoiceEvent) => void;
  onError?: (error: any) => void;
}

export interface VoiceProvider {
  /** Initialize a session but don't start the call yet */
  createSession(options: VoiceProviderOptions): Promise<void>;
  
  /** Start the actual voice call */
  startCall(): Promise<void>;
  
  /** End the current call */
  endCall(): Promise<void>;
  
  /** Send updated context to the running session */
  updateContext(context: Partial<AIContext>): Promise<void>;
  
  /** Handle raw events from the underlying provider */
  handleEvent(rawEvent: any): void;
}

