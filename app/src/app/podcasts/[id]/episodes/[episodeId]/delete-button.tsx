'use client';

import { useState } from 'react';

interface DeleteEpisodeButtonProps {
  episodeId: string;
  episodeTitle: string;
  podcastId: string;
}

export default function DeleteEpisodeButton({ episodeId, episodeTitle, podcastId }: DeleteEpisodeButtonProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${episodeTitle}"? This action cannot be undone.`)) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/episodes/${episodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to delete episode');
        setDeleting(false);
        return;
      }

      window.location.href = `/podcasts/${podcastId}/episodes`;
    } catch (error) {
      alert('An error occurred while deleting the episode');
      setDeleting(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {deleting ? 'Deleting...' : 'Delete Episode'}
    </button>
  );
}
