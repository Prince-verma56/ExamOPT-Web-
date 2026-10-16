import { isFeatureEnabled } from '@/config/features';
import { JobQueue, JobWorker } from './interface';
import { MockJobQueue } from './providers/mock';
import { DatabaseJobQueue, DatabaseJobWorker } from './providers/database';

// Global instances to ensure singletons
let sharedMockInstance: MockJobQueue | null = null;
let globalDatabaseQueue: DatabaseJobQueue | null = null;
let globalDatabaseWorker: DatabaseJobWorker | null = null;

export function getJobQueue(): JobQueue {
  if (!isFeatureEnabled('jobs')) {
    return getMockInstance();
  }
  
  if (!globalDatabaseQueue) {
    globalDatabaseQueue = new DatabaseJobQueue();
  }
  return globalDatabaseQueue;
}

export function getJobWorker(): JobWorker {
  if (!isFeatureEnabled('jobs')) {
    return getMockInstance();
  }
  
  if (!globalDatabaseWorker) {
    globalDatabaseWorker = new DatabaseJobWorker();
  }
  return globalDatabaseWorker;
}

function getMockInstance() {
  if (!sharedMockInstance) {
    sharedMockInstance = new MockJobQueue();
  }
  return sharedMockInstance;
}
