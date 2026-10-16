import { z } from 'zod';

export interface JobRetryPolicy {
  maxRetries: number;
  backoff: 'exponential' | 'linear' | 'fixed';
  initialDelayMs: number;
}

export interface JobDefinition<T extends z.ZodType> {
  name: string;
  payloadSchema: T;
  handler: (payload: z.infer<T>) => Promise<unknown>;
  retryPolicy?: JobRetryPolicy;
  timeoutMs?: number;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export interface JobResult {
  jobId: string;
  status: JobStatus;
  result?: unknown;
  error?: string;
  attempts: number;
  completedAt?: string;
}

export interface JobQueue {
  enqueue<T extends z.ZodType>(
    jobDef: JobDefinition<T>,
    payload: z.infer<T>
  ): Promise<string>; // Returns Job ID

  getJobStatus(jobId: string): Promise<JobResult | null>;
}

export interface JobWorker {
  start(): Promise<void>;
  stop(): Promise<void>;
  registerJob<T extends z.ZodType>(jobDef: JobDefinition<T>): void;
}
