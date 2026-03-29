import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, isValidAudioFile, isValidFileSize, getR2EpisodesCustomDomain } from '@/lib/r2';
import { UploadForm } from '@/components/upload-form';
import { maybeTriggerTranscription } from '@/lib/inngest/trigger-transcription';

export const dynamic = 'force-dynamic';

async function getPodcasts() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('*')
    .order('title');

  return { podcasts: podcasts || [] };
}

async function uploadEpisode(
  prevState: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  'use server';

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You must be logged in to upload an episode' };
  }

  const fileValue = formData.get('audio');
  const title = formData.get('title') as string;
  const description = formData.get('description') as string || '';
  const podcastId = (formData.get('podcast_id') as string) || null;

  // If a podcast is selected, verify the current user owns it
  if (podcastId) {
    const { data: podcast } = await supabase
      .from('podcasts')
      .select('id')
      .eq('id', podcastId)
      .eq('user_id', user.id)
      .single();

    if (!podcast) {
      return { error: 'Podcast not found or access denied' };
    }
  }

  if (!title) {
    return { error: 'Title is required' };
  }

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    return { error: 'Audio file is required' };
  }

  const file = fileValue;

  // Validate file type
  if (!isValidAudioFile(file)) {
    return { error: 'Invalid file type. Please upload an audio file (MP3, M4A, WAV, or OGG)' };
  }

  // Validate file size (500MB max)
  if (!isValidFileSize(file)) {
    return { error: 'File size exceeds 500MB limit' };
  }

  // Generate a temporary episode ID for R2 upload path
  const tempEpisodeId = crypto.randomUUID();

  let audioUrl: string;
  try {
    // Upload to R2 first to get the audio URL
    audioUrl = await uploadToR2(file, tempEpisodeId, file.name);
  } catch (error) {
    console.error('R2 upload failed:', error);
    return { error: `Failed to upload audio file: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }

  // Now create the episode record with the actual audio URL
  const { data: episode, error: insertError } = await supabase
    .from('episodes')
    .insert({
      title,
      description,
      audio_url: audioUrl,
      duration_seconds: null,
      transcript_status: 'pending',
      podcast_id: podcastId,
      // Only set user_id for standalone episodes; podcast-scoped episodes are
      // owned via the podcast relationship.
      ...(podcastId ? {} : { user_id: user.id }),
    })
    .select()
    .single();

  if (insertError || !episode) {
    // If database insert fails, try to clean up the uploaded file
    try {
      const { deleteFromR2 } = await import('@/lib/r2');
      const customDomain = getR2EpisodesCustomDomain();
      if (audioUrl.startsWith(customDomain)) {
        const key = audioUrl.replace(customDomain, '').replace(/^\//, '');
        await deleteFromR2(key);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup R2 file after DB error:', cleanupError);
    }
    return { error: insertError?.message || 'Failed to create episode' };
  }

  // Auto-trigger transcription if the user's subscription allows it
  await maybeTriggerTranscription(supabase, user.id, episode);

  redirect('/episodes');
}

export default async function NewEpisodePage() {
  const { podcasts } = await getPodcasts();

  return <UploadForm podcasts={podcasts} action={uploadEpisode} />;
}
