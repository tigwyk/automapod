import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Queue } from 'bullmq'

import type { InjectAdsRequest, EpisodeWithPodcast } from '@/lib/types'

// Initialize BullMQ queue for ad injection
const getAdInjectionQueue = () => {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL environment variable is not set')
  }

  return new Queue('ad-injection', {
    connection: {
      url: process.env.REDIS_URL,
    },
  })
}

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * POST /api/episodes/:id/inject-ads
 * Trigger ad injection for an episode
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify episode ownership
    const { data: episode, error: episodeError } = await supabase
      .from('episodes')
      .select(`
        id,
        title,
        audio_url,
        ad_enhanced_audio_url,
        duration_seconds,
        podcasts(user_id)
      `)
      .eq('id', id)
      .single()

    if (episodeError || !episode) {
      return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
    }

    if ((episode as unknown as EpisodeWithPodcast).podcasts.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!episode.audio_url) {
      return NextResponse.json({ error: 'Episode has no audio file' }, { status: 400 })
    }

    const body = await request.json() as InjectAdsRequest
    const { placement_ids } = body

    // Fetch placed ads count
    let placementsQuery = supabase
      .from('ad_placements')
      .select('id')
      .eq('episode_id', id)
      .eq('status', 'placed')

    if (placement_ids && placement_ids.length > 0) {
      placementsQuery = placementsQuery.in('id', placement_ids)
    }

    const { data: placements, error: placementsError } = await placementsQuery

    if (placementsError) {
      console.error('Error fetching placements:', placementsError)
      return NextResponse.json({ error: 'Failed to fetch placements' }, { status: 500 })
    }

    const adCount = placements?.length ?? 0

    if (adCount === 0) {
      return NextResponse.json({
        error: 'No placed ads found. Please place ads before injecting.',
        availablePlacements: 0,
      }, { status: 400 })
    }

    // Queue ad injection job
    const queue = getAdInjectionQueue()

    const job = await queue.add(
      'inject-ads',
      {
        episodeId: id,
        placementIds: placement_ids,
      },
      {
        jobId: `inject-ads-${id}-${Date.now()}`, // Allow multiple runs
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
      }
    )

    return NextResponse.json({
      success: true,
      jobId: job.id,
      episodeId: id,
      message: 'Ad injection started',
      adsToInject: adCount,
    }, { status: 202 })
  } catch (error) {
    console.error('Unexpected error in POST /api/episodes/:id/inject-ads:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
