# E2E Testing Guide - AutomaPod

## Overview

This guide explains how to run, write, and maintain E2E tests for AutomaPod using Playwright.

## Test Prerequisites

### Required Environment Variables

Create a `.env.local` file in the `app/` directory with:

```bash
# Test user credentials (must exist in database)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test-password-123

# Supabase credentials (for database access in tests)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPabase_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# R2 credentials (for upload tests)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=automapod-media

# Groq API (for transcription tests)
GROQ_API_KEY=your-groq-api-key
```

### Database Setup

1. **Create test user** in Supabase:
   ```sql
   insert into profiles (id, email, full_name)
   values (
     'test-user-uuid',
     'test@example.com',
     'Test User'
   );
   ```

2. **Run migrations** to ensure schema is up to date:
   ```bash
   cd app
   supabase db reset
   ```

## Running Tests

### Run All Tests
```bash
cd app
npm run test:e2e
```

### Run Specific Test File
```bash
cd app
npx playwright test rss.spec.ts
```

### Run with Debugging
```bash
cd app
npx playwright test --debug
```

### Run with UI
```bash
cd app
npx playwright test --ui
```

## Test Architecture

### Test Files

| File | Purpose | Test Count |
|------|---------|------------|
| `dashboard.spec.ts` | Dashboard navigation and UI | 4 tests |
| `podcasts.spec.ts` | Podcast CRUD operations | 10 tests |
| `episodes.spec.ts` | Episode listing and detail | 5 tests |
| `upload.spec.ts` | Episode upload and transcription | 8 tests |
| `rss.spec.ts` | RSS feed generation | 10 tests |
| `r2.spec.ts` | File type and size validation | 13 tests |

### Test Utilities

**`test-utils.ts`** provides:
- `getRequiredEnv(name)` - Get required environment variable
- `getTestCredentials()` - Get test user credentials

### Test Configuration

**`playwright.config.ts`** settings:
- **Serial execution**: `fullyParallel: false` (tests use authentication)
- **Single worker**: `workers: 1` (avoid auth conflicts)
- **Timeout**: 120 seconds for dev server startup
- **Retries**: 2 retries in CI, 0 locally
- **Trace**: On first retry
- **Screenshots**: On failure only

## Writing Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { getTestCredentials } from './test-utils';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/login');
    const { email, password } = getTestCredentials();
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: 10000 });
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Best Practices

#### 1. Avoid Hard-coded Timeouts

❌ **Bad:**
```typescript
await page.click('button[type="submit"]');
await page.waitForTimeout(5000); // Wastes time, flaky
```

✅ **Good:**
```typescript
await page.click('button[type="submit"]');
await page.waitForURL('/episodes', { timeout: 10000 });
// OR
await page.waitForSelector('text=Success');
// OR
await page.waitForLoadState('networkidle');
```

#### 2. Use Specific Selectors

❌ **Bad:**
```typescript
await page.click('text=Submit'); // Brittle, breaks if text changes
```

✅ **Good:**
```typescript
await page.click('[data-testid="submit-button"]'); // Stable
// OR
await page.click('button[type="submit"]'); // OK if unique
```

#### 3. Verify Actions Completed

❌ **Bad:**
```typescript
await page.click('button[type="submit"]');
const currentUrl = page.url(); // Might check too early
```

✅ **Good:**
```typescript
await page.click('button[type="submit"]');
await page.waitForURL('/podcasts', { timeout: 10000 });
const currentUrl = page.url();
expect(currentUrl).toContain('/podcasts');
```

#### 4. Use Unique Test Data

❌ **Bad:**
```typescript
const testName = 'Test Podcast'; // Conflicts between test runs
```

✅ **Good:**
```typescript
const timestamp = Date.now();
const testName = `Test Podcast ${timestamp}`; // Unique every time
```

#### 5. Check Error Conditions

❌ **Bad:**
```typescript
await page.click('button[type="submit"]');
// Assumes it worked
```

✅ **Good:**
```typescript
await page.click('button[type="submit"]');

// Check for either success or error
const success = page.locator('text=Success').or(page.locator('text=Error'));
await expect(success.first()).toBeVisible();
```

## Test Data Isolation

### Unique Identifiers

All test data should use unique identifiers to avoid conflicts:

```typescript
const timestamp = Date.now();
const testPodcastSlug = `test-podcast-${timestamp}`;
const testPodcastTitle = `Test Podcast ${timestamp}`;
```

### Cleanup (TODO)

