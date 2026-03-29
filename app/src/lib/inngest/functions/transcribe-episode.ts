import { inngest } from '../client';
import { processTranscriptionJob } from '@/lib/queue/jobs/transcription';
import type { TranscriptionJobData } from '@/lib/queue/types';

export const transcribeEpisodeFunction = inngest.createFunction(
  { id: 'transcribe-episode', retries: 3 },
  { event: 'episode/transcribe.requested' },
  async ({ event, step }) => {
    const data = event.data as TranscriptionJobData;

    await step.run('process-transcription', () =>
      processTranscriptionJob(data)
    );
  }
);
