# BUG-10: Invite Page Missing "Join Workspace" Button for Authenticated Users

**Status:** Open
**Priority:** High
**Estimate:** 3 hours
**Related Tests:** e2e/invite.spec.ts:154

## Problem

When an authenticated user visits an invitation link (`/invite/[token]`), the "Join Workspace" button is not visible. This prevents authenticated users from accepting workspace invitations.

## Error Details

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=Join Workspace')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms
```

## Test Flow

1. Create a user and authenticate them
2. Create an invitation link for a workspace
3. Visit the invitation URL as the authenticated user
4. **FAILS**: "Join Workspace" button is not visible

## Root Cause

The invitation page is either:
- Not rendering at all for authenticated users
- Missing the UI component that displays the "Join Workspace" button
- Incorrectly checking authentication state
- Related to BUG-09 where the page may not be loading correctly

## Expected Behavior

When an authenticated user visits `/invite/[token]`:
1. The invitation page should load with workspace details
2. A "Join Workspace" button should be visible
3. Clicking the button should add the user to the workspace
4. The user should be redirected to the workspace

## Affected Tests

- `e2e/invite.spec.ts:154` - should join workspace immediately when authenticated

## Acceptance Criteria

- [ ] Authenticated users see the invitation page with workspace details
- [ ] "Join Workspace" button is visible and functional
- [ ] Clicking the button successfully adds user to workspace
- [ ] User is redirected after joining
- [ ] Test passes when run individually
