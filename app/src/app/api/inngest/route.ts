import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { transcribeEpisodeFunction } from '@/lib/inngest/functions/transcribe-episode';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [transcribeEpisodeFunction],
});
