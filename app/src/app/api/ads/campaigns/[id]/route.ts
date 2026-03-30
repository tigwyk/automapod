import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import type {
  UpdateCampaignRequest,
  CampaignResponse,
  AdCampaign,
  AdCampaignUpdate,
  AdCampaignWithCounts,
} from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * GET /api/ads/campaigns/:id
 * Get a specific campaign
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const cookieStore = cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const { data: campaign, error } = await supabase
      .from('ad_campaigns')
      .select(`
        *,
        ad_creatives(count),
        ad_placements(count)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const campaignWithCounts = campaign as AdCampaignWithCounts
    const response: CampaignResponse = {
      ...(campaign as AdCampaign),
      creatives_count: campaignWithCounts.ad_creatives?.[0]?.count ?? 0,
      placements_count: campaignWithCounts.ad_placements?.[0]?.count ?? 0,
    }

    return NextResponse.json({ campaign: response })
  } catch (error) {
    console.error('Unexpected error in GET /api/ads/campaigns/:id:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/ads/campaigns/:id
 * Update a campaign
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const cookieStore = cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('ad_campaigns')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const body = await request.json() as UpdateCampaignRequest

    const updates: AdCampaignUpdate = {}

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json({ error: 'Campaign name cannot be empty' }, { status: 400 })
      }
      updates.name = body.name.trim()
    }

    if (body.status !== undefined) {
      if (!['draft', 'active', 'paused', 'completed'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }

    if (body.end_date !== undefined) {
      if (body.end_date) {
        const endDate = new Date(body.end_date)
        if (isNaN(endDate.getTime())) {
          return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 })
        }
        updates.end_date = endDate.toISOString()
      } else {
        updates.end_date = null
      }
    }

    if (body.budget_cents !== undefined) {
      if (body.budget_cents < 0) {
        return NextResponse.json({ error: 'Budget cannot be negative' }, { status: 400 })
      }
      updates.budget_cents = body.budget_cents
    }

    const { data: campaign, error } = await supabase
      .from('ad_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating campaign:', error)
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: campaign as CampaignResponse })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/ads/campaigns/:id:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/ads/campaigns/:id
 * Delete a campaign
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const cookieStore = cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('ad_campaigns')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing || existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('ad_campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting campaign:', error)
      return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/ads/campaigns/:id:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
