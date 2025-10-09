# BUG-48: Multi-Tab Test - Authentication Not Persisting to Second Tab

**Status:** Backlog
**Priority:** P2 (Medium) - Blocked
**Component:** E2E Tests, Authentication
**Affected Test:** `e2e/realtime-document-updates.spec.ts:222` - "document appears in both tabs simultaneously when created"
**Dependency:** BUG-47 (must be fixed first - does BUG-47 exist?)

## Priority

**P2 (Medium) - Blocked**

**Rationale:**
- **Blocked by BUG-47** (authentication fixture issue - need to verify if this exists)
- **Affects 1 test** (multi-tab realtime test)
- **Test infrastructure issue**: Playwright authentication state not shared between tabs
- **Niche scenario**: Multi-tab testing is less common than single-tab flows
- **Possible dependency on BUG-58**: If workspace creation fails, multi-tab test cannot proceed

**Why P2:**
- Medium importance - validates multi-tab realtime functionality
- Blocked by another bug that needs investigation
- Less critical than core functionality bugs
- May be blocked by multiple dependencies

**Investigation Steps:**
1. **First, verify BUG-47 exists** - check if this bug is documented
2. If BUG-47 doesn't exist, investigate Playwright authentication fixture
3. Check if `authenticatedPage` fixture sets auth at context level vs page level
4. May also be blocked by BUG-58 if workspace creation is required

**Current Status:** On hold pending dependency resolution

## Problem

When opening a second browser tab using `context.newPage()` in Playwright tests, the authentication state from the first tab does not persist to the second tab. The second tab fails to find authenticated UI elements.

## Test Details

Test: `document appears in both tabs simultaneously when created`

The test creates a workspace in the first authenticated tab, then opens a second tab to the same workspace URL:

```typescript
const page2 = await context.newPage()
await page2.goto(`/workspace/${workspaceId}`)
await expect(page2.getByTestId('create-document-button')).toBeVisible()
```

## Error

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('create-document-button')
Expected: visible
Received: <element(s) not found>
Timeout: 5000ms
```

Location: `e2e/realtime-document-updates.spec.ts:252`

## Root Cause Analysis

Possible causes:
1. Authentication cookies/session storage not shared across browser contexts in Playwright
2. The test fixture only authenticates the first page, not the browser context
3. Server-side session handling doesn't support multiple tabs properly
4. Authentication middleware redirects unauthenticated tabs to login

## Expected Behavior

When opening a second tab with `context.newPage()` from an authenticated Playwright browser context, the second tab should inherit the authentication state and be able to access authenticated routes without needing to sign in again.

## Investigation Steps

1. First fix BUG-47 (authentication fixture issue)
2. Verify that authentication cookies are set with proper scope to be shared across tabs
3. Check if the `authenticatedPage` fixture sets up authentication at the context level or just the page level
4. Review if session storage (not shared across tabs) is being used instead of cookies
5. Test if manually copying cookies/storage to the second page resolves the issue

## Workaround

After fixing BUG-47, if this issue persists, the test may need to:
1. Set up authentication at the browser context level, not just the page level
2. Manually copy authentication state to new tabs
3. Use `context.storageState()` to persist and reuse authentication

## Reproduction

```bash
cd simple-client
# First ensure BUG-47 is fixed
npx playwright test e2e/realtime-document-updates.spec.ts --grep "both tabs simultaneously" --project=chromium
```

## Related Files

- `e2e/fixtures/test-fixtures.ts` - Authentication fixture implementation
- `e2e/realtime-document-updates.spec.ts:222` - Failing test
