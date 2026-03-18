import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 1x1 transparent GIF (43 bytes) - for pixel tracking mode
const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

type Platform = 'ios' | 'android' | 'web' | 'other';

/**
 * GET /api/track/download?episodeId=xxx
 *
 * Download tracking endpoint for podcast analytics.
 *
 * Redirects to the actual audio file after tracking.
 * Never returns errors - tracking should be silent and not break RSS readers.
 *
 * Query params:
 * - episodeId: UUID of the episode (optional)
 * - pixel: Set to "1" to return 1x1 GIF instead of redirect (for pixel tracking in HTML)
 *
 * Privacy features:
 * - IP addresses are hashed (SHA-256) before storage
 * - Salt is used to prevent rainbow table attacks
 * - No personal data is stored
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const episodeId = searchParams.get('episodeId');
  const pixelMode = searchParams.get('pixel') === '1';

  // Helper function to return pixel GIF (for pixel tracking mode)
  const returnPixelGif = () => new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });

  // If no episodeId provided, return GIF silently (for RSS reader compatibility)
  if (!episodeId || typeof episodeId !== 'string') {
    return returnPixelGif();
  }

  // Fetch episode to get the actual audio URL
  const { data: episode, error: episodeError } = await supabase
    .from('episodes')
    .select('id, audio_url')
    .eq('id', episodeId)
    .single();

  if (episodeError || !episode || !episode.audio_url) {
    // Episode not found - return GIF in pixel mode, otherwise 404
    return pixelMode ? returnPixelGif() : new NextResponse('Episode not found', { status: 404 });
  }

  // Get client IP (check multiple headers for different deployments)
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown';

  // Get User-Agent
  const userAgent = request.headers.get('user-agent') || 'unknown';

  // Detect platform
  const platform = detectPlatform(userAgent);

  // Hash IP for privacy (GDPR/CCPA compliant)
  const ipSalt = process.env.IP_HASH_SALT || 'automapod-default-salt';
  const ipHash = createHash('sha256')
    .update(clientIp + ipSalt)
    .digest('hex');

  // Store download asynchronously (don't block response)
  (async () => {
    try {
      await supabase.from('episode_downloads').insert({
        episode_id: episodeId,
        ip_hash: ipHash,
        platform,
        user_agent: userAgent,
      });
    } catch (error) {
      // Silently fail - tracking shouldn't break the podcast
      console.error('Failed to track download:', error);
    }
  })();

  // Return GIF in pixel mode, otherwise redirect to actual audio
  if (pixelMode) {
    return returnPixelGif();
  }

  // Redirect to the actual audio file (301 for permanent redirect)
  return NextResponse.redirect(episode.audio_url, 301);
}

/**
 * Detect platform from User-Agent string
 */
function detectPlatform(userAgent: string): Platform {
  const ua = userAgent.toLowerCase();

  // iOS devices and apps
  if (
    ua.includes('iphone') ||
    ua.includes('ipad') ||
    ua.includes('ipod') ||
    ua.includes('apple-coremedia') || // Native iOS Podcast app
    ua.includes('overcast') ||
    ua.includes('downcast') ||
    ua.includes('castro') ||
    ua.includes('pocketcasts') && ua.includes('ios')
  ) {
    return 'ios';
  }

  // Android devices and apps
  if (
    ua.includes('android') ||
    ua.includes('podcastaddict') ||
    ua.includes('podkicker') ||
    ua.includes('beyondpod') ||
    ua.includes('doggcatcher')
  ) {
    return 'android';
  }

  // Web browsers
  if (
    ua.includes('mozilla') ||
    ua.includes('chrome') ||
    ua.includes('safari') ||
    ua.includes('firefox') ||
    ua.includes('edge')
  ) {
    return 'web';
  }

  // Other podcast apps and devices
  return 'other';
}
