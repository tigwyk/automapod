import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import type { MetricType } from './monitoring';

/**
 * Infrastructure Alert Service
 *
 * Manages alert notifications and alert history.
 * Part of AUT-20: Production Monitoring and Alerting.
 */

// ============================================
// Types
// ============================================

export type AlertSeverity = 'warning' | 'critical';

export type Alert = {
  metricType: MetricType;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  message?: string;
};

export type InfrastructureAlert = {
  id: string;
  metric_type: MetricType;
  severity: AlertSeverity;
  value: number;
  threshold: number;
  message: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

// ============================================
// Configuration
// ============================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERTS_EMAIL = process.env.ALERTS_EMAIL || 'ops@automapod.com';

// Validate Resend is configured
function validateResendConfig(): void {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
}

// ============================================
// Alert Deduplication
// ============================================

/**
 * Checks if an alert should be sent (deduplication).
 *
 * Prevents alert spam by checking if a similar alert was sent
 * in the last N hours.
 *
 * @param metricType - The metric type
 * @param severity - The alert severity
 * @param hoursThreshold - Hours to look back for recent alerts
 * @returns true if alert should be sent, false if duplicate
 */
export async function shouldSendAlert(
  metricType: MetricType,
  severity: AlertSeverity,
  hoursThreshold: number = 1
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const since = new Date(
      Date.now() - hoursThreshold * 60 * 60 * 1000
    ).toISOString();

    const { data, error } = await supabase
      .from('infrastructure_alerts')
      .select('id')
      .eq('metric_type', metricType)
      .eq('severity', severity)
      .eq('resolved', false)
      .gte('created_at', since)
      .limit(1);

    if (error) return true; // On error, allow alert (fail open)
    return !data || data.length === 0;
  } catch {
    return true; // On error, allow alert (fail open)
  }
}

// ============================================
// Alert Recording
// ============================================

/**
 * Records an alert to the database.
 *
 * @param alert - The alert details
 * @returns The created alert or null
 */
export async function recordAlert(
  alert: Alert
): Promise<InfrastructureAlert | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('infrastructure_alerts')
      .insert({
        metric_type: alert.metricType,
        severity: alert.severity,
        value: alert.value,
        threshold: alert.threshold,
        message: alert.message || null,
      })
      .select()
      .single();

    if (error || !data) return null;
    return data as InfrastructureAlert;
  } catch {
    return null;
  }
}

/**
 * Marks an alert as resolved.
 *
 * @param alertId - The alert ID to resolve
 * @returns true if successful
 */
export async function resolveAlert(alertId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('infrastructure_alerts')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId);

    return !error;
  } catch {
    return false;
  }
}

// ============================================
// Alert History
// ============================================

/**
 * Gets recent alerts, optionally filtered by resolved status.
 *
 * @param limit - Maximum number of alerts to return
 * @param resolved - Filter by resolved status (null = all)
 * @returns Array of alerts
 */
export async function getAlerts(
  limit: number = 50,
  resolved: boolean | null = null
): Promise<InfrastructureAlert[]> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from('infrastructure_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (resolved !== null) {
      query = query.eq('resolved', resolved);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data as InfrastructureAlert[];
  } catch {
    return [];
  }
}

/**
 * Gets active (unresolved) alerts.
 *
 * @returns Array of active alerts
 */
export async function getActiveAlerts(): Promise<InfrastructureAlert[]> {
  return getAlerts(100, false);
}

// ============================================
// Email Notifications
// ============================================

/**
 * Generates a human-readable message from alert details.
 */
function generateAlertMessage(alert: Alert): string {
  const metricNames: Record<MetricType, string> = {
    rss_generation_time: 'RSS Feed Generation Time',
    download_failure_rate: 'Audio Download Failure Rate',
    cdn_cache_hit_rate: 'CDN Cache Hit Rate',
    error_rate_5xx: '5xx Error Rate',
  };

  const metricName = metricNames[alert.metricType] || alert.metricType;
  const severity = alert.severity.toUpperCase();

  return `${metricName} is ${severity}: ${alert.value}${getUnit(alert.metricType)} (threshold: ${alert.threshold}${getUnit(alert.metricType)})`;
}

/**
 * Gets the unit for a metric type.
 */
function getUnit(metricType: MetricType): string {
  const units: Record<MetricType, string> = {
    rss_generation_time: 's',
    download_failure_rate: '%',
    cdn_cache_hit_rate: '%',
    error_rate_5xx: '%',
  };
  return units[metricType] || '';
}

