# [AMP-001] Fix Test Suite Security Issues

**Type**: bugfix/security
**Priority**: P0 (Security)
**Status**: ✅ Complete

## Description

Fix critical security issues in the E2E test suite where hardcoded credentials are exposed in source code, violating AutomaPod's security principles and amp-secrets guidelines.

## Issues Found

### 1. Hardcoded Credentials in Test Files

**`e2e/setup.ts` (lines 10-11)**:
```typescript
process.env.TEST_USER_EMAIL || 'test@automapod.app'
process.env.TEST_USER_PASSWORD || 'Test1234!'
```

**`e2e/upload.spec.ts` (lines 6-7)**:
```typescript
process.env.TEST_USER_EMAIL || 'test@example.com'
process.env.TEST_USER_PASSWORD || 'testpassword123'
```

**Problems**:
- Exposed fallback credentials in source code
- Inconsistent values between files
- Tests silently use defaults if env vars missing
- No validation that credentials are actually set

### 2. Missing .env.example
No template documenting required environment variables for developers.

## Scope

### In Scope
- [ ] Remove all hardcoded credential fallbacks from test files
- [ ] Add proper validation with clear error messages
- [ ] Create `.env.example` with required variables documentation
- [ ] Ensure consistent credential handling across all tests
- [ ] Verify tests still pass after changes

### Out of Scope
- Changing test functionality or behavior
- Modifying authentication flow
- Adding new tests
- Refactoring test structure (beyond security fixes)

## Approach

1. **Remove fallback values** - Use strict validation instead
2. **Add validation helper** - Create shared utility for env var validation
3. **Create .env.example** - Document all required test credentials
4. **Update test files** - Apply consistent validation pattern

## Validation Pattern

```typescript
// Instead of:
process.env.TEST_USER_EMAIL || 'fallback'

// Use:
function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

const email = getRequiredEnv('TEST_USER_EMAIL');
```

## Dependencies

- None (standalone security fix)

## Definition of Done

- [ ] All hardcoded credentials removed from test files
- [ ] Tests fail with clear error messages if env vars missing
- [ ] `.env.example` created with all required variables documented
- [ ] All E2E tests pass with proper credentials
- [ ] No credentials exposed in source code
- [ ] Code reviewed via `/amp-commit`

## Security Principles

Following amp-secrets guidelines:
- ✅ No plaintext credential storage
- ✅ Defensive validation at boundaries
- ✅ Fail fast on missing credentials
- ✅ Clear error messages for developers
- ✅ Documentation via .env.example

## Related

- Security principle: amp-secrets skill
- Affected files: `e2e/setup.ts`, `e2e/upload.spec.ts`
- Git status: Currently on main with uncommitted changes
