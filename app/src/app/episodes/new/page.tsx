import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { uploadToR2, generateEpisodeKey, R2_EPISODES_BUCKET } from '@/lib/r2';

export const dynamic = 'force-dynamic';

async function getPodcasts() {
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

  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('*')
    .order('title');

  return { podcasts: podcasts || [] };
}

async function uploadEpisode(formData: FormData) {
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

  // Get podcast info for RSS slug (if podcast selected)
  let rssSlug = 'standalone';
  if (podcastId) {
    const { data: podcast } = await supabase
      .from('podcasts')
      .select('rss_slug')
      .eq('id', podcastId)
      .single();

    if (podcast) {
      rssSlug = podcast.rss_slug;
    }
  }

  // Convert file to buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

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
  const key = generateEpisodeKey(rssSlug, episode.id, file.name);
  const audioUrl = await uploadToR2(
    R2_EPISODES_BUCKET,
    key,
    buffer,
    file.type || 'audio/mpeg'
  );

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload New Episode</h1>
        <p className="text-gray-600 mt-1">Add a new episode to your podcast</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form action={uploadEpisode} className="space-y-6">
          {podcasts.length > 0 && (
            <div>
              <label htmlFor="podcast_id" className="block text-sm font-medium text-gray-700">
                Podcast (optional)
              </label>
              <select
                name="podcast_id"
                id="podcast_id"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a podcast...</option>
                {podcasts.map((podcast: any) => (
                  <option key={podcast.id} value={podcast.id}>
                    {podcast.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Leave empty to upload as a standalone episode
              </p>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              id="title"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Episode title"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Episode description"
            />
          </div>

          <div>
            <label htmlFor="audio" className="block text-sm font-medium text-gray-700">
              Audio File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              name="audio"
              id="audio"
              accept="audio/*"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              MP3, M4A, WAV, or OGG (max 500MB)
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Upload Episode
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
