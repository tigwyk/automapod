/**
 * Subscription tier definitions and enforcement helpers.
 *
 * All tier logic lives here so limits can be updated in one place.
 * Stripe-specific logic lives in lib/stripe.ts.
 */

export type SubscriptionTier = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

// ── Tier limits ──────────────────────────────────────────────────────────────

export interface TierLimits {
  podcasts: number;         // max podcasts (Infinity = unlimited)
  episodes: number;         // max total episodes (Infinity = unlimited)
  storageMb: number;        // max storage in MB
  transcriptionHours: number; // transcription hours per month (0 = none)
  analyticsWindowDays: number; // analytics history window (Infinity = all time)
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    podcasts: 1,
    episodes: 10,
    storageMb: 500,
    transcriptionHours: 0,
    analyticsWindowDays: 7,
  },
  pro: {
    podcasts: 3,
    episodes: Infinity,
    storageMb: 10_240,      // 10 GB
    transcriptionHours: 10,
    analyticsWindowDays: Infinity,
  },
  business: {
    podcasts: Infinity,
    episodes: Infinity,
    storageMb: 51_200,      // 50 GB
    transcriptionHours: 40,
    analyticsWindowDays: Infinity,
  },
};

// ── Active subscription check ─────────────────────────────────────────────────

/**
 * Returns true if the subscription is in a state that grants access to
 * paid features (active or in trial).
 */
export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'active' || status === 'trialing';
}

/**
 * Returns the effective tier to enforce. If the subscription is not active
 * (past_due, canceled, etc.) the user is dropped to free.
 */
export function getEffectiveTier(subscription: UserSubscription): SubscriptionTier {
  if (isSubscriptionActive(subscription.status)) {
    return subscription.tier;
  }
  return 'free';
}

// ── Feature gates ─────────────────────────────────────────────────────────────

export function canCreatePodcast(
  subscription: UserSubscription,
  currentPodcastCount: number
): { allowed: boolean; reason?: string } {
  const tier = getEffectiveTier(subscription);
  const limit = TIER_LIMITS[tier].podcasts;
  if (currentPodcastCount < limit) return { allowed: true };
  return {
    allowed: false,
    reason: tier === 'free'
      ? 'Free plan allows 1 podcast. Upgrade to Pro for up to 3.'
      : 'Upgrade to Business for unlimited podcasts.',
  };
}

export function canUploadEpisode(
  subscription: UserSubscription,
  currentEpisodeCount: number,
  currentStorageMb: number,
  fileSizeMb: number
): { allowed: boolean; reason?: string } {
  const tier = getEffectiveTier(subscription);
  const limits = TIER_LIMITS[tier];

  if (currentEpisodeCount >= limits.episodes) {
    return {
      allowed: false,
      reason: `Free plan allows ${limits.episodes} episodes. Upgrade to Pro for unlimited episodes.`,
    };
  }

  if (currentStorageMb + fileSizeMb > limits.storageMb) {
    const limitGb = (limits.storageMb / 1024).toFixed(0);
    return {
      allowed: false,
      reason: `Storage limit reached (${limitGb} GB on ${tier} plan). Upgrade to increase your storage.`,
    };
  }

  return { allowed: true };
}

export function canTranscribe(
  subscription: UserSubscription
): { allowed: boolean; reason?: string } {
  const tier = getEffectiveTier(subscription);
  const hours = TIER_LIMITS[tier].transcriptionHours;
  if (hours > 0) return { allowed: true };
  return {
    allowed: false,
    reason: 'Transcription is available on Pro and Business plans.',
  };
}

/**
 * Returns the number of days of analytics history to show.
 * Returns null for "all time" (no restriction).
 */
export function getAnalyticsWindowDays(subscription: UserSubscription): number | null {
  const tier = getEffectiveTier(subscription);
  const days = TIER_LIMITS[tier].analyticsWindowDays;
  return days === Infinity ? null : days;
}

// ── Tier display helpers ──────────────────────────────────────────────────────

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
};

export const TIER_PRICES: Record<SubscriptionTier, { monthly: number; annual: number }> = {
  free:     { monthly: 0,  annual: 0   },
  pro:      { monthly: 19, annual: 190 },
  business: { monthly: 49, annual: 490 },
};

export function formatTierPrice(tier: SubscriptionTier, interval: 'monthly' | 'annual'): string {
  const price = TIER_PRICES[tier][interval];
  if (price === 0) return 'Free';
  if (interval === 'annual') {
    const monthly = (price / 12).toFixed(2);
    return `$${monthly}/mo (billed $${price}/yr)`;
  }
  return `$${price}/mo`;
}
