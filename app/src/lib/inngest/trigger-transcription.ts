import type { SupabaseClient } from '@supabase/supabase-js';
import { inngest } from './client';
import { getUserSubscription } from '@/lib/get-user-subscription';
import { canTranscribe } from '@/lib/subscription';

interface EpisodeForTranscription {
  id: string;
  audio_url: string;
  title: string;
}

/**
 * If the user's subscription allows transcription, marks the episode as
 * queued and sends the Inngest transcription event.
 *
 * Does nothing (silently) when the subscription does not permit transcription.
 */
export async function maybeTriggerTranscription(
  supabase: SupabaseClient,
  userId: string,
  episode: EpisodeForTranscription
): Promise<void> {
  const subscription = await getUserSubscription(userId);
  if (!canTranscribe(subscription).allowed || !episode.audio_url) {
    return;
  }

  await supabase
    .from('episodes')
    .update({ transcript_status: 'queued' })
    .eq('id', episode.id);

  await inngest.send({
    name: 'episode/transcribe.requested',
    data: {
      episodeId: episode.id,
      userId,
      audioUrl: episode.audio_url,
      title: episode.title,
    },
  });
}
