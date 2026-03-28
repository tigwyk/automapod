import { test, expect } from '@playwright/test';
import { getTestCredentials, getTestUserId, setTestUserSubscription, resetTestUserToFree } from './test-utils';

// ── helpers ───────────────────────────────────────────────────────────────────

async function login(page: import('@playwright/test').Page) {
  const { email, password } = getTestCredentials();
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

// ── Group 1 — Pricing page (no auth required) ─────────────────────────────────

test.describe('Pricing page', () => {
  test('renders all 3 tiers with correct pricing', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.getByRole('heading', { name: 'Simple, honest pricing' })).toBeVisible();
    await expect(page.locator('text=$0')).toBeVisible();
    await expect(page.locator('text=$19')).toBeVisible();
    await expect(page.locator('text=$49')).toBeVisible();
  });

  test('shows feature comparison table', async ({ page }) => {
    await page.goto('/pricing');

    // Table header
    await expect(page.locator('text=Feature comparison')).toBeVisible();

    // Key rows
    await expect(page.locator('table').locator('text=Podcasts')).toBeVisible();
    await expect(page.locator('table').locator('text=Storage')).toBeVisible();
    await expect(page.locator('table').locator('text=Transcription')).toBeVisible();
  });

  test('shows "Start free trial" CTAs for logged-in users', async ({ page }) => {
    await login(page);
    await page.goto('/pricing');

    // Logged-in users see trial CTAs on the Pro and Business cards
    const trialButtons = page.getByRole('button', { name: /start free trial/i });
    await expect(trialButtons.first()).toBeVisible();

    // "Sign up" links should not appear (those are for logged-out users)
    await expect(page.locator('a[href="/signup"]')).toHaveCount(0);
  });
});

// ── Group 2 — Billing settings page (free tier user) ─────────────────────────

test.describe('Billing settings page (free user)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test.afterEach(async () => {
    await resetTestUserToFree();
  });

  test('shows current plan as "Free"', async ({ page }) => {
    await page.goto('/settings/billing');

    // The billing page renders the tier label as a large bold span
    await expect(page.locator('span.text-2xl.font-bold', { hasText: 'Free' })).toBeVisible();
  });

  test('shows plan limits for free tier', async ({ page }) => {
    await page.goto('/settings/billing');

    // Plan limits section labels
    await expect(page.locator('dt', { hasText: 'Podcasts' })).toBeVisible();
    await expect(page.locator('dd', { hasText: 'Up to 1' })).toBeVisible();

    await expect(page.locator('dt', { hasText: 'Episodes' })).toBeVisible();
    await expect(page.locator('dd', { hasText: 'Up to 10' })).toBeVisible();

    await expect(page.locator('dt', { hasText: 'Storage' })).toBeVisible();
    await expect(page.locator('dd', { hasText: '500 MB' })).toBeVisible();
  });

  test('shows upgrade CTA and not manage-subscription button', async ({ page }) => {
    await page.goto('/settings/billing');

    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /manage subscription/i })).toHaveCount(0);
  });
});

// ── Group 3 — API contract tests ─────────────────────────────────────────────

test.describe('Billing API contracts', () => {
  test('checkout endpoint returns 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.post('/api/billing/checkout', {
      data: { tier: 'pro', interval: 'monthly' },
    });
    expect(response.status()).toBe(401);
  });

  test('portal endpoint returns 401 for unauthenticated requests', async ({ request }) => {
    const response = await request.post('/api/billing/portal');
    expect(response.status()).toBe(401);
  });

  test('portal endpoint returns 404 for free user with no stripe customer', async ({ page }) => {
    await login(page);

    const response = await page.request.post('/api/billing/portal');
    expect(response.status()).toBe(404);

    const body = await response.json() as { error: string };
    expect(body.error).toBeTruthy();
  });
});

// ── Group 4 — Tier enforcement ────────────────────────────────────────────────

test.describe('Tier enforcement', () => {
  test.afterEach(async () => {
    await resetTestUserToFree();
  });

  test('trial banner visible when subscription status is "trialing"', async ({ page }) => {
    // Set user to trialing with a trial end date 7 days from now
    const userId = await getTestUserId();
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await setTestUserSubscription(userId, {
      subscription_tier: 'pro',
      subscription_status: 'trialing',
      trial_ends_at: trialEndsAt,
    });

    await login(page);
    await page.goto('/dashboard');

    // Banner shows days remaining text
    await expect(page.locator('text=/days left in your free trial/')).toBeVisible();
  });
});
