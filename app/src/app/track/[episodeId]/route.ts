import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getClientIp,
  hashClientIp,
  analyzeUserAgent,
  createTrackingResponse,
} from '@/lib/analytics-utils';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: { episodeId: string } }
) {
  const episodeId = params.episodeId;
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  // Analyze user agent (check for bots FIRST, before expensive operations)
  const analysis = analyzeUserAgent(userAgent);

  if (analysis.isBot) {
    return createTrackingResponse();
  }

  // Get IP hash
  const ip = getClientIp(request);
  const ipHash = hashClientIp(ip);

  // Store download event (fire-and-forget - don't block response)
  const supabase = await createClient();
  supabase
    .from('episode_downloads')
    .insert({
      episode_id: episodeId,
      ip_hash: ipHash,
      user_agent: userAgent,
      platform: analysis.platform,
      downloaded_at: new Date().toISOString(),
    })
    .catch((error) => {
      console.error('Failed to track download:', error);
    });

  return createTrackingResponse();
}
