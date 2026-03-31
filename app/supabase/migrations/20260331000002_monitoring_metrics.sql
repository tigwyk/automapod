-- Migration: Infrastructure Monitoring and Alerting
-- Created: 2026-03-31
-- Author: DevOps Engineer
-- Related: AUT-20

-- ============================================
-- Infrastructure Metrics Time-Series Table
-- ============================================
-- Stores time-series metrics for monitoring infrastructure health
-- Follows GDPR/CCPA compliance (no PII in metrics)

CREATE TABLE IF NOT EXISTS infrastructure_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL CHECK (metric_type in (
    'rss_generation_time',
    'download_failure_rate',
    'cdn_cache_hit_rate',
    'error_rate_5xx'
  )),
  value DECIMAL(10,4) NOT NULL,
  unit TEXT NOT NULL CHECK (unit in ('seconds', 'percentage', 'count')),
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient time-series queries
CREATE INDEX IF NOT EXISTS idx_metrics_type_time
  ON infrastructure_metrics(metric_type, recorded_at DESC);

-- Index for time-range queries across all types
CREATE INDEX IF NOT EXISTS idx_metrics_time
  ON infrastructure_metrics(recorded_at DESC);

-- Comment for documentation
COMMENT ON TABLE infrastructure_metrics IS 'Time-series metrics for infrastructure monitoring (AUT-20)';
COMMENT ON COLUMN infrastructure_metrics.metadata IS 'Additional context without PII (e.g., podcast_id, region)';

-- ============================================
-- Infrastructure Alert History
-- ============================================
-- Tracks alert incidents for postmortem analysis

CREATE TABLE IF NOT EXISTS infrastructure_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity in ('warning', 'critical')),
  value DECIMAL(10,4) NOT NULL,
  threshold DECIMAL(10,4) NOT NULL,
  message TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active alerts query
CREATE INDEX IF NOT EXISTS idx_alerts_created
  ON infrastructure_alerts(created_at DESC);

-- Index for resolution tracking
CREATE INDEX IF NOT EXISTS idx_alerts_resolved
  ON infrastructure_alerts(resolved, resolved_at);

-- Index for alert history by type
CREATE INDEX IF NOT EXISTS idx_alerts_type
  ON infrastructure_alerts(metric_type, created_at DESC);

-- Comment for documentation
COMMENT ON TABLE infrastructure_alerts IS 'Alert history for infrastructure incidents (AUT-20)';
COMMENT ON COLUMN infrastructure_alerts.resolved IS 'FALSE = active alert, TRUE = resolved incident';

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================
-- Enable RLS
ALTER TABLE infrastructure_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE infrastructure_alerts ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (for background jobs)
CREATE POLICY "Service role has full access to metrics"
  ON infrastructure_metrics
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to alerts"
  ON infrastructure_alerts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can read metrics (for dashboard)
CREATE POLICY "Authenticated users can read metrics"
  ON infrastructure_metrics
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated admin users can read alerts
CREATE POLICY "Authenticated users can read alerts"
  ON infrastructure_alerts
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Threshold Configuration
-- ============================================
-- Store alert thresholds for easy adjustment without code changes

CREATE TABLE IF NOT EXISTS infrastructure_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT UNIQUE NOT NULL,
  warning_threshold DECIMAL(10,4) NOT NULL,
  critical_threshold DECIMAL(10,4) NOT NULL,
  comparison TEXT NOT NULL CHECK (comparison in ('greater_than', 'less_than')),
  check_interval_minutes INTEGER NOT NULL DEFAULT 5,
  enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default thresholds based on infrastructure audit
INSERT INTO infrastructure_thresholds (metric_type, warning_threshold, critical_threshold, comparison) VALUES
  ('rss_generation_time', 0.5, 1.0, 'greater_than'),  -- seconds
  ('download_failure_rate', 0.5, 1.0, 'greater_than'),  -- percentage
  ('cdn_cache_hit_rate', 95.0, 90.0, 'less_than'),  -- percentage
  ('error_rate_5xx', 0.05, 0.1, 'greater_than')  -- percentage
ON CONFLICT (metric_type) DO NOTHING;

COMMENT ON TABLE infrastructure_thresholds IS 'Configurable alert thresholds (AUT-20)';

-- ============================================
-- Maintenance: Data Retention
-- ============================================
-- Function to clean up old metrics (keep 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM infrastructure_metrics
  WHERE recorded_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Comment for documentation
COMMENT ON FUNCTION cleanup_old_metrics IS 'Delete metrics older than 90 days to manage storage (AUT-20)';

-- ============================================
-- Helper: Alert Deduplication
-- ============================================
-- Prevent alert spam: check if similar alert was sent recently
CREATE OR REPLACE FUNCTION should_send_alert(
  p_metric_type TEXT,
  p_severity TEXT,
  p_hours_threshold INTEGER DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_alert_count INTEGER;
BEGIN
  -- Count unresolved alerts of same type/severity in last N hours
  SELECT COUNT(*) INTO recent_alert_count
  FROM infrastructure_alerts
  WHERE metric_type = p_metric_type
    AND severity = p_severity
    AND resolved = FALSE
    AND created_at > NOW() - MAKE_INTERVAL(hours => p_hours_threshold);

  -- Only send if no recent alerts
  RETURN recent_alert_count = 0;
END;
$$;

COMMENT ON FUNCTION should_send_alert IS 'Deduplicate alerts to prevent spam (AUT-20)';