/**
 * Sends an alert email via Resend.
 *
 * @param alert - The alert details
 * @returns true if email was sent successfully
 */
export async function sendAlertEmail(alert: Alert): Promise<boolean> {
  try {
    validateResendConfig();

    const resend = new Resend(RESEND_API_KEY!);
    const message = alert.message || generateAlertMessage(alert);

    const { error } = await resend.emails.send({
      from: 'AutoMapod Alerts <alerts@automapod.com>',
      to: ALERTS_EMAIL,
      subject: `[${alert.severity.toUpperCase()}] ${alert.metricType} Alert`,
      html: generateAlertEmailHTML(alert, message),
    });

    if (error) {
      console.error('Failed to send alert email:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send alert email:', error);
    return false;
  }
}

/**
 * Generates HTML email body for alert.
 */
function generateAlertEmailHTML(alert: Alert, message: string): string {
  const severityColor = alert.severity === 'critical' ? '#dc2626' : '#f59e0b';
  const timestamp = new Date().toLocaleString();

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .alert-box { border: 2px solid ${severityColor}; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .severity { color: ${severityColor}; font-weight: bold; font-size: 18px; }
    .metric { font-size: 24px; font-weight: bold; margin: 20px 0; }
    .details { font-family: monospace; background: #f5f5f5; padding: 10px; border-radius: 4px; }
    .footer { color: #666; font-size: 12px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="alert-box">
    <div class="severity">${alert.severity.toUpperCase()} ALERT</div>
    <h1>Infrastructure Alert</h1>
    <div class="metric">${message}</div>
    <div class="details">
      <strong>Metric:</strong> ${alert.metricType}<br>
      <strong>Value:</strong> ${alert.value}<br>
      <strong>Threshold:</strong> ${alert.threshold}<br>
      <strong>Time:</strong> ${timestamp}
    </div>
  </div>
  <p>
    <strong>Next steps:</strong>
  </p>
  <ol>
    <li>Log into the AutoMapod dashboard to investigate</li>
    <li>Check the <a href="https://automapod.com/monitoring">monitoring page</a> for trends</li>
    <li>Follow the runbook if available</li>
    <li>Escalate to on-call if critical</li>
  </ol>
  <div class="footer">
    This is an automated alert from AutoMapod Infrastructure Monitoring.<br>
    Related issue: <a href="https://paperclip.ing/AUT/issues/AUT-20">AUT-20</a>
  </div>
</body>
</html>
  `.trim();
}

// ============================================
// Alert Orchestration
// ============================================

/**
 * Sends an alert: checks deduplication, records to DB, sends email.
 *
 * This is the main entry point for sending alerts.
 *
 * @param alert - The alert details
 * @returns true if alert was sent (not duplicate)
 */
export async function sendAlert(alert: Alert): Promise<boolean> {
  try {
    // Check if alert should be sent (deduplication)
    const shouldSend = await shouldSendAlert(alert.metricType, alert.severity);
    if (!shouldSend) {
      console.log(`Alert ${alert.metricType} (${alert.severity}) skipped due to deduplication`);
      return false;
    }

    // Record alert to database
    const recordedAlert = await recordAlert(alert);
    if (!recordedAlert) {
      console.error('Failed to record alert to database');
      // Continue anyway - alert delivery is more important
    }

    // Send email notification
    const emailSent = await sendAlertEmail(alert);
    if (!emailSent) {
      console.error('Failed to send alert email');
    }

    return true;
  } catch (error) {
    console.error('Failed to send alert:', error);
    return false;
  }
}

// ============================================
// Batch Alert Processing
// ============================================

/**
 * Processes multiple violations and sends alerts.
 *
 * Used by the background monitoring job to send alerts for all violations.
 *
 * @param violations - Array of threshold violations
 * @returns Number of alerts sent
 */
export async function processViolations(
  violations: Array<{
    metricType: MetricType;
    severity: 'warning' | 'critical';
    value: number;
    threshold: number;
  }>
): Promise<number> {
  let alertsSent = 0;

  for (const violation of violations) {
    const sent = await sendAlert({
      metricType: violation.metricType,
      severity: violation.severity,
      value: violation.value,
      threshold: violation.threshold,
    });

    if (sent) alertsSent++;
  }

  return alertsSent;
}
