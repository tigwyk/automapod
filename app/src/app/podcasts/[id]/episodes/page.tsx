import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AppNav } from '@/components/app-nav';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

async function getPodcastEpisodes(podcastId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Verify user owns this podcast
  const { data: podcast } = await supabase
    .from('podcasts')
    .select('*')
    .eq('id', podcastId)
    .eq('user_id', user.id)
    .single();

  if (!podcast) {
    return null;
  }

  // Get episodes for this podcast
  const { data: episodes } = await supabase
    .from('episodes')
    .select('*')
    .eq('podcast_id', podcastId)
    .order('created_at', { ascending: false });

  return { podcast, episodes: episodes || [], userId: user.id };
}

export default async function PodcastEpisodesPage({ params }: Props) {
  const { id } = await params;
  const result = await getPodcastEpisodes(id);

  if (!result) {
    notFound();
  }

  const { podcast, episodes, userId } = result;

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav
        userId={userId}
        activeLink="podcasts"
        extraLinks={[{ href: `/podcasts/${podcast.id}/episodes`, label: 'Episodes', active: true }]}
        actionSlot={
          <Link href={`/podcasts/${podcast.id}/episodes/new`} className="btn btn-sm btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Episode
          </Link>
        }
      />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
            <li className="text-foreground font-medium" aria-current="page">
              Episodes
            </li>
          </ol>
        </nav>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{podcast.title} - Episodes</h1>
              <p className="text-muted-foreground mt-1">Manage episodes for this podcast</p>
            </div>
            <Link
              href={`/podcasts/${podcast.id}`}
              className="btn btn-outline"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Podcast Settings
            </Link>
          </div>
        </div>

        {episodes.length === 0 ? (
          <div className="card-elevated p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">No episodes yet</h3>
            <p className="text-muted-foreground mt-2 mb-6">Upload your first episode to get started</p>
            <Link href={`/podcasts/${podcast.id}/episodes/new`} className="btn btn-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Your First Episode
            </Link>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-border">
              {episodes.map((episode) => (
                <li key={episode.id}>
                  <Link href={`/podcasts/${podcast.id}/episodes/${episode.id}`} className="block hover:bg-muted/50 transition-colors">
                    <div className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">{episode.title || 'Untitled'}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {episode.description || 'No description'}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`badge badge-${episode.transcript_status === 'completed' ? 'success' : episode.transcript_status === 'failed' ? 'accent' : 'warning'}`}>
                            {episode.transcript_status || 'pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
