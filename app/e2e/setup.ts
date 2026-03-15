import { test as setup } from '@playwright/test';
import { getTestCredentials } from './test-utils';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Get test credentials (fails fast if missing)
  const { email, password } = getTestCredentials();

  // Fill in login form with test credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit login form
  await page.click('button[type="submit"]');

  // Wait for successful login - either dashboard or error page
  await page.waitForURL(/\/(dashboard|\?error)/, { timeout: 10000 });

  // If we're on an error page, the user doesn't exist - fail the setup
  if (page.url().includes('error')) {
    throw new Error('Test user does not exist. Please create test user in Supabase first.');
  }

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
