'use client';

import { useState } from 'react';

interface DeletePodcastButtonProps {
  podcastId: string;
}

export function DeletePodcastButton({ podcastId }: DeletePodcastButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this podcast? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/podcasts/${podcastId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete podcast');
      }

      // Redirect to podcasts list
      window.location.href = '/podcasts';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete podcast');
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDeleting ? 'Deleting...' : 'Delete Podcast'}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
