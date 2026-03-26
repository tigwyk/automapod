import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

test.describe('Podcast Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    const { email, password } = getTestCredentials();
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should require authentication for podcast analytics endpoint', async ({ request }) => {
    // Use a fresh request context without cookies (unauthenticated)
    const response = await request.get('/api/analytics/podcast/00000000-0000-0000-0000-000000000000');

    expect(response.status()).toBe(401);

    const json = await response.json();
    expect(json).toHaveProperty('error', 'Authentication required');
  });

  test('should return 404 for non-existent podcast analytics', async ({ page }) => {
    const response = await page.request.get('/api/analytics/podcast/00000000-0000-0000-0000-000000000000');

    expect(response.status()).toBe(404);

    const json = await response.json();
    expect(json).toHaveProperty('error', 'Podcast not found');
  });

  test('should return analytics data with expected shape for owned podcast', async ({ page }) => {
    // Create a podcast first
    const timestamp = Date.now();
    const testTitle = `test_podcast_${timestamp}`;
    const testSlug = `test-pod-${timestamp}`;

    await page.goto('/podcasts/new');
    await page.fill('input#title', testTitle);
    await page.fill('input#rss_slug', testSlug);
    await page.click('button[type="submit"]');
    await page.waitForURL('/podcasts', { timeout: 10000 });

    // Find the podcast link and navigate to its detail page
    const podcastLink = page.locator(`a:has-text("${testTitle}")`).first();
    await podcastLink.click();
    await page.waitForLoadState('networkidle');

    // Extract podcast ID from URL
    const currentUrl = page.url();
    const podcastIdMatch = currentUrl.match(/\/podcasts\/([a-f0-9-]+)/);

    if (!podcastIdMatch) {
      throw new Error('Could not extract podcast ID from URL: ' + currentUrl);
    }

    const podcastId = podcastIdMatch[1];

    // Fetch analytics for the owned podcast
    const response = await page.request.get(`/api/analytics/podcast/${podcastId}`);

    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json).toHaveProperty('podcastId', podcastId);
    expect(json).toHaveProperty('title', testTitle);
    expect(json).toHaveProperty('totalDownloads');
    expect(json).toHaveProperty('uniqueDownloads');
    expect(json).toHaveProperty('platformBreakdown');
    expect(json).toHaveProperty('downloadsOverTime');
    expect(json).toHaveProperty('topEpisodes');

    // Platform breakdown should have all platforms
    expect(json.platformBreakdown).toHaveProperty('ios');
    expect(json.platformBreakdown).toHaveProperty('android');
    expect(json.platformBreakdown).toHaveProperty('web');
    expect(json.platformBreakdown).toHaveProperty('other');

    // downloadsOverTime should be a 30-day series
    expect(Array.isArray(json.downloadsOverTime)).toBe(true);
    expect(json.downloadsOverTime).toHaveLength(30);
    expect(json.downloadsOverTime[0]).toHaveProperty('date');
    expect(json.downloadsOverTime[0]).toHaveProperty('count');

    // topEpisodes should be an array (empty for a new podcast)
    expect(Array.isArray(json.topEpisodes)).toBe(true);
  });

  test('should navigate to podcast analytics page via Analytics button on podcast detail', async ({ page }) => {
    // Create a podcast
    const timestamp = Date.now();
    const testTitle = `test_podcast_nav_${timestamp}`;
    const testSlug = `test-pod-nav-${timestamp}`;

    await page.goto('/podcasts/new');
    await page.fill('input#title', testTitle);
    await page.fill('input#rss_slug', testSlug);
    await page.click('button[type="submit"]');
    await page.waitForURL('/podcasts', { timeout: 10000 });

    // Navigate to the podcast detail page
    const podcastLink = page.locator(`a:has-text("${testTitle}")`).first();
    await podcastLink.click();
    await page.waitForLoadState('networkidle');

    // Click the Analytics button in Quick Actions
    const analyticsButton = page.locator('a:has-text("Analytics")').first();
    await expect(analyticsButton).toBeVisible();
    await analyticsButton.click();
    await page.waitForLoadState('networkidle');

    // Should land on the podcast analytics page
    await expect(page).toHaveURL(/\/analytics\/podcast\/[a-f0-9-]+/);

    // Check key elements on the analytics page
    await expect(page.locator('text=Total Downloads')).toBeVisible();
    await expect(page.locator('text=Unique Listeners')).toBeVisible();
    await expect(page.locator('text=Downloads Over Time')).toBeVisible();
    await expect(page.locator('text=Platforms')).toBeVisible();
  });
});
