# BUG-47: Realtime Document Updates Tests - Authentication Fixture Not Working

**Status:** Backlog
**Priority:** High
**Component:** E2E Tests
**Affected Test Suite:** `e2e/realtime-document-updates.spec.ts`

## Problem

All 6 tests in the Realtime Document Updates test suite are failing because the `authenticatedPage` fixture is not properly authenticated. When tests run, the page displays the login screen ("Welcome back") instead of being in an authenticated state.

## Failed Tests

1. ❌ `document appears immediately in workspace browser when created via API` - Page shows login screen
2. ❌ `document appears immediately in dashboard sidebar when created via API` - Timeout due to missing authenticated state
3. ❌ `document disappears immediately when archived via API` - Page shows login screen
4. ❌ `document updates name immediately when renamed via API` - Page shows login screen
5. ❌ `document appears in both tabs simultaneously when created` - Second tab not authenticated
6. ❌ `document created via UI appears without reload` - Page shows login screen after workspace creation attempt

## Evidence

Test failure screenshot shows:
- "Welcome back" heading
- "No account? Sign up" link
- Email address and password input fields
- "Sign in" button

This indicates the page is on the login screen instead of being authenticated.

## Error Details

### Test 1 Failure
```
Error: expect(locator).toBeVisible() failed
Locator: getByText('Realtime Test 1759873962456')
Expected: visible
Received: <element(s) not found>
Timeout: 10000ms
```
Location: `e2e/realtime-document-updates.spec.ts:16`

### Test 5 Failure
```
Error: expect(locator).toBeVisible() failed
Locator: getByTestId('create-document-button')
Expected: visible
Received: <element(s) not found>
Timeout: 5000ms
```
Location: `e2e/realtime-document-updates.spec.ts:252`

### Test 6 Failure
```
Error: expect(locator).toBeVisible() failed
Locator: getByText('UI Create Test 1759873976990')
Expected: visible
Received: <element(s) not found>
Timeout: 10000ms
```
Location: `e2e/realtime-document-updates.spec.ts:288`

## Root Cause

The `authenticatedPage` fixture from `./fixtures/test-fixtures` is not properly setting up authentication state before tests run. This could be due to:

1. Session/cookie not being set correctly
2. Authentication token expiration
3. Fixture setup race condition
4. Browser context not persisting authentication state

## Investigation Steps

1. Check `e2e/fixtures/test-fixtures.ts` to review how `authenticatedPage` is implemented
2. Verify that authentication is properly awaited before returning the fixture
3. Check if other test suites using `authenticatedPage` are experiencing similar issues
4. Review session/cookie handling in the fixture setup
5. Check if recent changes to authentication system broke the fixture

## Expected Behavior

When tests use the `authenticatedPage` fixture, the browser should already be authenticated and on the dashboard page, ready to perform authenticated actions like creating workspaces and documents.

## Reproduction

```bash
cd simple-client
npx playwright test e2e/realtime-document-updates.spec.ts --project=chromium
```

All 6 tests will fail with authentication-related errors.

## Related Tests

Other test suites may be affected if they rely on the `authenticatedPage` fixture.
