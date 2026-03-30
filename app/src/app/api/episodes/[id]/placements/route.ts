import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import type {
  CreatePlacementRequest,
  PlacementResponse,
  AdPlacement,
  AdPlacementInsert,
  AdPlacementUpdate,
  EpisodeWithPodcast,
  AdPlacementWithDetails,
  AdCreativeWithCampaignForOwnership,
} from '@/lib/types'

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/episodes/:id/placements
 * List all ad placements for an episode
 */
export async function GET(
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

    const { data: placements, error } = await supabase
      .from('ad_placements')
      .select(`
        *,
        ad_creatives(
          id,
          name,
          ad_campaigns(name)
        )
      `)
      .eq('episode_id', id)
      .order('position_ms', { ascending: true })

    if (error) {
      console.error('Error fetching placements:', error)
      return NextResponse.json({ error: 'Failed to fetch placements' }, { status: 500 })
    }

    const response: PlacementResponse[] = (placements as AdPlacementWithDetails[]).map((placement) => ({
      ...placement,
      episode_title: episode.title,
      creative_name: placement.ad_creatives?.name,
      campaign_name: placement.ad_creatives?.ad_campaigns?.name,
    }))

    return NextResponse.json({ placements: response })
  } catch (error) {
    console.error('Unexpected error in GET /api/episodes/:id/placements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/episodes/:id/placements
 * Create a new ad placement
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

    const body = await request.json() as CreatePlacementRequest

    // Validation
    if (!body.creative_id) {
      return NextResponse.json({ error: 'Creative ID is required' }, { status: 400 })
    }

    // Verify creative exists and user has access
    const { data: creative, error: creativeError } = await supabase
      .from('ad_creatives')
      .select(`
        id,
        duration_seconds,
        ad_campaigns(user_id)
      `)
      .eq('id', body.creative_id)
      .single()

    if (creativeError || !creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 })
    }

    if ((creative as unknown as AdCreativeWithCampaignForOwnership).ad_campaigns.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied to creative' }, { status: 403 })
    }

    if (body.position_ms === undefined || body.position_ms < 0) {
      return NextResponse.json({ error: 'Position must be non-negative' }, { status: 400 })
    }

    // Check position is within episode duration
    if (episode.duration_seconds && body.position_ms > episode.duration_seconds * 1000) {
      return NextResponse.json({
        error: `Position exceeds episode duration (${episode.duration_seconds}s)`
      }, { status: 400 })
    }

    if (!body.type) {
      return NextResponse.json({ error: 'Placement type is required' }, { status: 400 })
    }

    if (!['pre_roll', 'mid_roll', 'post_roll', 'dynamic'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid placement type' }, { status: 400 })
    }

    const placementData: AdPlacementInsert = {
      episode_id: id,
      creative_id: body.creative_id,
      position_ms: body.position_ms,
      type: body.type,
      status: 'pending',
    }

    const { data: placement, error } = await supabase
      .from('ad_placements')
      .insert(placementData)
      .select(`
        *,
        ad_creatives(
          id,
          name,
          ad_campaigns(name)
        )
      `)
      .single()

    if (error) {
      console.error('Error creating placement:', error)
      return NextResponse.json({ error: 'Failed to create placement' }, { status: 500 })
    }

    const response: PlacementResponse = {
      ...(placement as AdPlacement),
      episode_title: episode.title,
      creative_name: (placement as AdPlacementWithDetails).ad_creatives?.name,
      campaign_name: (placement as AdPlacementWithDetails).ad_creatives?.ad_campaigns?.name,
    }

    return NextResponse.json({ placement: response }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/episodes/:id/placements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
