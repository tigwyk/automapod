import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Queue } from 'bullmq'

import type { SilenceMarkerResponse, SilenceMarker, EpisodeWithPodcast } from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Initialize BullMQ queue for silence detection
const getSilenceQueue = () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is not set')
  }

  return new Queue('silence-detection', {
    connection: {
      url: process.env.REDIS_URL,
    },
  })
}

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/episodes/:id/silence
 * Get silence markers for an episode
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Verify episode ownership
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select(`
        id,
        podcasts(user_id)
      `)
      .eq('id', id)
      .single()

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    const episodeWithPodcast = episode as EpisodeWithPodcast
    if (episodeWithPodcast.podcasts.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: markers, error } = await supabase
      .from('silence_markers')
      .select('*')
      .eq('episode_id', id)
      .order('start_ms', { ascending: true })

    if (error) {
      console.error('Error fetching silence markers:', error)
      return NextResponse.json({ error: 'Failed to fetch silence markers' }, { status: 500 })
    }

    // Format time as MM:SS
    const formatTime = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000)
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

    const response: SilenceMarkerResponse[] = (markers as SilenceMarker[]).map(marker => ({
      ...marker,
      formatted_time: formatTime(marker.start_ms),
    }))

    return NextResponse.json({ markers: response })
  } catch (error) {
    console.error('Unexpected error in GET /api/episodes/:id/silence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/episodes/:id/silence
 * Trigger silence detection analysis
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Verify episode ownership
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select(`
        id,
        title,
        audio_url,
        duration_seconds,
        podcasts(user_id)
      `)
      .eq('id', id)
      .single()

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    const episodeWithPodcast = episode as EpisodeWithPodcast
    if (episodeWithPodcast.podcasts.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!episode.audio_url) {
      return NextResponse.json({ error: 'Episode has no audio file' }, { status: 400 })
    }

    const body = await request.json()
    const minDurationMs = body.min_duration_ms ?? 1000 // Default 1 second
    const minConfidence = body.min_confidence ?? 0.7 // Default 0.7

    if (minDurationMs < 100) {
      return NextResponse.json({ error: 'Minimum duration must be at least 100ms' }, { status: 400 })
    }

    if (minConfidence < 0 || minConfidence > 1) {
      return NextResponse.json({ error: 'Confidence must be between 0 and 1' }, { status: 400 })
    }

    // Clear existing markers
    await supabase
      .from('silence_markers')
      .delete()
      .eq('episode_id', id)

    // Queue silence detection job
    const queue = getSilenceQueue()

    const job = await queue.add(
      'detect-silence',
      {
        episodeId: id,
        audioUrl: episode.audio_url,
        minDurationMs,
        minConfidence,
        userId: user.id,
      },
      {
        jobId: `silence-${id}`, // Deduplicate jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    )

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: 'Silence detection analysis started',
    }, { status: 202 })
  } catch (error) {
    console.error('Unexpected error in POST /api/episodes/:id/silence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/episodes/:id/silence
 * Delete all silence markers for an episode
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Verify episode ownership
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select(`
        id,
        podcasts(user_id)
      `)
      .eq('id', id)
      .single()

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    const episodeWithPodcast = episode as EpisodeWithPodcast
    if (episodeWithPodcast.podcasts.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { error } = await supabase
      .from('silence_markers')
      .delete()
      .eq('episode_id', id)

    if (error) {
      console.error('Error deleting silence markers:', error)
      return NextResponse.json({ error: 'Failed to delete silence markers' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/episodes/:id/silence:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
