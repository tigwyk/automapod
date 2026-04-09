import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getAllMetricSummaries, getActiveAlerts, type MetricType } from '@/lib/monitoring';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Monitoring Dashboard
 *
 * Displays real-time infrastructure metrics and alerts.
 * Admin-only access for operations team.
 *
 * Related: AUT-20
 */

// Check if user is admin (simple check - can be enhanced with proper role system)
async function isAdmin(supabase: SupabaseClient): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // Check user email against admin list (env var)
  if (!user.email) return false;
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(user.email);
}

function getStatusColor(status: 'ok' | 'warning' | 'critical'): string {
  switch (status) {
    case 'ok':
      return 'text-green-600 bg-green-50';
    case 'warning':
      return 'text-yellow-600 bg-yellow-50';
    case 'critical':
      return 'text-red-600 bg-red-50';
  }
}

function getStatusIcon(status: 'ok' | 'warning' | 'critical'): string {
  switch (status) {
    case 'ok':
      return '✓';
    case 'warning':
      return '⚠';
    case 'critical':
      return '✕';
  }
}

function getMetricLabel(type: MetricType): string {
  const labels: Record<MetricType, string> = {
    rss_generation_time: 'RSS Generation Time',
    download_failure_rate: 'Download Failure Rate',
    cdn_cache_hit_rate: 'CDN Cache Hit Rate',
    error_rate_5xx: '5xx Error Rate',
  };
  return labels[type] || type;
}

function getMetricUnit(type: MetricType): string {
  const units: Record<MetricType, string> = {
    rss_generation_time: 's',
    download_failure_rate: '%',
    cdn_cache_hit_rate: '%',
    error_rate_5xx: '%',
  };
  return units[type] || '';
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return 'N/A';
  if (unit === '%') return `${value.toFixed(2)}%`;
  if (unit === 's') return `${value.toFixed(3)}s`;
  return value.toString();
}

function getMetricStatus(type: MetricType, value: number | null): 'ok' | 'warning' | 'critical' {
  if (value === null) return 'ok';

  // Define thresholds (should match database config)
  switch (type) {
    case 'rss_generation_time':
      if (value > 1.0) return 'critical';
      if (value > 0.5) return 'warning';
      return 'ok';
    case 'download_failure_rate':
      if (value > 1.0) return 'critical';
      if (value > 0.5) return 'warning';
      return 'ok';
    case 'cdn_cache_hit_rate':
      if (value < 90.0) return 'critical';
      if (value < 95.0) return 'warning';
      return 'ok';
    case 'error_rate_5xx':
      if (value > 0.1) return 'critical';
      if (value > 0.05) return 'warning';
      return 'ok';
    default:
      return 'ok';
  }
}

export default async function MonitoringPage() {
  const supabase = await createClient();

  // Check admin access
  const admin = await isAdmin(supabase);
  if (!admin) {
    redirect('/dashboard');
  }

  // Get metrics and alerts
  const [summaries, alerts] = await Promise.all([
    getAllMetricSummaries('24h'),
    getActiveAlerts(),
  ]);

  const metricTypes: MetricType[] = [
    'rss_generation_time',
    'download_failure_rate',
    'cdn_cache_hit_rate',
    'error_rate_5xx',
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Infrastructure Monitoring</h1>
            <p className="text-muted-foreground mt-2">
              Real-time metrics and alerts for AutoMapod infrastructure
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {metricTypes.map((type) => {
              const summary = summaries[type];
              const value = summary?.current ?? null;
              const status = getMetricStatus(type, value);
              const unit = getMetricUnit(type);

              return (
                <div key={type} className="card-elevated p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      {getMetricLabel(type)}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(status)}`}>
                      {getStatusIcon(status)} {status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mb-4">
                    <div className="text-3xl font-bold text-foreground">
                      {formatValue(value, unit)}
                    </div>
                  </div>

                  {summary && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Avg: {formatValue(summary.average, unit)}</div>
                      <div>Min: {formatValue(summary.min, unit)}</div>
                      <div>Max: {formatValue(summary.max, unit)}</div>
                      <div>Count: {summary.count}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Alerts */}
          <div className="card-elevated p-6 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Active Alerts ({alerts.length})
            </h2>

            {alerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>No active alerts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border ${
                      alert.severity === 'critical'
                        ? 'border-red-200 bg-red-50'
                        : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${
                            alert.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {getMetricLabel(alert.metric_type)}
                          </span>
                        </div>
                        <div className="text-sm text-foreground">
                          {alert.message || `${alert.value} (threshold: ${alert.threshold})`}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card-elevated p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-3 gap-4">
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="font-semibold text-foreground">Vercel Dashboard</div>
                <div className="text-sm text-muted-foreground mt-1">
                  View deployment status
                </div>
              </a>
              <a
                href="https://app.supabase.com/project/_"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="font-semibold text-foreground">Supabase Dashboard</div>
                <div className="text-sm text-muted-foreground mt-1">
                  View database metrics
                </div>
              </a>
              <a
                href="https://dash.cloudflare.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <div className="font-semibold text-foreground">Cloudflare Dashboard</div>
                <div className="text-sm text-muted-foreground mt-1">
                  View R2 and CDN metrics
                </div>
              </a>
            </div>
          </div>

          {/* Documentation Link */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Monitoring infrastructure -{' '}
              <a
                href="https://paperclip.ing/AUT/issues/AUT-20"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                AUT-20
              </a>
            </p>
            <p className="mt-1">
              Need help? Check the{' '}
              <a
                href="/docs/runbooks/monitoring"
                className="text-primary hover:underline"
              >
                monitoring runbook
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
