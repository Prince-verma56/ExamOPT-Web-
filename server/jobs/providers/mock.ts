import { z } from 'zod';
import { JobQueue, JobWorker, JobDefinition, JobResult, JobStatus } from '../interface';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock InMemory Job Queue.
 * ONLY for development/testing when Redis is not available.
 * Does not persist across restarts.
 */
export class MockJobQueue implements JobQueue, JobWorker {
  private jobs: Map<string, {
    def: JobDefinition<any>,
    payload: any,
    status: JobStatus,
    attempts: number,
    result?: any,
    error?: string,
    completedAt?: string
  }> = new Map();

  private registeredJobs: Map<string, JobDefinition<any>> = new Map();
  private isRunning = false;

  async enqueue<T extends z.ZodType>(jobDef: JobDefinition<T>, payload: z.infer<T>): Promise<string> {
    // Validate payload before accepting
    jobDef.payloadSchema.parse(payload);
    
    const jobId = uuidv4();
    this.jobs.set(jobId, {
      def: jobDef,
      payload,
      status: 'pending',
      attempts: 0
    });

    if (this.isRunning) {
      // Process asynchronously
      setTimeout(() => this.processJob(jobId), 0);
    }

    return jobId;
  }

  async getJobStatus(jobId: string): Promise<JobResult | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    return {
      jobId,
      status: job.status,
      result: job.result,
      error: job.error,
      attempts: job.attempts,
      completedAt: job.completedAt
    };
  }

  registerJob<T extends z.ZodType>(jobDef: JobDefinition<T>): void {
    this.registeredJobs.set(jobDef.name, jobDef);
  }

  async start(): Promise<void> {
    this.isRunning = true;
    // Process any pending jobs that were queued before start()
    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      if (job.status === 'pending') {
        setTimeout(() => this.processJob(jobId), 0);
      }
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  private async processJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job || !this.isRunning) return;

    job.status = 'running';
    job.attempts += 1;

    try {
      // Execute the handler
      let result;
      if (job.def.timeoutMs) {
        result = await Promise.race([
          job.def.handler(job.payload),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Job timeout')), job.def.timeoutMs))
        ]);
      } else {
        result = await job.def.handler(job.payload);
      }

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date().toISOString();
      console.log(`[JobQueue] Job ${job.def.name} (${jobId}) completed successfully.`);
    } catch (error: any) {
      console.error(`[JobQueue] Job ${job.def.name} (${jobId}) failed:`, error);
      const maxRetries = job.def.retryPolicy?.maxRetries || 0;
      
      if (job.attempts <= maxRetries) {
        job.status = 'retrying';
        // Mock retry delay
        const delay = job.def.retryPolicy?.initialDelayMs || 1000;
        setTimeout(() => this.processJob(jobId), delay);
      } else {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date().toISOString();
      }
    }
  }
}
