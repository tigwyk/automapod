import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

import type {
  CreateCreativeRequest,
  CreativeResponse,
  AdCreative,
  AdCreativeInsert,
  AdCreativeWithCampaignName,
} from '@/lib/types'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/ads/creatives
 * List all creatives for the authenticated user's campaigns
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('campaign_id')

    let query = supabase
      .from('ad_creatives')
      .select(`
        *,
        ad_campaigns(name)
      `)

    // Filter by user's campaigns
    query = query.eq('ad_campaigns.user_id', user.id)

    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    const { data: creatives, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching creatives:', error)
      return NextResponse.json({ error: 'Failed to fetch creatives' }, { status: 500 })
    }

    const response: CreativeResponse[] = (creatives as AdCreativeWithCampaignName[]).map((creative) => ({
      ...creative,
      campaign_name: creative.ad_campaigns?.name,
    }))

    return NextResponse.json({ creatives: response })
  } catch (error) {
    console.error('Unexpected error in GET /api/ads/creatives:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/ads/creatives
 * Create a new ad creative
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('sb-access-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const body = await request.json() as CreateCreativeRequest

    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Creative name is required' }, { status: 400 })
    }

    if (!body.campaign_id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    // Verify campaign ownership
    const { data: campaign, error: campaignError } = await supabase
      .from('ad_campaigns')
      .select('id, user_id')
      .eq('id', body.campaign_id)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found or access denied' }, { status: 404 })
    }

    if (!body.audio_url?.trim()) {
      return NextResponse.json({ error: 'Audio URL is required' }, { status: 400 })
    }

    if (!body.duration_seconds || body.duration_seconds <= 0) {
      return NextResponse.json({ error: 'Duration must be positive' }, { status: 400 })
    }

    if (body.duration_seconds > 180) {
      return NextResponse.json({ error: 'Duration cannot exceed 3 minutes' }, { status: 400 })
    }

    const creativeData: AdCreativeInsert = {
      campaign_id: body.campaign_id,
      name: body.name.trim(),
      audio_url: body.audio_url.trim(),
      duration_seconds: body.duration_seconds,
      transcript: body.transcript ?? null,
      click_through_url: body.click_through_url?.trim() ?? null,
    }

    const { data: creative, error } = await supabase
      .from('ad_creatives')
      .insert(creativeData)
      .select(`
        *,
        ad_campaigns(name)
      `)
      .single()

    if (error) {
      console.error('Error creating creative:', error)
      return NextResponse.json({ error: 'Failed to create creative' }, { status: 500 })
    }

    const creativeWithCampaignName = creative as AdCreativeWithCampaignName
    const response: CreativeResponse = {
      ...(creative as AdCreative),
      campaign_name: creativeWithCampaignName.ad_campaigns?.name,
    }

    return NextResponse.json({ creative: response }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in POST /api/ads/creatives:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
