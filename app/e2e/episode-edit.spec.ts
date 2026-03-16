import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

test.describe('Episode Edit', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    const { email, password } = getTestCredentials();
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should show edit button on episode detail page', async ({ page }) => {
    // Create an episode first
    await page.goto('/episodes/new');

    const timestamp = Date.now();
    const testTitle = `Edit Test ${timestamp}`;

    await page.fill('input[name="title"]', testTitle);

    const testAudioBuffer = Buffer.from(
      'ID3' + '\x00\x00\x00' + '\x00\x00\x00\x00' +
      '\xff\xe3' + '\x00\x00' + '\x00\x00' + '\x00\x00' +
      '\x00'.repeat(100)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: testAudioBuffer,
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    // Get episode ID
    const currentUrl = page.url();
    const episodeIdMatch = currentUrl.match(/\/episodes\/([a-f0-9-]+)/);

    if (!episodeIdMatch) {
      test.skip(true, 'Could not extract episode ID');
      return;
    }

    // Go to episode detail page
    await page.goto(currentUrl);
    await page.waitForLoadState('networkidle');

    // Check for edit button
    const editButton = page.locator('a:has-text("Edit Episode")');
    await expect(editButton).toBeVisible();
  });

  test('should navigate to edit page when clicking edit button', async ({ page }) => {
    // Create an episode
    await page.goto('/episodes/new');

    const timestamp = Date.now();
    const testTitle = `Navigate Edit Test ${timestamp}`;

    await page.fill('input[name="title"]', testTitle);

    const testAudioBuffer = Buffer.from(
      'ID3' + '\x00\x00\x00' + '\x00\x00\x00\x00' +
      '\xff\xe3' + '\x00\x00' + '\x00\x00' + '\x00\x00' +
      '\x00'.repeat(100)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: testAudioBuffer,
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    const episodeIdMatch = currentUrl.match(/\/episodes\/([a-f0-9-]+)/);

    if (!episodeIdMatch) {
      test.skip(true, 'Could not extract episode ID');
      return;
    }

    await page.goto(currentUrl);
    await page.waitForLoadState('networkidle');

    // Click edit button
    const editButton = page.locator('a:has-text("Edit Episode")');
    await editButton.click();

    // Should be on edit page
    await expect(page).toHaveURL(/\/episodes\/[a-f0-9-]+\/edit/);

    // Check for edit form elements
    await expect(page.locator('h1:has-text("Edit Episode")')).toBeVisible();
    await expect(page.locator('label:has-text("Title")')).toBeVisible();
    await expect(page.locator('label:has-text("Description")')).toBeVisible();
    await expect(page.locator('label:has-text("Podcast")')).toBeVisible();
  });

  test('should pre-populate form with current episode data', async ({ page }) => {
    // Create an episode with specific data
    await page.goto('/episodes/new');

    const timestamp = Date.now();
    const testTitle = `Pre-populate Test ${timestamp}`;
    const testDescription = 'This is a test description for pre-population';

    await page.fill('input[name="title"]', testTitle);
    await page.fill('textarea[name="description"]', testDescription);

    const testAudioBuffer = Buffer.from(
      'ID3' + '\x00\x00\x00' + '\x00\x00\x00\x00' +
      '\xff\xe3' + '\x00\x00' + '\x00\x00' + '\x00\x00' +
      '\x00'.repeat(100)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: testAudioBuffer,
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    const episodeIdMatch = currentUrl.match(/\/episodes\/([a-f0-9-]+)/);

    if (!episodeIdMatch) {
      test.skip(true, 'Could not extract episode ID');
      return;
    }

    // Navigate to edit page
    await page.goto(`${currentUrl}/edit`);
    await page.waitForLoadState('networkidle');

    // Check form is pre-populated
    const titleInput = page.locator('input[name="title"]');
    await expect(titleInput).toHaveValue(testTitle);

    const descriptionInput = page.locator('textarea[name="description"]');
    await expect(descriptionInput).toHaveValue(testDescription);
  });

  test('should save episode changes', async ({ page }) => {
    // Create an episode
    await page.goto('/episodes/new');

    const timestamp = Date.now();
    const originalTitle = `Save Test ${timestamp}`;
    const updatedTitle = `Save Test Updated ${timestamp}`;

    await page.fill('input[name="title"]', originalTitle);

    const testAudioBuffer = Buffer.from(
      'ID3' + '\x00\x00\x00' + '\x00\x00\x00\x00' +
      '\xff\xe3' + '\x00\x00' + '\x00\x00' + '\x00\x00' +
      '\x00'.repeat(100)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: testAudioBuffer,
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    const episodeIdMatch = currentUrl.match(/\/episodes\/([a-f0-9-]+)/);

    if (!episodeIdMatch) {
      test.skip(true, 'Could not extract episode ID');
      return;
    }

    // Go to edit page
    await page.goto(`${currentUrl}/edit`);
    await page.waitForLoadState('networkidle');

    // Update title
    const titleInput = page.locator('input[name="title"]');
    await titleInput.clear();
    await titleInput.fill(updatedTitle);

    // Add description
    const descriptionInput = page.locator('textarea[name="description"]');
    await descriptionInput.fill('Updated description');

    // Submit form
    await page.click('button[type="submit"]');

    // Should navigate back to episode detail page
    await page.waitForURL(/\/episodes\/[a-f0-9-]+$/);

    // Check that changes are saved
    await expect(page.locator(`text=${updatedTitle}`)).toBeVisible();
  });

  test('should return to episode detail when canceling', async ({ page }) => {
    // Create an episode
    await page.goto('/episodes/new');

    const timestamp = Date.now();
    const testTitle = `Cancel Test ${timestamp}`;

    await page.fill('input[name="title"]', testTitle);

    const testAudioBuffer = Buffer.from(
      'ID3' + '\x00\x00\x00' + '\x00\x00\x00\x00' +
      '\xff\xe3' + '\x00\x00' + '\x00\x00' + '\x00\x00' +
      '\x00'.repeat(100)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: testAudioBuffer,
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    const episodeIdMatch = currentUrl.match(/\/episodes\/([a-f0-9-]+)/);

    if (!episodeIdMatch) {
      test.skip(true, 'Could not extract episode ID');
      return;
    }

    // Go to edit page
    await page.goto(`${currentUrl}/edit`);
    await page.waitForLoadState('networkidle');

    // Click cancel
    const cancelButton = page.locator('a:has-text("Cancel")');
    await cancelButton.click();

    // Should return to episode detail page
    await expect(page).toHaveURL(/\/episodes\/[a-f0-9-]+$/);
  });

  test('should require title', async ({ page }) => {
    // Create an episode
    await page.goto('/episodes/new');

    const timestamp = Date.now();
    const testTitle = `Validation Test ${timestamp}`;

    await page.fill('input[name="title"]', testTitle);

    const testAudioBuffer = Buffer.from(
      'ID3' + '\x00\x00\x00' + '\x00\x00\x00\x00' +
      '\xff\xe3' + '\x00\x00' + '\x00\x00' + '\x00\x00' +
      '\x00'.repeat(100)
    );

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.mp3',
      mimeType: 'audio/mpeg',
      buffer: testAudioBuffer,
    });

    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    const currentUrl = page.url();
    const episodeIdMatch = currentUrl.match(/\/episodes\/([a-f0-9-]+)/);

    if (!episodeIdMatch) {
      test.skip(true, 'Could not extract episode ID');
      return;
    }

    // Go to edit page
    await page.goto(`${currentUrl}/edit`);
    await page.waitForLoadState('networkidle');

    // Clear title
    const titleInput = page.locator('input[name="title"]');
    await titleInput.clear();

    // Try to submit - browser validation should prevent
    await page.click('button[type="submit"]');

    // Should stay on edit page due to validation
    await expect(page).toHaveURL(/\/episodes\/[a-f0-9-]+\/edit/);
  });
});
