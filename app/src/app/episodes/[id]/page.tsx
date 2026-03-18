import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import DeleteEpisodeButton from './delete-button';

export const dynamic = 'force-dynamic';

/**
 * Gets an episode with ownership verification.
 * Returns the episode only if the current user owns it.
 * Ownership is determined by either:
 * 1. episode.user_id matches the user (for standalone episodes)
 * 2. episode.podcast_id belongs to a podcast the user owns
 */
async function getAuthenticatedEpisode(id: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get episode - use a simple query first
  const { data: episode } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', id)
    .single();

  if (!episode) {
    return null;
  }

  // Verify ownership: user must own the episode directly OR through its podcast
  const ownsDirectly = episode.user_id === user.id;

  let ownsViaPodcast = false;
  if (!ownsDirectly && episode.podcast_id) {
    // Check if the podcast belongs to the user
    const { data: podcast } = await supabase
      .from('podcasts')
      .select('user_id')
      .eq('id', episode.podcast_id)
      .single();

    ownsViaPodcast = podcast?.user_id === user.id;
  }

  if (!ownsDirectly && !ownsViaPodcast) {
    return null;
  }

  return episode;
}

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await getAuthenticatedEpisode(id);

  if (!episode) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{episode.title}</h1>
          <p className="text-gray-600 mt-1">{episode.description || 'No description'}</p>
        </div>
        <a
          href={`/analytics/episode/${id}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          View Analytics
        </a>
      </div>

      {episode.audio_url && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
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

      <div className="bg-white shadow rounded-lg p-6 mb-6">
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

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Manage Episode</h2>
        <div className="flex gap-4 items-center">
          <a
            href={`/episodes/${id}/edit`}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 inline-flex items-center"
          >
            Edit Episode
          </a>
          <DeleteEpisodeButton episodeId={episode.id} episodeTitle={episode.title} />
        </div>
      </div>
    </div>
  );
}
