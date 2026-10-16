import { JobQueue, JobWorker, JobDefinition, JobResult, JobStatus } from '../interface';
import { db } from '@/server/db';
import { z } from 'zod';
import { eventBus } from '@/server/events/bus';

export class DatabaseJobQueue implements JobQueue {
  async enqueue<T extends z.ZodType>(
    jobDef: JobDefinition<T>,
    payload: z.infer<T>,
    options?: { priority?: number; delay?: number; retries?: number }
  ): Promise<string> {
    const runAt = options?.delay ? new Date(Date.now() + options.delay) : new Date();
    
    const record = await db.job.create({
      data: {
        name: jobDef.name,
        payload: payload as any,
        status: 'queued',
        maxRetries: options?.retries ?? jobDef.retryPolicy?.maxRetries ?? 3,
        runAt,
      },
    });

    eventBus.publish('job.created', { jobId: record.id });
    return record.id;
  }

  async getJobStatus(jobId: string): Promise<JobResult | null> {
    const record = await db.job.findUnique({ where: { id: jobId } });
    if (!record) return null;

    return {
      jobId: record.id,
      status: record.status as JobStatus,
      attempts: record.attempts,
      error: record.error || undefined,
      completedAt: record.completedAt?.toISOString(),
    };
  }
}

export class DatabaseJobWorker implements JobWorker {
  private isRunning = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private registry: Map<string, JobDefinition<any>> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private intervalMs = 2000;

  registerJob<T extends z.ZodType>(jobDef: JobDefinition<T>): void {
    this.registry.set(jobDef.name, jobDef);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async poll() {
    if (!this.isRunning) return;

    try {
      // Find one job to run
      const job = await db.$transaction(async (tx) => {
        // Find next eligible job
        const nextJob = await tx.job.findFirst({
          where: {
            status: { in: ['queued', 'retrying'] },
            runAt: { lte: new Date() },
          },
          orderBy: { runAt: 'asc' },
        });

        if (!nextJob) return null;

        // Lock and mark running
        return await tx.job.update({
          where: { id: nextJob.id },
          data: { status: 'running', startedAt: new Date() },
        });
      });

      if (job) {
        await this.executeJob(job);
        // Continue immediately if we found a job
        if (this.isRunning) {
          setImmediate(() => this.poll());
          return;
        }
      }
    } catch (e) {
      console.error('[DatabaseJobWorker] Poll Error:', e);
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.poll(), this.intervalMs);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async executeJob(job: any) {
    const jobDef = this.registry.get(job.name);
    
    if (!jobDef) {
      await db.job.update({
        where: { id: job.id },
        data: { status: 'failed', error: 'No handler registered for job type' }
      });
      return;
    }

    try {
      // Execute handler
      await jobDef.handler(job.payload);

      // Mark success
      await db.job.update({
        where: { id: job.id },
        data: { status: 'completed', completedAt: new Date() }
      });

      eventBus.publish('job.completed', { jobId: job.id });

    } catch (error: unknown) {
      const attempts = job.attempts + 1;
      const isFinalFailure = attempts >= job.maxRetries;

      await db.job.update({
        where: { id: job.id },
        data: {
          attempts,
          status: isFinalFailure ? 'failed' : 'retrying',
          error: (error as Error).message,
          // simple fixed backoff
          runAt: new Date(Date.now() + 5000 * attempts),
        }
      });
      
      if (isFinalFailure) {
        eventBus.publish('job.failed', { jobId: job.id, error: (error as Error).message });
      }
    }
  }
}
