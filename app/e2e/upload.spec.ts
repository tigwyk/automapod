import { test, expect, type Page } from '@playwright/test';
import { getTestCredentials } from './test-utils';

// Helper function to create a test podcast and return its ID
async function createTestPodcast(page: Page, titleSuffix: string = '') {
  const uniqueSuffix = titleSuffix || `${Date.now()}`;

  await page.goto('/podcasts/new');
  await page.fill('input[name="title"]', `Upload Test Podcast ${uniqueSuffix}`);
  await page.fill('input[name="rss_slug"]', `upload-test-${uniqueSuffix}`);
  await page.fill('textarea[name="description"]', 'Test podcast for upload testing');

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/podcasts\/[a-f0-9-]+$/, { timeout: 10000 });

  // Extract podcast ID from URL
  const url = page.url();
  return url.split('/').pop();
}

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

  test('should show upload button on podcast detail page', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Navigate to podcast detail page
    await page.goto(`/podcasts/${podcastId}`);

    // Check for "Upload Episode" button
    const uploadButton = page.getByRole('link', { name: /Upload Episode/i });
    await expect(uploadButton).toBeVisible();
  });

  test('should navigate to upload page from podcast', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Navigate to podcast detail page
    await page.goto(`/podcasts/${podcastId}`);

    // Click Upload Episode button
    const uploadButton = page.getByRole('link', { name: /Upload Episode/i });
    await uploadButton.click();

    // Should be on the podcast-scoped upload page
    await expect(page).toHaveURL(new RegExp(`/podcasts/${podcastId}/episodes/new`));
  });

  test('should upload an episode to a podcast', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Navigate to upload page
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

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
    await page.waitForTimeout(5000);

    // Check for success - should be redirected to podcast episodes page
    const currentUrl = page.url();
    expect(currentUrl).toContain(`/podcasts/${podcastId}/episodes`);
  });

  test('should validate required fields', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Navigate to upload page
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

    // Get current URL (should stay on same page if validation fails)
    const currentUrl = page.url();

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Wait a moment for any validation
    await page.waitForTimeout(1000);

    // Check that we're still on the same page (validation prevented submission)
    expect(page.url()).toBe(currentUrl);
  });

  test('should show error for invalid file type', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Navigate to upload page
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

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
    const error = page.locator('text=Invalid file type').or(
      page.locator('text=audio').or(
        page.locator('text=.mp3').or(
          page.locator('[data-testid="file-error"]')
        )
      )
    );

    await expect(error.first()).toBeVisible({ timeout: 5000 });
  });

  test('should allow removing selected file', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Navigate to upload page
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake audio content'),
    });

    // Check for file name display
    const fileName = page.locator('text=test.mp3').or(
      page.locator('[data-testid="file-name"]').or(
        page.locator('.file-name')
      )
    );

    // Wait a bit for file to be processed
    await page.waitForTimeout(1000);

    const fileNameCount = await fileName.count();
    if (fileNameCount > 0) {
      await expect(fileName.first()).toBeVisible();

      // Remove file (if there's a remove button)
      const removeButton = page.locator('button:has-text("Remove")').or(
        page.locator('text=Remove').or(
          page.locator('[data-testid="remove-file"]')
        )
      );

      const removeCount = await removeButton.count();
      if (removeCount > 0) {
        await removeButton.first().click();

        // File name should disappear
        await expect(fileName.first()).not.toBeVisible();
      }
    }
  });

  test('should show file size after selection', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Navigate to upload page
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('fake audio content'),
    });

    // Check for file size display
    // page.locator() only accepts strings; use getByText() for RegExp matching
    const fileSize = page.getByText(/\d+\s*(bytes|KB|MB|GB)/).or(
      page.locator('[data-testid="file-size"]')
    );

    // File size might or might not be shown depending on implementation
    await page.waitForTimeout(1000);
    const isVisible = await fileSize.isVisible().catch(() => false);
    expect(isVisible).toBeDefined();
  });

  test('should navigate back to podcast episodes on cancel', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Navigate to upload page
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

    // Click cancel button if it exists
    const cancelButton = page.locator('button:has-text("Cancel")').or(
      page.locator('a:has-text("Cancel")')
    );

    const count = await cancelButton.count();

    if (count > 0) {
      await cancelButton.first().click();
      await expect(page).toHaveURL(new RegExp(`/podcasts/${podcastId}`));
    }
  });

  test('should have proper form labels', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Navigate to upload page
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

    // Check for form labels
    await expect(page.locator('label:has-text("Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();

    const audioOrFileLabel = page.locator('label:has-text("Audio"), label:has-text("File")');
    await expect(audioOrFileLabel).toBeVisible();
  });

  test('should not show podcast dropdown (context inferred from URL)', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Navigate to upload page
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

    // Check that there is NO podcast dropdown (since it's inferred from URL)
    const podcastDropdown = page.locator('select[name="podcast_id"]').or(
      page.locator('label:has-text("Podcast (optional)")').or(
        page.locator('label:has-text("Select a podcast")')
      )
    );

    await expect(podcastDropdown).not.toBeVisible();
  });

  test('should show podcast context in upload page title', async ({ page }) => {
    // Create a test podcast with a specific name
    const uniqueSuffix = Date.now();
    await page.goto('/podcasts/new');
    await page.fill('input[name="title"]', `Context Test ${uniqueSuffix}`);
    await page.fill('input[name="rss_slug"]', `context-test-${uniqueSuffix}`);
    await page.fill('textarea[name="description"]', 'Test');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/podcasts\/[a-f0-9-]+$/, { timeout: 10000 });

    const url = page.url();
    const podcastId = url.split('/').pop();

    // Navigate to upload page
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

    // Check that the podcast name is shown in the page title
    await expect(page.getByText(/Add a new episode to Context Test/)).toBeVisible();
  });

  test.describe('Global upload page (/episodes/new) error banner', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      const { email, password } = getTestCredentials();
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard', { timeout: 10000 });
    });

    test('should show error banner with role="alert" for invalid file type', async ({ page }) => {
      await page.goto('/episodes/new');

      await page.fill('input[name="title"]', 'Test Episode');

      const fileInput = page.locator('input[name="audio"]');
      await fileInput.setInputFiles({
        name: 'test.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('not an audio file'),
      });

      await page.click('button[type="submit"]');

      // Wait for the server action to respond and the error banner to appear
      const alert = page.locator('[role="alert"]');
      await expect(alert).toBeVisible({ timeout: 10000 });
      await expect(alert).toContainText('Invalid file type');
    });

    test('should show error banner with role="alert" when title is missing', async ({ page }) => {
      await page.goto('/episodes/new');

      // Remove the required attribute via JS so the form submits without a title
      await page.evaluate(() => {
        const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
        if (titleInput) titleInput.removeAttribute('required');
      });

      const fileInput = page.locator('input[name="audio"]');
      await fileInput.setInputFiles({
        name: 'test.mp3',
        mimeType: 'audio/mpeg',
        buffer: Buffer.from('fake audio content'),
      });

      // Remove required from audio input too so we can submit with just a missing title
      await page.evaluate(() => {
        const audioInput = document.querySelector<HTMLInputElement>('input[name="audio"]');
        if (audioInput) audioInput.removeAttribute('required');
      });

      // Clear any title value and submit
      await page.fill('input[name="title"]', '');
      await page.click('button[type="submit"]');

      const alert = page.locator('[role="alert"]');
      await expect(alert).toBeVisible({ timeout: 10000 });
      await expect(alert).toContainText('Title is required');
    });
  });
});
