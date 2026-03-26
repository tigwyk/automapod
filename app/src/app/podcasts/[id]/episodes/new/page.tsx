import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SimpleUploadForm } from '@/components/simple-upload-form';
import { AppNav } from '@/components/app-nav';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

async function getPodcast(podcastId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: podcast } = await supabase
    .from('podcasts')
    .select('*')
    .eq('id', podcastId)
    .eq('user_id', user.id)
    .single();

  if (!podcast) return null;
  return { podcast, userId: user.id };
}

export default async function NewEpisodePage({ params }: Props) {
  const { id } = await params;
  const result = await getPodcast(id);

  if (!result) {
    redirect('/podcasts');
  }

  const { podcast, userId } = result;

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav
        userId={userId}
        activeLink="podcasts"
        extraLinks={[{ href: `/podcasts/${podcast.id}/episodes`, label: 'Episodes' }]}
      />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/podcasts" className="text-muted-foreground hover:text-foreground transition-colors">
                All Podcasts
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li>
              <Link href={`/podcasts/${podcast.id}`} className="text-muted-foreground hover:text-foreground transition-colors">
                {podcast.title}
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="text-foreground font-medium" aria-current="page">
              Upload Episode
            </li>
          </ol>
        </nav>

        <SimpleUploadForm
          podcastTitle={podcast.title}
          podcastId={podcast.id}
          backUrl={`/podcasts/${podcast.id}/episodes`}
        />
      </main>
    </div>
  );
}
