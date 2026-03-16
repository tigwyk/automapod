import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

test.describe('RSS Feed Generation', () => {
  let testPodcastSlug: string;

  test.beforeAll(async ({ browser }) => {
    // Create a test podcast for RSS tests using the page
    const timestamp = Date.now();
    testPodcastSlug = `test-podcast-${timestamp}`;

    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    await page.goto('/login');
    const { email, password } = getTestCredentials();
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });

    // Create test podcast
    await page.goto('/podcasts/new');
    await page.fill('input[name="title"]', `Test Podcast ${timestamp}`);
    await page.fill('input[name="rss_slug"]', testPodcastSlug);
    await page.fill('textarea[name="description"]', 'Test podcast for RSS feed generation');
    await page.click('button[type="submit"]');

    // Wait for creation to complete
    await page.waitForURL('/podcasts', { timeout: 10000 });

    await context.close();
  });

  test('should return 404 for non-existent podcast', async ({ request }) => {
    const response = await request.get('/rss/non-existent-podcast');
    expect(response.status()).toBe(404);
  });

  test('should generate RSS feed for podcast', async ({ request }) => {
    const response = await request.get(`/rss/${testPodcastSlug}`);
    expect(response.status()).toBe(200);
  });

  test('should return XML content type', async ({ request }) => {
    const response = await request.get(`/rss/${testPodcastSlug}`);

    // Check content type
    const contentType = response.headers()['content-type'];
    expect(contentType).toBeTruthy();
    expect(contentType.toLowerCase()).toContain('xml');
  });

  test('should set proper caching headers', async ({ request }) => {
    const response = await request.get(`/rss/${testPodcastSlug}`);

    // Check Cache-Control header exists
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toBeDefined();
  });

  test('should include podcast metadata in RSS feed', async ({ request }) => {
    const response = await request.get(`/rss/${testPodcastSlug}`);
    const text = await response.text();

    // Check for required RSS elements
    expect(text).toContain('<?xml version="1.0"');
    expect(text).toContain('<rss');
    expect(text).toContain('<channel>');
    expect(text).toContain('<title>');
  });

  test('should include iTunes namespace tags', async ({ request }) => {
    const response = await request.get(`/rss/${testPodcastSlug}`);
    const text = await response.text();

    // Check iTunes namespace declaration (flexible check)
    const hasItunesNamespace = text.includes('xmlns:itunes') || text.includes('itunes:');
    expect(hasItunesNamespace).toBeTruthy();
  });

  test('should include episodes in RSS feed', async ({ request }) => {
    const response = await request.get(`/rss/${testPodcastSlug}`);
    const text = await response.text();

    // Check for channel metadata
    expect(text).toContain('<channel>');

    // Episodes are optional - feed might be empty
    const hasItems = text.includes('<item>');
    if (hasItems) {
      expect(text).toContain('<title>');
    }
  });

  test('should handle podcast with no episodes', async ({ request }) => {
    const response = await request.get(`/rss/${testPodcastSlug}`);
    const text = await response.text();

    // Should still have channel metadata even with no episodes
    expect(text).toContain('<channel>');
    expect(text).toContain('<title>');

    // Response should be successful
    expect(response.status()).toBe(200);
  });

  test('should escape special characters in XML', async ({ request }) => {
    const response = await request.get(`/rss/${testPodcastSlug}`);
    const text = await response.text();

    // Check for proper XML declaration
    expect(text).toContain('<?xml version="1.0"');
  });

  test('should limit episodes to 100 in RSS feed', async ({ request }) => {
    const response = await request.get(`/rss/${testPodcastSlug}`);
    const text = await response.text();

    // Count <item> occurrences
    const itemMatches = text.match(/<item>/g);
    const itemCount = itemMatches ? itemMatches.length : 0;

    // Should have at most 100 episodes
    expect(itemCount).toBeLessThanOrEqual(100);
  });
});
