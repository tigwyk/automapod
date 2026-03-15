/**
 * Test utilities for E2E tests
 */

/**
 * Gets a required environment variable or throws an error.
 * This ensures tests fail fast if credentials are missing.
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${name}\n\n` +
        `Please set ${name} in your .env.local file.\n` +
        `See .env.example for all required variables.`
    );
  }

  return value.trim();
}

/**
 * Test credentials - validated at runtime
 */
export function getTestCredentials() {
  return {
    email: getRequiredEnv('TEST_USER_EMAIL'),
    password: getRequiredEnv('TEST_USER_PASSWORD'),
  };
}
