import { isFeatureEnabled } from '@/config/features';
import { SchedulerProvider } from './interface';
import { MockSchedulerProvider } from './providers/mock';
import { DatabaseSchedulerProvider } from './providers/database';

let activeScheduler: SchedulerProvider | null = null;
let activeMockScheduler: SchedulerProvider | null = null;

export function getScheduler(): SchedulerProvider {
  if (!isFeatureEnabled('scheduler')) {
    if (!activeMockScheduler) activeMockScheduler = new MockSchedulerProvider();
    return activeMockScheduler;
  }

  if (!activeScheduler) {
    activeScheduler = new DatabaseSchedulerProvider();
  }

  return activeScheduler;
}
