import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function PodcastAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;

  const { data: podcast } = await supabase
    .from('podcasts')
    .select('id, title')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!podcast) {
    redirect('/analytics');
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Nav */}
      <nav className="bg-white border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-foreground">AutomaPod</h1>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Dashboard</Link>
                <Link href="/podcasts" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Podcasts</Link>
                <Link href="/analytics" className="text-sm font-medium text-foreground hover:text-primary transition-colors">Analytics</Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
              <form action="/api/auth/signout" method="POST">
                <button type="submit" className="btn btn-sm btn-outline">Sign Out</button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/analytics" className="hover:text-primary transition-colors">Analytics</Link>
            <span>›</span>
            <span>{podcast.title}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">{podcast.title}</h1>
          <p className="mt-1 text-muted-foreground">Podcast-level analytics</p>
        </div>

        <div className="card-elevated p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Podcast analytics coming soon</h2>
          <p className="text-muted-foreground mb-6">
            Per-podcast episode breakdown and time-series charts are tracked in AMP-44.
          </p>
          <Link href="/analytics" className="btn btn-primary">Back to Overview</Link>
        </div>
      </main>
    </div>
  );
}
