import { test, expect } from '@playwright/test';

// Helper to generate unique test data
const generateTestData = () => {
  const timestamp = Date.now();
  return {
    title: `test_podcast_${timestamp}`,
    description: `Test podcast description ${timestamp}`,
    rss_slug: `test-podcast-${timestamp}`,
    cover_image_url: 'https://example.com/cover.jpg',
  };
};

test.describe('Podcast Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in login form with test credentials
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should display podcasts page with empty state', async ({ page }) => {
    await page.goto('/podcasts');

    // Check heading
    await expect(page.locator('h1')).toContainText('Podcasts');

    // Check empty state message
    await expect(page.locator('text=No podcasts yet')).toBeVisible();
    await expect(page.locator('text=Get started by creating your first podcast')).toBeVisible();
  });

  test('should create a new podcast', async ({ page }) => {
    const testData = generateTestData();

    // Navigate to podcasts page
    await page.goto('/podcasts');

    // Click "Create Podcast" button
    await page.click('text=Create Podcast');

    // Wait for navigation to new podcast page
    await page.waitForURL('/podcasts/new');

    // Fill in podcast form
    await page.fill('input#title', testData.title);
    await page.fill('input#rss_slug', testData.rss_slug);
    await page.fill('textarea#description', testData.description);
    await page.fill('input#cover_image_url', testData.cover_image_url);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation back to podcasts page
    await page.waitForURL('/podcasts');

    // Verify podcast appears in list
    await expect(page.locator(`text=${testData.title}`)).toBeVisible();
  });

  test('should show validation errors for invalid podcast data', async ({ page }) => {
    // Navigate to new podcast page
    await page.goto('/podcasts/new');

    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // Check for error messages
    await expect(page.locator('text=Title is required')).toBeVisible();
    await expect(page.locator('text=RSS slug is required')).toBeVisible();
  });

  test('should auto-generate RSS slug from title', async ({ page }) => {
    const testData = generateTestData();

    // Navigate to new podcast page
    await page.goto('/podcasts/new');

    // Fill in title
    await page.fill('input#title', testData.title);

    // Check that RSS slug is auto-generated
    const slugValue = await page.inputValue('input#rss_slug');
    expect(slugValue).toBe(testData.rss_slug);
  });

  test('should validate RSS slug format', async ({ page }) => {
    // Navigate to new podcast page
    await page.goto('/podcasts/new');

    // Fill in title
    await page.fill('input#title', 'Test Podcast');

    // Enter invalid RSS slug (with uppercase and spaces)
    await page.fill('input#rss_slug', 'Invalid-Slug Here');

    // Try to submit
    await page.click('button[type="submit"]');

    // Check for validation error
    await expect(page.locator('text=RSS slug must contain only lowercase letters, numbers, and hyphens')).toBeVisible();
  });

  test('should view and edit podcast details', async ({ page }) => {
    const testData = generateTestData();
    const updatedTitle = `Updated ${testData.title}`;

    // First create a podcast
    await page.goto('/podcasts/new');
    await page.fill('input#title', testData.title);
    await page.fill('textarea#description', testData.description);
    await page.click('button[type="submit"]');
    await page.waitForURL('/podcasts');

    // Click on the podcast to view details
    await page.click(`text=${testData.title}`);

    // Wait for navigation to detail page
    await page.waitForURL(/\/podcasts\/[a-f0-9-]+/);

    // Verify current title
    await expect(page.locator('input#title')).toHaveValue(testData.title);

    // Update title
    await page.fill('input#title', updatedTitle);

    // Save changes
    await page.click('button[type="submit"]:text("Save Changes")');

    // Wait for navigation back to podcasts page
    await page.waitForURL('/podcasts');

    // Verify updated title appears
    await expect(page.locator(`text=${updatedTitle}`)).toBeVisible();
  });

  test('should prevent deleting podcast with episodes', async ({ page }) => {
    const testData = generateTestData();

    // Create a podcast
    await page.goto('/podcasts/new');
    await page.fill('input#title', testData.title);
    await page.click('button[type="submit"]');
    await page.waitForURL('/podcasts');

    // Click on the podcast to view details
    await page.click(`text=${testData.title}`);
    await page.waitForURL(/\/podcasts\/[a-f0-9-]+/);

    // Try to delete the podcast (will fail since we can't create episodes yet without R2)
    // This test will be updated after R2 integration
    await page.click('text=Delete Podcast');

    // Check for confirmation dialog
    await expect(page.locator('text=Are you sure you want to delete this podcast?')).toBeVisible();

    // Cancel deletion
    await page.keyboard.press('Escape');
  });

  test('should navigate from dashboard to podcasts', async ({ page }) => {
    // Start at dashboard
    await page.goto('/dashboard');

    // Click "Create Podcast" button
    await page.click('text=Create Podcast');

    // Should navigate to podcasts/new or podcasts (depending on implementation)
    await expect(page).toHaveURL(/\/podcasts/);
  });

  test('should cancel podcast creation', async ({ page }) => {
    // Navigate to new podcast page
    await page.goto('/podcasts/new');

    // Fill in some data
    await page.fill('input#title', 'Unsaved Podcast');

    // Click cancel
    await page.click('button:has-text("Cancel")');

    // Should return to podcasts page
    await page.waitForURL('/podcasts');
  });
});
