import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateEpisodeKey,
  getPresignedUploadUrl,
  getR2EpisodesCustomDomain,
  isValidAudioFile,
  isValidFileSize,
} from '@/lib/r2';
import { getUserSubscription } from '@/lib/get-user-subscription';
import { canUploadEpisode } from '@/lib/subscription';

/**
 * POST /api/r2/presign
 *
 * Returns a short-lived presigned PUT URL for direct browser → R2 uploads.
 * The audio file never transits the Next.js server.
 *
 * Body: { filename: string, contentType: string, fileSize: number, podcastId: string }
 * Returns: { presignedUrl: string, key: string, audioUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json() as {
      filename?: string;
      contentType?: string;
      fileSize?: number;
      podcastId?: string;
    };

    const { filename, contentType, fileSize, podcastId } = body;

    if (!filename || !contentType || fileSize === undefined || !podcastId) {
      return NextResponse.json(
        { error: 'filename, contentType, fileSize, and podcastId are required' },
        { status: 400 }
      );
    }

    // Validate file type via a mock File object (reuse existing validators)
    const mockFile = { type: contentType, size: fileSize } as File;
    if (!isValidAudioFile(mockFile)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an audio file (MP3, M4A, WAV, or OGG)' },
        { status: 422 }
      );
    }
    if (!isValidFileSize(mockFile)) {
      return NextResponse.json(
        { error: 'File size exceeds 500MB limit' },
        { status: 422 }
      );
    }

    // Verify the authenticated user owns this podcast
    const { data: podcast } = await supabase
      .from('podcasts')
      .select('id')
      .eq('id', podcastId)
      .eq('user_id', user.id)
      .single();

    if (!podcast) {
      return NextResponse.json(
        { error: 'Podcast not found or access denied' },
        { status: 403 }
      );
    }

    // Subscription tier enforcement
    const subscription = await getUserSubscription(user.id);

    const { count: episodeCount, error: countError } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })
      .eq('podcast_id', podcastId);

    if (countError) {
      return NextResponse.json({ error: 'Failed to check episode limit' }, { status: 500 });
    }

    const fileSizeMb = Math.ceil(fileSize / (1024 * 1024));
    const result = canUploadEpisode(subscription, episodeCount ?? 0, 0, fileSizeMb);
    if (!result.allowed) {
      return NextResponse.json({ error: result.reason, upgradeRequired: true }, { status: 403 });
    }

    const episodeId = crypto.randomUUID();
    const key = generateEpisodeKey(episodeId, filename);
    const presignedUrl = await getPresignedUploadUrl(key, contentType);
    const audioUrl = `${getR2EpisodesCustomDomain()}/${key}`;

    return NextResponse.json({ presignedUrl, key, audioUrl });
  } catch (error) {
    console.error('Presign error:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
