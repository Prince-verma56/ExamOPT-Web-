import { db } from '@/server/db';
import { getJobQueue } from '@/server/jobs';
import * as cronParser from 'cron-parser';
import { eventBus } from '@/server/events/bus';
import { SchedulerProvider } from '../interface';
import { z } from 'zod';

export class DatabaseSchedulerProvider implements SchedulerProvider {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private intervalMs = 10000; // Poll every 10 seconds

  async schedule(jobName: string, payload: unknown, options: { delayMs?: number; runAt?: string }): Promise<string> {
    const runAt = options.runAt ? new Date(options.runAt) : new Date(Date.now() + (options.delayMs || 0));
    const sjob = await db.scheduledJob.create({
      data: {
        name: jobName,
        payload: payload as any,
        nextRunAt: runAt,
        isActive: true,
      },
    });
    return sjob.id;
  }

  async scheduleRecurring(jobName: string, payload: unknown, cronExpression: string): Promise<string> {
    let nextRunAt = new Date();
    try {
      const interval = (cronParser as any).parseExpression(cronExpression, { currentDate: new Date() });
      nextRunAt = interval.next().toDate();
    } catch (e) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const sjob = await db.scheduledJob.create({
      data: {
        name: jobName,
        payload: payload as any,
        cronExpression,
        nextRunAt,
        isActive: true,
      },
    });
    return sjob.id;
  }

  async cancel(scheduleId: string): Promise<boolean> {
    const sjob = await db.scheduledJob.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });
    return sjob.isActive === false;
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
      await db.$transaction(async (tx) => {
        const now = new Date();
        const dueJobs = await tx.scheduledJob.findMany({
          where: {
            isActive: true,
            nextRunAt: { lte: now },
          },
        });

        for (const sjob of dueJobs) {
          // Enqueue the actual job execution
          const queue = getJobQueue();
          await queue.enqueue({
            name: sjob.name,
            payloadSchema: z.any(), // Schemas are validated by worker
            handler: async () => {}, // Handlers are registered in worker
          }, sjob.payload || {});

          if (sjob.cronExpression) {
            let nextRunAt = new Date(now.getTime() + (sjob.intervalMs || 60000));
            try {
              const interval = (cronParser as any).parseExpression(sjob.cronExpression, { currentDate: now });
              nextRunAt = interval.next().toDate();
            } catch (e) {
              console.error(`Invalid cron expression for job ${sjob.id}:`, e);
            }
            await tx.scheduledJob.update({
              where: { id: sjob.id },
              data: {
                lastRunAt: now,
                nextRunAt,
              },
            });
          } else if (sjob.intervalMs) {
            await tx.scheduledJob.update({
              where: { id: sjob.id },
              data: {
                lastRunAt: now,
                nextRunAt: new Date(now.getTime() + sjob.intervalMs),
              },
            });
          } else {
             // one-off job, mark inactive
             await tx.scheduledJob.update({
              where: { id: sjob.id },
              data: {
                lastRunAt: now,
                isActive: false,
              }
             });
          }

          eventBus.publish('scheduler.triggered', { scheduledJobId: sjob.id, jobName: sjob.name });
        }
      });
    } catch (error) {
      console.error('[SchedulerProvider] Poll Error:', error);
    }

    if (this.isRunning) {
      this.timer = setTimeout(() => this.poll(), this.intervalMs);
    }
  }
}
