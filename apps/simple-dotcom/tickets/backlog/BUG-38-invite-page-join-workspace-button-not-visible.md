# [BUG-38]: Invite Page "Join Workspace" Button Not Visible

Date created: 2025-10-07
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

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

The invite page at `/invite/[token]` does not display the "Join Workspace" button for authenticated users who are not yet members of the workspace. This prevents users from joining workspaces via invitation links.

This affects multiple E2E tests:
- `invite.spec.ts` > "Unauthenticated User Flow" > "should join workspace after signup"
- `invite.spec.ts` > "Authenticated User Flow" > "should join workspace immediately when authenticated"

## Steps to Reproduce

1. Create a workspace with an invitation link enabled
2. As an authenticated user (who is NOT a member of the workspace), visit `/invite/[token]`
3. Look for "Join Workspace" button

## Expected Behavior

- The invite page should load successfully
- Workspace name should be displayed
- "Join Workspace" button should be visible
- User should be able to click the button to join

## Actual Behavior

- "Join Workspace" text is NOT visible (element not found)
- Tests fail waiting for the button
- Page may not be rendering the invite UI correctly

## Error Message

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=Join Workspace')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms
```

## Potential Causes

1. **Invite page not implemented**: The `/invite/[token]` route may not exist or be incomplete
2. **Different button text**: The button might use different text (e.g., "Join", "Accept Invitation")
3. **Wrong state detection**: The page might not correctly detect that the user is authenticated but not a member
4. **API issues**: The invite data might not be loading from the API
5. **Redirect logic**: The page might be redirecting before showing the UI

## Acceptance Criteria

- [ ] `/invite/[token]` page renders correctly for valid tokens
- [ ] "Join Workspace" button is visible for authenticated non-members
- [ ] Button text matches test expectations or tests are updated
- [ ] Clicking button successfully adds user to workspace
- [ ] Page redirects to workspace after successful join
- [ ] Both E2E tests pass

## Related Files

- `e2e/invite.spec.ts:89-150` - Failing test (unauthenticated flow)
- `e2e/invite.spec.ts:154-185` - Failing test (authenticated flow)
- Invite page route (likely `src/app/invite/[token]/page.tsx`)
- Invite join API endpoint (`/api/workspaces/[id]/invite/join` or similar)

## Testing Requirements

- [x] E2E tests exist and are failing
- [ ] Manual testing required
- [ ] Fix verification needed

## Notes

This appears to be a missing or incomplete implementation of the invite page UI. The invite functionality is critical for workspace collaboration features.

Screenshots available in test results for both failures.

## Related Bugs

This may be related to:
- BUG-36 (invitation settings page issues)
- BUG-37 (page closing unexpectedly)

All three bugs suggest the invitation/invite pages may not be fully implemented.
