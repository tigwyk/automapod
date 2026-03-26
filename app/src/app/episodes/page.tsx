import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AppNav } from '@/components/app-nav';

export const dynamic = 'force-dynamic';

async function getEpisodes() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get episodes owned directly by user (standalone episodes)
  const { data: directEpisodes } = await supabase
    .from('episodes')
    .select('*')
    .eq('user_id', user.id);

  // Get user's podcast IDs
  const { data: podcasts } = await supabase
    .from('podcasts')
    .select('id')
    .eq('user_id', user.id);

  const podcastIds = podcasts?.map(p => p.id) || [];

  // Get episodes through podcasts
  let podcastEpisodes = [];
  if (podcastIds.length > 0) {
    const { data: podcastEpisodesData } = await supabase
      .from('episodes')
      .select('*')
      .in('podcast_id', podcastIds);

    podcastEpisodes = podcastEpisodesData || [];
  }

  // Combine and deduplicate (by id), then sort
  const allEpisodes = [...(directEpisodes || []), ...podcastEpisodes];
  const uniqueEpisodes = Array.from(
    new Map(allEpisodes.map(e => [e.id, e])).values()
  ).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return { episodes: uniqueEpisodes, userId: user.id };
}

export default async function EpisodesPage() {
  const { episodes, userId } = await getEpisodes();

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav
        userId={userId}
        extraLinks={[{ href: '/episodes', label: 'Episodes', active: true }]}
        actionSlot={
          <Link href="/episodes/new" className="btn btn-sm btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Episode
          </Link>
        }
      />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Episodes</h1>
          <p className="text-muted-foreground mt-1">Manage your podcast episodes</p>
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
            <Link href="/episodes/new" className="btn btn-primary">
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
                  <Link href={`/episodes/${episode.id}`} className="block hover:bg-muted/50 transition-colors">
                    <div className="px-6 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">{episode.title || 'Untitled'}</h3>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {episode.description || 'No description'}
                          </p>
                          {episode.podcast_id && (
                            <span className="inline-flex items-center text-xs text-muted-foreground mt-2">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                              </svg>
                              Podcast
                            </span>
                          )}
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
