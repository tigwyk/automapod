import { createClient } from '@/lib/supabase/server';

/**
 * Infrastructure Monitoring Service
 *
 * Collects and stores metrics for critical infrastructure components.
 * Part of AUT-20: Production Monitoring and Alerting.
 *
 * Metrics collected:
 * - RSS feed generation time
 * - Audio download failure rate
 * - CDN cache hit rate
 * - 5xx error rate
 */

// ============================================
// Types
// ============================================

export type MetricType =
  | 'rss_generation_time'
  | 'download_failure_rate'
  | 'cdn_cache_hit_rate'
  | 'error_rate_5xx';

export type MetricUnit = 'seconds' | 'percentage' | 'count';

export type TimeWindow = '1h' | '24h' | '7d' | '30d' | '90d';

export type InfrastructureMetric = {
  id: string;
  metric_type: MetricType;
  value: number;
  unit: MetricUnit;
  metadata: Record<string, unknown>;
  recorded_at: string;
};

export type MetricSummary = {
  metricType: MetricType;
  current: number;
  average: number;
  min: number;
  max: number;
  count: number;
};

// ============================================
// Metric Recording
// ============================================

/**
 * Records a metric to the database.
 *
 * Uses fire-and-forget pattern: doesn't await the database call to avoid
 * impacting application performance. Metrics are best-effort.
 *
 * @param type - The type of metric being recorded
 * @param value - The numeric value
 * @param unit - The unit of measurement
 * @param metadata - Optional additional context (no PII)
 */
export async function recordMetric(
  type: MetricType,
  value: number,
  unit: MetricUnit,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createClient();

    // Fire-and-forget: don't await
    supabase.from('infrastructure_metrics').insert({
      metric_type: type,
      value,
      unit,
      metadata: metadata ?? {},
    }).catch((err) => {
      // Silent fail - metrics shouldn't break the app
      console.error(`Failed to record metric ${type}:`, err);
    });
  } catch (error) {
    // Silent fail - metrics shouldn't break the app
    console.error(`Failed to record metric ${type}:`, error);
  }
}

/**
 * Records RSS feed generation time.
 *
 * Call this in RSS generation endpoints with timing.
 *
 * @param seconds - Time taken to generate RSS feed
 * @param podcastId - Optional podcast ID for correlation
 */
export async function recordRSSGenerationTime(
  seconds: number,
  podcastId?: string
): Promise<void> {
  await recordMetric('rss_generation_time', seconds, 'seconds', {
    podcast_id: podcastId,
  });
}

/**
 * Records audio download failure rate.
 *
 * Calculate before calling: (failures / total_requests) * 100
 *
 * @param failureRate - Failure rate as percentage (0-100)
 * @param context - Optional context (e.g., region, file type)
 */
export async function recordDownloadFailureRate(
  failureRate: number,
  context?: Record<string, unknown>
): Promise<void> {
  await recordMetric('download_failure_rate', failureRate, 'percentage', context);
}

/**
 * Records CDN cache hit rate.
 *
 * Calculate before calling: (cache_hits / total_requests) * 100
 *
 * @param hitRate - Cache hit rate as percentage (0-100)
 */
export async function recordCDNCacheHitRate(hitRate: number): Promise<void> {
  await recordMetric('cdn_cache_hit_rate', hitRate, 'percentage');
}

/**
 * Records 5xx error rate.
 *
 * Calculate before calling: (5xx_responses / total_responses) * 100
 *
 * @param errorRate - Error rate as percentage (0-100)
 */
export async function recordErrorRate5xx(errorRate: number): Promise<void> {
  await recordMetric('error_rate_5xx', errorRate, 'percentage');
}

// ============================================
// Metric Retrieval
// ============================================

/**
 * Gets time window for queries in ISO format.
 */
function getTimeWindowISO(window: TimeWindow): string {
  const now = new Date();
  const windows = {
    '1h': 1 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  };
  return new Date(now.getTime() - windows[window]).toISOString();
}

/**
 * Retrieves metrics for a specific type within a time window.
 *
 * @param type - The type of metric to retrieve
 * @param window - Time window to query
 * @returns Array of metrics, newest first
 */
