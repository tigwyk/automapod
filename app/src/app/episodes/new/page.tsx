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

  // Create episode record first to get ID
  const { data: episode, error: insertError } = await supabase
    .from('episodes')
    .insert({
      title,
      description,
      audio_url: null, // Will update after upload
      duration_seconds: null,
      transcript_status: 'pending',
      podcast_id: podcastId || null,
    })
    .select()
    .single();

  if (insertError || !episode) {
    throw new Error(insertError?.message || 'Failed to create episode');
  }

  // Upload to R2
  const audioUrl = await uploadToR2(file, episode.id, file.name);

  // Update episode with R2 URL
  const { error: updateError } = await supabase
    .from('episodes')
    .update({ audio_url: audioUrl })
    .eq('id', episode.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  redirect('/episodes');
}

export default async function NewEpisodePage() {
  const { podcasts } = await getPodcasts();

  return <UploadForm podcasts={podcasts} action={uploadEpisode} />;
}
