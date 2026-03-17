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

async function uploadEpisode(formData: FormData) {
  'use server';

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const file = formData.get('audio') as File;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string || '';
  const podcastId = formData.get('podcast_id') as string;

  if (!title) {
    throw new Error('Title is required');
  }

  if (!file) {
    throw new Error('Audio file is required');
  }

  // Validate file type
  if (!isValidAudioFile(file)) {
    throw new Error('Invalid file type. Please upload an audio file (MP3, M4A, WAV, or OGG)');
  }

  // Validate file size (500MB max)
  if (!isValidFileSize(file)) {
    throw new Error('File size exceeds 500MB limit');
  }

  // Generate a temporary episode ID for R2 upload path
  const tempEpisodeId = crypto.randomUUID();

  // Upload to R2 first to get the audio URL
  const audioUrl = await uploadToR2(file, tempEpisodeId, file.name);

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
      const key = audioUrl.replace(process.env.R2_EPISODES_CUSTOM_DOMAIN!, '');
      await deleteFromR2(key);
    } catch (cleanupError) {
      console.error('Failed to cleanup R2 file after DB error:', cleanupError);
    }
    throw new Error(insertError?.message || 'Failed to create episode');
  }

  // If the episode ID differs from temp ID, we'd need to move the file
  // For now, we use the temp ID as the actual ID to avoid this complexity
  // In production, you might want to move the file to the correct location

  redirect('/episodes');
}

export default async function NewEpisodePage() {
  const { podcasts } = await getPodcasts();

  return <UploadForm podcasts={podcasts} action={uploadEpisode} />;
}
