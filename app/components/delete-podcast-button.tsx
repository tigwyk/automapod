'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeletePodcastButtonProps {
  podcastId: string;
}

export default function DeletePodcastButton({ podcastId }: DeletePodcastButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this podcast?')) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/podcasts/${podcastId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete podcast');
      }

      router.push('/podcasts');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete podcast');
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        {isDeleting ? 'Deleting...' : 'Delete Podcast'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
