import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/analytics/podcast/:id
 *
 * Returns aggregate analytics for a single podcast:
 * - Total and unique downloads across all episodes
 * - Platform breakdown (aggregated)
 * - Downloads over last 30 days (all episodes combined)
 * - Top episodes ranked by total downloads
 *
 * Requires authentication. User must own the podcast.
 *
 * Aggregation is performed in-memory after fetching episode and download
 * rows. Suitable for current scale; migrate to SQL aggregate (RPC) if needed.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: podcastId } = await params;

    if (!podcastId) {
      return NextResponse.json(
        { error: 'Podcast ID is required' },
        { status: 400 }
      );
    }

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

    // Verify user owns this podcast
    const { data: podcast, error: podcastError } = await supabase
      .from('podcasts')
      .select('id, title')
      .eq('id', podcastId)
      .eq('user_id', user.id)
      .single();

    if (podcastError || !podcast) {
      return NextResponse.json(
        { error: 'Podcast not found' },
        { status: 404 }
      );
    }

    // Fetch all episodes for this podcast
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, title')
      .eq('podcast_id', podcastId)
      .order('created_at', { ascending: false });

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
      return NextResponse.json(
        { error: 'Failed to fetch episodes' },
        { status: 500 }
      );
    }

    const episodeIds = episodes?.map((e) => e.id) ?? [];

    if (episodeIds.length === 0) {
      return NextResponse.json({
        podcastId: podcast.id,
        title: podcast.title,
        totalDownloads: 0,
        uniqueDownloads: 0,
        platformBreakdown: { ios: 0, android: 0, web: 0, other: 0 },
        downloadsOverTime: buildEmptyTimeSeries(),
        topEpisodes: [],
      });
    }

    // Fetch all downloads for this podcast's episodes in one query
    const { data: downloads, error: downloadsError } = await supabase
      .from('episode_downloads')
      .select('episode_id, ip_hash, platform, downloaded_at')
      .in('episode_id', episodeIds);

    if (downloadsError) {
      console.error('Error fetching downloads:', downloadsError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    const allDownloads = downloads ?? [];

    // Account-level totals
    const totalDownloads = allDownloads.length;
    const uniqueDownloads = new Set(allDownloads.map((d) => d.ip_hash)).size;

    // Platform breakdown
    const platformBreakdown: Record<string, number> = {
      ios: 0,
      android: 0,
      web: 0,
      other: 0,
    };
    allDownloads.forEach((d) => {
      if (d.platform && platformBreakdown[d.platform] !== undefined) {
        platformBreakdown[d.platform]++;
      }
    });

    // Downloads over time (last 30 days, all episodes combined)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyCounts: Record<string, number> = {};
    allDownloads.forEach((d) => {
      if (d.downloaded_at && new Date(d.downloaded_at) >= thirtyDaysAgo) {
        const date = new Date(d.downloaded_at).toISOString().split('T')[0];
        dailyCounts[date] = (dailyCounts[date] ?? 0) + 1;
      }
    });

    const downloadsOverTime = buildTimeSeries(dailyCounts);

    // Per-episode totals for top episodes ranking
    const episodeTotals: Record<string, { total: number; ips: Set<string> }> = {};
    episodeIds.forEach((id) => {
      episodeTotals[id] = { total: 0, ips: new Set() };
    });
    allDownloads.forEach((d) => {
      if (episodeTotals[d.episode_id]) {
        episodeTotals[d.episode_id].total++;
        episodeTotals[d.episode_id].ips.add(d.ip_hash);
      }
    });

    // Build lookup for episode titles
    const episodeTitleById: Record<string, string> = {};
    episodes?.forEach((e) => {
      episodeTitleById[e.id] = e.title;
    });

    // Top episodes sorted by total downloads descending
    const topEpisodes = episodeIds
      .map((id) => ({
        id,
        title: episodeTitleById[id] ?? 'Untitled',
        totalDownloads: episodeTotals[id].total,
        uniqueDownloads: episodeTotals[id].ips.size,
      }))
      .sort((a, b) => b.totalDownloads - a.totalDownloads);

    return NextResponse.json({
      podcastId: podcast.id,
      title: podcast.title,
      totalDownloads,
      uniqueDownloads,
      platformBreakdown,
      downloadsOverTime,
      topEpisodes,
    });
  } catch (error) {
    console.error('Podcast analytics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/** Build a zero-filled 30-day time series. */
function buildEmptyTimeSeries() {
  return buildTimeSeries({});
}

/** Fill a 30-day series, inserting zeros for missing dates. */
function buildTimeSeries(dailyCounts: Record<string, number>) {
  const series: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    series.push({ date: dateStr, count: dailyCounts[dateStr] ?? 0 });
  }
  return series;
}
