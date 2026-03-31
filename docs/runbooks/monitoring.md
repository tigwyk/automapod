# Infrastructure Monitoring Runbook

**Version:** 1.0
**Last Updated:** 2026-03-31
**Related:** [AUT-20](https://paperclip.ing/AUT/issues/AUT-20)

---

## Overview

This runbook covers monitoring and alerting for AutoMapod infrastructure. It explains what each alert means, how to investigate, and common fixes.

## Quick Reference

| Alert Type | What It Means | First Action |
|------------|---------------|--------------|
| RSS Generation Time | RSS feeds are slow to generate | Check database query performance |
| Download Failure Rate | Audio files are failing to serve | Check R2/CDN status |
| CDN Cache Hit Rate | CDN is missing frequently (not serving from cache) | Check Cloudflare cache settings |
| 5xx Error Rate | Server errors are increasing | Check application logs |

---

## Alert Details

### 1. RSS Generation Time

**Thresholds:**
- Warning: >500ms
- Critical: >1s

**What This Means:**

RSS feed generation is taking longer than expected. This affects podcast directories and listeners trying to fetch updates.

**How to Investigate:**

1. Check the [monitoring dashboard](https://automapod.com/monitoring)
2. Look at recent values - is it spiking or sustained?
3. Check Supabase query performance:
   ```bash
   # View slow query logs
   supabase db inspect --slow-queries
   ```
4. Check database connection pool:
   ```bash
   # Check connection count
   supabase db inspect --connections
   ```

**Common Fixes:**

| Issue | Fix |
|-------|-----|
| Missing database index | Add index on `episodes(podcast_id, created_at)` |
| Too many episodes per feed | Implement pagination (future) |
| Database connection exhaustion | Increase connection pool size |
| High database load | Check for long-running queries |

**When to Escalate:**

- RSS generation time >5s for 10+ minutes
- All podcasts affected (not just one)
- Database is unresponsive

---

### 2. Download Failure Rate

**Thresholds:**
- Warning: >0.5%
- Critical: >1%

**What This Means:**

Audio file downloads are failing. Listeners can't play episodes.

**How to Investigate:**

1. Check if it's specific files or global:
   ```bash
   # View failed downloads by episode
   SELECT episode_id, COUNT(*) as failures
   FROM episode_downloads
   WHERE status = 'failed'
   GROUP BY episode_id
   ORDER BY failures DESC
   LIMIT 10;
   ```
2. Check Cloudflare R2 status:
   - Dashboard: https://dash.cloudflare.com
   - Look for R2 bucket errors
3. Check CDN logs:
   ```bash
   # View Cloudflare analytics
   # Check for 404/5xx responses from audio.automapod.com
   ```

**Common Fixes:**

| Issue | Fix |
|-------|-----|
| File not in R2 | Re-upload the episode audio |
| R2 bucket permissions | Check CORS configuration |
| CDN cache issues | Purge CDN cache for affected files |
| Custom domain down | Check DNS for audio.automapod.com |

**When to Escalate:**

- Failure rate >10% for 5+ minutes
- Multiple files affected across different podcasts
- R2 service appears down

---

### 3. CDN Cache Hit Rate

**Thresholds:**
- Warning: <95%
- Critical: <90%

**What This Means:**

Cloudflare CDN is not serving content from cache. This increases costs and slows down delivery.

**How to Investigate:**

1. Check Cloudflare Analytics:
   - Dashboard → Caching → Cache Analytics
   - Look at cache hit rate trends
2. Check cache rules:
   - Dashboard → Caching → Configuration
   - Verify cache settings for `audio.automapod.com`
3. Check if cache is being purged frequently:
   ```bash
   # Look for recent cache purges
   ```

**Common Fixes:**

| Issue | Fix |
|-------|-----|
| Cache disabled for audio files | Enable caching for `.mp3`, `.m4a` files |
| Short cache TTL | Increase cache TTL to 7 days |
| Frequent cache purges | Reduce purge frequency |
| Bypass cache on | Check for "Bypass Cache on Cookie" rules |

**When to Escalate:**

- Cache hit rate <50% for 30+ minutes
- Sudden drop from normal (>95%)
- Can't identify the cause

---

### 4. 5xx Error Rate

**Thresholds:**
- Warning: >0.05%
- Critical: >0.1%

**What This Means:**

Server errors (500-599) are increasing. The application is failing requests.

**How to Investigate:**

1. Check Vercel logs:
   - Dashboard → Project → Logs
   - Filter for 5xx status codes
2. Check application logs:
   ```bash
   # View recent error logs
   vercel logs --follow
   ```
3. Check for deployment issues:
   - Recent deploy that introduced bugs?
   - Environment variables missing?
4. Check database connection:
   ```bash
   # Test database connectivity
   ```

**Common Fixes:**

| Issue | Fix |
|-------|-----|
| Recent deploy broke something | Rollback to previous deployment |
| Database connection exhausted | Check connection pool, increase if needed |
| Missing environment variable | Add missing var to Vercel env |
| Unhandled exception | Fix the bug, deploy hotfix |

**When to Escalate:**

- 5xx rate >1% for 5+ minutes
- All endpoints returning 500 errors
- Can't access the application at all

---

## On-Call Procedures

### Initial Response (5 minutes)

1. **Acknowledge the alert** - Reply to the email or Slack message
2. **Check the dashboard** - Go to https://automapod.com/monitoring
3. **Assess severity**:
   - **Critical**: Affects all users, major functionality broken
   - **Warning**: Degraded performance, partial impact
4. **Create incident channel** (if critical): `#incident-YYYY-MM-DD`

### Investigation (15 minutes)

1. **Gather context**:
   - When did it start?
   - What changed recently? (deploys, config changes)
   - Is it getting better or worse?
2. **Check related systems**:
   - Vercel status: https://www.vercel-status.com
   - Supabase status: https://status.supabase.com
   - Cloudflare status: https://www.cloudflarestatus.com
3. **Document findings** in the incident channel

### Resolution (varies)

1. **Fix the issue** using the relevant section above
2. **Verify the fix** - check the monitoring dashboard
3. **Resolve the alert** - mark as resolved in the dashboard
4. **Communicate** - update the incident channel

### Post-Incident (within 24 hours)

1. **Write postmortem** covering:
   - What happened?
   - Why did it happen?
   - How did we fix it?
   - How can we prevent it in the future?
2. **Update this runbook** if new patterns discovered
3. **Create follow-up tasks** for long-term fixes

---

## Escalation Policy

### When to Escalate Immediately

- Production is completely down
- Data loss or corruption suspected
- Security incident in progress
- SLA breach imminent

### Escalation Path

1. **DevOps Engineer** (you) - Initial response
2. **CTO** - Technical escalation, complex issues
3. **CEO** - Business impact, customer communication

### Contact Information

| Role | Slack | Email |
|------|-------|-------|
| DevOps | @devops | ops@automapod.com |
| CTO | @cto | cto@automapod.com |
| CEO | @ceo | ceo@automapod.com |

---

## Maintenance

### Daily (automated)

- Monitoring cron job runs every 5 minutes
- Alerts fire automatically when thresholds breached

### Weekly

- Review alert history for patterns
- Adjust thresholds if needed (false positives/negatives)

### Monthly

- Review and update this runbook
- Test alert delivery (email/Slack)
- Postmortem review for any incidents

---

## Useful Commands

```bash
# Check database migration status
supabase db list

# View recent metrics (requires psql)
SELECT metric_type, value, unit, recorded_at
FROM infrastructure_metrics
ORDER BY recorded_at DESC
LIMIT 100;

# View active alerts
SELECT * FROM infrastructure_alerts
WHERE resolved = false
ORDER BY created_at DESC;

# Manually trigger monitoring check
curl -X POST https://automapod.com/api/cron/monitoring \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'

# Test email alerts
curl -X POST https://automapod.com/api/cron/monitoring/test \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## Related Documentation

- [Infrastructure Audit](../infrastructure-audit-2026-03-30-detailed.md)
- [Incident Response Template](./incident-response.md)
- [On-Call Procedures](./oncall.md)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-03-31 | Initial version | DevOps Engineer |
