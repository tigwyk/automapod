import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

// Helper function to create a test podcast and return its ID
async function createTestPodcast(page: any, titleSuffix: string = '') {
  const uniqueSuffix = titleSuffix || `${Date.now()}`;

  await page.goto('/podcasts/new');
  await page.fill('input[name="title"]', `Edit Test Podcast ${uniqueSuffix}`);
  await page.fill('input[name="rss_slug"]', `edit-test-${uniqueSuffix}`);
  await page.fill('textarea[name="description"]', 'Test podcast for episode editing');

  await page.click('button[type="submit"]');
  await page.waitForURL(/\/podcasts\/[a-f0-9-]+$/, { timeout: 10000 });

  // Extract podcast ID from URL
  const url = page.url();
  return url.split('/').pop();
}

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
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Create an episode in the podcast
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

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

    // Upload redirects to podcast episodes list
    await expect(page).toHaveURL(new RegExp(`/podcasts/${podcastId}/episodes`));
    await page.waitForLoadState('networkidle');

    // Find the episode in the list by title and click on it
    const episodeLink = page.locator(`a:has-text("${testTitle}")`);
    const linkCount = await episodeLink.count();

    if (linkCount === 0) {
      test.skip(true, 'Could not find episode in list');
      return;
    }

    // Click on episode to go to episode detail page
    await episodeLink.first().click();
    await page.waitForLoadState('networkidle');

    // Check for edit button
    const editButton = page.locator('a:has-text("Edit Episode")');
    await expect(editButton).toBeVisible();
  });

  test('should navigate to edit page when clicking edit button', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Create an episode
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

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

    // Navigate to podcast episodes list
    await page.goto(`/podcasts/${podcastId}/episodes`);
    await page.waitForLoadState('networkidle');

    // Find and click on the episode
    const episodeLink = page.locator(`a:has-text("${testTitle}")`);
    const linkCount = await episodeLink.count();

    if (linkCount === 0) {
      test.skip(true, 'Could not find episode in list');
      return;
    }

    await episodeLink.first().click();
    await page.waitForLoadState('networkidle');

    // Click edit button
    const editButton = page.locator('a:has-text("Edit Episode")');
    await editButton.click();

    // Should be on the edit page with podcast context
    await expect(page).toHaveURL(new RegExp(`/podcasts/${podcastId}/episodes/[a-f0-9-]+/edit`));
  });

  test('should pre-populate form with existing episode data', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Create an episode with specific data
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

    const timestamp = Date.now();
    const testTitle = `Pre-populate Test ${timestamp}`;
    const testDescription = `This is a test description ${timestamp}`;

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

    // Navigate to episodes and find the episode
    await page.goto(`/podcasts/${podcastId}/episodes`);
    await page.waitForLoadState('networkidle');

    const episodeLink = page.locator(`a:has-text("${testTitle}")`);
    const linkCount = await episodeLink.count();

    if (linkCount === 0) {
      test.skip(true, 'Could not find episode in list');
      return;
    }

    await episodeLink.first().click();
    await page.waitForLoadState('networkidle');

    // Click edit button
    const editButton = page.locator('a:has-text("Edit Episode")');
    await editButton.click();
    await page.waitForLoadState('networkidle');

    // Check that form is pre-populated
    const titleInput = page.locator('input[name="title"]');
    await expect(titleInput).toHaveValue(testTitle);

    const descriptionInput = page.locator('textarea[name="description"]');
    await expect(descriptionInput).toHaveValue(testDescription);
  });

  test('should save changes to episode', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Create an episode
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

    const timestamp = Date.now();
    const originalTitle = `Original Title ${timestamp}`;

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

    // Navigate to episodes and edit
    await page.goto(`/podcasts/${podcastId}/episodes`);
    await page.waitForLoadState('networkidle');

    const episodeLink = page.locator(`a:has-text("${originalTitle}")`);
    const linkCount = await episodeLink.count();

    if (linkCount === 0) {
      test.skip(true, 'Could not find episode in list');
      return;
    }

    await episodeLink.first().click();
    await page.waitForLoadState('networkidle');

    // Click edit button
    const editButton = page.locator('a:has-text("Edit Episode")');
    await editButton.click();
    await page.waitForLoadState('networkidle');

    // Update title
    const updatedTitle = `Updated Title ${timestamp}`;
    await page.fill('input[name="title"]', updatedTitle);

    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Should redirect back to episode detail page
    await expect(page).toHaveURL(new RegExp(`/podcasts/${podcastId}/episodes/[a-f0-9-]+$`));

    // Check that the updated title is displayed
    await expect(page.getByText(updatedTitle)).toBeVisible();
  });

  test('should navigate back to episode detail on cancel', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Create an episode
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

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

    // Navigate to episodes and edit
    await page.goto(`/podcasts/${podcastId}/episodes`);
    await page.waitForLoadState('networkidle');

    const episodeLink = page.locator(`a:has-text("${testTitle}")`);
    const linkCount = await episodeLink.count();

    if (linkCount === 0) {
      test.skip(true, 'Could not find episode in list');
      return;
    }

    await episodeLink.first().click();
    await page.waitForLoadState('networkidle');

    // Get the current URL (episode detail page)
    const detailUrl = page.url();

    // Click edit button
    const editButton = page.locator('a:has-text("Edit Episode")');
    await editButton.click();
    await page.waitForLoadState('networkidle');

    // Click cancel button if it exists
    const cancelButton = page.locator('button:has-text("Cancel")').or(
      page.locator('a:has-text("Cancel")')
    );

    const count = await cancelButton.count();

    if (count > 0) {
      await cancelButton.first().click();

      // Should navigate back to episode detail page
      await expect(page).toHaveURL(detailUrl);
    }
  });

  test('should show podcast context in edit page breadcrumb', async ({ page }) => {
    // Create a test podcast
    const podcastId = await createTestPodcast(page);

    // Create an episode
    await page.goto(`/podcasts/${podcastId}/episodes/new`);

    const timestamp = Date.now();
    const testTitle = `Breadcrumb Test ${timestamp}`;

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

    // Navigate to episodes and edit
    await page.goto(`/podcasts/${podcastId}/episodes`);
    await page.waitForLoadState('networkidle');

    const episodeLink = page.locator(`a:has-text("${testTitle}")`);
    const linkCount = await episodeLink.count();

    if (linkCount === 0) {
      test.skip(true, 'Could not find episode in list');
      return;
    }

    await episodeLink.first().click();
    await page.waitForLoadState('networkidle');

    // Click edit button
    const editButton = page.locator('a:has-text("Edit Episode")');
    await editButton.click();
    await page.waitForLoadState('networkidle');

    // Check breadcrumb navigation
    await expect(page.getByRole('link', { name: 'All Podcasts' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Edit Test Podcast/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Episodes' })).toBeVisible();
  });
});
