import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { addTranscriptionJob, getTranscriptionJobState } from '@/lib/queue';

export const runtime = 'nodejs';

/**
 * POST /api/transcribe
 *
 * Queues an episode for transcription using BullMQ.
 * The actual transcription is processed by a worker.
 *
 * Request body:
 * { episodeId: string }
 *
 * Response (queued):
 * { jobId: string, status: 'queued', episodeId: string }
 *
 * Response (already queued/processing):
 * { jobId: string, status: 'processing'|'queued', state: JobState }
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

    // Check if there's already a job for this episode
    const existingJob = await getTranscriptionJobState(episodeId);
    if (existingJob && existingJob.state !== 'completed' && existingJob.state !== 'failed') {
      return NextResponse.json({
        jobId: existingJob.id,
        status: existingJob.state,
        episodeId,
        message: 'Transcription already in progress',
      });
    }

    // Update status to queued
    await supabase
      .from('episodes')
      .update({ transcript_status: 'queued' })
      .eq('id', episodeId);

    // Add job to queue
    const jobId = await addTranscriptionJob({
      episodeId: episode.id,
      userId: user.id,
      audioUrl: episode.audio_url,
      title: episode.title,
    });

    return NextResponse.json({
      jobId,
      status: 'queued',
      episodeId: episode.id,
    });

  } catch (error) {
    console.error('Transcription API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transcribe?episodeId=<id>
 *
 * Get the status of a transcription job
 */
export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const episodeId = searchParams.get('episodeId');

    if (!episodeId) {
      return NextResponse.json(
        { error: 'episodeId query parameter is required' },
        { status: 400 }
      );
    }

    const jobState = await getTranscriptionJobState(episodeId);

    if (!jobState) {
      return NextResponse.json(
        { error: 'No job found for this episode' },
        { status: 404 }
      );
    }

    return NextResponse.json(jobState);

  } catch (error) {
    console.error('Transcription status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
