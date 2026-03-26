import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { uploadToR2, isValidAudioFile, isValidFileSize, getR2EpisodesCustomDomain } from '@/lib/r2';
import { SimpleUploadForm } from '@/components/simple-upload-form';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

async function getPodcast(podcastId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: podcast } = await supabase
    .from('podcasts')
    .select('*')
    .eq('id', podcastId)
    .eq('user_id', user.id)
    .single();

  return podcast;
}

async function uploadEpisode(
  prevState: { error?: string } | null,
  podcastId: string,
  formData: FormData
): Promise<{ error?: string } | null> {
  'use server';

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'You must be logged in to upload an episode' };
  }

  // Verify user owns this podcast
  const { data: podcast } = await supabase
    .from('podcasts')
    .select('id')
    .eq('id', podcastId)
    .eq('user_id', user.id)
    .single();

  if (!podcast) {
    return { error: 'Podcast not found or access denied' };
  }

  const fileValue = formData.get('audio');
  const title = formData.get('title') as string;
  const description = formData.get('description') as string || '';

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
      podcast_id: podcastId,  // Always set - no standalone episodes
    })
    .select()
    .single();

  if (insertError || !episode) {
    // If database insert fails, try to clean up the uploaded file
    try {
      const { deleteFromR2 } = await import('@/lib/r2');
      if (audioUrl.startsWith(getR2EpisodesCustomDomain())) {
        const key = audioUrl.replace(getR2EpisodesCustomDomain(), '').replace(/^\//, '');
        await deleteFromR2(key);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup R2 file after DB error:', cleanupError);
    }
    return { error: insertError?.message || 'Failed to create episode' };
  }

  redirect(`/podcasts/${podcastId}/episodes`);
}

export default async function NewEpisodePage({ params }: Props) {
  const { id } = await params;
  const podcast = await getPodcast(id);

  if (!podcast) {
    redirect('/podcasts');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <nav className="bg-white border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-foreground">AutomaPod</h1>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
                <Link href="/podcasts" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Podcasts</Link>
                <Link href={`/podcasts/${podcast.id}/episodes`} className="text-sm font-medium text-foreground hover:text-primary transition-colors">Episodes</Link>
                <Link href="/analytics" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Analytics</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/podcasts" className="text-muted-foreground hover:text-foreground transition-colors">
                All Podcasts
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li>
              <Link href={`/podcasts/${podcast.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                {podcast.title}
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="text-foreground font-medium" aria-current="page">
              Upload Episode
            </li>
          </ol>
        </nav>

        <SimpleUploadForm
          podcastTitle={podcast.title}
          action={async (prevState, formData) => {
            'use server';
            return uploadEpisode(prevState, podcast.id, formData);
          }}
          backUrl={`/podcasts/${podcast.id}/episodes`}
        />
      </main>
    </div>
  );
}
