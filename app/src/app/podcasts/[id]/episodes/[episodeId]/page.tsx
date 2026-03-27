import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import DeleteEpisodeButton from './delete-button';
import { AppNav } from '@/components/app-nav';

export const dynamic = 'force-dynamic';

/**
 * Gets an episode with ownership verification.
 * Returns the episode only if the current user owns the podcast it belongs to.
 */
async function getAuthenticatedEpisode(podcastId: string, episodeId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Verify user owns the podcast
  const { data: podcast } = await supabase
    .from('podcasts')
    .select('id, title')
    .eq('id', podcastId)
    .eq('user_id', user.id)
    .single();

  if (!podcast) {
    return null;
  }

  // Get the episode (RLS will ensure it belongs to this podcast)
  const { data: episode } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', episodeId)
    .eq('podcast_id', podcastId)
    .single();

  if (!episode) {
    return null;
  }

  return { podcast, episode, userId: user.id };
}

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string; episodeId: string }>;
}) {
  const { id: podcastId, episodeId } = await params;
  const result = await getAuthenticatedEpisode(podcastId, episodeId);

  if (!result) {
    notFound();
  }

  const { podcast, episode, userId } = result;

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav
        userId={userId}
        activeLink="podcasts"
        extraLinks={[{ href: `/podcasts/${podcast.id}/episodes`, label: 'Episodes', active: true }]}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
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
            <li>
              <Link href={`/podcasts/${podcast.id}/episodes`} className="text-muted-foreground hover:text-foreground transition-colors">
                Episodes
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="text-foreground font-medium truncate" aria-current="page">
              {episode.title}
            </li>
          </ol>
        </nav>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{episode.title}</h1>
            <p className="text-gray-600 mt-1">{episode.description || 'No description'}</p>
          </div>
          <Link
            href={`/analytics/episode/${episode.id}`}
            className="btn btn-primary"
          >
            View Analytics
          </Link>
        </div>

        {episode.audio_url && (
          <div className="card-elevated p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Audio Player</h2>
            <audio
              controls
              src={episode.audio_url}
              className="w-full"
            >
              Your browser does not support the audio element.
            </audio>
            <p className="mt-2 text-sm text-gray-500 break-all">
              <span className="font-medium">URL:</span> {episode.audio_url}
            </p>
          </div>
        )}

        <div className="card-elevated p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Episode Details</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  episode.transcript_status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : episode.transcript_status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {episode.transcript_status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Duration</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {episode.duration_seconds
                  ? `${Math.floor(episode.duration_seconds / 60)}:${String(episode.duration_seconds % 60).padStart(2, '0')}`
                  : 'N/A'}
              </dd>
            </div>
          </dl>

          {episode.transcript && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Transcript</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{episode.transcript}</p>
            </div>
          )}
        </div>

        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Manage Episode</h2>
          <div className="flex gap-4 items-center">
            <Link
              href={`/podcasts/${podcast.id}/episodes/${episode.id}/edit`}
              className="btn btn-primary"
            >
              Edit Episode
            </Link>
            <DeleteEpisodeButton episodeId={episode.id} episodeTitle={episode.title} podcastId={podcast.id} />
          </div>
        </div>
      </main>
    </div>
  );
}
