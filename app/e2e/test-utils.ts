/**
 * Test utilities for E2E tests
 */

import { createClient } from '@supabase/supabase-js';
import type { SubscriptionTier, SubscriptionStatus } from '../src/lib/subscription';

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

// snake_case keys mirror the profiles table columns; types come from src/lib/subscription
type SubscriptionPatch = Partial<{
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}>;

const FREE_SUBSCRIPTION: SubscriptionPatch = {
  subscription_tier: 'free',
  subscription_status: 'active',
  trial_ends_at: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
};

function getServiceRoleClient() {
  return createClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  );
}

/**
 * Returns the Supabase user ID for the configured test user.
 * Requires SUPABASE_SERVICE_ROLE_KEY to be set.
 */
export async function getTestUserId(): Promise<string> {
  const supabase = getServiceRoleClient();
  const testEmail = getRequiredEnv('TEST_USER_EMAIL');
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error(`Failed to list users: ${error.message}`);
  const user = data.users.find((u) => u.email === testEmail);
  if (!user) throw new Error(`Test user ${testEmail} not found in Supabase auth`);
  return user.id;
}

/**
 * Directly patches the profiles row for the given user via service role.
 * Use in afterEach to reset subscription state between tests.
 */
export async function setTestUserSubscription(
  userId: string,
  patch: SubscriptionPatch
): Promise<void> {
  const supabase = getServiceRoleClient();
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...patch });
  if (error) throw new Error(`Failed to update subscription: ${error.message}`);
}

/**
 * Resets the test user to a clean free-tier state.
 * Call in afterEach for any test that mutates subscription data.
 */
export async function resetTestUserToFree(): Promise<void> {
  const userId = await getTestUserId();
  await setTestUserSubscription(userId, FREE_SUBSCRIPTION);
}

