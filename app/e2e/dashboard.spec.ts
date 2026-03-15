import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Get test credentials (fails fast if missing)
    const { email, password } = getTestCredentials();

    // Fill in login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should display dashboard with user info', async ({ page }) => {
    // Check heading
    await expect(page.locator('h1')).toContainText('AutoMapod');

    // Check for welcome message
    await expect(page.locator('text=Welcome to AutoMapod')).toBeVisible();
  });

  test('should have navigation buttons', async ({ page }) => {
    // Check for Create Podcast button (use role to avoid strict mode violation)
    await expect(page.getByRole('link', { name: 'Create Podcast' })).toBeVisible();

    // Check for Manage Podcasts button
    await expect(page.getByRole('link', { name: 'Manage Podcasts' })).toBeVisible();

    // Check for Upload New Episode button
    await expect(page.getByRole('link', { name: 'Upload New Episode' })).toBeVisible();

    // Check for View All Episodes button
    await expect(page.getByRole('link', { name: 'View All Episodes' })).toBeVisible();
  });

  test('should display feature checklist', async ({ page }) => {
    // Check for Getting Started section
    await expect(page.locator('text=Getting Started')).toBeVisible();

    // Check for feature list items
    await expect(page.locator('text=Create podcasts')).toBeVisible();
    await expect(page.locator('text=Upload audio')).toBeVisible();
    await expect(page.locator('text=Auto-transcribe')).toBeVisible();
    await expect(page.locator('text=Generate RSS feed')).toBeVisible();
  });

  test('should indicate feature status', async ({ page }) => {
    // Check that completed features have green checkmarks
    const completedFeatures = page.locator('svg.text-green-500');
    await expect(completedFeatures).toHaveCount(3); // Create podcasts, Upload audio, Auto-transcribe

    // Check that upcoming features have gray icons
    const upcomingFeatures = page.locator('svg.text-gray-400');
    await expect(upcomingFeatures).toHaveCount(1); // Generate RSS feed
  });
});
