'use client';

import { useState } from 'react';

/**
 * Button that opens the Stripe Customer Portal for self-serve billing management.
 */
export function OpenPortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const json = await res.json() as { url?: string; error?: string };

      if (!res.ok || !json.url) {
        throw new Error(json.error ?? 'Failed to open billing portal');
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
        className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Opening…' : 'Manage subscription →'}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
