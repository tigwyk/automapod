import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PodcastForm } from '@/components/podcast-form';
import DeletePodcastButton from '@/components/delete-podcast-button';
import { updatePodcast } from './actions';

export const dynamic = 'force-dynamic';

async function getPodcast(id: string) {
  const supabase = await createClient();

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

export default async function PodcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const podcast = await getPodcast(id);

  if (!podcast) {
    redirect('/podcasts');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <PodcastForm podcast={podcast} action={updatePodcast} podcastId={id} />

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Once you delete a podcast, there is no going back. Please be certain.
        </p>
        <DeletePodcastButton podcastId={podcast.id} />
      </div>
    </div>
  );
}
