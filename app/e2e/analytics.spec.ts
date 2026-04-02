import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

test.describe('Analytics & Download Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    const { email, password } = getTestCredentials();
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should return 1x1 GIF for tracking pixel', async ({ request }) => {
    // Test with a fake episode ID (should still return the GIF)
    const response = await request.get('/api/track/download?episodeId=00000000-0000-0000-0000-000000000000');

    // Should return 200 regardless of episode validity (for RSS reader compatibility)
    expect(response.status()).toBe(200);

    // Should be a GIF
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image/gif');

    // Should not cache
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('no-cache');
  });

  test('should return 1x1 GIF for new tracking pixel route', async ({ request }) => {
    // Test the new /track/[episodeId].gif route
    const response = await request.get('/track/00000000-0000-0000-0000-000000000000.gif');

    // Should return 200 regardless of episode validity (for RSS reader compatibility)
    expect(response.status()).toBe(200);

    // Should be a GIF
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image/gif');

    // Should not cache
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('no-cache');
  });

  test('should require authentication for analytics endpoint', async ({ request }) => {
    // Use a fresh request context without cookies
    const response = await request.get('/api/analytics/episode/00000000-0000-0000-0000-000000000000');

    expect(response.status()).toBe(401);

    const json = await response.json();
    expect(json).toHaveProperty('error', 'Authentication required');
  });

  test('should return 404 for non-existent episode analytics', async ({ page }) => {
    const response = await page.request.get('/api/analytics/episode/00000000-0000-0000-0000-000000000000');

    expect(response.status()).toBe(404);

    const json = await response.json();
    expect(json).toHaveProperty('error', 'Episode not found');
  });

  test('should show analytics link on episode detail page', async ({ page, request }) => {
    // First, create an episode via the upload page
    await page.goto('/episodes/new');

    const timestamp = Date.now();
    const testTitle = `Analytics Test ${timestamp}`;

    await page.fill('input[name="title"]', testTitle);

    const testAudioBuffer = Buffer.from(
      'ID3' + '\x00\x00\x00' + '\x00\x00\x00\x00' +
      '\xff\xe3' + '\x00\x00' + '\x00\x00' + '\x00\x00' +
      '\x00'.repeat(100)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: testAudioBuffer,
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Get the episode ID from URL
    const currentUrl = page.url();
    const episodeIdMatch = currentUrl.match(/\/episodes\/([a-f0-9-]+)/);

    if (!episodeIdMatch) {
      test.skip(true, 'Could not extract episode ID');
      return;
    }

    const episodeId = episodeIdMatch[1];

    // Go to episode detail page
    await page.goto(`/episodes/${episodeId}`);
    await page.waitForLoadState('networkidle');

    // Check for analytics link
    const analyticsLink = page.locator('a:has-text("View Analytics")');
    await expect(analyticsLink).toBeVisible();

    // Click the link and verify analytics page loads
    await analyticsLink.click();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/analytics\/episode\/[a-f0-9-]+/);

    // Check for analytics elements
    await expect(page.locator('text=Analytics')).toBeVisible();
    await expect(page.locator('text=Platform Breakdown')).toBeVisible();
    await expect(page.locator('text=Downloads Over Time')).toBeVisible();
  });

  test('should handle missing episodeId in tracking endpoint', async ({ request }) => {
    const response = await request.get('/api/track/download');

    // Should still return GIF (for RSS reader compatibility)
    expect(response.status()).toBe(200);

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('image/gif');
  });

  test('should return analytics data for owned episode', async ({ page, request }) => {
    // Create an episode
    await page.goto('/episodes/new');

    const timestamp = Date.now();
    const testTitle = `Analytics Data Test ${timestamp}`;

    await page.fill('input[name="title"]', testTitle);

    const testAudioBuffer = Buffer.from(
      'ID3' + '\x00\x00\x00' + '\x00\x00\x00\x00' +
      '\xff\xe3' + '\x00\x00' + '\x00\x00' + '\x00\x00' +
      '\x00'.repeat(100)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: testAudioBuffer,
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Get episode ID
    const currentUrl = page.url();
    const episodeIdMatch = currentUrl.match(/\/episodes\/([a-f0-9-]+)/);

    if (!episodeIdMatch) {
      test.skip(true, 'Could not extract episode ID');
      return;
    }

    const episodeId = episodeIdMatch[1];

    // Get analytics
    const response = await page.request.get(`/api/analytics/episode/${episodeId}`);

    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json).toHaveProperty('episodeId', episodeId);
    expect(json).toHaveProperty('totalDownloads');
    expect(json).toHaveProperty('uniqueDownloads');
    expect(json).toHaveProperty('platformBreakdown');
    expect(json).toHaveProperty('downloadsOverTime');

    // Platform breakdown should have all platforms
    expect(json.platformBreakdown).toHaveProperty('ios');
    expect(json.platformBreakdown).toHaveProperty('android');
    expect(json.platformBreakdown).toHaveProperty('web');
    expect(json.platformBreakdown).toHaveProperty('other');
  });

  test('should show correct back link for standalone episode', async ({ page }) => {
    // Create a standalone episode
    await page.goto('/episodes/new');

    const timestamp = Date.now();
    const testTitle = `Back Link Test ${timestamp}`;

    await page.fill('input[name="title"]', testTitle);

    const testAudioBuffer = Buffer.from(
      'ID3' + '\x00\x00\x00' + '\x00\x00\x00\x00' +
      '\xff\xe3' + '\x00\x00' + '\x00\x00' + '\x00\x00' +
      '\x00'.repeat(100)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: testAudioBuffer,
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Get the episode ID from URL
    const currentUrl = page.url();
    const episodeIdMatch = currentUrl.match(/\/episodes\/([a-f0-9-]+)/);

    if (!episodeIdMatch) {
      test.skip(true, 'Could not extract episode ID');
      return;
    }

    const episodeId = episodeIdMatch[1];

    // Navigate to analytics page
    await page.goto(`/analytics/episode/${episodeId}`);
    await page.waitForLoadState('networkidle');

    // Check the back link goes to the standalone episode page
    const backLink = page.locator('a:has-text("Back to Episode")');
    await expect(backLink).toBeVisible();

    const href = await backLink.getAttribute('href');
    expect(href).toBe(`/episodes/${episodeId}`);
  });

  test('should show correct back link for podcast episode', async ({ page }) => {
    // Create a podcast first
    const timestamp = Date.now();
    const testPodcastTitle = `Back Link Podcast ${timestamp}`;
    const testSlug = `back-link-pod-${timestamp}`;

    await page.goto('/podcasts/new');
    await page.fill('input#title', testPodcastTitle);
    await page.fill('input#rss_slug', testSlug);
    await page.click('button[type="submit"]');
    await page.waitForURL('/podcasts', { timeout: 10000 });

    // Navigate to the podcast detail page
    const podcastLink = page.locator(`a:has-text("${testPodcastTitle}")`).first();
    await podcastLink.click();
    await page.waitForLoadState('networkidle');

    // Extract podcast ID from URL
    const currentUrl = page.url();
    const podcastIdMatch = currentUrl.match(/\/podcasts\/([a-f0-9-]+)/);

    if (!podcastIdMatch) {
      test.skip(true, 'Could not extract podcast ID');
      return;
    }

    const podcastId = podcastIdMatch[1];

    // Navigate to episodes
    await page.goto(`/podcasts/${podcastId}/episodes`);
    await page.waitForLoadState('networkidle');

    // Click "New Episode" button
    const newEpisodeButton = page.locator('a:has-text("New Episode")');
    await newEpisodeButton.click();
    await page.waitForLoadState('networkidle');

    // Create an episode
    const testEpisodeTitle = `Back Link Episode ${timestamp}`;
    await page.fill('input[name="title"]', testEpisodeTitle);

    const testAudioBuffer = Buffer.from(
      'ID3' + '\x00\x00\x00' + '\x00\x00\x00\x00' +
      '\xff\xe3' + '\x00\x00' + '\x00\x00' + '\x00\x00' +
      '\x00'.repeat(100)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: testAudioBuffer,
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Get the episode ID from URL
    const episodeUrl = page.url();
    const episodeIdMatch = episodeUrl.match(/\/episodes\/([a-f0-9-]+)/);

    if (!episodeIdMatch) {
      test.skip(true, 'Could not extract episode ID');
      return;
    }

    const episodeId = episodeIdMatch[1];

    // Navigate to analytics page
    await page.goto(`/analytics/episode/${episodeId}`);
    await page.waitForLoadState('networkidle');

    // Check the back link goes to the podcast episode page
    const backLink = page.locator('a:has-text("Back to Episode")');
    await expect(backLink).toBeVisible();

    const href = await backLink.getAttribute('href');
    expect(href).toBe(`/podcasts/${podcastId}/episodes/${episodeId}`);
  });
});
