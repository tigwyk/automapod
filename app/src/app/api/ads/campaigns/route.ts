import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import type {
  CreateCampaignRequest,
  CampaignResponse,
  AdCampaignInsert,
  AdCampaignWithCounts,
} from '@/lib/types'

/**
 * GET /api/ads/campaigns
 * List all campaigns for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: campaigns, error } = await supabase
      .from('ad_campaigns')
      .select(`
        *,
        ad_creatives(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching campaigns:', error)
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
    }

    const response: CampaignResponse[] = (campaigns as AdCampaignWithCounts[]).map((campaign) => ({
      ...campaign,
      creatives_count: campaign.ad_creatives?.[0]?.count ?? 0,
      placements_count: 0,
    }))

    return NextResponse.json({ campaigns: response })
  } catch (error) {
    console.error('Unexpected error in GET /api/ads/campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/ads/campaigns
 * Create a new ad campaign
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as CreateCampaignRequest

    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 })
    }

    if (!body.type) {
      return NextResponse.json({ error: 'Campaign type is required' }, { status: 400 })
    }

    if (!['host_read', 'pre_recorded', 'network'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid campaign type' }, { status: 400 })
    }

    if (!body.start_date) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
    }

    const startDate = new Date(body.start_date)
    if (isNaN(startDate.getTime())) {
      return NextResponse.json({ error: 'Invalid start date format' }, { status: 400 })
    }

    if (body.end_date) {
      const endDate = new Date(body.end_date)
      if (isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 })
      }
      if (endDate <= startDate) {
        return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 })
      }
    }

    if (body.budget_cents !== undefined && body.budget_cents < 0) {
      return NextResponse.json({ error: 'Budget cannot be negative' }, { status: 400 })
    }

    const campaignData: AdCampaignInsert = {
      user_id: user.id,
      name: body.name.trim(),
      type: body.type,
      start_date: startDate.toISOString(),
      end_date: body.end_date ? new Date(body.end_date).toISOString() : null,
      budget_cents: body.budget_cents ?? 0,
      status: 'draft',
    }

    const { data: campaign, error } = await supabase
      .from('ad_campaigns')
      .insert(campaignData)
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    return NextResponse.json({ campaign: campaign as CampaignResponse }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/ads/campaigns:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
