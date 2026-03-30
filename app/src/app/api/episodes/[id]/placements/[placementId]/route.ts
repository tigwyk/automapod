import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import type {
  UpdatePlacementRequest,
  PlacementResponse,
  AdPlacement,
  AdPlacementUpdate,
  EpisodeWithPodcast,
  AdPlacementWithDetails,
} from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RouteContext = {
  params: Promise<{ id: string; placementId: string }>
}

/**
 * PATCH /api/episodes/:id/placements/:placementId
 * Update an ad placement
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, placementId } = await context.params
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

    const body = await request.json() as UpdatePlacementRequest

    const updates: AdPlacementUpdate = {}

    if (body.position_ms !== undefined) {
      if (body.position_ms < 0) {
        return NextResponse.json({ error: 'Position must be non-negative' }, { status: 400 })
      }

      // Check position is within episode duration
      if (episode.duration_seconds && body.position_ms > episode.duration_seconds * 1000) {
        return NextResponse.json({
          error: `Position exceeds episode duration (${episode.duration_seconds}s)`
        }, { status: 400 })
      }

      updates.position_ms = body.position_ms
    }

    if (body.status !== undefined) {
      if (!['pending', 'placed', 'skipped'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }

    const { data: placement, error } = await supabase
      .from('ad_placements')
      .update(updates)
      .eq('id', placementId)
      .eq('episode_id', id)
      .select(`
        *,
        ad_creatives(
          id,
          name,
          ad_campaigns(name)
        )
      `)
      .single()

    if (error || !placement) {
      return NextResponse.json({ error: 'Placement not found' }, { status: 404 })
    }

    const placementWithDetails = placement as AdPlacementWithDetails
    const response: PlacementResponse = {
      ...(placement as AdPlacement),
      episode_title: episode.title,
      creative_name: placementWithDetails.ad_creatives?.name,
      campaign_name: placementWithDetails.ad_creatives?.ad_campaigns?.name,
    }

    return NextResponse.json({ placement: response })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/episodes/:id/placements/:placementId:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/episodes/:id/placements/:placementId
 * Delete an ad placement
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id, placementId } = await context.params
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
      .from('ad_placements')
      .delete()
      .eq('id', placementId)
      .eq('episode_id', id)

    if (error) {
      console.error('Error deleting placement:', error)
      return NextResponse.json({ error: 'Failed to delete placement' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/episodes/:id/placements/:placementId:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
