import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AppNav } from '@/components/app-nav';
import { getUserSubscription } from '@/lib/get-user-subscription';
import { TIER_LABELS, TIER_LIMITS, TIER_PRICES, getEffectiveTier } from '@/lib/subscription';
import { OpenPortalButton } from '@/components/open-portal-button';
import { StartTrialButton } from '@/components/start-trial-button';

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
  const effectiveTier = getEffectiveTier(subscription);
  const limits = TIER_LIMITS[effectiveTier];
  const params = await searchParams;
  const justSubscribed = params.success === '1';

  const isTrialing = subscription.status === 'trialing';
  const trialDaysLeft = subscription.trialEndsAt
    ? Math.max(0, Math.ceil((subscription.trialEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;

  const isPaid = effectiveTier !== 'free';

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav userId={user.id} activeLink="billing" />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Billing</h1>
        <p className="text-muted-foreground mb-8">Manage your plan and subscription.</p>

        {justSubscribed && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800 font-medium">
            🎉 Welcome to AutomaPod {TIER_LABELS[effectiveTier]}! Your trial has started.
          </div>
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
          <h2 className="text-lg font-semibold text-foreground mb-4">Plan limits</h2>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Podcasts</dt>
              <dd className="font-medium text-foreground mt-0.5">
                {limits.podcasts === Infinity ? 'Unlimited' : `Up to ${limits.podcasts}`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Episodes</dt>
              <dd className="font-medium text-foreground mt-0.5">
                {limits.episodes === Infinity ? 'Unlimited' : `Up to ${limits.episodes}`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Storage</dt>
              <dd className="font-medium text-foreground mt-0.5">
                {limits.storageMb >= 1024 ? `${(limits.storageMb / 1024).toFixed(0)} GB` : `${limits.storageMb} MB`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Transcription</dt>
              <dd className="font-medium text-foreground mt-0.5">
                {limits.transcriptionHours === 0 ? 'Not included' : `${limits.transcriptionHours} hrs/mo`}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Analytics</dt>
              <dd className="font-medium text-foreground mt-0.5">
                {limits.analyticsWindowDays === Infinity ? 'Full history' : `Last ${limits.analyticsWindowDays} days`}
              </dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
