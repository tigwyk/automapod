/**
 * Shared utilities for download tracking and analytics.
 * Privacy-first implementation with GDPR compliance.
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

// ── Constants ─────────────────────────────────────────────────────────────

export const PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export const RESPONSE_HEADERS = {
  'content-type': 'image/gif',
  'cache-control': 'no-cache, no-store, must-revalidate',
} as const;

export const IP_HASH_SALT = process.env.IP_HASH_SALT || 'automapod-default-salt';

export const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /googlebot/i,
  /bingbot/i,
  /slackbot/i,
  /twitterbot/i,
  /facebookexternalhit/i,
] as const;

// ── Platform Types ───────────────────────────────────────────────────────────

export type Platform =
  | 'Apple Podcasts'
  | 'Spotify'
  | 'Overcast'
  | 'Pocket Casts'
  | 'Castro'
  | 'Podcast Addict'
  | 'Stitcher'
  | 'Google Podcasts'
  | 'Browser'
  | 'Other';

export const PLATFORMS = {
  APPLE_PODCASTS: 'Apple Podcasts',
  SPOTIFY: 'Spotify',
  OVERCAST: 'Overcast',
  POCKET_CASTS: 'Pocket Casts',
  CASTRO: 'Castro',
  PODCAST_ADDICT: 'Podcast Addict',
  STITCHER: 'Stitcher',
  GOOGLE_PODCASTS: 'Google Podcasts',
  BROWSER: 'Browser',
  OTHER: 'Other',
} as const;

// ── IP Utilities ───────────────────────────────────────────────────────────────

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    '0.0.0.0'
  );
}

export function hashClientIp(ip: string): string {
  return createHash('sha256')
    .update(ip + IP_HASH_SALT)
    .digest('hex');
}

// ── User Agent Analysis ──────────────────────────────────────────────────────

interface UserAgentAnalysis {
  platform: Platform;
  isBot: boolean;
}

export function analyzeUserAgent(userAgent: string): UserAgentAnalysis {
  const ua = userAgent.toLowerCase();

  // Check bots first (before expensive operations)
  if (BOT_PATTERNS.some(pattern => pattern.test(ua))) {
    return { platform: PLATFORMS.OTHER, isBot: true };
  }

  // Detect platforms (order by frequency for short-circuit benefit)
  const platformMap: Record<string, Platform> = {
    'apple-core-media': PLATFORMS.APPLE_PODCASTS,
    'spotify': PLATFORMS.SPOTIFY,
    'overcast': PLATFORMS.OVERCAST,
    'pocketcasts': PLATFORMS.POCKET_CASTS,
    'castro': PLATFORMS.CASTRO,
    'podcastaddict': PLATFORMS.PODCAST_ADDICT,
    'stitcher': PLATFORMS.STITCHER,
    'google-podcasts': PLATFORMS.GOOGLE_PODCASTS,
  };

  for (const [key, platform] of Object.entries(platformMap)) {
    if (ua.includes(key)) {
      return { platform, isBot: false };
    }
  }

  // Browsers
  if (ua.includes('firefox') || ua.includes('chrome') || ua.includes('safari')) {
    return { platform: PLATFORMS.BROWSER, isBot: false };
  }

  return { platform: PLATFORMS.OTHER, isBot: false };
}

// ── Response Creation ──────────────────────────────────────────────────────────

export function createTrackingResponse(): Response {
  return new Response(PIXEL_GIF, {
    headers: RESPONSE_HEADERS,
  });
}
