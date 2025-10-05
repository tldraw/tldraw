# [BUG-07]: Incorrect Signin Route in Test

Date reported: 2025-10-05
Date last updated: 2025-10-05
Date resolved:

## Status

- [x] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [ ] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [ ] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [x] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: N/A (Test issue)
- OS: All
- Environment: local (E2E tests)
- Affected version/commit: simple-dotcom branch

## Description

The test is attempting to navigate to `/auth/signin` which doesn't exist in the application. The correct route is `/login`.

## Steps to Reproduce

1. Run the E2E test: `e2e/invitation-links.spec.ts`
2. Test "non-owner cannot see invitation management UI" attempts to navigate to `/auth/signin`
3. Test times out waiting for email input field that never appears
4. Test fails with timeout error

## Expected Behavior

The test should navigate to the correct signin route (`/login`).

## Actual Behavior

The test navigates to `/auth/signin` which doesn't exist, causing the page to never load and the test to timeout while waiting for the email input field.

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Test timeout of 30000ms exceeded.

Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[type="email"]')

  312 | 		// Sign in as member
  313 | 		await page.goto('/auth/signin')
> 314 | 		await page.fill('input[type="email"]', memberEmail)
```

## Related Files/Components

- `e2e/invitation-links.spec.ts:260` - Test with incorrect route
- Line 313 uses `/auth/signin` instead of `/login`

## Possible Cause

Test was likely written with an incorrect assumption about the route structure or copied from a different codebase that used `/auth/signin`.

## Proposed Solution

Change line 313 from:
```typescript
await page.goto('/auth/signin')
```

To:
```typescript
await page.goto('/login')
```

## Related Issues

- Part of E2E test failures

## Worklog

## Resolution