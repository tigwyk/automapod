import { createClient } from '@/lib/supabase/server';

export type PodcastStat = {
  id: string;
  title: string;
  episodeCount: number;
  totalDownloads: number;
  uniqueDownloads: number;
};

export type AnalyticsOverview = {
  totalDownloads: number;
  totalUniqueDownloads: number;
  podcasts: PodcastStat[];
};

/**
 * Fetches and aggregates account-level analytics for a user.
 *
 * Aggregation is performed in-memory after fetching podcast, episode, and
 * download rows. Suitable for current scale; migrate to a SQL aggregate
 * query (RPC) via AMP-46 if download volume becomes a concern.
 */
export async function getAnalyticsOverview(
  userId: string,
  windowDays: number | null = null
): Promise<AnalyticsOverview | null> {
  try {
    const supabase = await createClient();

    const { data: podcasts, error: podcastsError } = await supabase
      .from('podcasts')
      .select('id, title')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (podcastsError || !podcasts) return null;

    if (podcasts.length === 0) {
      return { totalDownloads: 0, totalUniqueDownloads: 0, podcasts: [] };
    }

    const podcastIds = podcasts.map((p) => p.id);

    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('id, podcast_id')
      .in('podcast_id', podcastIds);

    if (episodesError) return null;

    const allEpisodeIds = episodes?.map((e) => e.id) ?? [];

    // When there are no episodes, skip the query to avoid UUID syntax errors.
    let downloads: { episode_id: string; ip_hash: string }[] = [];
    if (allEpisodeIds.length > 0) {
      let query = supabase
        .from('episode_downloads')
        .select('episode_id, ip_hash')
        .in('episode_id', allEpisodeIds);

      if (windowDays !== null) {
        const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', since);
      }

      const { data, error: downloadsError } = await query;
      if (downloadsError) return null;
      downloads = data ?? [];
    }

    const episodeToPodcast: Record<string, string> = {};
    const episodeCountByPodcast: Record<string, number> = {};
    episodes?.forEach((e) => {
      episodeToPodcast[e.id] = e.podcast_id;
      episodeCountByPodcast[e.podcast_id] =
        (episodeCountByPodcast[e.podcast_id] ?? 0) + 1;
    });

    const downloadsByPodcast: Record<string, { total: number; ips: Set<string> }> = {};
    podcasts.forEach((p) => {
      downloadsByPodcast[p.id] = { total: 0, ips: new Set() };
    });

    downloads.forEach((d) => {
      const podcastId = episodeToPodcast[d.episode_id];
      if (podcastId && downloadsByPodcast[podcastId]) {
        downloadsByPodcast[podcastId].total++;
        downloadsByPodcast[podcastId].ips.add(d.ip_hash);
      }
    });

    const globalIps = new Set(downloads.map((d) => d.ip_hash));

    return {
      totalDownloads: downloads.length,
      totalUniqueDownloads: globalIps.size,
      podcasts: podcasts.map((p) => ({
        id: p.id,
        title: p.title,
        episodeCount: episodeCountByPodcast[p.id] ?? 0,
        totalDownloads: downloadsByPodcast[p.id].total,
        uniqueDownloads: downloadsByPodcast[p.id].ips.size,
      })),
    };
  } catch {
    return null;
  }
}
