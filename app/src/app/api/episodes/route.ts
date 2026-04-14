import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { maybeTriggerTranscription } from '@/lib/inngest/trigger-transcription';

/**
 * POST /api/episodes
 *
 * Creates an episode record after the audio file has been uploaded directly
 * to R2 via a presigned URL. The body contains only metadata — no file bytes.
 *
 * Body: { title: string, description?: string, audioUrl: string, podcastId: string }
 * Returns: { episode } with status 201
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json() as {
      title?: string;
      description?: string;
      audioUrl?: string;
      podcastId?: string;
      contentType?: string;
      fileSize?: number;
    };

    const { title, description, audioUrl, podcastId, contentType, fileSize } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!audioUrl) {
      return NextResponse.json({ error: 'audioUrl is required' }, { status: 400 });
    }
    if (!podcastId) {
      return NextResponse.json({ error: 'podcastId is required' }, { status: 400 });
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

    const { data: episode, error: insertError } = await supabase
      .from('episodes')
      .insert({
        title: title.trim(),
        description: description?.trim() || '',
        audio_url: audioUrl,
        audio_file_size: fileSize ?? null,
        audio_content_type: contentType ?? null,
        duration_seconds: null,
        transcript_status: 'pending',
        podcast_id: podcastId,
      })
      .select()
      .single();

    if (insertError || !episode) {
      return NextResponse.json(
        { error: insertError?.message || 'Failed to create episode' },
        { status: 500 }
      );
    }

    // Auto-trigger transcription if the user's subscription allows it
    await maybeTriggerTranscription(supabase, user.id, episode);

    return NextResponse.json({ episode }, { status: 201 });
  } catch (error) {
    console.error('Create episode error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: episodes, error } = await supabase
      .from('episodes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ episodes });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
