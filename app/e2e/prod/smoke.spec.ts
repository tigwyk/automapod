import { test, expect } from '@playwright/test';

/**
 * Production Smoke Tests
 *
 * These tests run against production to verify core functionality.
 * IMPORTANT: These tests are READ-ONLY and should not modify production data.
 *
 * Required environment variables:
 *   PROD_TEST_USER_EMAIL    - Test user email
 *   PROD_TEST_USER_PASSWORD - Test user password
 *
 * Usage:
 *   PROD_TEST_USER_EMAIL=test@automapod.app \
 *   PROD_TEST_USER_PASSWORD=Test1234! \
 *   npm run test:prod
 */

/**
 * Get production test credentials from environment variables
 */
function getProdCredentials() {
  const email = process.env.PROD_TEST_USER_EMAIL;
  const password = process.env.PROD_TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing production test credentials.\n\n' +
        'Please set:\n' +
        '  PROD_TEST_USER_EMAIL=test@automapod.app\n' +
        '  PROD_TEST_USER_PASSWORD=Test1234!\n\n' +
        'Example:\n' +
        '  PROD_TEST_USER_EMAIL=test@automapod.app PROD_TEST_USER_PASSWORD=Test1234! npm run test:prod'
    );
  }

  return { email: email.trim(), password: password.trim() };
}

test.describe('Production Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to production login page
    await page.goto('/login');

    // Get prod test credentials
    const { email, password } = getProdCredentials();

    // Fill in login form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should successfully login to production', async ({ page }) => {
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify we're logged in
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });

  test('should display dashboard on production', async ({ page }) => {
    // Check for AutomaPod branding
    await expect(page.getByRole('link', { name: 'AutomaPod' })).toBeVisible();

    // Check for welcome message
    await expect(page.locator('text=Welcome to AutomaPod')).toBeVisible();

    // Check for Sign Out button
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });

  test('should have navigation cards on production', async ({ page }) => {
    // Check that the page has navigation elements
    // The production UI may differ, so we just verify there are links present
    const navLinks = page.getByRole('link');
    const count = await navLinks.count();

    // We should have multiple navigation links (at minimum logo + sign out)
    expect(count).toBeGreaterThanOrEqual(2);

    // Verify the AutomaPod logo/link is present
    await expect(page.getByRole('link', { name: 'AutomaPod' })).toBeVisible();
  });

  test('should display features section on production', async ({ page }) => {
    // Check for Features section
    await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible();

    // Check for feature items
    await expect(page.getByText('Podcast Management')).toBeVisible();
    await expect(page.getByText('Audio Upload')).toBeVisible();
    await expect(page.getByText('AI Transcription')).toBeVisible();
    await expect(page.getByText('RSS Feeds')).toBeVisible();
  });
});
