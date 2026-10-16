/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AIProvider, GenerateOptions, StreamOptions, StructuredOptions, EmbedOptions, EmbedResult } from '../core/interface';
import { z } from 'zod';

export class MockAIProvider implements AIProvider {
  async generate(options: GenerateOptions): Promise<string> {
    console.log('[MockAI] Generating text for:', options.prompt);
    return "This is a mock AI response.";
  }

  async stream(options: StreamOptions): Promise<any> {
    console.log('[MockAI] Streaming text for:', options.prompt);
    
    // Create a simple readable stream that yields words
    const words = ["This", "is", "a", "mock", "streamed", "AI", "response."];
    const stream = new ReadableStream({
      async start(controller) {
        for (const word of words) {
          controller.enqueue(new TextEncoder().encode(word + ' '));
          await new Promise(r => setTimeout(r, 100)); // Simulate delay
        }
        controller.close();
      }
    });

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  async structured<T>(options: StructuredOptions<T>): Promise<T> {
    console.log('[MockAI] Generating structured object for schema:', options.schemaName);
    
    // In a real mock you might use something like JSON schema faker
    // But for basic types we'll just throw unless we have a specific mock handler
    throw new Error("Structured generation is not automatically supported by the mock provider without specific handlers.");
  }

  async embed(options: EmbedOptions): Promise<EmbedResult> {
    const values = Array.isArray(options.input) ? options.input : [options.input];
    console.log('[MockAI] Generating embeddings for', values.length, 'inputs');
    
    const embeddings = values.map(() => Array(1536).fill(0).map(() => Math.random() - 0.5));
    
    return {
      embeddings,
      usage: { tokens: values.length * 10 },
    };
  }
}

