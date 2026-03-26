'use client';

import Link from 'next/link';

interface TrialBannerProps {
  trialEndsAt: Date;
}

/**
 * Sticky top banner shown during a free trial.
 * Displays days remaining and a link to add a payment method.
 */
export function TrialBanner({ trialEndsAt }: TrialBannerProps) {
  const now = new Date();
  const msRemaining = trialEndsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  if (daysRemaining === 0) return null;

  const urgency = daysRemaining <= 3;

  return (
    <div className={`w-full py-2 px-4 text-sm text-center ${urgency ? 'bg-amber-500 text-white' : 'bg-primary text-white'}`}>
      <span className="font-medium">
        {daysRemaining === 1
          ? 'Your free trial ends tomorrow.'
          : `${daysRemaining} days left in your free trial.`}
      </span>
      {' '}
      <Link
        href="/settings/billing"
        className="underline underline-offset-2 font-semibold hover:opacity-80"
      >
        Add payment method →
      </Link>
    </div>
  );
}
