import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';

export const runtime = 'edge';

// 1x1 transparent GIF
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'change-me-in-production';
  return createHash('sha256')
    .update(ip + salt)
    .digest('hex')
    .substring(0, 16);
}

function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return '0.0.0.0'; // Fallback
}

function parsePlatform(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('apple-core-media')) return 'Apple Podcasts';
  if (ua.includes('spotify')) return 'Spotify';
  if (ua.includes('overcast')) return 'Overcast';
  if (ua.includes('pocketcasts')) return 'Pocket Casts';
  if (ua.includes('castro')) return 'Castro';
  if (ua.includes('downcast')) return 'Downcast';
  if (ua.includes('podcastaddict')) return 'Podcast Addict';
  if (ua.includes('stitcher')) return 'Stitcher';
  if (ua.includes('google-podcasts')) return 'Google Podcasts';

  // Browsers
  if (ua.includes('firefox')) return 'Browser';
  if (ua.includes('chrome')) return 'Browser';
  if (ua.includes('safari')) return 'Browser';

  return 'Other';
}

function isBot(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /googlebot/i,
    /bingbot/i,
    /slackbot/i,
    /twitterbot/i,
    /facebookexternalhit/i,
  ];

  return botPatterns.some(pattern => pattern.test(ua));
}

export async function GET(
  request: NextRequest,
  { params }: { params: { episodeId: string } }
) {
  const episodeId = params.episodeId;

  // Get request metadata
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const ipHash = hashIP(ip);

  // Skip bots
  if (isBot(userAgent)) {
    return new Response(PIXEL_GIF, {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }

  // Parse platform
  const platform = parsePlatform(userAgent);

  // Store download event
  try {
    const supabase = await createClient();
    await supabase.from('episode_downloads').insert({
      episode_id: episodeId,
      ip_hash: ipHash,
      user_agent: userAgent,
      platform: platform,
      downloaded_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log but don't fail the response
    console.error('Failed to track download:', error);
  }

  // Return 1x1 transparent GIF
  return new Response(PIXEL_GIF, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
