import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function getEpisode(id: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: episode } = await supabase
    .from('episodes')
    .select('*')
    .eq('id', id)
    .single();

  return episode;
}

async function deleteEpisode(id: string) {
  'use server';

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/episodes');
  redirect('/episodes');
}

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await getEpisode(id);

  if (!episode) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{episode.title}</h1>
        <p className="text-gray-600 mt-1">{episode.description || 'No description'}</p>
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

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete an episode, there is no going back.
        </p>
        <form action={deleteEpisode.bind(null, episode.id)}>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete Episode
          </button>
        </form>
      </div>
    </div>
  );
}
