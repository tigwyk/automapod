import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateStripeCustomer, createCheckoutSession, getPriceId } from '@/lib/stripe';

const TRIAL_DAYS = 14;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session for a new subscription.
 * Body: { tier: 'pro' | 'business', interval: 'monthly' | 'annual' }
 * Returns: { url } — redirect the browser to this URL
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json() as { tier?: string; interval?: string };
    const { tier, interval } = body;

    if (tier !== 'pro' && tier !== 'business') {
      return NextResponse.json({ error: 'Invalid tier. Must be "pro" or "business".' }, { status: 400 });
    }
    if (interval !== 'monthly' && interval !== 'annual') {
      return NextResponse.json({ error: 'Invalid interval. Must be "monthly" or "annual".' }, { status: 400 });
    }

    // Fetch existing subscription data
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_tier, subscription_status')
      .eq('id', user.id)
      .single();

    // Don't allow checkout if already on a paid active plan
    if (
      profile?.subscription_status === 'active' &&
      profile?.subscription_tier !== 'free'
    ) {
      return NextResponse.json(
        { error: 'Already subscribed. Use the billing portal to change your plan.' },
        { status: 409 }
      );
    }

    const customerId = await getOrCreateStripeCustomer(
      user.id,
      user.email ?? '',
      profile?.stripe_customer_id ?? null
    );

    // Persist customer ID if newly created
    if (customerId !== profile?.stripe_customer_id) {
      await supabase
        .from('profiles')
        .upsert({ id: user.id, stripe_customer_id: customerId });
    }

    const priceId = getPriceId(tier, interval);

    const session = await createCheckoutSession({
      customerId,
      priceId,
      trialDays: TRIAL_DAYS,
      successUrl: `${SITE_URL}/settings/billing?success=1`,
      cancelUrl: `${SITE_URL}/pricing?canceled=1`,
      userId: user.id,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
