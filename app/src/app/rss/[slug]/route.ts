import { NextResponse, NextRequest } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Create public Supabase client (no cookies - public feed must not emit Set-Cookie)
    const supabase = createPublicClient();

    // Fetch podcast by slug (no auth required - public feed)
    const { data: podcast, error: podcastError } = await supabase
      .from('podcasts')
      .select('*')
      .eq('rss_slug', slug)
      .single();

    if (podcastError || !podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    // Fetch published episodes for this podcast
    const { data: episodes, error: episodesError } = await supabase
      .from('episodes')
      .select('*')
      .eq('podcast_id', podcast.id)
      .not('audio_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (episodesError) {
      console.error('Error fetching episodes:', episodesError);
      // Continue even if episodes fail
    }

    // Generate RSS XML
    const xml = generateRSSFeed(podcast, episodes || [], request.url);

    // Calculate ETag based on content hash
    const etag = `"${Buffer.from(xml).toString('base64').substring(0, 27)}"`;

    // Get latest episode date for Last-Modified
    const lastModified = episodes && episodes.length > 0
      ? episodes[0].created_at
      : podcast.updated_at;

    // Return RSS with caching headers
    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
        'ETag': etag,
        'Last-Modified': new Date(lastModified).toUTCString(),
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface PodcastRecord {
  id: string;
  rss_slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  updated_at: string;
}

interface EpisodeRecord {
  id: string;
  title: string;
  description: string | null;
  audio_url: string | null;
  created_at: string;
  duration_seconds: number | null;
}

function generateRSSFeed(podcast: PodcastRecord, episodes: EpisodeRecord[], requestUrl: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.automapod.app';
  const podcastUrl = `${baseUrl}/podcasts/${podcast.id}`;
  const feedUrl = `${baseUrl}/rss/${podcast.rss_slug}`;

  // Format date for RSS
  const formatDate = (date: string) => {
    return new Date(date).toUTCString();
  };

  // Format duration as HH:MM:SS
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Build episodes XML
  const episodesXml = episodes.map(episode => {
    const pubDate = episode.created_at ? formatDate(episode.created_at) : '';
    const duration = episode.duration_seconds ? formatDuration(episode.duration_seconds) : '0:00:00';

    // Use tracking URL for enclosure - points to our tracking endpoint which redirects to R2
    // The endpoint tracks the download, then redirects to the actual audio file
    const trackedAudioUrl = episode.audio_url ?
      `${baseUrl}/api/track/download?episodeId=${episode.id}` : null;

    const enclosure = trackedAudioUrl ?
      `    <enclosure url="${trackedAudioUrl}" type="audio/mpeg" length="12345678"/>` : '';

    return `    <item>
      <title><![CDATA[${episode.title}]]></title>
      <description><![CDATA[${episode.description || ''}]]></description>
      ${enclosure}
      <guid isPermaLink="false">${episode.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <itunes:duration>${duration}</itunes:duration>
      <itunes:explicit>no</itunes:explicit>
    </item>`;
  }).join('\n');

  // Build complete RSS feed
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title><![CDATA[${podcast.title}]]></title>
    <link>${podcastUrl}</link>
    <description><![CDATA[${podcast.description || ''}]]></description>
    <language>en-us</language>
    <itunes:author><![CDATA[${podcast.title}]]></itunes:author>
    <itunes:summary><![CDATA[${podcast.description || ''}]]></itunes:summary>
    <itunes:owner>
      <itunes:name><![CDATA[${podcast.title}]]></itunes:name>
      <itunes:email>${podcast.id}@automapod.app</itunes:email>
    </itunes:owner>
    <itunes:image href="${podcast.cover_image_url || `${baseUrl}/default-cover.jpg`}"/>
    <itunes:category text="Technology"/>
    <itunes:explicit>no</itunes:explicit>
${episodesXml.length > 0 ? episodesXml : ''}
  </channel>
</rss>`;
}
