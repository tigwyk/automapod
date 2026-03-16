import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PodcastForm } from '@/components/podcast-form';

export const dynamic = 'force-dynamic';

async function createPodcast(prevState: { error?: string } | null, formData: FormData) {
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
    return { error: 'Title is required' };
  }

  if (!rssSlug || rssSlug.trim() === '') {
    return { error: 'RSS slug is required' };
  }

  // Validate RSS slug format (alphanumeric, hyphens only)
  if (!/^[a-z0-9-]+$/.test(rssSlug)) {
    return { error: 'RSS slug can only contain lowercase letters, numbers, and hyphens' };
  }

  // Check if RSS slug is unique
  const { data: existing } = await supabase
    .from('podcasts')
    .select('id')
    .eq('rss_slug', rssSlug)
    .single();

  if (existing) {
    return { error: 'This RSS slug is already taken. Please choose another.' };
  }

  // Create podcast
  const { data: podcast, error: insertError } = await supabase
    .from('podcasts')
    .insert({
      title,
      description,
      rss_slug: rssSlug,
      cover_image_url: coverImageUrl,
      user_id: user.id,
    })
    .select()
    .single();

  if (insertError || !podcast) {
    return { error: insertError?.message || 'Failed to create podcast' };
  }

  redirect('/podcasts');
}

export default async function NewPodcastPage() {
  return <PodcastForm action={createPodcast} />;
}
