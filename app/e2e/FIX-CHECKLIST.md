# Test Flakiness Fix Checklist - AMP-002

Quick reference for applying fixes to each test file.

## File: `app/e2e/rss.spec.ts`

### Status: ⚠️ PARTIALLY FIXED

### Fixed ✅
- Line 19: Replaced `waitForTimeout(5000)` with `waitForURL()`
- Added documentation header
- Added error handling to `createTestPodcast()`
- Removed early returns from several tests

### Still Needed ❌
- [ ] Complete removal of all early returns (lines 60-62, 78-81, etc.)
- [ ] Add database verification to `createTestPodcast()`
- [ ] Add test cleanup in `afterEach`

### Fix Template

**Replace hard-coded timeout**:
```typescript
// ❌ Before
await page.click('button[type="submit"]');
await page.waitForTimeout(5000);
return { slug: testPodcastSlug, title: testPodcastTitle, success: !page.url().includes('/podcasts/new') };

// ✅ After
await page.click('button[type="submit"]');
await page.waitForURL(
  (url: URL) => url.pathname === '/podcasts' || url.pathname === '/podcasts/new',
  { timeout: 10000 }
);
const currentUrl = page.url();
const success = !currentUrl.includes('/podcasts/new');
if (!success) {
  throw new Error('Failed to create test podcast');
}
await page.waitForLoadState('networkidle');
return { slug: testPodcastSlug, title: testPodcastTitle, success: true };
```

**Remove early return**:
```typescript
// ❌ Before
if (response.status() !== 200) {
  expect(response.status()).toBe(404);
  return;
}
// RSS testing here...

// ✅ After
expect(response.status()).toBe(200); // Will fail if podcast creation didn't work
// RSS testing here...
```

---

## File: `app/e2e/upload.spec.ts`

### Status: ❌ NOT FIXED

### Fixes Needed

1. **Line 44**: Replace hard-coded timeout
```typescript
// ❌ Before
await page.click('button[type="submit"]');
await page.waitForTimeout(5000);
const currentUrl = page.url();
expect(currentUrl).toMatch(/\/episodes/);

// ✅ After
await page.click('button[type="submit"]');
await page.waitForURL(/\/episodes/, { timeout: 15000 });
```

2. **Line 61**: Remove unnecessary timeout
```typescript
// ❌ Before
await page.click('button[type="submit"]');
await page.waitForTimeout(1000);
expect(page.url()).toBe(currentUrl);

// ✅ After
await page.click('button[type="submit"]');
expect(page.url()).toBe(currentUrl); // HTML5 validation is instant
```

3. **Line 116**: Replace with proper wait
```typescript
// ❌ Before
await fileInput.setInputFiles({...});
await page.waitForTimeout(1000);
const inputValue = await fileInput.inputValue();

// ✅ After
await fileInput.setInputFiles({...});
await expect(async () => {
  const inputValue = await fileInput.inputValue();
  expect(inputValue).toBeTruthy();
}).toPass({ timeout: 5000 });
```

---

## File: `app/e2e/podcasts.spec.ts`

### Status: ❌ NOT FIXED

### Fixes Needed

1. **Lines 95, 139, 241, 286**: Remove unnecessary timeouts
```typescript
// ❌ Before
await page.click('button[type="submit"]');
await page.waitForTimeout(1000);
expect(page.url()).toBe(currentUrl);

// ✅ After
await page.click('button[type="submit"]');
expect(page.url()).toBe(currentUrl); // HTML5 validation is instant
```

2. **Lines 160, 211**: Replace with database verification
```typescript
// ❌ Before
await page.click('button[type="submit"]');
await page.waitForTimeout(3000);
const currentUrl = page.url();
if (currentUrl.includes('/podcasts/new')) {
  expect(true).toBe(true);
  return;
}

// ✅ After
await page.click('button[type="submit"]');
await page.waitForURL(
  (url) => url.pathname === '/podcasts' || url.pathname === '/podcasts/new',
  { timeout: 10000 }
);

// Verify podcast was actually created in database
const slug = rss_slug || `test-podcast-${timestamp}`;
const { data } = await supabase
  .from('podcasts')
  .select('id')
  .eq('rss_slug', slug)
  .single();

if (!data) {
  throw new Error(`Podcast creation failed: ${slug} not found in database`);
}
```

