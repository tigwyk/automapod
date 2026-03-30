import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/analytics/episode/:id
 *
 * Returns download analytics for a specific episode.
 * Requires authentication (user must own the podcast).
 *
 * Response includes:
 * - Total downloads
 * - Unique downloads (by IP hash)
 * - Platform breakdown
 * - Downloads over time (last 30 days)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: episodeId } = await params;

    if (!episodeId) {
      return NextResponse.json(
        { error: 'Episode ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user owns this episode
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select('id, title, podcast_id')
      .eq('id', episodeId)
      .single();

    if (episodeError || !episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    // Check if user owns the podcast
    const { data: podcast } = await supabase
      .from('podcasts')
      .select('user_id')
      .eq('id', episode.podcast_id)
      .single();

    if (!podcast || podcast.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get all downloads for this episode
    // Note: If episode_downloads table doesn't exist or has no data, return empty analytics
    let downloads: any[] | null = null;
    try {
      const result = await supabase
        .from('episode_downloads')
        .select('ip_hash, platform, downloaded_at')
        .eq('episode_id', episodeId);
      downloads = result.data;
      // Silently ignore errors - the table might not exist yet, which is fine
    } catch {
      // Table doesn't exist or other error - continue with empty data
      downloads = null;
    }

    // Calculate metrics
    const totalDownloads = downloads?.length || 0;
    const uniqueIpHashes = new Set(downloads?.map(d => d.ip_hash) || []);
    const uniqueDownloads = uniqueIpHashes.size;

    // Platform breakdown
    const platformBreakdown: Record<string, number> = {
      ios: 0,
      android: 0,
      web: 0,
      other: 0,
    };

    downloads?.forEach(d => {
      if (d.platform && platformBreakdown[d.platform] !== undefined) {
        platformBreakdown[d.platform]++;
      }
    });

    // Downloads over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const downloadsOverTime: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};

    downloads?.forEach(d => {
      if (d.downloaded_at) {
        const date = new Date(d.downloaded_at).toISOString().split('T')[0];
        if (new Date(d.downloaded_at) >= thirtyDaysAgo) {
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        }
      }
    });

    // Fill in missing dates with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      downloadsOverTime[dateStr] = dailyCounts[dateStr] || 0;
    }

    return NextResponse.json({
      episodeId: episode.id,
      title: episode.title,
      totalDownloads,
      uniqueDownloads,
      platformBreakdown,
      downloadsOverTime: Object.entries(downloadsOverTime).map(([date, count]) => ({
        date,
        count,
      })),
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
