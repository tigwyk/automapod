import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type RouteContext = {
  params: Promise<{ id: string }>
}

/**
 * DELETE /api/ads/creatives/:id
 * Delete a creative
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

    // Verify ownership through campaign
    const { data: creative, error: fetchError } = await supabase
      .from('ad_creatives')
      .select(`
        id,
        ad_campaigns(user_id)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !creative) {
      return NextResponse.json({ error: 'Creative not found' }, { status: 404 })
    }

    if ((creative as any).ad_campaigns.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { error } = await supabase
      .from('ad_creatives')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting creative:', error)
      return NextResponse.json({ error: 'Failed to delete creative' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/ads/creatives/:id:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
