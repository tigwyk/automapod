/**
 * BullMQ queue client for adding transcription jobs
 */

import { Queue } from 'bullmq';
import type { TranscriptionJobData, TranscriptionJobOptions } from './types';

/**
 * Creates a Redis connection options object for BullMQ
 *
 * TODO: Configure Redis connection based on environment
 * - Use REDIS_URL environment variable
 * - Fallback to localhost for development
 * - Add connection pooling for production
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
 * Transcription queue singleton
 * Lazily initialized on first use
 */
let transcriptionQueue: Queue | null = null;

/**
 * Get or create the transcription queue instance
 */
export function getTranscriptionQueue(): Queue {
  if (!transcriptionQueue) {
    const connection = createRedisOptions();

    transcriptionQueue = new Queue('transcription', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 1000, // Keep last 1000 completed jobs
          age: 7 * 24 * 3600, // 7 days
        },
        removeOnFail: {
          count: 5000, // Keep last 5000 failed jobs
          age: 30 * 24 * 3600, // 30 days
        },
      },
    });
  }

  return transcriptionQueue;
}

/**
 * Add a transcription job to the queue
 */
export async function addTranscriptionJob(
  data: TranscriptionJobData,
  options?: TranscriptionJobOptions
): Promise<string> {
  const queue = getTranscriptionQueue();

  const job = await queue.add('transcribe-episode', data, {
    jobId: `transcription:${data.episodeId}`, // Unique job per episode
    ...options,
  });

  return job.id!;
}

/**
 * Get the status of a transcription job
 */
export async function getTranscriptionJobState(episodeId: string) {
  const queue = getTranscriptionQueue();
  const jobId = `transcription:${episodeId}`;

  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();

  return {
    id: job.id,
    state,
    data: job.data,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
    failedReason: job.failedReason,
    returnvalue: job.returnvalue,
  };
}

/**
 * Close the queue connection
 * Call this when shutting down the application
 */
export async function closeTranscriptionQueue(): Promise<void> {
  if (transcriptionQueue) {
    await transcriptionQueue.close();
    transcriptionQueue = null;
  }
}
