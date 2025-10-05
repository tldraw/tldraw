# [BUG-25]: Invite Page Missing "Join Workspace" Button for Authenticated Users

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
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

When an authenticated user visits an invitation link (`/invite/[token]`), the "Join Workspace" button is not visible. This prevents authenticated users from accepting workspace invitations.

## Steps to Reproduce

1. Create a user and authenticate them
2. Create an invitation link for a workspace
3. Visit the invitation URL as the authenticated user
4. **FAILS**: "Join Workspace" button is not visible

## Expected Behavior

When an authenticated user visits `/invite/[token]`:
1. The invitation page should load with workspace details
2. A "Join Workspace" button should be visible
3. Clicking the button should add the user to the workspace
4. The user should be redirected to the workspace

## Actual Behavior

What actually happens:

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=Join Workspace')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms
```

## Related Files/Components

- `e2e/invite.spec.ts:154` - should join workspace immediately when authenticated

## Possible Cause

The invitation page is either:
- Not rendering at all for authenticated users
- Missing the UI component that displays the "Join Workspace" button
- Incorrectly checking authentication state
- Related to BUG-09 where the page may not be loading correctly

## Proposed Solution

Suggested fix or approach to resolve the bug.

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

## Resolution

Description of how the bug was fixed, or why it was closed without fixing.
