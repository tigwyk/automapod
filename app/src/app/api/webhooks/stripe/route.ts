import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { constructWebhookEvent, getTierFromPriceId, getStripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import type { SubscriptionStatus, SubscriptionTier } from '@/lib/subscription';

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe subscription lifecycle events and keeps the local
 * profiles table in sync.
 *
 * Verified via stripe-signature header — rejects invalid requests.
 */
export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Error handling webhook event ${event.type}:`, err);
    // Return 200 so Stripe doesn't retry — log and investigate separately
    return NextResponse.json({ received: true, warning: 'Handler error — check logs' });
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      // Unhandled event — ignore silently
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.customer || !session.subscription) return;

  const userId = session.metadata?.supabase_user_id;
  if (!userId) {
    console.error('checkout.session.completed missing supabase_user_id metadata', session.id);
    return;
  }

  const supabase = await createClient();

  // Save customer ID against the user
  await supabase
    .from('profiles')
    .update({ stripe_customer_id: session.customer as string })
    .eq('id', userId)
    .throwOnError();

  // Immediately sync the subscription so the billing page reflects the new
  // tier without waiting for the separate customer.subscription.created event
  const subscription = await getStripe().subscriptions.retrieve(
    session.subscription as string
  );
  await handleSubscriptionUpdated(subscription);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id ?? '';

  const tier: SubscriptionTier = getTierFromPriceId(priceId);
  const status = mapStripeStatus(subscription.status);
  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;
  // In Stripe API v2026-03-25.dahlia, current_period_end moved to subscription items
  const periodEnd = subscription.items.data[0]?.current_period_end ?? null;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;

  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({
      subscription_tier: tier,
      subscription_status: status,
      stripe_subscription_id: subscription.id,
      trial_ends_at: trialEndsAt,
      current_period_end: currentPeriodEnd,
    })
    .eq('stripe_customer_id', customerId)
    .throwOnError();
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      trial_ends_at: null,
      current_period_end: null,
    })
    .eq('stripe_customer_id', customerId)
    .throwOnError();
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.customer) return;
  const customerId = invoice.customer as string;

  const supabase = await createClient();
  await supabase
    .from('profiles')
    .update({ subscription_status: 'past_due' })
    .eq('stripe_customer_id', customerId)
    .throwOnError();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'active':    return 'active';
    case 'trialing':  return 'trialing';
    case 'past_due':  return 'past_due';
    case 'canceled':
    case 'unpaid':    return 'canceled';
    default:          return 'incomplete';
  }
}

// Disable body parsing — Stripe requires the raw body for signature verification
export const config = {
  api: { bodyParser: false },
};
