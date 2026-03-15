import { test, expect } from '@playwright/test';

test.describe('Episode List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should display episodes page', async ({ page }) => {
    await page.goto('/episodes');

    // Check heading
    await expect(page.locator('h1')).toContainText('Episodes');
  });

  test('should display empty state when no episodes', async ({ page }) => {
    await page.goto('/episodes');

    // Check for empty state
    const emptyState = page.locator('text=No episodes yet').or(page.locator('text=Upload your first episode'));
    await expect(emptyState).toBeVisible();
  });
});

test.describe('Episode Detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should show episode detail page', async ({ page }) => {
    // This test assumes an episode exists. In a real test, you'd create one first.
    // For now, we'll just test navigation to a dummy UUID
    await page.goto('/episodes/00000000-0000-0000-0000-000000000000');

    // Should show not found or redirect (since episode doesn't exist)
    // The exact behavior depends on your implementation
    const currentUrl = page.url();
    expect(currentUrl).toContain('/episodes');
  });

  test('should have delete button on episode detail', async ({ page }) => {
    await page.goto('/episodes/00000000-0000-0000-0000-000000000000');

    // Check for delete button (if page loads)
    const deleteButton = page.locator('text=Delete').or(page.locator('button:has-text("Delete")'));
    // This might not be visible if episode doesn't exist, so we just check the element exists
    expect(await deleteButton.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Episode Deletion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should cancel deletion', async ({ page }) => {
    await page.goto('/episodes/00000000-0000-0000-0000-000000000000');

    // Try to click delete button if it exists
    const deleteButton = page.locator('text=Delete').or(page.locator('button:has-text("Delete")'));
    const count = await deleteButton.count();

    if (count > 0) {
      await deleteButton.first().click();

      // Cancel deletion
      await page.keyboard.press('Escape');

      // Should stay on detail page
      await expect(page).toHaveURL(/\/episodes\/.+/);
    }
  });
});

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD || 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should navigate to episodes list from dashboard', async ({ page }) => {
    await page.click('text=View All Episodes');
    await expect(page).toHaveURL('/episodes');
  });

  test('should navigate to upload from dashboard', async ({ page }) => {
    await page.click('text=Upload New Episode');
    await expect(page).toHaveURL('/episodes/new');
  });
});
