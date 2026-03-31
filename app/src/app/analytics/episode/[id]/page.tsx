import { notFound } from 'next/navigation';

type PlatformData = {
  ios: number;
  android: number;
  web: number;
  other: number;
};

type DownloadTimeData = {
  date: string;
  count: number;
};

type AnalyticsData = {
  episodeId: string;
  podcastId: string | null;
  title: string;
  totalDownloads: number;
  uniqueDownloads: number;
  platformBreakdown: PlatformData;
  downloadsOverTime: DownloadTimeData[];
};

type AnalyticsError = {
  error: string;
  status: number;
};

async function getAnalytics(episodeId: string): Promise<AnalyticsData | AnalyticsError | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/analytics/episode/${episodeId}`,
      {
        cache: 'no-store',
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

function getErrorMessage(error: AnalyticsError): { title: string; message: string; action?: string } {
  switch (error.status) {
    case 401:
      return {
        title: 'Authentication Required',
        message: 'You need to be logged in to view episode analytics.',
        action: 'Please log in and try again.',
      };
    case 403:
      return {
        title: 'Access Denied',
        message: 'You do not have permission to view analytics for this episode.',
        action: 'You can only view analytics for episodes in your own podcasts.',
      };
    case 404:
      return {
        title: 'Episode Not Found',
        message: 'This episode does not exist or has been deleted.',
        action: 'Check the episode ID and try again.',
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

export default async function EpisodeAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const analytics = await getAnalytics(id);

  if (!analytics) {
    notFound();
  }

  // Check if this is an error response
  if ('error' in analytics) {
    const errorInfo = getErrorMessage(analytics);
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-2xl font-bold text-red-600 mb-4">{errorInfo.title}</h1>
            <p className="text-gray-700 mb-2">{errorInfo.message}</p>
            {errorInfo.action && <p className="text-gray-600">{errorInfo.action}</p>}
            <div className="mt-6">
              <a
                href="/dashboard"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxPlatformCount = Math.max(...Object.values(analytics.platformBreakdown), 1);
  const maxDailyCount = Math.max(...analytics.downloadsOverTime.map(d => d.count), 1);

  // Determine the back link based on whether the episode is part of a podcast
  const backToEpisodeUrl = analytics.podcastId
    ? `/podcasts/${analytics.podcastId}/episodes/${analytics.episodeId}`
    : `/episodes/${analytics.episodeId}`;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-2 text-lg text-gray-600">{analytics.title}</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase">Total Downloads</h2>
            <p className="mt-2 text-4xl font-bold text-gray-900">
              {analytics.totalDownloads.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase">Unique Downloads</h2>
            <p className="mt-2 text-4xl font-bold text-gray-900">
              {analytics.uniqueDownloads.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Breakdown</h2>
          <div className="space-y-4">
            {Object.entries(analytics.platformBreakdown).map(([platform, count]) => {
              const percentage = analytics.totalDownloads > 0
                ? (count / analytics.totalDownloads) * 100
                : 0;
              const barWidth = (count / maxPlatformCount) * 100;

              return (
                <div key={platform}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize font-medium text-gray-700">{platform}</span>
                    <span className="text-gray-500">
                      {count.toLocaleString()} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Downloads Over Time */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Downloads Over Time (30 Days)</h2>
          <div className="h-64 flex items-end gap-1">
            {analytics.downloadsOverTime.map((data) => {
              const barHeight = (data.count / maxDailyCount) * 100;

              return (
                <div
                  key={data.date}
                  className="flex-1 flex flex-col items-center group"
                >
                  <div className="w-full relative">
                    <div
                      className="bg-blue-500 hover:bg-blue-600 transition-colors rounded-t"
                      style={{ height: `${Math.max(barHeight, 2)}%` }}
                    />
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {data.count}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 rotate-45 origin-bottom-left truncate w-16">
                    {new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8">
          <a
            href={backToEpisodeUrl}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Episode
          </a>
        </div>
      </div>
    </div>
  );
}
