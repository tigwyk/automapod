/**
 * BullMQ worker for processing transcription jobs
 *
 * TODO: Implement standalone worker process
 * - Create a separate entry point (e.g., workers/transcription.ts)
 * - Use a process manager (PM2, Docker) for production
 * - Add graceful shutdown handling
 * - Add health check endpoint
 *
 * Run with: node dist/workers/transcription.js
 */

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { processTranscriptionJob } from '../jobs/transcription';

/**
 * Create a Redis connection for the worker
 */
function createRedisOptions() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  return {
    host: redisUrl.includes('://')
      ? redisUrl.split('://')[1]?.split(':')[0] || 'localhost'
      : redisUrl,
    port: parseInt(redisUrl.split(':')[2] || '6379', 10),
  };
}

/**
 * Create and start the transcription worker
 */
export function createTranscriptionWorker(): Worker {
  const connection = createRedisOptions();

  const worker = new Worker(
    'transcription',
    async (job) => {
      return await processTranscriptionJob(job);
    },
    {
      connection,
      concurrency: 2, // Process 2 jobs concurrently
      limiter: {
        max: 5, // Max 5 jobs per interval
        duration: 60000, // Per minute
      },
    }
  );

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed for episode ${job.data.episodeId}`);
  });

  worker.on('failed', (job, error) => {
    console.error(
      `Job ${job?.id} failed for episode ${job?.data.episodeId}:`,
      error.message
    );
  });

  worker.on('progress', (job, progress) => {
    console.log(`Job ${job?.id} progress: ${progress}%`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Closing transcription worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return worker;
}

/**
 * Start the worker if this file is run directly
 * TODO: Move to a separate entry point file
 */
if (require.main === module) {
  const worker = createTranscriptionWorker();
  console.log('Transcription worker started, waiting for jobs...');
}
