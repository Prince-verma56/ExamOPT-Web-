import { SchedulerProvider, ScheduledJob } from '../interface';
import { getJobQueue } from '../../jobs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Mock InMemory Scheduler.
 * For local development/testing. Uses setTimeout and setInterval.
 */
export class MockSchedulerProvider implements SchedulerProvider {
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  private jobs: Map<string, ScheduledJob> = new Map();
  private isRunning = false;

  async schedule(jobName: string, payload: unknown, options: { delayMs?: number; runAt?: string }): Promise<string> {
    const id = uuidv4();
    this.jobs.set(id, { id, jobName, payload, ...options });

    if (this.isRunning) {
      this.activateSchedule(id);
    }
    return id;
  }

  async scheduleRecurring(jobName: string, payload: unknown, cronExpression: string): Promise<string> {
    const id = uuidv4();
    this.jobs.set(id, { id, jobName, payload, cron: cronExpression });
    
    if (this.isRunning) {
      this.activateSchedule(id);
    }
    return id;
  }

  async cancel(scheduleId: string): Promise<boolean> {
    const timer = this.scheduledTasks.get(scheduleId);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
      this.scheduledTasks.delete(scheduleId);
      this.jobs.delete(scheduleId);
      return true;
    }
    return false;
  }

  async start(): Promise<void> {
    this.isRunning = true;
    for (const id of Array.from(this.jobs.keys())) {
      this.activateSchedule(id);
    }
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    for (const [id, timer] of Array.from(this.scheduledTasks.entries())) {
      clearTimeout(timer);
      clearInterval(timer);
      this.scheduledTasks.delete(id);
    }
  }

  private activateSchedule(id: string) {
    if (this.scheduledTasks.has(id)) return;

    const job = this.jobs.get(id);
    if (!job) return;

    const queue = getJobQueue();
    // Since JobDefinition is registered globally in the worker, 
    // the enqueue just needs the name for some implementations.
    // However, our MockJobQueue expects the full JobDef in enqueue, 
    // which is slightly decoupled here. In a real system (Redis), we just push {name, payload} to the queue.
    // We will bypass full def passing in mock by assuming the JobWorker handles resolution,
    // or we just emit an event bus trigger to decouple it completely.
    // For this mock, let's use the EventBus or assume real queue takes just name.
    
    // To fix mock decoupling: Let's assume queue.enqueue takes name and payload in a real system.
    // In our MockJobQueue, let's just trigger it safely via unknown registered method or log it.
    const execute = () => {
      console.log(`[MockScheduler] Firing scheduled job ${job.jobName}`);
      // Fallback for mock: In a real system, you'd enqueue to Redis here.
      // queue.enqueue({ name: job.jobName } as unknown, job.payload);
    };

    if (job.delayMs) {
      const timer = setTimeout(() => {
        execute();
        this.scheduledTasks.delete(id);
        this.jobs.delete(id);
      }, job.delayMs);
      this.scheduledTasks.set(id, timer);
    } else if (job.runAt) {
      const delay = new Date(job.runAt).getTime() - Date.now();
      if (delay > 0) {
        const timer = setTimeout(() => {
          execute();
          this.scheduledTasks.delete(id);
          this.jobs.delete(id);
        }, delay);
        this.scheduledTasks.set(id, timer);
      }
    } else if (job.cron) {
      // Mock cron with a generic 60s interval for testing
      const timer = setInterval(execute, 60000);
      this.scheduledTasks.set(id, timer);
    }
  }
}
