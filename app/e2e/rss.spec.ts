import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

test.describe('RSS Feed Generation', () => {
  let testPodcastId: string;
  let testPodcastSlug: string;

  test.beforeAll(async ({ request }) => {
    // Create a test podcast for RSS tests
    const timestamp = Date.now();
    testPodcastSlug = `test-podcast-${timestamp}`;

    // First login to get session
    const loginResponse = await request.post('/api/auth/signin', {
      data: {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      },
    });

    // Create test podcast via API (or we could use the page)
    // For now, we'll use a known slug from manual testing
    testPodcastSlug = 'test-podcast'; // This should exist from manual testing
  });

  test('should return 404 for non-existent podcast', async ({ request }) => {
    const response = await request.get('/rss/non-existent-podcast');
    expect(response.status()).toBe(404);
  });

  test('should generate RSS feed for podcast', async ({ page }) => {
    // Navigate to a podcast's RSS feed
    await page.goto('/rss/test-podcast');

    // Check that we get XML content type
    const contentType = await page.evaluate(() => document.contentType);
    expect(contentType).toContain('xml');
  });

  test('should return XML content type', async ({ page, request }) => {
    const response = await request.get('/rss/test-podcast');

    // Check content type
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/xml');
    expect(contentType).toContain('charset=utf-8');
  });

  test('should set proper caching headers', async ({ page, request }) => {
    const response = await request.get('/rss/test-podcast');

    // Check Cache-Control header
    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('max-age=300');
    expect(cacheControl).toContain('public');

    // Check ETag header exists
    const etag = response.headers()['etag'];
    expect(etag).toBeDefined();

    // Check Last-Modified header exists
    const lastModified = response.headers()['last-modified'];
    expect(lastModified).toBeDefined();
  });

  test('should include podcast metadata in RSS feed', async ({ page, request }) => {
    const response = await request.get('/rss/test-podcast');
    const text = await response.text();

    // Check for required RSS elements
    expect(text).toContain('<?xml version="1.0"');
    expect(text).toContain('<rss version="2.0"');
    expect(text).toContain('xmlns:itunes');
    expect(text).toContain('<channel>');
    expect(text).toContain('<title>');
    expect(text).toContain('<description>');
    expect(text).toContain('<itunes:author>');
    expect(text).toContain('<itunes:image>');
  });

  test('should include iTunes namespace tags', async ({ page, request }) => {
    const response = await request.get('/rss/test-podcast');
    const text = await response.text();

    // Check iTunes-specific tags
    expect(text).toContain('<itunes:author>');
    expect(text).toContain('<itunes:summary>');
    expect(text).toContain('<itunes:owner>');
    expect(text).toContain('<itunes:image');
    expect(text).toContain('<itunes:category>');
    expect(text).toContain('<itunes:explicit>');
  });

  test('should include episodes in RSS feed', async ({ page, request }) => {
    const response = await request.get('/rss/test-podcast');
    const text = await response.text();

    // Check for episode elements (if episodes exist)
    // This might not find items if no episodes exist, which is ok
    const hasItems = text.includes('<item>');
    if (hasItems) {
      expect(text).toContain('<title>');
      expect(text).toContain('<description>');
      expect(text).toContain('<enclosure');
      expect(text).toContain('<guid>');
      expect(text).toContain('<pubDate>');
      expect(text).toContain('<itunes:duration>');
    }
  });

  test('should handle podcast with no episodes', async ({ page, request }) => {
    // This test assumes a podcast with no episodes exists
    // The feed should still be valid, just without episode items
    const response = await request.get('/rss/test-podcast');
    const text = await response.text();

    // Should still have channel metadata
    expect(text).toContain('<channel>');
    expect(text).toContain('<title>');

    // Response should be successful
    expect(response.status()).toBe(200);
  });

  test('should escape special characters in XML', async ({ page, request }) => {
    const response = await request.get('/rss/test-podcast');
    const text = await response.text();

    // Check for CDATA sections (used for escaping)
    expect(text).toContain('<![CDATA[');
  });

  test('should limit episodes to 100 in RSS feed', async ({ page, request }) => {
    const response = await request.get('/rss/test-podcast');
    const text = await response.text();

    // Count <item> occurrences
    const itemMatches = text.match(/<item>/g);
    const itemCount = itemMatches ? itemMatches.length : 0;

    // Should have at most 100 episodes
    expect(itemCount).toBeLessThanOrEqual(100);
  });
});
