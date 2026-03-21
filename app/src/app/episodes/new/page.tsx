import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, isValidAudioFile, isValidFileSize } from '@/lib/r2';
import { UploadForm } from '@/components/upload-form';

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
  const podcastId = formData.get('podcast_id') as string;

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
      podcast_id: podcastId || null,
      user_id: user.id,  // Set owner for proper ownership tracking
    })
    .select()
    .single();

  if (insertError || !episode) {
    // If database insert fails, try to clean up the uploaded file
    try {
      const { deleteFromR2 } = await import('@/lib/r2');
      const { getR2EpisodesCustomDomain } = await import('@/lib/r2');
      if (audioUrl.startsWith(getR2EpisodesCustomDomain())) {
        const key = audioUrl.replace(getR2EpisodesCustomDomain(), '').replace(/^\//, '');
        await deleteFromR2(key);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup R2 file after DB error:', cleanupError);
    }
    return { error: insertError?.message || 'Failed to create episode' };
  }

  redirect('/episodes');
}

export default async function NewEpisodePage() {
  const { podcasts } = await getPodcasts();

  return <UploadForm podcasts={podcasts} action={uploadEpisode} />;
}
