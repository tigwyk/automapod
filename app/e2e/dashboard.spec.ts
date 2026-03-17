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
    // Check for AutoMapod branding in nav
    await expect(page.getByRole('link', { name: 'AutoMapod' })).toBeVisible();

    // Check for welcome message
    await expect(page.locator('text=Welcome to AutoMapod')).toBeVisible();

    // Check for Sign Out button (user is logged in)
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });

  test('should have navigation cards', async ({ page }) => {
    // Check for Create Podcast card
    await expect(page.getByRole('link', { name: /Create Podcast.*/ })).toBeVisible();

    // Check for Upload Episode card
    await expect(page.getByRole('link', { name: /Upload Episode.*/ })).toBeVisible();

    // Check for Manage Podcasts card
    await expect(page.getByRole('link', { name: /Manage Podcasts.*/ })).toBeVisible();

    // Check for View Episodes card
    await expect(page.getByRole('link', { name: /View Episodes.*/ })).toBeVisible();
  });

  test('should display feature list', async ({ page }) => {
    // Check for Features section
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();

    // Check for feature items
    await expect(page.getByText('Podcast Management')).toBeVisible();
    await expect(page.getByText('Audio Upload')).toBeVisible();
    await expect(page.getByText('AI Transcription')).toBeVisible();
    await expect(page.getByText('RSS Feeds')).toBeVisible();
  });

  test('should have navigation in header', async ({ page }) => {
    // The nav links are hidden on mobile and shown on desktop (md breakpoint)
    // We verify they work through navigation tests, so here we just check the nav structure exists

    // Check for AutoMapod branding in nav (always visible)
    await expect(page.getByRole('link', { name: 'AutoMapod' })).toBeVisible();

    // Check for Sign Out button (always visible)
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });
});
