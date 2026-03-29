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
 * Errors are caught and logged so that episode creation always succeeds.
 * If inngest.send() fails after the DB status update, the episode will remain
 * in 'queued' state; the Inngest function will not run until manually re-triggered.
 */
export async function maybeTriggerTranscription(
  supabase: SupabaseClient,
  userId: string,
  episode: EpisodeForTranscription
): Promise<void> {
  try {
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
  } catch (error) {
    console.error(`[transcription] Failed to queue episode ${episode.id}:`, error);
  }
}
