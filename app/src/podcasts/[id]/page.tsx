import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import PodcastForm from '@/components/podcast-form';
import DeletePodcastButton from '@/components/delete-podcast-button';

export const dynamic = 'force-dynamic';

async function getPodcast(id: string) {
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

  const { data: podcast } = await supabase
    .from('podcasts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  return podcast;
}

async function updatePodcast(
  id: string,
  data: {
    title: string;
    description: string;
    cover_image_url: string;
    rss_slug: string;
  }
) {
  'use server';

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/podcasts/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update podcast');
  }
}

export default async function PodcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const podcast = await getPodcast(id);

  if (!podcast) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Podcast</h1>
        <p className="text-gray-600 mt-1">Update your podcast settings</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <PodcastForm
          initialData={{
            title: podcast.title,
            description: podcast.description || '',
            cover_image_url: podcast.cover_image_url || '',
            rss_slug: podcast.rss_slug,
          }}
          onSubmit={(data) => updatePodcast(podcast.id, data)}
          submitLabel="Save Changes"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete a podcast, there is no going back. Please be certain.
        </p>
        <DeletePodcastButton podcastId={podcast.id} />
      </div>
    </div>
  );
}
