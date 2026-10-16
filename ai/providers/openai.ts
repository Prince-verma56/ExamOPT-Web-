/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AIProvider, GenerateOptions, StreamOptions, StructuredOptions, EmbedOptions, EmbedResult } from '../core/interface';
import { generateText, streamText, generateObject, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export class OpenAIAdapter implements AIProvider {
  private getModel(name: string = 'gpt-4o-mini') {
    return openai(name);
  }

  private getEmbeddingModel(name: string = 'text-embedding-3-small') {
    return openai.embedding(name);
  }

  async generate(options: GenerateOptions): Promise<string> {
    const { text } = await generateText({
      model: this.getModel(process.env.AI_MODEL || 'gpt-4o-mini'),
      system: options.system,
      prompt: options.prompt,
      temperature: options.temperature,
    });
    return text;
  }

  async stream(options: StreamOptions): Promise<any> {
    const result = streamText({
      model: this.getModel(process.env.AI_MODEL || 'gpt-4o-mini'),
      system: options.system,
      prompt: options.prompt,
      temperature: options.temperature,
    });
    return result.toTextStreamResponse();
  }

  async structured<T>(options: StructuredOptions<T>): Promise<T> {
    const { object } = await generateObject({
      model: this.getModel(process.env.AI_MODEL || 'gpt-4o-mini'),
      system: options.system,
      prompt: options.prompt,
      temperature: options.temperature,
      schema: options.schema,
      schemaName: options.schemaName,
      schemaDescription: options.schemaDescription,
    });
    return object as T;
  }

  async embed(options: EmbedOptions): Promise<EmbedResult> {
    const values = Array.isArray(options.input) ? options.input : [options.input];
    const { embeddings, usage } = await embedMany({
      model: this.getEmbeddingModel(),
      values,
    });
    
    return {
      embeddings,
      usage: { tokens: usage.tokens },
    };
  }
}

