# BUG-07: Incorrect Signin Route in Test

**Status:** Open
**Priority:** Low
**Estimate:** 0.5 hours
**Related Tests:** e2e/invitation-links.spec.ts:260

## Problem

The test is attempting to navigate to `/auth/signin` which doesn't exist in the application. The correct route is `/login`.

## Error Details

```
Test timeout of 30000ms exceeded.

Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')

  312 | 		// Sign in as member
  313 | 		await page.goto('/auth/signin')
> 314 | 		await page.fill('input[type="email"]', memberEmail)
```

## Root Cause

Line 313 uses `/auth/signin` but the application uses `/login` for the signin page. The page never loads, so the email input field is never found, causing a timeout.

## Expected Behavior

The test should navigate to the correct signin route (`/login`).

## Affected Tests

- `e2e/invitation-links.spec.ts:260` - non-owner cannot see invitation management UI

## Fix

Change line 313 from:
```typescript
await page.goto('/auth/signin')
```

To:
```typescript
await page.goto('/login')
```

## Acceptance Criteria

- [ ] Update route to `/login`
- [ ] Test passes when run individually
