import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/transcribe?episodeId=<id>
 *
 * Returns the current transcript_status and transcript for an episode.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return NextResponse.json({ error: 'episodeId query parameter is required' }, { status: 400 });
    }

    const { data: episode, error } = await supabase
      .from('episodes')
      .select('id, transcript_status, transcript')
      .eq('id', episodeId)
      .single();

    if (error || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 });
    }

    return NextResponse.json({
      episodeId: episode.id,
      status: episode.transcript_status,
      transcript: episode.transcript,
    });

  } catch (error) {
    console.error('Transcription status API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