3. **Line 191**: Replace with proper wait
```typescript
// ❌ Before
await saveButton.click();
await page.waitForTimeout(2000);
const finalUrl = page.url();

// ✅ After
await saveButton.click();
await page.waitForURL(
  (url) => url.pathname.match(/\/podcasts\/[a-f0-9-]+/) || url.pathname === '/podcasts',
  { timeout: 10000 }
);
const finalUrl = page.url();
```

4. **Lines 109-119**: Fix race condition
```typescript
// ❌ Before
await page.fill('input#title', testData.title);
const slugValue = await page.inputValue('input#rss_slug');
expect(slugValue === expectedHyphens || slugValue === expectedUnderscores).toBe(true);

// ✅ After
await page.fill('input#title', testData.title);

// Wait for auto-generation to complete
await expect(async () => {
  const slugValue = await page.inputValue('input#rss_slug');
  expect(slugValue).not.toBe('');
}).toPass({ timeout: 5000 });

const slugValue = await page.inputValue('input#rss_slug');
expect(slugValue === expectedHyphens || slugValue === expectedUnderscores).toBe(true);
```

---

## File: `app/e2e/r2.spec.ts`

### Status: ❌ NOT FIXED

### Fixes Needed

1. **Lines 121, 140**: Replace with proper wait
```typescript
// ❌ Before
await fileInput.setInputFiles({...});
await page.waitForTimeout(500);
const inputValue = await fileInput.inputValue();
expect(inputValue).toBeTruthy();

// ✅ After
await fileInput.setInputFiles({...});
await expect(async () => {
  const inputValue = await fileInput.inputValue();
  expect(inputValue).toContain('test.mp3');
}).toPass({ timeout: 5000 });
```

2. **Line 273**: Replace with URL wait
```typescript
// ❌ Before
await cancelButton.first().click();
await page.waitForTimeout(1000);
expect(page.url()).not.toBe(currentUrl);

// ✅ After
const originalUrl = page.url();
await cancelButton.first().click();
await page.waitForURL(
  (url) => url.href !== originalUrl,
  { timeout: 5000 }
);
```

---

## File: `app/e2e/test-utils.ts`

### Status: ❌ NEEDS ADDITIONS

### Additions Needed

Add database verification helper:

```typescript
/**
 * Verifies a podcast exists in the database
 */
export async function verifyPodcastExists(slug: string): Promise<boolean> {
  // Import Supabase client
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from('podcasts')
    .select('id')
    .eq('rss_slug', slug)
    .single();

  if (error) {
    throw new Error(`Database query failed: ${error.message}`);
  }

  return !!data;
}

/**
 * Deletes a test podcast from the database
 */
export async function deleteTestPodcast(slug: string): Promise<void> {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase
    .from('podcasts')
    .delete()
    .eq('rss_slug', slug);

  if (error) {
    throw new Error(`Failed to delete test podcast: ${error.message}`);
  }
}
```

---

## Verification Commands

### Check for remaining timeouts
```bash
cd app/e2e
grep -n "waitForTimeout" *.spec.ts
```

### Check for early returns
```bash
cd app/e2e
grep -B2 "return;" rss.spec.ts | grep "if (response.status"
```

### Run tests multiple times
```bash
cd app
for i in {1..5}; do echo "Run $i:"; npm run test:e2e; done
```

### Check test timing
```bash
cd app
npm run test:e2e -- --reporter=html
# Then open playwright-report/index.html
```

---

## Priority Order

1. **P0 - Do First**:
   - Fix all `waitForTimeout` instances (17 total)
   - Remove early returns from RSS tests (8 instances)

2. **P1 - Do Second**:
   - Add database verification helpers
   - Fix race conditions in podcasts.spec.ts

3. **P2 - Do Last**:
   - Add test cleanup
   - Add timing metrics
   - Add data-testid attributes

---

## Expected Results After Fixes

### Before
- ✗ 17 hard-coded timeouts
- ✗ 8 early returns
- ✗ No database verification
- ✗ Race conditions
- ✗ ~27 seconds wasted per run

### After
- ✓ 0 hard-coded timeouts
- ✓ 0 early returns
- ✓ Database verification on all data creation
- ✓ No race conditions
- ✓ 0 seconds wasted
- ✓ 33% faster test suite
