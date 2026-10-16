/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { AIContext } from '../../context';
import { VoiceProvider, VoiceProviderOptions, VoiceSessionState, VoiceEvent } from '../interface';
import Vapi from '@vapi-ai/web';

export class VapiProvider implements VoiceProvider {
  private vapi: any;
  private options?: VoiceProviderOptions;
  private state: VoiceSessionState = 'idle';

  constructor() {
    // We instantiate Vapi only on the client. It requires public key.
    if (typeof window !== 'undefined') {
      const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || '';
      this.vapi = new Vapi(publicKey);
      this.setupListeners();
    }
  }

  private setState(newState: VoiceSessionState) {
    this.state = newState;
    if (this.options?.onStateChange) {
      this.options.onStateChange(newState);
    }
  }

  private setupListeners() {
    this.vapi.on('call-start', () => {
      this.setState('active');
      this.emitEvent('call-started');
    });

    this.vapi.on('call-end', () => {
      this.setState('ended');
      this.emitEvent('call-ended');
    });

    this.vapi.on('speech-start', () => {
      this.setState('speaking');
      this.emitEvent('assistant-speech-started');
    });

    this.vapi.on('speech-end', () => {
      this.setState('active');
      this.emitEvent('assistant-speech-ended');
    });

    this.vapi.on('message', (message: any) => {
      this.handleEvent(message);
    });

    this.vapi.on('error', (e: any) => {
      this.setState('error');
      if (this.options?.onError) {
        this.options.onError(e);
      }
    });
  }

  private emitEvent(type: VoiceEvent['type'], payload?: any) {
    if (this.options?.onEvent) {
      this.options.onEvent({
        type,
        timestamp: new Date(),
        payload,
      });
    }
  }

  async createSession(options: VoiceProviderOptions): Promise<void> {
    this.options = options;
  }

  async startCall(): Promise<void> {
    if (!this.vapi) throw new Error("Vapi not initialized");
    if (!this.options?.assistantId) throw new Error("Assistant ID is required");

    this.setState('connecting');
    
    // Inject AI Context into Vapi Assistant overrides
    // We pass context via assistantOverrides.variableValues
    await this.vapi.start(this.options.assistantId, {
      variableValues: {
        userId: this.options.context?.userId || 'guest',
        conversationId: this.options.context?.conversationId || 'new',
        role: this.options.context?.role || 'user',
        ...this.options.context?.metadata
      }
    });
  }

  async endCall(): Promise<void> {
    if (!this.vapi) return;
    this.setState('ending');
    this.vapi.stop();
  }

  async updateContext(context: Partial<AIContext>): Promise<void> {
    // Vapi currently doesn't allow dynamic variable injection mid-call via web SDK easily,
    // but we can send a custom message to the assistant if needed.
    this.vapi.send({
      type: 'add-message',
      message: {
        role: 'system',
        content: `Context updated: ${JSON.stringify(context)}`
      }
    });
  }

  handleEvent(rawEvent: any): void {
    if (rawEvent.type === 'transcript') {
      this.emitEvent('transcript-updated', rawEvent);
    } else if (rawEvent.type === 'function-call') {
      this.emitEvent('tool-called', rawEvent);
    }
  }
}

