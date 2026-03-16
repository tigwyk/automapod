# [AMP-001] Fix Test Failures

**Type**: bugfix
**Priority**: P1
**Status**: ✅ Complete

## Description

Fix 22 failing E2E tests out of 55 total tests. Current pass rate is 60% (33/55).

## Test Failure Breakdown

### 1. RSS Tests (8 failing)
**Issue**: Tests expect `rss_slug: 'test-podcast'` to exist in database
**Error**: `{"error":"Podcast not found"}`

**Failing tests:**
- should generate RSS feed for podcast
- should return XML content type
- should set proper caching headers
- should include podcast metadata in RSS feed
- should include iTunes namespace tags
- should include episodes in RSS feed
- should handle podcast with no episodes
- should escape special characters in XML

**Root Cause**: No test data setup creates the expected podcast

**Approach**:
- Add test data setup in `beforeAll` hook
- Create test podcast with `rss_slug: 'test-podcast'`
- Optionally create test episodes for comprehensive coverage
- Use Supabase client to insert test data

### 2. R2 Tests (16 failing)
**Issue**: Upload page selectors don't match actual UI elements
**Error**: Element not found / Timeout errors

**Failing tests:**
- All 16 tests in `e2e/r2.spec.ts`

**Root Cause**: Need to inspect actual upload page HTML to match selectors

**Approach**:
- Inspect `/episodes/new` page HTML structure
- Update selectors to match actual elements
- Add `data-testid` attributes if needed (prefer selectors first)
- Test file upload flow manually if needed

### 3. Validation Tests (5 failing)
**Issue**: Validation error messages don't match expected text
**Error**: `element(s) not found`

**Failing tests:**
- podcasts: should show validation errors for invalid podcast data
- podcasts: should view and edit podcast details
- podcasts: should prevent deleting podcast with episodes
- podcasts: should cancel podcast creation
- upload: should validate required fields

**Root Cause**: Error text or button labels differ from test expectations

**Approach**:
- Check actual error messages in the UI
- Update test selectors with flexible `.or()` chains
- Use `data-testid` attributes for more reliable selectors

## Scope

### In Scope
- [ ] Fix RSS test failures (8 tests)
  - [ ] Add test data setup for test podcast
  - [ ] Verify RSS endpoint works with test data
- [ ] Fix R2 test failures (16 tests)
  - [ ] Inspect upload page HTML
  - [ ] Update selectors to match actual UI
- [ ] Fix validation test failures (5 tests)
  - [ ] Update error message selectors
  - [ ] Add flexible selector chains

### Out of Scope
- Adding new features
- Refactoring working tests
- Performance optimizations
- Changing test framework

## Approach

### Phase 1: RSS Tests (Quickest Win)
1. Add `beforeAll` hook to create test podcast
2. Use Supabase client to insert podcast with known slug
3. Clean up test data in `afterAll` hook (optional)
4. Run RSS tests to verify

### Phase 2: R2 Tests
1. Run dev server and inspect upload page HTML
2. Identify correct selectors for file input, title, description
3. Update R2 test selectors
4. Run R2 tests to verify

### Phase 3: Validation Tests
1. Run tests individually and capture actual error messages
2. Update selectors with flexible `.or()` chains
3. Run validation tests to verify

## Definition of Done

- [ ] All 55 tests passing (100% pass rate)
- [ ] No test flakiness (consistent results on re-runs)
- [ ] Tests run in under 10 minutes
- [ ] Code committed to feature branch
- [ ] Ready for PR review

## Success Criteria

- **Before**: 33/55 passing (60%)
- **After**: 55/55 passing (100%)

## Notes

- Use flexible selectors with `.or()` chains for resilience
- Prefer `data-testid` attributes for critical elements
- Add cleanup in `afterAll` hooks for test data
- Document any test data dependencies
- Keep tests isolated (no dependencies between tests)
