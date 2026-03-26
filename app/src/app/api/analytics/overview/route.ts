import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnalyticsOverview } from '@/lib/analytics';

/**
 * GET /api/analytics/overview
 *
 * Returns account-level analytics for the authenticated user.
 * Aggregation is delegated to getAnalyticsOverview() in @/lib/analytics.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const overview = await getAnalyticsOverview(user.id);

    if (!overview) {
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    return NextResponse.json(overview);
  } catch (error) {
    console.error('Analytics overview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
