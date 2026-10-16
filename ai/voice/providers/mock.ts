/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { AIContext } from '../../context';
import { VoiceProvider, VoiceProviderOptions, VoiceSessionState } from '../interface';

export class MockVoiceProvider implements VoiceProvider {
  private state: VoiceSessionState = 'idle';
  private options?: VoiceProviderOptions;

  private setState(newState: VoiceSessionState) {
    this.state = newState;
    if (this.options?.onStateChange) {
      this.options.onStateChange(newState);
    }
  }

  async createSession(options: VoiceProviderOptions): Promise<void> {
    this.options = options;
    console.log('[MockVoice] Session created with context:', options.context);
  }

  async startCall(): Promise<void> {
    if (!this.options) throw new Error("Session not created");
    
    this.setState('connecting');
    
    setTimeout(() => {
      this.setState('active');
      if (this.options?.onEvent) {
        this.options.onEvent({ type: 'call-started', timestamp: new Date() });
      }
    }, 1000);
  }

  async endCall(): Promise<void> {
    this.setState('ending');
    setTimeout(() => {
      this.setState('ended');
      if (this.options?.onEvent) {
        this.options.onEvent({ type: 'call-ended', timestamp: new Date() });
      }
    }, 500);
  }

  async updateContext(context: Partial<AIContext>): Promise<void> {
    console.log('[MockVoice] Context updated:', context);
  }

  handleEvent(rawEvent: any): void {
    console.log('[MockVoice] Handled raw event:', rawEvent);
  }
}

