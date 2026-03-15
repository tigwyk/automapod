import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import PodcastForm from '@/components/podcast-form';

export const dynamic = 'force-dynamic';

async function createPodcast(data: {
  title: string;
  description: string;
  cover_image_url: string;
  rss_slug: string;
}) {
  'use server';

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/podcasts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create podcast');
  }
}

export default function NewPodcastPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Podcast</h1>
        <p className="text-gray-600 mt-1">Set up a new podcast show</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <PodcastForm onSubmit={createPodcast} submitLabel="Create Podcast" />
      </div>
    </div>
  );
}
