/**
 * Server-side helper: fetch the current user's resource usage.
 * Returns counts and storage usage for subscription enforcement.
 */

import { createClient } from '@/lib/supabase/server';

export interface UserUsage {
  podcastCount: number;
  episodeCount: number;
  storageUsedMb: number;
}

export async function getUserUsage(userId: string): Promise<UserUsage> {
  const supabase = await createClient();

  // Count podcasts
  const { count: podcastCount } = await supabase
    .from('podcasts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Count episodes and sum storage
  const { data: episodes } = await supabase
    .from('episodes')
    .select('audio_size_bytes')
    .eq('user_id', userId);

  const episodeCount = episodes?.length || 0;
  const storageUsedBytes = episodes?.reduce((sum, ep) => sum + (ep.audio_size_bytes || 0), 0) || 0;
  const storageUsedMb = storageUsedBytes / (1024 * 1024);

  return {
    podcastCount: podcastCount || 0,
    episodeCount,
    storageUsedMb,
  };
}