Currently, tests don't clean up created data. Future improvements:

```typescript
test.afterEach(async ({ page }) => {
  // Delete test podcasts
  // Delete test episodes
  // Reset test user state
});
```

## Common Patterns

### Form Submission

```typescript
// Fill form
await page.fill('input#title', 'Test Title');
await page.fill('textarea#description', 'Test Description');

// Submit
await page.click('button[type="submit"]');

// Wait for result
await page.waitForURL(
  (url) => url.pathname === '/success' || url.pathname === '/form',
  { timeout: 10000 }
);

// Verify success
expect(page.url()).toContain('/success');
```

### File Upload

```typescript
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles({
  name: 'test.mp3',
  mimeType: 'audio/mpeg',
  buffer: Buffer.from('fake audio content'),
});

// Verify file selected
const inputValue = await fileInput.inputValue();
expect(inputValue).toBeTruthy();
```

### Navigation

```typescript
// Click link
await page.click('text=Go to Page');

// Wait for navigation
await page.waitForURL('/page', { timeout: 10000 });

// Verify URL
await expect(page).toHaveURL('/page');
```

### API Requests

```typescript
const response = await request.get('/api/endpoint');
expect(response.status()).toBe(200);

const text = await response.text();
expect(text).toContain('expected content');
```

## Test Timing

### Expected Test Durations

| Test | Duration | Reason |
|------|----------|--------|
| Dashboard tests | ~5 seconds | Simple navigation |
| Podcast creation | ~8 seconds | Form submission + navigation |
| RSS tests | ~10 seconds | Podcast creation + API call |
| Upload tests | ~15 seconds | File upload + transcription |
| R2 tests | ~5 seconds | Form validation only |

**Total suite duration**: ~2-3 minutes (local), ~5-7 minutes (with retries)

### Slow Tests

Tests taking > 10 seconds should be investigated:

1. **Check for hard-coded timeouts** - replace with proper waits
2. **Check for unnecessary waits** - remove if not needed
3. **Check for slow operations** - consider mocking or optimizing

## Debugging Tests

### View Test Details

```bash
npx playwright test --reporter=html
```

Then open `playwright-report/index.html`

### Debug Specific Test

```bash
npx playwright test --debug "should create podcast"
```

### Step Through Test

```bash
npx playwright test --ui
```

### View Trace

On failure, traces are saved to `test-results/`. View with:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

## Troubleshooting

### Test Fails Intermittently

**Cause**: Race condition or timing issue

**Fix**:
- Replace `waitForTimeout()` with proper wait
- Use `waitForSelector()` or `waitForURL()`
- Increase timeout if operation is legitimately slow

### Test Fails Consistently

**Cause**: Application bug or test assumption

**Fix**:
1. Run test with `--debug` to see what's happening
2. Check application logs for errors
3. Verify test assumptions are still valid
4. Check if environment variables are set

### "Test user not found" Error

**Cause**: Test user doesn't exist in database

**Fix**:
```sql
insert into profiles (id, email, full_name)
values ('test-user-uuid', 'test@example.com', 'Test User');
```

### "Timeout waiting for navigation" Error

**Cause**: Navigation didn't complete or went to unexpected URL

**Fix**:
1. Check if form validation failed
2. Check if there's an error message
3. Use more flexible URL matcher:
   ```typescript
   await page.waitForURL(
     (url) => url.pathname.includes('/expected'),
     { timeout: 15000 }
   );
   ```

## CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Manual trigger from GitHub Actions

### CI Test Configuration

- **Headless mode**: Always
- **Retries**: 2
- **Parallel**: No (serial execution)
- **Timeout**: 120 seconds per test

## Future Improvements

### Short Term
- [ ] Add database cleanup in `afterEach`
- [ ] Replace all hard-coded timeouts
- [ ] Add `data-testid` attributes to critical elements
- [ ] Add test timing metrics

### Medium Term
- [ ] Add visual regression testing
- [ ] Add API performance testing
- [ ] Add test data factories
- [ ] Add test result history tracking

### Long Term
- [ ] Add load testing
- [ ] Add cross-browser testing (Firefox, Safari)
- [ ] Add mobile device testing
- [ ] Add accessibility testing

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [AutomaPod CLAUDE.md](../CLAUDE.md)
- [Testing Playwright Reference](~/.claude/docs/testing-playwright.md)

## Questions?

Refer to:
- `test-utils.ts` for helper functions
- `playwright.config.ts` for test configuration
- `.env.example` for environment variable reference
