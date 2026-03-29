import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { PodcastForm } from '@/components/podcast-form';
import { DeletePodcastButton } from '@/components/delete-podcast-button';
import { RssFeedPanel } from '@/components/rss-feed-panel';
import Link from 'next/link';
import { AppNav } from '@/components/app-nav';

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

  if (!podcast) return null;
  return { podcast, userId: user.id };
}

async function updatePodcast(prevState: { error?: string } | null, formData: FormData) {
  'use server';

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

export default async function PodcastDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getPodcast(id);

  if (!result) {
    redirect('/podcasts');
  }

  const { podcast, userId } = result;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  let baseUrl: string;

  if (siteUrl) {
    baseUrl = siteUrl.replace(/\/+$/, '');
  } else {
    const headersList = await headers();
    const forwardedProto = headersList.get('x-forwarded-proto')?.split(',')[0].trim();
    const forwardedHost = headersList.get('x-forwarded-host')?.split(',')[0].trim();
    const host = forwardedHost ?? headersList.get('host') ?? 'localhost:3000';
    const proto = forwardedProto ?? 'http';
    baseUrl = `${proto}://${host}`;
  }

  const feedUrl = `${baseUrl}/rss/${podcast.rss_slug}`;

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
            <li className="text-foreground font-medium" aria-current="page">
              {podcast.title}
            </li>
          </ol>
        </nav>

        <div className="card-elevated p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="flex gap-3">
              <Link href={`/podcasts/${podcast.id}/episodes/new`} className="btn btn-primary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Episode
              </Link>
              <Link href={`/podcasts/${podcast.id}/episodes`} className="btn btn-outline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                View Episodes
              </Link>
              <Link href={`/analytics/podcast/${podcast.id}`} className="btn btn-outline">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </Link>
            </div>
          </div>
        </div>

        <PodcastForm podcast={podcast} action={updatePodcast} podcastId={id} />

        <RssFeedPanel feedUrl={feedUrl} />

        <div className="mt-8 card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Once you delete a podcast, there is no going back. Please be certain.
          </p>
          <DeletePodcastButton podcastId={podcast.id} />
        </div>
      </main>
    </div>
  );
}
