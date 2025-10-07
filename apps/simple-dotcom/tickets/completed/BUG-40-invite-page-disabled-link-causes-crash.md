# [BUG-40]: Invite Page Crashes When Accessing Disabled Link

Date created: 2025-10-07
Date last updated: 2025-10-07
Date completed: 2025-10-07

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [x] P0 (Critical - Blocking)
- [ ] P1 (High - Should Fix Soon)
- [ ] P2 (Medium - Normal Priority)
- [ ] P3 (Low - Nice to Have)

## Category

- [ ] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [ ] Infrastructure

## Description

When a user attempts to access an invitation link that has been disabled, the page/browser crashes or closes unexpectedly instead of showing a "Link Disabled" error message. This prevents users from understanding why they cannot join the workspace.

This affects the E2E test:
- `invite.spec.ts` > "Error Scenarios" > "should show error for disabled link"

## Steps to Reproduce

1. Create a workspace with an enabled invitation link
2. Disable the invitation link via API
3. As an authenticated user, visit `/invite/[token]`
4. Page should show "Link Disabled" message

## Expected Behavior

- The invite page should load successfully
- "Link Disabled" error message should be visible
- User should understand that the link is no longer valid
- Page should remain stable (no crashes)

## Actual Behavior

- Test times out after 30 seconds
- Error: "Target page, context or browser has been closed"
- Page cannot navigate to the invite URL
- Browser/page crashes or redirects unexpectedly

## Error Message

```
Test timeout of 30000ms exceeded.

Error: page.waitForURL: Target page, context or browser has been closed
=========================== logs ===========================
waiting for navigation to "/invite/[token]" until "load"
============================================================
```

## Potential Causes

1. **Unhandled API error**: The invite API returns an error for disabled links that isn't handled
2. **JavaScript crash**: An uncaught exception causes the page to crash
3. **Infinite redirect loop**: The page keeps redirecting between routes
4. **Missing error boundary**: React error boundary not catching the error
5. **Database constraint issue**: A database error causes the page to fail

## Acceptance Criteria

- [x] Invite page loads successfully for disabled links
- [x] "Link Disabled" error message is visible
- [x] Page remains stable (no crashes or unexpected closes)
- [x] User-friendly error explanation is provided
- [x] Option to contact workspace owner or return to dashboard
- [x] E2E test passes without timeout

## Related Files

- `e2e/invite.spec.ts:215-243` - Failing test
- Invite page route (likely `src/app/invite/[token]/page.tsx`)
- Invite validation API endpoint

## Testing Requirements

- [x] E2E test exists and is failing
- [x] Manual testing required to see actual crash
- [x] Browser console logs needed
- [x] Fix verification needed

## Investigation Steps

1. Check browser console for JavaScript errors
2. Review network tab for failed API requests
3. Test manually in headed mode to observe crash behavior
4. Check if error boundaries are implemented
5. Verify invite API error handling for disabled links
6. Look for redirect loops in the code

## Notes

This is a critical bug that causes a very poor user experience. Users should see a clear error message, not a crashed page.

Screenshots available in test results:
- `test-results/invite-Workspace-Invitatio-1ba0f-how-error-for-disabled-link-chromium/test-failed-1.png`
- `test-results/invite-Workspace-Invitatio-1ba0f-how-error-for-disabled-link-chromium/test-failed-2.png`

## Related Bugs

- BUG-37: Page closing issue in invitation-links tests
- BUG-38: Join Workspace button not visible
- BUG-39: Already member message not visible
- BUG-41: Link Expired message not visible

All suggest the invite page may have fundamental implementation issues.

## Resolution

**Root Cause**: The E2E test was using hardcoded credentials (`test@example.com`) that didn't exist in the database, causing login to fail. This prevented the test from verifying that the disabled link error message was properly displayed.

**Fix Applied**: Updated the test at `e2e/invite.spec.ts:215-243` to use the `testUser` fixture's credentials instead of hardcoded values. The test now:
1. Uses `testUser` fixture in the test parameters
2. Fills email with `testUser.email`
3. Fills password with `testUser.password`

**Verification**: Test now passes successfully (4.7s). The invite page correctly:
- Displays "Link Disabled" message for disabled invitation links
- Shows user-friendly explanation and guidance
- Provides "Go to Dashboard" link
- Remains stable without crashes

**Files Changed**:
- `simple-client/e2e/invite.spec.ts:215,236-237` - Updated test to use testUser fixture credentials
