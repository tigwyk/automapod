import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/app-nav';
import { getUserSubscription } from '@/lib/get-user-subscription';
import { getUserUsage } from '@/lib/get-user-usage';
import { TIER_LABELS, TIER_LIMITS, TIER_PRICES, getEffectiveTier } from '@/lib/subscription';
import { OpenPortalButton } from '@/components/open-portal-button';
import { StartTrialButton } from '@/components/start-trial-button';
import { BillingSuccessRefresh } from '@/components/billing-success-refresh';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Billing — AutomaPod' };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const subscription = await getUserSubscription(user.id);
  const usage = await getUserUsage(user.id);
  const effectiveTier = getEffectiveTier(subscription);
  const limits = TIER_LIMITS[effectiveTier];
  const params = await searchParams;
  const justSubscribed = params.success === '1';

  const isTrialing = subscription.status === 'trialing';
  const trialDaysLeft = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const isPaid = effectiveTier !== 'free';

  // Calculate usage percentages for progress bars
  const podcastUsage = limits.podcasts === Infinity ? 0 : (usage.podcastCount / limits.podcasts) * 100;
  const episodeUsage = limits.episodes === Infinity ? 0 : (usage.episodeCount / limits.episodes) * 100;
  const storageUsage = (usage.storageUsedMb / limits.storageMb) * 100;

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav userId={user.id} activeLink="billing" subscription={subscription} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Billing</h1>
        <p className="text-muted-foreground mb-8">Manage your plan and subscription.</p>

        {justSubscribed && (
          <>
            <BillingSuccessRefresh />
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 font-medium">
              🎉 Welcome to AutomaPod {TIER_LABELS[effectiveTier]}! Your trial has started.
            </div>
          </>
        )}

        {/* Current plan */}
        <div className="card-elevated p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Current plan</h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">{TIER_LABELS[effectiveTier]}</span>
                {isTrialing && trialDaysLeft !== null && (
                  <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    Trial — {trialDaysLeft}d left
                  </span>
                )}
                {subscription.status === 'past_due' && (
                  <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    Payment past due
                  </span>
                )}
              </div>
              {isPaid && (
                <p className="text-sm text-muted-foreground mt-1">
                  {isTrialing
                    ? `Trial ends ${subscription.trialEndsAt?.toLocaleDateString()}`
                    : `Renews ${subscription.currentPeriodEnd?.toLocaleDateString()}`}
                </p>
              )}
            </div>
            <div className="text-right">
              {effectiveTier === 'free' ? (
                <span className="text-2xl font-bold text-foreground">$0<span className="text-base font-normal text-muted-foreground">/mo</span></span>
              ) : (
                <span className="text-2xl font-bold text-foreground">${TIER_PRICES[effectiveTier].monthly}<span className="text-base font-normal text-muted-foreground">/mo</span></span>
              )}
            </div>
          </div>

          {isPaid ? (
            <OpenPortalButton />
          ) : (
            <div className="flex gap-3">
              <StartTrialButton tier="pro" label="Upgrade to Pro — $19/mo" className="btn btn-primary" />
              <Link href="/pricing" className="btn btn-outline">Compare plans</Link>
            </div>
          )}
        </div>

        {/* Usage */}
        <div className="card-elevated p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Usage</h2>
          <div className="space-y-4">
            {/* Podcasts */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Podcasts</span>
                <span className="font-medium text-foreground">
                  {limits.podcasts === Infinity
                    ? `${usage.podcastCount} podcasts`
                    : `${usage.podcastCount} / ${limits.podcasts}`}
                </span>
              </div>
              {limits.podcasts !== Infinity && (
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      podcastUsage >= 90 ? 'bg-red-500' : podcastUsage >= 70 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(podcastUsage, 100)}%` }}
                  />
                </div>
              )}
              {podcastUsage >= 90 && limits.podcasts !== Infinity && (
                <p className="text-xs text-amber-600 mt-1">⚠️ Approaching podcast limit</p>
              )}
            </div>

            {/* Episodes */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Episodes</span>
                <span className="font-medium text-foreground">
                  {limits.episodes === Infinity
                    ? `${usage.episodeCount} episodes`
                    : `${usage.episodeCount} / ${limits.episodes}`}
                </span>
              </div>
              {limits.episodes !== Infinity && (
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      episodeUsage >= 90 ? 'bg-red-500' : episodeUsage >= 70 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(episodeUsage, 100)}%` }}
                  />
                </div>
              )}
              {episodeUsage >= 90 && limits.episodes !== Infinity && (
                <p className="text-xs text-amber-600 mt-1">⚠️ Approaching episode limit</p>
              )}
            </div>

            {/* Storage */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium text-foreground">
                  {usage.storageUsedMb >= 1024
                    ? `${(usage.storageUsedMb / 1024).toFixed(2)} GB`
                    : `${usage.storageUsedMb.toFixed(0)} MB`}
                  {' / '}
                  {limits.storageMb >= 1024
                    ? `${(limits.storageMb / 1024).toFixed(0)} GB`
                    : `${limits.storageMb} MB`}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    storageUsage >= 90 ? 'bg-red-500' : storageUsage >= 70 ? 'bg-amber-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(storageUsage, 100)}%` }}
                />
              </div>
              {storageUsage >= 90 && (
                <p className="text-xs text-amber-600 mt-1">⚠️ Approaching storage limit</p>
              )}
            </div>

            {/* Transcription */}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Transcription</span>
                <span className="font-medium text-foreground">
                  {limits.transcriptionHours === 0 ? 'Not included' : `${limits.transcriptionHours} hrs/mo`}
                </span>
              </div>
            </div>

            {/* Analytics */}
            <div className="pt-2 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Analytics</span>
                <span className="font-medium text-foreground">
                  {limits.analyticsWindowDays === Infinity ? 'Full history' : `Last ${limits.analyticsWindowDays} days`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
