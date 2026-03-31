import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { AppNav } from '@/components/app-nav';
import { cookies } from 'next/headers';

type PlatformBreakdown = {
  ios: number;
  android: number;
  web: number;
  other: number;
};

type TopEpisode = {
  id: string;
  title: string;
  totalDownloads: number;
  uniqueDownloads: number;
};

type DownloadPoint = {
  date: string;
  count: number;
};

type PodcastAnalytics = {
  podcastId: string;
  title: string;
  totalDownloads: number;
  uniqueDownloads: number;
  platformBreakdown: PlatformBreakdown;
  downloadsOverTime: DownloadPoint[];
  topEpisodes: TopEpisode[];
};

type PodcastAnalyticsError = {
  error: string;
  status: number;
};

async function getPodcastAnalytics(
  podcastId: string,
  siteUrl: string
): Promise<PodcastAnalytics | PodcastAnalyticsError | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');

    const response = await fetch(
      `${siteUrl}/api/analytics/podcast/${podcastId}`,
      {
        cache: 'no-store',
        headers: {
          Cookie: cookieHeader,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return { error: error.error || 'Failed to fetch analytics', status: response.status };
    }

    return await response.json();
  } catch (error) {
    return { error: 'Network error', status: 0 };
  }
}

export default async function PodcastAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const analytics = await getPodcastAnalytics(id, siteUrl);

  if (!analytics) {
    notFound();
  }

  // Check if this is an error response
  if ('error' in analytics) {
    const errorInfo = getErrorMessage(analytics);
    return (
      <div className="min-h-screen bg-muted/30">
        <AppNav userId={user.id} userEmail={user.email} activeLink="analytics" />

        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="card-elevated p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">{errorInfo.title}</h1>
            <p className="text-foreground mb-2">{errorInfo.message}</p>
            {errorInfo.action && <p className="text-muted-foreground">{errorInfo.action}</p>}
            <div className="mt-6">
              <a
                href="/analytics"
                className="text-primary hover:text-primary/80 font-medium"
              >
                ← Back to Analytics
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const maxPlatformCount = Math.max(
    ...Object.values(analytics.platformBreakdown),
    1
  );
  const maxDailyCount = Math.max(
    ...analytics.downloadsOverTime.map((d) => d.count),
    1
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <AppNav userId={user.id} userEmail={user.email} activeLink="analytics" />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-6" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/analytics" className="text-muted-foreground hover:text-foreground transition-colors">
                Analytics
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="text-foreground font-medium" aria-current="page">
              {analytics.title}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">{analytics.title}</h1>
          <p className="mt-1 text-muted-foreground">Podcast analytics</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="card-elevated p-6">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Downloads</h2>
            <p className="mt-2 text-4xl font-bold text-foreground">
              {analytics.totalDownloads.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">All time, all episodes</p>
          </div>
          <div className="card-elevated p-6">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Unique Listeners</h2>
            <p className="mt-2 text-4xl font-bold text-foreground">
              {analytics.uniqueDownloads.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Distinct IPs, all time</p>
          </div>
          <div className="card-elevated p-6">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Episodes</h2>
            <p className="mt-2 text-4xl font-bold text-foreground">
              {analytics.topEpisodes.length.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Total published</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Downloads over time — spans 2 cols */}
          <div className="lg:col-span-2 card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Downloads Over Time (30 Days)</h2>
            <div className="h-48 flex items-end gap-1">
              {analytics.downloadsOverTime.map((data) => {
                const barHeight = (data.count / maxDailyCount) * 100;
                return (
                  <div key={data.date} className="flex-1 flex flex-col items-center group">
                    <div className="w-full relative">
                      <div
                        className="bg-primary/70 hover:bg-primary transition-colors rounded-t"
                        style={{ height: `${Math.max(barHeight, 2)}%` }}
                      />
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {data.count}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 rotate-45 origin-bottom-left truncate w-12">
                      {new Date(`${data.date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform breakdown — 1 col */}
          <div className="card-elevated p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Platforms</h2>
            <div className="space-y-4">
              {Object.entries(analytics.platformBreakdown).map(([platform, count]) => {
                const percentage = analytics.totalDownloads > 0
                  ? (count / analytics.totalDownloads) * 100
                  : 0;
                const barWidth = (count / maxPlatformCount) * 100;
                return (
                  <div key={platform}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize font-medium text-foreground">{platform}</span>
                      <span className="text-muted-foreground">
                        {count.toLocaleString()} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top episodes table */}
        <div className="card-elevated overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">Episodes</h2>
          </div>

          {analytics.topEpisodes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No episodes published yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Episode</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Downloads</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Unique</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {analytics.topEpisodes.map((episode, index) => (
                    <tr key={episode.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-muted-foreground w-5 text-right flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="font-medium text-foreground truncate max-w-xs">
                            {episode.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                        {episode.totalDownloads.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                        {episode.uniqueDownloads.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/analytics/episode/${episode.id}`}
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
          )}
        </div>
      </main>
    </div>
  );
}

function getErrorMessage(error: PodcastAnalyticsError): { title: string; message: string; action?: string } {
  switch (error.status) {
    case 401:
      return {
        title: 'Authentication Required',
        message: 'You need to be logged in to view podcast analytics.',
        action: 'Please log in and try again.',
      };
    case 403:
      return {
        title: 'Access Denied',
        message: 'You do not have permission to view analytics for this podcast.',
        action: 'You can only view analytics for your own podcasts.',
      };
    case 404:
      return {
        title: 'Podcast Not Found',
        message: 'This podcast does not exist or has been deleted.',
        action: 'Check the podcast ID and try again.',
      };
    case 500:
      return {
        title: 'Server Error',
        message: 'There was a problem fetching the analytics data.',
        action: 'Please try again later.',
      };
    default:
      return {
        title: 'Error',
        message: error.error || 'An unexpected error occurred.',
        action: 'Please try again.',
      };
  }
}
