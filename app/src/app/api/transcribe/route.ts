import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Groq from 'groq-sdk';

export const runtime = 'nodejs';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * POST /api/transcribe
 *
 * Transcribes an episode's audio using Groq's Whisper API.
 *
 * Request body:
 * { episodeId: string }
 *
 * Response:
 * { transcript: string }
 */
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { episodeId } = body;

    if (!episodeId || typeof episodeId !== 'string') {
      return NextResponse.json(
        { error: 'episodeId is required (string)' },
        { status: 400 }
      );
    }

    // Fetch episode from database
    const { data: episode, error: fetchError } = await supabase
      .from('episodes')
      .select('id, audio_url, title, transcript_status')
      .eq('id', episodeId)
      .single();

    if (fetchError || !episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      );
    }

    if (!episode.audio_url) {
      return NextResponse.json(
        { error: 'Episode has no audio file to transcribe' },
        { status: 400 }
      );
    }

    // Update status to processing
    await supabase
      .from('episodes')
      .update({ transcript_status: 'processing' })
      .eq('id', episodeId);

    try {
      // Download audio from R2
      const audioResponse = await fetch(episode.audio_url);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status}`);
      }

      const audioBlob = await audioResponse.blob();
      const audioFile = new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' });

      // Send to Groq Whisper API
      const transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        response_format: 'text',
      });

      // Save transcript to database
      const { error: updateError } = await supabase
        .from('episodes')
        .update({
          transcript: transcription.text,
          transcript_status: 'completed',
        })
        .eq('id', episodeId);

      if (updateError) {
        throw new Error(`Failed to save transcript: ${updateError.message}`);
      }

      return NextResponse.json({
        transcript: transcription.text,
        episodeId: episode.id,
        title: episode.title,
      });

    } catch (error) {
      // Mark as failed on transcription error
      await supabase
        .from('episodes')
        .update({ transcript_status: 'pending' })
        .eq('id', episodeId);

      const errorMessage = error instanceof Error ? error.message : 'Transcription failed';

      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Transcription API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
