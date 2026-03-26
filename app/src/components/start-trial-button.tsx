'use client';

import { useState } from 'react';

interface StartTrialButtonProps {
  tier: 'pro' | 'business';
  interval?: 'monthly' | 'annual';
  label?: string;
  className?: string;
}

export function StartTrialButton({
  tier,
  interval = 'monthly',
  label = 'Start free trial',
  className = 'btn btn-primary w-full',
}: StartTrialButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval }),
      });

      const json = await res.json() as { url?: string; error?: string };

      if (!res.ok || !json.url) {
        throw new Error(json.error ?? 'Failed to start checkout');
      }

      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? 'Redirecting…' : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
