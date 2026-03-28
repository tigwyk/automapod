/**
 * Stripe client and helper utilities.
 *
 * Server-only — never import this in client components.
 * Use the STRIPE_PUBLISHABLE_KEY env var for client-side Stripe.js.
 */

import Stripe from 'stripe';
import type { SubscriptionTier } from './subscription';

// ── Stripe client (singleton) ─────────────────────────────────────────────────

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    stripeInstance = new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
  }
  return stripeInstance;
}

// ── Price ID helpers ──────────────────────────────────────────────────────────

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function getPriceId(tier: 'pro' | 'business', interval: 'monthly' | 'annual'): string {
  const key = `STRIPE_${tier.toUpperCase()}_${interval === 'monthly' ? 'MONTHLY' : 'ANNUAL'}_PRICE_ID`;
  return getRequiredEnv(key);
}

// ── Customer helpers ──────────────────────────────────────────────────────────

/**
 * Retrieve or create a Stripe customer for the given user.
 * Returns the Stripe customer ID.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  existingCustomerId: string | null
): Promise<string> {
  const stripe = getStripe();

  if (existingCustomerId) {
    // Verify it still exists
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) return existingCustomerId;
    } catch {
      // Customer not found — create a new one
    }
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  return customer.id;
}

// ── Checkout session ──────────────────────────────────────────────────────────

export interface CreateCheckoutOptions {
  customerId: string;
  priceId: string;
  trialDays: number;
  successUrl: string;
  cancelUrl: string;
  userId: string;
}

export async function createCheckoutSession(
  options: CreateCheckoutOptions
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();

  return stripe.checkout.sessions.create({
    customer: options.customerId,
    mode: 'subscription',
    line_items: [{ price: options.priceId, quantity: 1 }],
    metadata: { supabase_user_id: options.userId },
    subscription_data: {
      trial_period_days: options.trialDays,
      metadata: { supabase_user_id: options.userId },
    },
    // No card required to start trial
    payment_method_collection: 'if_required',
    allow_promotion_codes: true,
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
  });
}

// ── Customer Portal session ───────────────────────────────────────────────────

export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ── Webhook verification ──────────────────────────────────────────────────────

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const secret = getRequiredEnv('STRIPE_WEBHOOK_SECRET');
  return getStripe().webhooks.constructEvent(payload, signature, secret);
}

// ── Subscription → tier mapping ───────────────────────────────────────────────

/**
 * Map a Stripe price ID back to an AutoMapod tier.
 * Falls back to 'free' if the price ID isn't recognised.
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  const pro = [
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  ];
  const business = [
    process.env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    process.env.STRIPE_BUSINESS_ANNUAL_PRICE_ID,
  ];

  if (pro.includes(priceId)) return 'pro';
  if (business.includes(priceId)) return 'business';
  return 'free';
}
