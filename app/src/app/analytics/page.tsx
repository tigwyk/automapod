import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { getAnalyticsOverview } from '@/lib/analytics';
import { AppNav } from '@/components/app-nav';
import { getUserSubscription } from '@/lib/get-user-subscription';
import { getAnalyticsWindowDays } from '@/lib/subscription';

export default async function AnalyticsOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const subscription = await getUserSubscription(user.id);
  const windowDays = getAnalyticsWindowDays(subscription);
  const overview = await getAnalyticsOverview(user.id, windowDays);

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav userId={user.id} userEmail={user.email} activeLink="analytics" />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
          <p className="mt-1 text-muted-foreground">Download stats across all your podcasts</p>
        </div>

        {windowDays !== null && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <span className="font-medium">Analytics limited to the last {windowDays} days.</span>
            {' '}
            <a href="/pricing" className="underline underline-offset-2 font-semibold">Upgrade to Pro</a>
            {' '}for full history.
          </div>
        )}

        {overview === null ? (
          <div className="card-elevated p-8 text-center">
            <p className="text-muted-foreground">Failed to load analytics. Please try again.</p>
          </div>
        ) : overview.podcasts.length === 0 ? (
          /* Empty state */
          <div className="card-elevated p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No analytics yet</h2>
            <p className="text-muted-foreground mb-6">Create a podcast and publish episodes to start tracking downloads.</p>
            <Link href="/podcasts/new" className="btn btn-primary">Create Your First Podcast</Link>
          </div>
        ) : (
          <>
            {/* Account-level stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
              <div className="card-elevated p-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Downloads</h2>
                <p className="mt-2 text-4xl font-bold text-foreground">
                  {overview.totalDownloads.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">All time, all podcasts</p>
              </div>
              <div className="card-elevated p-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Unique Listeners</h2>
                <p className="mt-2 text-4xl font-bold text-foreground">
                  {overview.totalUniqueDownloads.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Distinct IPs, all podcasts</p>
              </div>
              <div className="card-elevated p-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Podcasts</h2>
                <p className="mt-2 text-4xl font-bold text-foreground">
                  {overview.podcasts.length.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {overview.podcasts.reduce((sum, p) => sum + p.episodeCount, 0)} total episodes
                </p>
              </div>
            </div>

            {/* Per-podcast table */}
            <div className="card-elevated overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">Podcasts</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Podcast</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Episodes</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Downloads</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Unique</th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {overview.podcasts.map((podcast) => (
                      <tr key={podcast.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-medium text-foreground">{podcast.title}</span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                          {podcast.episodeCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                          {podcast.totalDownloads.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                          {podcast.uniqueDownloads.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/analytics/podcast/${podcast.id}`}
                            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
