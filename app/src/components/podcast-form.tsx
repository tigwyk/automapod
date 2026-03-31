'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

interface Podcast {
  id: string;
  title: string;
  description?: string;
  rss_slug: string;
  cover_image_url?: string;
}

interface PodcastFormProps {
  podcast?: Podcast;
  podcastId?: string;
  action: (prevState: { error?: string } | null, formData: FormData) => Promise<{ error?: string } | null>;
}

type SlugValidationStatus = 'idle' | 'validating' | 'unique' | 'taken';

function SubmitButton({ podcast }: { podcast?: Podcast }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving...' : podcast ? 'Update Podcast' : 'Create Podcast'}
    </button>
  );
}

export function PodcastForm({ podcast, podcastId, action }: PodcastFormProps) {
  const [title, setTitle] = useState(podcast?.title || '');
  const [rssSlug, setRssSlug] = useState(podcast?.rss_slug || '');
  const [state, formAction] = useFormState<{ error?: string } | null, FormData>(action, null);
  const [slugValidationStatus, setSlugValidationStatus] = useState<SlugValidationStatus>('idle');
  const validationTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced slug validation
  const validateSlug = useCallback(async (slug: string) => {
    if (!slug || podcast) {
      // Skip validation for existing podcasts or empty slugs
      setSlugValidationStatus('idle');
      return;
    }

    setSlugValidationStatus('validating');

    try {
      const response = await fetch(`/api/podcasts/slug/validate?slug=${encodeURIComponent(slug)}&suggestUnique=true`);

      if (!response.ok) {
        setSlugValidationStatus('idle');
        return;
      }

      const data = await response.json();

      if (data.isUnique) {
        setSlugValidationStatus('unique');
      } else if (data.suggestedSlug) {
        setSlugValidationStatus('taken');
        // Auto-update to the suggested unique slug
        setRssSlug(data.suggestedSlug);
      }
    } catch (error) {
      console.error('Slug validation error:', error);
      setSlugValidationStatus('idle');
    }
  }, [podcast]);

  // Auto-generate RSS slug from title and validate
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

  // Validate slug when it changes
  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      validateSlug(rssSlug);
    }, 500); // 500ms debounce

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [rssSlug, validateSlug]);

  // Get error from form state
  const errorMessage = state?.error;

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
        <form action={formAction} className="space-y-6">
          {/* Hidden ID field for edits */}
          {podcastId && (
            <input type="hidden" name="id" value={podcastId} />
          )}

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
            <div className="relative mt-1">
              <input
                type="text"
                name="rss_slug"
                id="rss_slug"
                required
                value={rssSlug}
                onChange={(e) => setRssSlug(e.target.value)}
                pattern="[a-z0-9-]+"
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 sm:text-sm pr-10
                  ${slugValidationStatus === 'unique' ? 'border-green-300 focus:border-green-500 focus:ring-green-500' : ''}
                  ${slugValidationStatus === 'taken' ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500' : ''}
                  ${slugValidationStatus === 'validating' ? 'border-blue-300 focus:border-blue-500 focus:ring-blue-500' : ''}
                  ${slugValidationStatus === 'idle' ? 'border-gray-300 focus:border-blue-500 focus:ring-blue-500' : ''}
                `}
                placeholder="my-awesome-podcast"
                maxLength={100}
              />
              {/* Validation status indicator */}
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {slugValidationStatus === 'validating' && (
                  <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {slugValidationStatus === 'unique' && (
                  <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 00016zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {slugValidationStatus === 'taken' && (
                  <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Unique identifier for your podcast (lowercase letters, numbers, and hyphens only)
            </p>
            {slugValidationStatus === 'taken' && (
              <p className="mt-1 text-sm text-yellow-600">
                This slug was taken. We've updated it to a unique variant.
              </p>
            )}
            {slugValidationStatus === 'unique' && (
              <p className="mt-1 text-sm text-green-600">
                This slug is available!
              </p>
            )}
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
            <SubmitButton podcast={podcast} />
          </div>
        </form>
      </div>
    </div>
  );
}
