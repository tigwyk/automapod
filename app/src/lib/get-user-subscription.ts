/**
 * Server-side helper: fetch the current user's subscription from the DB.
 * Returns a free/active default if no profile row exists yet.
 */

import { createClient } from '@/lib/supabase/server';
import type { UserSubscription } from './subscription';

export async function getUserSubscription(userId: string): Promise<UserSubscription> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'subscription_tier, subscription_status, trial_ends_at, current_period_end, stripe_customer_id, stripe_subscription_id'
    )
    .eq('id', userId)
    .single();

  return {
    tier: (profile?.subscription_tier as UserSubscription['tier']) ?? 'free',
    status: (profile?.subscription_status as UserSubscription['status']) ?? 'active',
    trialEndsAt: profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null,
    currentPeriodEnd: profile?.current_period_end ? new Date(profile.current_period_end) : null,
    stripeCustomerId: profile?.stripe_customer_id ?? null,
    stripeSubscriptionId: profile?.stripe_subscription_id ?? null,
  };
}
