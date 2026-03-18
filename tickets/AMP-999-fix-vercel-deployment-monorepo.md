# AMP-999 Fix Vercel deployment error - monorepo structure

**Type**: bugfix
**Priority**: P0 (blocking deployment)
**Status**: In Progress

## Description
Vercel deployment is failing with "No Next.js version detected" error. The root `package.json` contains `next` as a devDependency, which is confusing Vercel's framework detection in the monorepo structure. Vercel is detecting the root package.json instead of the `app/` subdirectory package.json where the actual Next.js app lives.

## Error Message
```
No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies". Also check your Root Directory setting matches the directory of your package.json file.
```

## Root Cause
- Root `package.json` has `next: ^15.5.13` as a devDependency (not a full dependency)
- This partial Next.js installation confuses Vercel's auto-detection
- Vercel needs explicit direction to look in the `app/` subdirectory

## Scope
### In Scope
- [ ] Add `"rootDirectory": "app"` to vercel.json to explicitly point Vercel to the correct subdirectory
- [ ] Remove `next` and `eslint-config-next` from root package.json (they're not needed at root)
- [ ] Test that Vercel deployment works

### Out of Scope
- Restructuring the monorepo
- Moving files out of app subdirectory
- Changing Vercel project settings via UI (we want this in code)

## Approach
1. Update `vercel.json` to add `rootDirectory` configuration
2. Clean up root `package.json` to remove Next.js dependencies that are only in app/
3. Verify configuration is valid
4. Push and confirm Vercel deployment succeeds

## Why This Works
The `rootDirectory` property tells Vercel to treat a specific subdirectory as the project root. This aligns Vercel's framework detection with the actual Next.js app location and eliminates confusion from the monorepo structure.

## Dependencies
- None

## Definition of Done
- [ ] vercel.json updated with rootDirectory
- [ ] Root package.json cleaned of Next.js deps
- [ ] Vercel deployment succeeds
- [ ] No build errors
- [ ] Tests still pass locally
