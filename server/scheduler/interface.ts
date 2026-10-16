export interface ScheduledJob {
  id: string;
  jobName: string;
  payload: unknown;
  cron?: string;
  delayMs?: number;
  runAt?: string;
}

export interface SchedulerProvider {
  /**
   * Schedule a job to run at a specific time or after a delay.
   */
  schedule(jobName: string, payload: unknown, options: { delayMs?: number; runAt?: string }): Promise<string>;

  /**
   * Schedule a recurring job using a cron expression.
   */
  scheduleRecurring(jobName: string, payload: unknown, cronExpression: string): Promise<string>;

  /**
   * Cancel a scheduled job.
   */
  cancel(scheduleId: string): Promise<boolean>;

  start(): Promise<void>;
  stop(): Promise<void>;
}
