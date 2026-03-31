import { NextRequest, NextResponse } from 'next/server';
import { checkAllThresholds } from '@/lib/monitoring';
import { processViolations } from '@/lib/alerts';

/**
 * Monitoring Cron Job
 *
 * Runs every 5 minutes via Vercel Cron to check infrastructure metrics
 * against thresholds and send alerts when violations are detected.
 *
 * Cron schedule: Every 5 minutes
 * Vercel config: vercel.json
 *
 * Related: AUT-20
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const secret = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.warn('CRON_SECRET not configured - cron endpoint is unprotected');
    return true; // Allow in development
  }

  return secret === `Bearer ${expectedSecret}`;
}

/**
 * GET /api/cron/monitoring
 *
 * Vercel Cron endpoint for monitoring checks.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();

    // Check all thresholds
    const violations = await checkAllThresholds();

    // Process violations (send alerts)
    const alertsSent = await processViolations(violations);

    const duration = Date.now() - startTime;

    // Log results
    console.log(`[Monitoring Cron] Checked ${violations.length} violations, sent ${alertsSent} alerts (${duration}ms)`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      violations: violations.length,
      alertsSent,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('[Monitoring Cron] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint for testing.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Manual trigger for testing
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;

    const violations = await checkAllThresholds();

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        violationsCount: violations.length,
        violations: violations.map((v) => ({
          metricType: v.metricType,
          severity: v.severity,
          value: v.value,
          threshold: v.threshold,
        })),
      });
    }

    const alertsSent = await processViolations(violations);

    return NextResponse.json({
      success: true,
      violations: violations.length,
      alertsSent,
    });
  } catch (error) {
    console.error('[Monitoring Cron] Manual trigger error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
