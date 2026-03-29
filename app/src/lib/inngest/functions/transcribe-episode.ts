import { inngest } from '../client';
import { processTranscriptionJob } from '@/lib/queue/jobs/transcription';
import type { TranscriptionJobData } from '@/lib/queue/types';

const MAX_ATTEMPTS = 3; // must match retries: 3

export const transcribeEpisodeFunction = inngest.createFunction(
  { id: 'transcribe-episode', retries: MAX_ATTEMPTS, triggers: [{ event: 'episode/transcribe.requested' }] },
  async ({ event, step, attempt }) => {
    const data = event.data as TranscriptionJobData;

    await step.run('process-transcription', () =>
      processTranscriptionJob(data, { isFinalAttempt: attempt >= MAX_ATTEMPTS - 1 })
    );
  }
);
