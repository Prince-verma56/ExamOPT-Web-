/**
 * Production Job Worker Entry Point
 * 
 * This script runs the DatabaseJobWorker and DatabaseSchedulerProvider
 * independent of the Next.js web process. 
 * 
 * Usage: npm run worker
 */

import { getJobWorker } from '../server/jobs';
import { getScheduler } from '../server/scheduler';

async function main() {
  console.log('[Worker] Starting production worker...');

  const worker = getJobWorker();
  const scheduler = getScheduler();

  // Start the queue worker
  console.log('[Worker] Connecting to Job Queue...');
  await worker.start();
  
  // Start the scheduler
  console.log('[Worker] Starting Scheduler...');
  await scheduler.start();

  console.log('[Worker] Ready. Waiting for jobs...');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Worker] Shutting down...');
    await scheduler.stop();
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(error => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});
