import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PodcastForm } from '@/components/podcast-form';
import DeletePodcastButton from '@/components/delete-podcast-button';
import { error } from 'next/response';

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

async function updatePodcast(id: string, formData: FormData) {
  'use server';

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string || '';
  const rssSlug = formData.get('rss_slug') as string;
  const coverImageUrl = formData.get('cover_image_url') as string || '';

  // Validation
  if (!title || title.trim() === '') {
    return error('Title is required');
  }

  if (!rssSlug || rssSlug.trim() === '') {
    return error('RSS slug is required');
  }

  // Validate RSS slug format
  if (!/^[a-z0-9-]+$/.test(rssSlug)) {
    return error('RSS slug can only contain lowercase letters, numbers, and hyphens');
  }

  // Check if RSS slug is unique (excluding current podcast)
  const { data: existing } = await supabase
    .from('podcasts')
    .select('id')
    .eq('rss_slug', rssSlug)
    .neq('id', id)
    .single();

  if (existing) {
    return error('This RSS slug is already taken. Please choose another.');
  }

  // Update podcast
  const { data: podcast, error: updateError } = await supabase
    .from('podcasts')
    .update({
      title,
      description,
      rss_slug: rssSlug,
      cover_image_url: coverImageUrl,
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (updateError || !podcast) {
    return error(updateError?.message || 'Failed to update podcast');
  }

  redirect(`/podcasts/${id}`);
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
      <PodcastForm podcast={podcast} action={(formData) => updatePodcast(id, formData)} />

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
