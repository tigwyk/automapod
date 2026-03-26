# AMP-46: Fix Pre-existing TypeScript Errors in E2E Tests

**Type**: fix
**Priority**: P2
**Status**: Backlog

## Description

Running `tsc --noEmit` from the app directory surfaces 4 TypeScript errors in e2e test files. These are pre-existing issues unrelated to current feature work. They don't block builds (Next.js build passes) but they should be fixed to keep `tsc` clean for CI.

## Errors

```
e2e/r2.spec.ts(354,40): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.

e2e/r2.spec.ts(370,45): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string'.
  Type 'null' is not assignable to type 'string'.

e2e/r2.spec.ts(380,46): error TS2345: Argument of type 'string | null' is not assignable to parameter of type 'string | Request'.
  Type 'null' is not assignable to type 'string | Request'.

e2e/upload.spec.ts(205,35): error TS2345: Argument of type 'RegExp' is not assignable to parameter of type 'string'.
```

## Approach

- `r2.spec.ts` lines 354, 370, 380: Add null guards or non-null assertions (`!`) where the value is known to be set by the test setup
- `upload.spec.ts` line 205: Likely passing a `RegExp` to an API that expects a `string` — convert or use `.toString()`

## Definition of Done

- [ ] `tsc --noEmit` produces zero errors
- [ ] All existing E2E tests still pass (`npm run test:e2e`)
- [ ] No test logic changed, only type annotations fixed
