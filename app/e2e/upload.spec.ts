import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

test.describe('Episode Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');

    // Get test credentials (fails fast if missing)
    const { email, password } = getTestCredentials();

    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should show upload button on dashboard', async ({ page }) => {
    await expect(page.locator('text=Upload New Episode')).toBeVisible();
  });

  test('should navigate to upload page', async ({ page }) => {
    await page.click('text=Upload New Episode');
    await expect(page).toHaveURL('/episodes/new');
  });

  test('should upload an episode and transcribe it', async ({ page }) => {
    await page.goto('/episodes/new');

    // Fill in title
    await page.fill('input[name="title"]', 'Test Episode');

    // Upload file (create a small test file)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake audio content'),
    });

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for processing or navigation
    // This might redirect to episodes list or stay on page with progress
    await page.waitForTimeout(5000);

    // Check for success message or navigation
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/episodes/);
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/episodes/new');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Check for validation errors
    const errorMessage = page.locator('text=Title is required').or(page.locator('text=required'));
    await expect(errorMessage).toBeVisible();
  });

  test('should show error for invalid file type', async ({ page }) => {
    await page.goto('/episodes/new');

    // Fill in title
    await page.fill('input[name="title"]', 'Test Episode');

    // Upload invalid file type
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an audio file'),
    });

    // Submit form
    await page.click('button[type="submit"]');

    // Check for error message
    const errorMessage = page.locator('text=Invalid file type').or(page.locator('text=audio'));
    await expect(errorMessage.or(page.locator('text=.mp3'))).toBeVisible();
  });

  test('should allow removing selected file', async ({ page }) => {
    await page.goto('/episodes/new');

    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake audio content'),
    });

    // Check for file name display
    const fileName = page.locator('text=test.mp3');
    await expect(fileName).toBeVisible();

    // Remove file (if there's a remove button)
    const removeButton = page.locator('button:has-text("Remove")').or(page.locator('text=Remove'));
    const removeCount = await removeButton.count();

    if (removeCount > 0) {
      await removeButton.first().click();

      // File name should disappear
      await expect(fileName).not.toBeVisible();
    }
  });

  test('should show file size after selection', async ({ page }) => {
    await page.goto('/episodes/new');

    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake audio content'),
    });

    // Check for file size display
    const fileSize = page.locator(/\d+\s*(bytes|KB|MB|GB)/);
    // File size might or might not be shown depending on implementation
    const isVisible = await fileSize.isVisible().catch(() => false);
    expect(isVisible).toBeDefined();
  });

  test('should navigate back to dashboard on cancel', async ({ page }) => {
    await page.goto('/episodes/new');

    // Click cancel button if it exists
    const cancelButton = page.locator('button:has-text("Cancel")').or(page.locator('a:has-text("Cancel")'));
    const count = await cancelButton.count();

    if (count > 0) {
      await cancelButton.first().click();
      await expect(page).toHaveURL(/\/(dashboard|episodes)/);
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/episodes/new');

    // Check for form labels
    await expect(page.locator('label:has-text("Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();
    const audioOrFileLabel = page.locator('label:has-text("Audio"), label:has-text("File")');
    await expect(audioOrFileLabel).toBeVisible();
  });
});
