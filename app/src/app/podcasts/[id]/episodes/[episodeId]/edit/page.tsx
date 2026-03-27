import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/app-nav';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string; episodeId: string }>;
}

async function getEpisodeForEdit(podcastId: string, episodeId: string) {
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

  // Get the episode (must belong to this podcast)
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

async function updateEpisode(podcastId: string, episodeId: string, formData: FormData) {
  'use server';

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Verify ownership
  const { data: podcast } = await supabase
    .from('podcasts')
    .select('id')
    .eq('id', podcastId)
    .eq('user_id', user.id)
    .single();

  if (!podcast) {
    throw new Error('Podcast not found or access denied');
  }

  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;

  if (!title) {
    throw new Error('Title is required');
  }

  const { error } = await supabase
    .from('episodes')
    .update({ title, description })
    .eq('id', episodeId)
    .eq('podcast_id', podcastId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/podcasts/${podcastId}/episodes/${episodeId}`);
}

export default async function EditEpisodePage({ params }: Props) {
  const { id: podcastId, episodeId } = await params;
  const result = await getEpisodeForEdit(podcastId, episodeId);

  if (!result) {
    notFound();
  }

  const { podcast, episode, userId } = result;

  const boundUpdateEpisode = updateEpisode.bind(null, podcastId, episodeId);

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav
        userId={userId}
        activeLink="podcasts"
        extraLinks={[{ href: `/podcasts/${podcast.id}/episodes`, label: 'Episodes' }]}
      />

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
            <li>
              <Link href={`/podcasts/${podcast.id}/episodes`} className="text-muted-foreground hover:text-foreground transition-colors">
                Episodes
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li>
              <Link href={`/podcasts/${podcast.id}/episodes/${episode.id}`} className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[12rem]" title={episode.title}>
                {episode.title}
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="text-foreground font-medium" aria-current="page">
              Edit
            </li>
          </ol>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Edit Episode</h1>
          <p className="text-gray-600 mt-1">Update episode information for <span className="font-semibold">{podcast.title}</span></p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <form action={boundUpdateEpisode} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                id="title"
                required
                defaultValue={episode.title}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                name="description"
                id="description"
                rows={4}
                defaultValue={episode.description || ''}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Episode description"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Link
                href={`/podcasts/${podcast.id}/episodes/${episode.id}`}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </Link>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
