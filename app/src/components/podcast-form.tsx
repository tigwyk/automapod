'use client';

import { useState, useEffect } from 'react';
import { useFormState } from 'react-dom';

interface Podcast {
  id: string;
  title: string;
  description?: string;
  rss_slug: string;
  cover_image_url?: string;
}

interface PodcastFormProps {
  podcast?: Podcast;
  action: (formData: FormData) => Promise<void>;
}

export function PodcastForm({ podcast, action }: PodcastFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState(podcast?.title || '');
  const [rssSlug, setRssSlug] = useState(podcast?.rss_slug || '');
  const { pending, data } = useFormState(action);

  // Auto-generate RSS slug from title
  useEffect(() => {
    if (title && !podcast) {
      // Only auto-generate for new podcasts, not when editing
      const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .substring(0, 100); // Max 100 characters
      setRssSlug(slug);
    }
  }, [title, podcast]);

  // Get error from form state
  const errorMessage = data?.error;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {podcast ? 'Edit Podcast' : 'Create New Podcast'}
        </h1>
        <p className="text-gray-600 mt-1">
          {podcast ? 'Update your podcast details' : 'Add a new podcast to your account'}
        </p>
      </div>

      {errorMessage && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 00016zm1-8a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-2 0v4a1 1 0 112 0v-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{errorMessage}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <form action={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              id="title"
              required
              defaultValue={podcast?.title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="My Awesome Podcast"
              maxLength={255}
            />
          </div>

          {/* RSS Slug */}
          <div>
            <label htmlFor="rss_slug" className="block text-sm font-medium text-gray-700">
              RSS Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="rss_slug"
              id="rss_slug"
              required
              value={rssSlug}
              onChange={(e) => setRssSlug(e.target.value)}
              pattern="[a-z0-9-]+"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="my-awesome-podcast"
              maxLength={100}
            />
            <p className="mt-1 text-sm text-gray-500">
              Unique identifier for your podcast (lowercase letters, numbers, and hyphens only)
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={4}
              defaultValue={podcast?.description}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="What is your podcast about?"
              maxLength={5000}
            />
          </div>

          {/* Cover Image URL */}
          <div>
            <label htmlFor="cover_image_url" className="block text-sm font-medium text-gray-700">
              Cover Image URL
            </label>
            <input
              type="url"
              name="cover_image_url"
              id="cover_image_url"
              defaultValue={podcast?.cover_image_url}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="https://example.com/cover.jpg"
            />
            <p className="mt-1 text-sm text-gray-500">
              URL to your podcast cover image
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pending || isSubmitting ? 'Saving...' : podcast ? 'Update Podcast' : 'Create Podcast'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
