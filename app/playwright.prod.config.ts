import { defineConfig, devices } from '@playwright/test';

/**
 * Production testing configuration
 * Tests run against https://www.automapod.app
 * No local dev server started
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
require('dotenv').config({ path: '.env.local' });

export default defineConfig({
  testDir: './e2e/prod', // Use separate prod test directory
  fullyParallel: false, // Run tests serially since they use authentication
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for prod tests - fail fast
  workers: 1, // Single worker to avoid auth conflicts
  reporter: 'list',
  use: {
    baseURL: 'https://www.automapod.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Don't start local dev server for production tests
  // webServer: undefined,
});
