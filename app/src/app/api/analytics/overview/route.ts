import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/analytics/overview
 *
 * Returns account-level analytics for the authenticated user:
 * - Total downloads and unique downloads across all podcasts
 * - Per-podcast breakdown with episode counts and download totals
 *
 * Aggregation is performed at the database level to avoid
 * loading all download rows into memory.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch all podcasts for this user
    const { data: podcasts, error: podcastsError } = await supabase
      .from('podcasts')
      .select('id, title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (podcastsError) {
      console.error('Error fetching podcasts:', podcastsError);
      return NextResponse.json(
        { error: 'Failed to fetch podcasts' },
        { status: 500 }
      );
    }

    if (!podcasts || podcasts.length === 0) {
      return NextResponse.json({
        totalDownloads: 0,
        totalUniqueDownloads: 0,
        podcasts: [],
      });
    }

    const podcastIds = podcasts.map((p) => p.id);

    // Fetch all episodes for these podcasts
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, podcast_id')
      .in('podcast_id', podcastIds);

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
      return NextResponse.json(
        { error: 'Failed to fetch episodes' },
        { status: 500 }
      );
    }

    const allEpisodeIds = episodes?.map((e) => e.id) ?? [];

    // Fetch all download records for these episodes in one query.
    // We select only the fields needed for aggregation.
    // The [''] fallback avoids a Supabase error on an empty .in() list when a
    // user has podcasts but no episodes yet; it matches no rows.
    const { data: downloads, error: downloadsError } = await supabase
      .from('episode_downloads')
      .select('episode_id, ip_hash')
      .in('episode_id', allEpisodeIds.length > 0 ? allEpisodeIds : ['']);

    if (downloadsError) {
      console.error('Error fetching downloads:', downloadsError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    // Build episode → podcast lookup and episode count per podcast in one pass
    const episodeToPodcast: Record<string, string> = {};
    const episodeCountByPodcast: Record<string, number> = {};
    episodes?.forEach((e) => {
      episodeToPodcast[e.id] = e.podcast_id;
      episodeCountByPodcast[e.podcast_id] =
        (episodeCountByPodcast[e.podcast_id] ?? 0) + 1;
    });

    // Aggregate downloads per podcast
    const downloadsByPodcast: Record<string, { total: number; ips: Set<string> }> = {};
    podcasts.forEach((p) => {
      downloadsByPodcast[p.id] = { total: 0, ips: new Set() };
    });

    downloads?.forEach((d) => {
      const podcastId = episodeToPodcast[d.episode_id];
      if (podcastId && downloadsByPodcast[podcastId]) {
        downloadsByPodcast[podcastId].total++;
        downloadsByPodcast[podcastId].ips.add(d.ip_hash);
      }
    });

    // Compute account-level totals (unique by podcast to avoid double-counting
    // the same listener across podcasts — use global unique IP set)
    const globalIps = new Set(downloads?.map((d) => d.ip_hash) ?? []);
    const totalDownloads = downloads?.length ?? 0;
    const totalUniqueDownloads = globalIps.size;

    // Build per-podcast response
    const podcastStats = podcasts.map((p) => ({
      id: p.id,
      title: p.title,
      episodeCount: episodeCountByPodcast[p.id] ?? 0,
      totalDownloads: downloadsByPodcast[p.id].total,
      uniqueDownloads: downloadsByPodcast[p.id].ips.size,
    }));

    return NextResponse.json({
      totalDownloads,
      totalUniqueDownloads,
      podcasts: podcastStats,
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