export async function getMetrics(
  type: MetricType,
  window: TimeWindow = '24h'
): Promise<InfrastructureMetric[]> {
  try {
    const supabase = await createClient();
    const since = getTimeWindowISO(window);

    const { data, error } = await supabase
      .from('infrastructure_metrics')
      .select('*')
      .eq('metric_type', type)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: false })
      .limit(1000);

    if (error || !data) return [];
    return data as InfrastructureMetric[];
  } catch {
    return [];
  }
}

/**
 * Gets summary statistics for a metric type.
 *
 * @param type - The type of metric to summarize
 * @param window - Time window to query
 * @returns Summary statistics or null
 */
export async function getMetricSummary(
  type: MetricType,
  window: TimeWindow = '24h'
): Promise<MetricSummary | null> {
  try {
    const metrics = await getMetrics(type, window);
    if (metrics.length === 0) return null;

    const values = metrics.map((m) => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      metricType: type,
      current: values[0], // Most recent value
      average,
      min,
      max,
      count: values.length,
    };
  } catch {
    return null;
  }
}

/**
 * Gets all metric summaries for dashboard display.
 *
 * @param window - Time window to query
 * @returns Array of summaries for all metric types
 */
export async function getAllMetricSummaries(
  window: TimeWindow = '24h'
): Promise<Record<MetricType, MetricSummary | null>> {
  const types: MetricType[] = [
    'rss_generation_time',
    'download_failure_rate',
    'cdn_cache_hit_rate',
    'error_rate_5xx',
  ];

  const summaries = await Promise.all(
    types.map((type) => getMetricSummary(type, window))
  );

  return {
    rss_generation_time: summaries[0],
    download_failure_rate: summaries[1],
    cdn_cache_hit_rate: summaries[2],
    error_rate_5xx: summaries[3],
  };
}

// ============================================
// Threshold Checking
// ============================================

export type ThresholdConfig = {
  metric_type: MetricType;
  warning_threshold: number;
  critical_threshold: number;
  comparison: 'greater_than' | 'less_than';
  enabled: boolean;
};

/**
 * Gets threshold configuration from database.
 */
export async function getThresholds(): Promise<ThresholdConfig[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('infrastructure_thresholds')
      .select('*')
      .eq('enabled', true);

    if (error || !data) return [];
    return data as ThresholdConfig[];
  } catch {
    return [];
  }
}

/**
 * Checks if a value violates a threshold.
 *
 * @param value - The metric value to check
 * @param threshold - The threshold configuration
 * @returns 'critical' | 'warning' | 'ok'
 */
export function checkThreshold(
  value: number,
  threshold: ThresholdConfig
): 'critical' | 'warning' | 'ok' {
  const { critical_threshold, warning_threshold, comparison } = threshold;

  if (comparison === 'greater_than') {
    if (value > critical_threshold) return 'critical';
    if (value > warning_threshold) return 'warning';
  } else {
    // less_than
    if (value < critical_threshold) return 'critical';
    if (value < warning_threshold) return 'warning';
  }

  return 'ok';
}

/**
 * Checks all metrics against their thresholds.
 *
 * Called by the background monitoring job (every 5 minutes).
 *
 * @returns Array of violations for alerting
 */
export async function checkAllThresholds(): Promise<
  Array<{
    metricType: MetricType;
    severity: 'warning' | 'critical';
    value: number;
    threshold: number;
  }>
> {
  const thresholds = await getThresholds();
  const violations: Array<{
    metricType: MetricType;
    severity: 'warning' | 'critical';
    value: number;
    threshold: number;
  }> = [];

  for (const threshold of thresholds) {
    const summary = await getMetricSummary(threshold.metric_type, '1h');
    if (!summary) continue;

    const status = checkThreshold(summary.current, threshold);
    if (status !== 'ok') {
      violations.push({
        metricType: threshold.metric_type,
        severity: status,
        value: summary.current,
        threshold:
          status === 'critical'
            ? threshold.critical_threshold
            : threshold.warning_threshold,
      });
    }
  }

  return violations;
}
