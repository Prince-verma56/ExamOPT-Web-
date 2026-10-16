/* eslint-disable @typescript-eslint/no-explicit-any */
 
import { z } from 'zod';

export interface GenerateOptions {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StructuredOptions<T> extends GenerateOptions {
  schema: z.ZodType<T>;
  schemaName?: string;
  schemaDescription?: string;
}

export interface StreamOptions extends GenerateOptions {
  onChunk?: (chunk: string) => void;
  onFinish?: (fullText: string) => void;
}

export interface EmbedOptions {
  input: string | string[];
}

export interface EmbedResult {
  embeddings: number[][];
  usage: { tokens: number };
}

export interface AIProvider {
  /** Generate a complete text response */
  generate(options: GenerateOptions): Promise<string>;
  
  /** Generate a stream of text. Resolves with an object containing a stream that can be converted to a response, or an async iterator. */
  stream(options: StreamOptions): Promise<ReadableStream | any>;
  
  /** Generate a structured object matching a Zod schema */
  structured<T>(options: StructuredOptions<T>): Promise<T>;
  
  /** Generate embeddings for text */
  embed(options: EmbedOptions): Promise<EmbedResult>;
}

