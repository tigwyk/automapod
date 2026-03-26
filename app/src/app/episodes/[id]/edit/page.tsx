'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Episode {
  id: string;
  title: string;
  description: string | null;
  podcast_id: string | null;
}

interface Podcast {
  id: string;
  title: string;
}

async function getPodcasts() {
  const response = await fetch('/api/podcasts');
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.podcasts || [];
}

async function getEpisode(id: string) {
  const response = await fetch(`/api/episodes/${id}`);
  if (!response.ok) {
    throw new Error('Episode not found');
  }
  const data = await response.json();
  return data.episode;
}

async function updateEpisode(id: string, formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const podcastId = formData.get('podcast_id') as string;

  if (!title || title.trim().length === 0) {
    return { error: 'Title is required' };
  }

  const response = await fetch(`/api/episodes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title.trim(),
      description: description?.trim() || null,
      podcast_id: podcastId || null,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    return { error: data.error || 'Failed to update episode' };
  }

  return { error: null };
}

export default function EditEpisodePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [episodeData, podcastsData] = await Promise.all([
          getEpisode(id),
          getPodcasts(),
        ]);

        setEpisode(episodeData);
        setPodcasts(podcastsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load episode');
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadData();
    }
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!episode) return;
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateEpisode(episode.id, formData);

    if (result.error) {
      setError(result.error);
      setSaving(false);
    } else {
      router.push(`/episodes/${episode.id}`);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Episode not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Episode</h1>
        <p className="text-gray-600 mt-1">Update episode information</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            defaultValue={episode.title}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            defaultValue={episode.description || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          />
          <p className="mt-1 text-sm text-gray-500">
            Optional. A brief description of your episode.
          </p>
        </div>

        <div>
          <label htmlFor="podcast_id" className="block text-sm font-medium text-gray-700">
            Podcast
          </label>
          <select
            id="podcast_id"
            name="podcast_id"
            defaultValue={episode.podcast_id || ''}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
          >
            <option value="">No podcast (standalone episode)</option>
            {podcasts.map((podcast) => (
              <option key={podcast.id} value={podcast.id}>
                {podcast.title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Optional. Choose which podcast this episode belongs to.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <a
            href={`/episodes/${episode.id}`}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 inline-flex items-center"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
