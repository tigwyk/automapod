'use client';

import { useState } from 'react';

interface UploadFormProps {
  podcasts: Array<{
    id: string;
    title: string;
  }>;
  action: (formData: FormData) => Promise<void>;
}

export function UploadForm({ podcasts, action }: UploadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await action(formData);
    } catch (error) {
      setIsSubmitting(false);
      // Error will be handled by the server action
      throw error;
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload New Episode</h1>
        <p className="text-gray-600 mt-1">Add a new episode to your podcast</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form action={handleSubmit} className="space-y-6">
          {podcasts.length > 0 && (
            <div>
              <label htmlFor="podcast_id" className="block text-sm font-medium text-gray-700">
                Podcast (optional)
              </label>
              <select
                name="podcast_id"
                id="podcast_id"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select a podcast...</option>
                {podcasts.map((podcast) => (
                  <option key={podcast.id} value={podcast.id}>
                    {podcast.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Leave empty to upload as a standalone episode
              </p>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              id="title"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Episode title"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              id="description"
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Episode description"
            />
          </div>

          <div>
            <label htmlFor="audio" className="block text-sm font-medium text-gray-700">
              Audio File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              name="audio"
              id="audio"
              accept="audio/*"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
              MP3, M4A, WAV, or OGG (max 500MB)
            </p>
          </div>

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
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Uploading...' : 'Upload Episode'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
