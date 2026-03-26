'use client';

import Link from 'next/link';

interface UpgradePromptProps {
  reason: string;
  /** Which tier to suggest. Defaults to 'pro'. */
  suggestedTier?: 'pro' | 'business';
  className?: string;
}

/**
 * Reusable inline prompt shown when a user hits a free-tier limit.
 * Rendered inline — not a modal — to keep the UX low-friction.
 */
export function UpgradePrompt({ reason, suggestedTier = 'pro', className = '' }: UpgradePromptProps) {
  const tierLabel = suggestedTier === 'business' ? 'Business' : 'Pro';

  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 ${className}`} role="alert">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">{reason}</p>
          <div className="mt-2 flex gap-3">
            <Link
              href={`/pricing`}
              className="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              Upgrade to {tierLabel} →
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-amber-600 hover:text-amber-800"
            >
              Compare plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
