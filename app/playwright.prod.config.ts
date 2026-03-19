import { defineConfig, devices } from '@playwright/test';

/**
 * Production testing configuration
 * Tests run against https://www.automapod.app
 * No local dev server started
 */
require('dotenv').config({ path: '.env.local' });

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run tests serially since they use authentication
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid auth conflicts
  reporter: 'list',
  use: {
    baseURL: 'https://www.automapod.app',
    trace: 'on-first-retry',
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
