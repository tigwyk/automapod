import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

test.describe('Episode List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');

    // Get test credentials (fails fast if missing)
    const { email, password } = getTestCredentials();

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should display episodes page within podcast context', async ({ page }) => {
    // First, create a test podcast
    await page.goto('/podcasts/new');

    await page.fill('input[name="title"]', 'Test Podcast for Episodes');
    await page.fill('input[name="rss_slug"]', 'test-episodes-podcast');
    await page.fill('textarea[name="description"]', 'A test podcast for episode testing');

    await page.click('button[type="submit"]');

    // Wait for redirect to podcast detail page
    await page.waitForURL(/\/podcasts\/[a-f0-9-]+$/, { timeout: 10000 });

    // Get the podcast ID from the URL
    const url = page.url();
    const podcastId = url.split('/').pop();

    // Navigate to the episodes page for this podcast
    await page.goto(`/podcasts/${podcastId}/episodes`);

    // Check heading
    await expect(page.getByRole('heading', { name: /Test Podcast for Episodes - Episodes/ })).toBeVisible();
  });

  test('should display empty state when no episodes', async ({ page }) => {
    // First, create a test podcast
    await page.goto('/podcasts/new');

    await page.fill('input[name="title"]', 'Empty Test Podcast');
    await page.fill('input[name="rss_slug"]', `empty-test-${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Empty test podcast');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/podcasts\/[a-f0-9-]+$/, { timeout: 10000 });

    // Get the podcast ID from the URL
    const url = page.url();
    const podcastId = url.split('/').pop();

    // Navigate to the episodes page
    await page.goto(`/podcasts/${podcastId}/episodes`);

    // Check for empty state
    const emptyState = page.locator('text=No episodes yet');

    // Empty state should be visible for new podcast
    await expect(emptyState).toBeVisible();
  });
});

test.describe('Episode Upload in Podcast Context', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');

    // Get test credentials (fails fast if missing)
    const { email, password } = getTestCredentials();

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should navigate to upload page from podcast episodes', async ({ page }) => {
    // First, create a test podcast
    await page.goto('/podcasts/new');

    await page.fill('input[name="title"]', 'Upload Test Podcast');
    await page.fill('input[name="rss_slug"]', `upload-test-${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Test podcast for upload');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/podcasts\/[a-f0-9-]+$/, { timeout: 10000 });

    // Get the podcast ID from the URL
    const url = page.url();
    const podcastId = url.split('/').pop();

    // Navigate to episodes page
    await page.goto(`/podcasts/${podcastId}/episodes`);

    // Click "Upload Episode" button
    await page.getByRole('link', { name: /Upload Episode/ }).click();

    // Should be on the upload page
    await expect(page).toHaveURL(/\/podcasts\/[a-f0-9-]+\/episodes\/new/);

    // Check that the podcast title is shown
    await expect(page.getByText(/Add a new episode to Upload Test Podcast/)).toBeVisible();
  });

  test('should show podcast-scoped navigation', async ({ page }) => {
    // First, create a test podcast
    await page.goto('/podcasts/new');

    await page.fill('input[name="title"]', 'Nav Test Podcast');
    await page.fill('input[name="rss_slug"]', `nav-test-${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Test podcast for navigation');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/podcasts\/[a-f0-9-]+$/, { timeout: 10000 });

    // Get the podcast ID from the URL
    const url = page.url();
    const podcastId = url.split('/').pop();

    // Navigate to episodes page
    await page.goto(`/podcasts/${podcastId}/episodes`);

    // Check breadcrumb navigation
    await expect(page.getByRole('link', { name: 'All Podcasts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nav Test Podcast' })).toBeVisible();
    await expect(page.getByText('Episodes', { exact: true })).toBeVisible();
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');

    // Get test credentials (fails fast if missing)
    const { email, password } = getTestCredentials();

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should navigate to podcasts from dashboard (not episodes directly)', async ({ page }) => {
    await page.goto('/dashboard');

    // Check that "Podcasts" link exists
    await expect(page.getByRole('link', { name: 'Podcasts' })).toBeVisible();

    // Click on Podcasts
    await page.getByRole('link', { name: 'Podcasts' }).click();
    await expect(page).toHaveURL('/podcasts');
  });

  test('should not have direct Episodes link in dashboard nav', async ({ page }) => {
    await page.goto('/dashboard');

    // Check that "Episodes" link does NOT exist in nav
    const episodesLink = page.getByRole('navigation').getByRole('link', { name: 'Episodes' });
    await expect(episodesLink).not.toBeVisible();
  });

  test('should navigate to podcasts page and then to episodes', async ({ page }) => {
    await page.goto('/dashboard');

    // Click on "Manage Podcasts"
    await page.getByRole('link', { name: 'Manage Podcasts' }).click();
    await expect(page).toHaveURL('/podcasts');

    // Create a test podcast
    await page.getByRole('link', { name: 'Create Podcast' }).click();
    await expect(page).toHaveURL('/podcasts/new');

    await page.fill('input[name="title"]', 'Dashboard Test Podcast');
    await page.fill('input[name="rss_slug"]', `dashboard-test-${Date.now()}`);
    await page.fill('textarea[name="description"]', 'Test from dashboard');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/podcasts\/[a-f0-9-]+$/, { timeout: 10000 });

    // Now on podcast detail page, check for "View Episodes" button
    await expect(page.getByRole('link', { name: /View Episodes/ })).toBeVisible();
  });
});
