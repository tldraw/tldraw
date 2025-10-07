# BUG-49: API Auth Test Skipped with Outdated Better Auth Comments

**Status:** New
**Priority:** Medium
**Category:** Testing / Authentication
**Date reported:** 2025-10-07

## Summary

The test "should allow authenticated requests to API endpoints" in `route-guards.spec.ts:324` is skipped with outdated comments claiming Better Auth integration issues. The app no longer uses Better Auth - it uses Supabase Auth. This test needs to be implemented to verify authenticated API requests work correctly.

## Steps to Reproduce

1. Run route-guards test suite: `npx playwright test e2e/route-guards.spec.ts`
2. Observe test "Route Guards › API Route Guards › should allow authenticated requests to API endpoints" is skipped
3. Check test code at line 324-329

## Current Behavior

The test is skipped with this outdated comment:
```typescript
test('should allow authenticated requests to API endpoints', async ({}) => {
    // TODO: Fix auth integration - Better Auth cookies not being recognized by Supabase requireAuth
    // The app uses Better Auth for authentication but API routes use Supabase auth
    // This needs middleware to sync the auth state between the two systems
    test.skip()
})
```

## Expected Behavior

- Test should be implemented and running
- Test should verify authenticated users can successfully call protected API endpoints
- Test should use the current Supabase Auth system (not Better Auth)

## Root Cause

The codebase was migrated away from Better Auth to Supabase Auth, but:
1. The test comments and skip reason were never updated
2. The test was never implemented for the current auth system
3. Outdated "Better Auth" comments remain in API route files (e.g., `src/app/api/workspaces/route.ts:18,62`)

## Evidence

### Test File Location
`simple-client/e2e/route-guards.spec.ts:324-329`

### Current Auth Implementation
`src/lib/supabase/server.ts` shows Supabase Auth is used:
- `requireAuth()` calls `getCurrentUser()`
- `getCurrentUser()` uses `supabase.auth.getUser()` (Supabase Auth, not Better Auth)
- Cookie-based authentication via `@supabase/ssr`

### Outdated Comments in API Routes
Example from `src/app/api/workspaces/route.ts`:
```typescript
// Line 18: "Get session from Better Auth"
// Line 62: "Get session from Better Auth"
// Both call requireAuth() which uses Supabase Auth
```

## Impact

- **Test Coverage:** Missing verification that authenticated API requests work
- **Code Quality:** Outdated comments mislead developers
- **Maintenance:** Future developers may waste time investigating non-existent "Better Auth" issues

## Affected Files

- `simple-client/e2e/route-guards.spec.ts` (line 324-329) - skipped test
- `src/app/api/workspaces/route.ts` (lines 18, 62) - outdated comments
- Likely other API route files with similar outdated comments

## Related Tests

The unauthenticated API test passes:
```
✅ "should protect API endpoints from unauthenticated requests" (line 316)
```

This verifies the negative case (401/403 for unauthenticated), but we need the positive case (200 for authenticated).

## Suggested Fix

1. Implement the skipped test to verify authenticated API requests:
   ```typescript
   test('should allow authenticated requests to API endpoints', async ({ authenticatedPage }) => {
       const response = await authenticatedPage.request.get('/api/workspaces')
       expect(response.ok()).toBeTruthy()
       expect(response.status()).toBe(200)
   })
   ```

2. Remove outdated "Better Auth" comments from all API route files

3. Update test description/comments to reflect Supabase Auth usage

## Test Output

```
Running 22 tests using 5 workers
  1 skipped
  21 passed (16.5s)
```

The skipped test is at `route-guards.spec.ts:324`.
