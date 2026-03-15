'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function updatePodcast(prevState: { error?: string } | null, formData: FormData) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const id = formData.get('id') as string;
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

  // Validate RSS slug format
  if (!/^[a-z0-9-]+$/.test(rssSlug)) {
    return { error: 'RSS slug can only contain lowercase letters, numbers, and hyphens' };
  }

  // Check if RSS slug is unique (excluding current podcast)
  const { data: existing } = await supabase
    .from('podcasts')
    .select('id')
    .eq('rss_slug', rssSlug)
    .neq('id', id)
    .single();

  if (existing) {
    return { error: 'This RSS slug is already taken. Please choose another.' };
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
    return { error: updateError?.message || 'Failed to update podcast' };
  }

  redirect(`/podcasts/${id}`);
}
