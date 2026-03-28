/**
 * BullMQ worker for processing transcription jobs.
 *
 * Run as a standalone process:
 *   bun run worker
 *
 * The worker connects to Redis, picks up transcription jobs, and calls
 * the Groq Whisper API to transcribe each episode's audio file.
 * It writes results directly to Supabase via the service role key,
 * bypassing the Next.js SSR cookie-based auth client.
 */

import { Worker } from 'bullmq';
import { processTranscriptionJob } from '../jobs/transcription';
import { createRedisOptions } from '../redis';

function createTranscriptionWorker(): Worker {
  const worker = new Worker(
    'transcription',
    async (job) => {
      return await processTranscriptionJob(job);
    },
    {
      connection: createRedisOptions(),
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 60_000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[transcription] job ${job.id} completed — episode ${job.data.episodeId}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[transcription] job ${job?.id} failed — episode ${job?.data.episodeId}:`, error.message);
  });

  worker.on('progress', (job, progress) => {
    console.log(`[transcription] job ${job?.id} progress: ${progress}%`);
  });

  const shutdown = async () => {
    console.log('[transcription] shutting down worker...');
    await worker.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return worker;
}

export { createTranscriptionWorker };
