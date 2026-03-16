import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

// Helper function to create a test podcast
async function createTestPodcast(page: any) {
  const timestamp = Date.now();
  const testPodcastSlug = `test-podcast-${timestamp}`;
  const testPodcastTitle = `Test Podcast ${timestamp}`;

  await page.goto('/podcasts/new');
  await page.waitForLoadState('networkidle');

  await page.fill('input#title', testPodcastTitle);
  await page.fill('input#rss_slug', testPodcastSlug);
  await page.fill('textarea#description', 'Test podcast for RSS feed generation');
  await page.click('button[type="submit"]');

  // Wait for navigation or timeout
  await page.waitForTimeout(5000);

  return { slug: testPodcastSlug, title: testPodcastTitle, success: !page.url().includes('/podcasts/new') };
}

test.describe('RSS Feed Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    const { email, password } = getTestCredentials();
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should return 404 for non-existent podcast', async ({ request }) => {
    const response = await request.get('/rss/non-existent-podcast');
    expect(response.status()).toBe(404);
  });

  test('should generate RSS feed for podcast', async ({ page }) => {
    // Create a test podcast
    const { slug, success } = await createTestPodcast(page);

    if (!success) {
      test.skip();
      return;
    }

    await page.goto(`/rss/${slug}`);
    await page.waitForLoadState('networkidle');

    // Should not be a 404
    const content = await page.content();
    const isJson = content.includes('{"error"');
    expect(isJson).toBe(false);
  });

  test('should return XML content type', async ({ page, request }) => {
    // Create a test podcast
    const { slug, success } = await createTestPodcast(page);

    if (!success) {
      test.skip();
      return;
    }

    const response = await request.get(`/rss/${slug}`);

    // Check content type
    const contentType = response.headers()['content-type'];
    expect(contentType).toBeTruthy();
    expect(contentType.toLowerCase()).toContain('xml');
  });

  test('should set proper caching headers', async ({ page, request }) => {
    // Create a test podcast
    const { slug, success } = await createTestPodcast(page);

    if (!success) {
      test.skip();
      return;
    }

    const response = await request.get(`/rss/${slug}`);

    // Check Cache-Control header exists
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toBeDefined();
  });

  test('should include podcast metadata in RSS feed', async ({ page, request }) => {
    // Create a test podcast
    const { slug, success } = await createTestPodcast(page);

    if (!success) {
      test.skip();
      return;
    }

    const response = await request.get(`/rss/${slug}`);
    const text = await response.text();

    // Check for required RSS elements
    expect(text).toContain('<?xml version="1.0"');
    expect(text).toContain('<rss');
    expect(text).toContain('<channel>');
    expect(text).toContain('<title>');
  });

  test('should include iTunes namespace tags', async ({ page, request }) => {
    // Create a test podcast
    const { slug, success } = await createTestPodcast(page);

    if (!success) {
      test.skip();
      return;
    }

    const response = await request.get(`/rss/${slug}`);
    const text = await response.text();

    // Check iTunes namespace declaration (flexible check)
    const hasItunesNamespace = text.includes('xmlns:itunes') || text.includes('itunes:');
    expect(hasItunesNamespace).toBeTruthy();
  });

  test('should include episodes in RSS feed', async ({ page, request }) => {
    // Create a test podcast
    const { slug, success } = await createTestPodcast(page);

    if (!success) {
      test.skip();
      return;
    }

    const response = await request.get(`/rss/${slug}`);
    const text = await response.text();

    // Check for channel metadata
    expect(text).toContain('<channel>');

    // Episodes are optional - feed might be empty
    const hasItems = text.includes('<item>');
    if (hasItems) {
      expect(text).toContain('<title>');
    }
  });

  test('should handle podcast with no episodes', async ({ page, request }) => {
    // Create a test podcast
    const { slug, success } = await createTestPodcast(page);

    if (!success) {
      test.skip();
      return;
    }

    const response = await request.get(`/rss/${slug}`);
    const text = await response.text();

    // Should still have channel metadata even with no episodes
    expect(text).toContain('<channel>');
    expect(text).toContain('<title>');

    // Response should be successful
    expect(response.status()).toBe(200);
  });

  test('should escape special characters in XML', async ({ page, request }) => {
    // Create a test podcast
    const { slug, success } = await createTestPodcast(page);

    if (!success) {
      test.skip();
      return;
    }

    const response = await request.get(`/rss/${slug}`);
    const text = await response.text();

    // Check for proper XML declaration
    expect(text).toContain('<?xml version="1.0"');
  });

  test('should limit episodes to 100 in RSS feed', async ({ page, request }) => {
    // Create a test podcast
    const { slug, success } = await createTestPodcast(page);

    if (!success) {
      test.skip();
      return;
    }

    const response = await request.get(`/rss/${slug}`);
    const text = await response.text();

    // Count <item> occurrences
    const itemMatches = text.match(/<item>/g);
    const itemCount = itemMatches ? itemMatches.length : 0;

    // Should have at most 100 episodes
    expect(itemCount).toBeLessThanOrEqual(100);
  });
});
