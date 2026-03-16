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
    .select('*, podcasts(user_id)')
    .eq('id', id)
    .single();

  if (!episode) {
    return null;
  }

  // Check if user owns this episode's podcast
  if (episode.podcasts?.user_id !== user.id) {
    return null;
  }

  return episode;
}

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
    return [];
  }

  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('id, title')
    .eq('user_id', user.id)
    .order('title');

  return podcasts || [];
}

async function updateEpisode(id: string, formData: FormData) {
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

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const podcastId = formData.get('podcast_id') as string;

  if (!title || title.trim().length === 0) {
    throw new Error('Title is required');
  }

  if (!podcastId) {
    throw new Error('Podcast is required');
  }

  const { error } = await supabase
    .from('episodes')
    .update({
      title: title.trim(),
      description: description?.trim() || null,
      podcast_id: podcastId,
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/episodes/${id}`);
  revalidatePath('/episodes');
  redirect(`/episodes/${id}`);
}

export default async function EditEpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const episode = await getEpisode(id);
  const podcasts = await getPodcasts();

  if (!episode) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Episode</h1>
        <p className="text-gray-600 mt-1">Update episode information</p>
      </div>

      <form action={updateEpisode.bind(null, id)} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            defaultValue={episode.title}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            defaultValue={episode.description || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
          <p className="mt-1 text-sm text-gray-500">
            Optional. A brief description of your episode.
          </p>
        </div>

        <div>
          <label htmlFor="podcast_id" className="block text-sm font-medium text-gray-700">
            Podcast <span className="text-red-500">*</span>
          </label>
          <select
            id="podcast_id"
            name="podcast_id"
            required
            defaultValue={episode.podcast_id}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          >
            {podcasts.map((podcast) => (
              <option key={podcast.id} value={podcast.id}>
                {podcast.title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Choose which podcast this episode belongs to.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
          <a
            href={`/episodes/${id}`}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 inline-block text-center pt-2"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
