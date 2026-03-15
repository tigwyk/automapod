'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PodcastFormProps {
  initialData?: {
    title?: string;
    description?: string;
    cover_image_url?: string;
    rss_slug?: string;
  };
  onSubmit: (data: {
    title: string;
    description: string;
    cover_image_url: string;
    rss_slug: string;
  }) => Promise<void>;
  submitLabel?: string;
}

export default function PodcastForm({
  initialData,
  onSubmit,
  submitLabel = 'Create Podcast',
}: PodcastFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    cover_image_url: initialData?.cover_image_url || '',
    rss_slug: initialData?.rss_slug || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      title: value,
      rss_slug: initialData?.rss_slug || generateSlug(value),
    }));
    if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.rss_slug.trim()) {
      newErrors.rss_slug = 'RSS slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.rss_slug)) {
      newErrors.rss_slug = 'RSS slug must contain only lowercase letters, numbers, and hyphens';
    }

    if (formData.cover_image_url && !isValidUrl(formData.cover_image_url)) {
      newErrors.cover_image_url = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit(formData);
      router.push('/podcasts');
    } catch (error) {
      console.error('Failed to submit podcast:', error);
      setErrors({ root: 'Failed to save podcast. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl">
      {errors.root && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {errors.root}
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          disabled={isSubmitting}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.title ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="My Awesome Podcast"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="rss_slug" className="block text-sm font-medium text-gray-700 mb-2">
          RSS Slug <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="rss_slug"
          value={formData.rss_slug}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, rss_slug: e.target.value }));
            if (errors.rss_slug) setErrors(prev => ({ ...prev, rss_slug: '' }));
          }}
          disabled={isSubmitting}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.rss_slug ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="my-awesome-podcast"
        />
        {errors.rss_slug && (
          <p className="mt-1 text-sm text-red-600">{errors.rss_slug}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          This will be used in your RSS feed URL: automapod.com/rss/<span className="font-mono">{formData.rss_slug || 'slug'}</span>
        </p>
      </div>

      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          disabled={isSubmitting}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="A brief description of your podcast..."
        />
      </div>

      <div className="mb-6">
        <label htmlFor="cover_image_url" className="block text-sm font-medium text-gray-700 mb-2">
          Cover Image URL
        </label>
        <input
          type="url"
          id="cover_image_url"
          value={formData.cover_image_url}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, cover_image_url: e.target.value }));
            if (errors.cover_image_url) setErrors(prev => ({ ...prev, cover_image_url: '' }));
          }}
          disabled={isSubmitting}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.cover_image_url ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="https://example.com/cover.jpg"
        />
        {errors.cover_image_url && (
          <p className="mt-1 text-sm text-red-600">{errors.cover_image_url}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Recommended: 1400x1400 to 3000x3000 pixels, JPG or PNG, under 500KB
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.push('/podcasts')}
          disabled={isSubmitting}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
