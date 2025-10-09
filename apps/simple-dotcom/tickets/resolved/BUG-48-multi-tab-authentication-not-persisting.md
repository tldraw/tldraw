# BUG-48: Multi-Tab Test - Authentication Not Persisting to Second Tab

**Status:** Resolved
**Priority:** P2 (Medium)
**Component:** E2E Tests, Test Fixtures
**Affected Test:** `e2e/realtime-document-updates.spec.ts:222` - "document appears in both tabs simultaneously when created"
**Resolution Date:** 2025-10-09

## Problem

When opening a second browser tab using `context.newPage()` in Playwright tests, the authentication state from the first tab did not persist to the second tab. The second tab showed the login page instead of the authenticated workspace view.

```typescript
const page2 = await context.newPage()
await page2.goto(`/workspace/${workspaceId}`)
await expect(page2.getByTestId('create-document-button')).toBeVisible()
// ❌ Failed: showed login page instead
```

## Root Cause

The test was using **two different fixtures** incorrectly:

1. **`authenticatedPage`** - provides a pre-authenticated page, but creates and **closes its own context** after use
2. **`context`** - Playwright's default browser context fixture, which is **not authenticated**

The test requested both fixtures:
```typescript
test('...', async ({ context, authenticatedPage, supabaseAdmin }) => {
    const page1 = authenticatedPage  // From authenticated context A
    const page2 = await context.newPage()  // From unauthenticated context B ❌
```

`page1` came from the authenticated context, but `page2` came from the default unauthenticated context, causing it to be redirected to the login page.

## Solution

Use the `authenticatedContext` fixture instead, which provides the authenticated browser context without closing it:

```typescript
test('...', async ({ authenticatedContext, supabaseAdmin }) => {
    const page1 = await authenticatedContext.newPage()
    await page1.goto('/dashboard')

    // Both pages now share the same authenticated context ✅
    const page2 = await authenticatedContext.newPage()
    await page2.goto(`/workspace/${workspaceId}`)
```

## Changes Made

**File:** `e2e/realtime-document-updates.spec.ts:222-214`

- Removed `context` and `authenticatedPage` from test fixtures
- Added `authenticatedContext` fixture
- Created `page1` manually from `authenticatedContext`
- Created `page2` from the same `authenticatedContext`
- Added proper cleanup: `await page1.close()` and `await page2.close()`

## Test Result

✅ **Test now passes** (17.4 seconds)

Both tabs successfully:
- Share authentication state
- Access authenticated routes
- Receive realtime document updates

## Lessons Learned

1. **Fixture Design Issue**: The `authenticatedPage` fixture closes its context after use, making it unsuitable for multi-page tests
2. **Use the Right Fixture**: Tests needing multiple pages should use `authenticatedContext` to manage pages manually
3. **Not an Auth Bug**: This was a test infrastructure issue, not a problem with the application's authentication system

## Related Files

- `e2e/fixtures/test-fixtures.ts` - Authentication fixture definitions
- `e2e/realtime-document-updates.spec.ts:234` - Fixed test (line numbers shifted after adding pauses)
