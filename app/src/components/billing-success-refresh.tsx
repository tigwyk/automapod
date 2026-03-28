'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * After a successful Stripe checkout redirect, the webhook may not have
 * fired yet. This component refreshes the page after a short delay so the
 * billing page reflects the updated subscription tier.
 */
export function BillingSuccessRefresh() {
  const router = useRouter();

  useEffect(() => {
    // First refresh at 2s — catches most cases
    const t1 = setTimeout(() => router.refresh(), 2_000);
    // Second refresh at 6s — fallback if the webhook was slow
    const t2 = setTimeout(() => router.refresh(), 6_000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [router]);

  return null;
}
