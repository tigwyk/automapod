import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

/**
 * E2E tests for the analytics overview page (/analytics) and
 * the /api/analytics/overview API endpoint.
 *
 * Per-episode analytics: analytics.spec.ts
 * Per-podcast analytics: podcast-analytics.spec.ts
 */
test.describe('Analytics Overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const { email, password } = getTestCredentials();
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  test('should show Analytics nav link on dashboard', async ({ page }) => {
    const analyticsLink = page.locator('nav a[href="/analytics"]');
    await expect(analyticsLink).toBeVisible();
    await expect(analyticsLink).toHaveText('Analytics');
  });

  test('should navigate to /analytics from nav link', async ({ page }) => {
    await page.locator('nav a[href="/analytics"]').click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/analytics');
    await expect(page.locator('h1:has-text("Analytics")')).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Auth guards
  // -----------------------------------------------------------------------

  test('should redirect unauthenticated users from /analytics to /login', async ({ browser }) => {
    // Fresh context with no session cookies
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/analytics');
    await page.waitForURL(/\/login/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
    await ctx.close();
  });

  test('should return 401 from overview API without auth', async ({ request }) => {
    const response = await request.get('/api/analytics/overview');
    expect(response.status()).toBe(401);
    const json = await response.json();
    expect(json).toHaveProperty('error', 'Authentication required');
  });

  // -----------------------------------------------------------------------
  // Overview API shape
  // -----------------------------------------------------------------------

  test('should return expected shape from overview API', async ({ page }) => {
    const response = await page.request.get('/api/analytics/overview');
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json).toHaveProperty('totalDownloads');
    expect(json).toHaveProperty('totalUniqueDownloads');
    expect(json).toHaveProperty('podcasts');
    expect(Array.isArray(json.podcasts)).toBe(true);

    // Each podcast entry should have the expected fields
    if (json.podcasts.length > 0) {
      const podcast = json.podcasts[0];
      expect(podcast).toHaveProperty('id');
      expect(podcast).toHaveProperty('title');
      expect(podcast).toHaveProperty('episodeCount');
      expect(podcast).toHaveProperty('totalDownloads');
      expect(podcast).toHaveProperty('uniqueDownloads');
    }
  });

  // -----------------------------------------------------------------------
  // Overview page — with a known podcast
  // -----------------------------------------------------------------------

  test('should list a newly created podcast on the overview page', async ({ page }) => {
    const timestamp = Date.now();
    const testTitle = `test_podcast_overview_${timestamp}`;
    const testSlug = `test-pod-ov-${timestamp}`;

    // Create a podcast
    await page.goto('/podcasts/new');
    await page.fill('input#title', testTitle);
    await page.fill('input#rss_slug', testSlug);
    await page.click('button[type="submit"]');
    await page.waitForURL('/podcasts', { timeout: 10000 });

    // Navigate to analytics overview
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // The podcast should appear in the table
    await expect(page.locator(`text=${testTitle}`)).toBeVisible();

    // The Episodes, Downloads, and Unique columns should be present
    await expect(page.locator('th:has-text("Episodes")')).toBeVisible();
    await expect(page.locator('th:has-text("Downloads")')).toBeVisible();
    await expect(page.locator('th:has-text("Unique")')).toBeVisible();
  });

  test('should show stats row (Total Downloads, Unique Listeners, Podcasts) when podcasts exist', async ({ page }) => {
    // Create a podcast so we're not in the empty state
    const timestamp = Date.now();
    const testTitle = `test_podcast_stats_${timestamp}`;
    const testSlug = `test-pod-st-${timestamp}`;

    await page.goto('/podcasts/new');
    await page.fill('input#title', testTitle);
    await page.fill('input#rss_slug', testSlug);
    await page.click('button[type="submit"]');
    await page.waitForURL('/podcasts', { timeout: 10000 });

    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Total Downloads')).toBeVisible();
    await expect(page.locator('text=Unique Listeners')).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Drill-down navigation
  // -----------------------------------------------------------------------

  test('should navigate to podcast analytics via "View →" link', async ({ page }) => {
    const timestamp = Date.now();
    const testTitle = `test_podcast_drilldown_${timestamp}`;
    const testSlug = `test-pod-dd-${timestamp}`;

    // Create a podcast
    await page.goto('/podcasts/new');
    await page.fill('input#title', testTitle);
    await page.fill('input#rss_slug', testSlug);
    await page.click('button[type="submit"]');
    await page.waitForURL('/podcasts', { timeout: 10000 });

    // Go to analytics overview
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');

    // Find the "View →" link in the row for our test podcast
    const podcastRow = page.locator(`tr:has-text("${testTitle}")`);
    await expect(podcastRow).toBeVisible();

    const viewLink = podcastRow.locator('a:has-text("View →")');
    await expect(viewLink).toBeVisible();
    await viewLink.click();
    await page.waitForLoadState('networkidle');

    // Should land on the podcast analytics page
    await expect(page).toHaveURL(/\/analytics\/podcast\/[a-f0-9-]+/);
    await expect(page.locator('text=Total Downloads')).toBeVisible();
    await expect(page.locator('text=Unique Listeners')).toBeVisible();
  });

  // -----------------------------------------------------------------------
  // Empty state
  // -----------------------------------------------------------------------

  // Note: This test is skipped by default since it's hard to guarantee
  // a zero-podcast account in shared test credentials. Run it manually
  // against a fresh test account if needed.
  test.skip('should show empty state when no podcasts exist', async ({ page }) => {
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=No analytics yet')).toBeVisible();
    await expect(page.locator('a:has-text("Create Your First Podcast")')).toBeVisible();
  });
});
