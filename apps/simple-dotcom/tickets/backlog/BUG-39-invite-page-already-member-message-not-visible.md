# [BUG-39]: Invite Page "Already a Member" Message Not Visible

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

When a user who is already a member (or owner) of a workspace visits that workspace's invitation link, the page should display an "Already a Member" message. This message is not visible, preventing users from understanding their membership status and navigating to the workspace.

This affects the E2E test:
- `invite.spec.ts` > "Authenticated User Flow" > "should show already member message"

## Steps to Reproduce

1. Create a workspace (user becomes owner)
2. Get the invitation link for that workspace
3. As the owner, visit the invitation link `/invite/[token]`
4. Look for "Already a Member" message

## Expected Behavior

- The invite page should detect that the user is already a member/owner
- "Already a Member" heading should be visible
- "You are the owner of this workspace" (or similar) message should be visible
- "Go to Workspace" link/button should be available
- User should NOT see "Join Workspace" button

## Actual Behavior

- "Already a Member" text is NOT visible (element not found)
- Expected message about ownership is not displayed
- Page may not be differentiating between members and non-members

## Error Message

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=Already a Member')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms
```

## Potential Causes

1. **Missing member detection**: The page doesn't check if the user is already a member
2. **Different message text**: The UI might use different wording
3. **State management issue**: The page might not be loading membership status correctly
4. **Wrong redirect**: The page might be redirecting to workspace instead of showing the message
5. **API issue**: The membership check API might not be working

## Acceptance Criteria

- [ ] Invite page detects existing membership correctly
- [ ] "Already a Member" or equivalent message is visible for members
- [ ] Different messages for owners vs regular members (if applicable)
- [ ] "Go to Workspace" button/link is functional
- [ ] No "Join Workspace" button shown to existing members
- [ ] E2E test passes

## Related Files

- `e2e/invite.spec.ts:187-203` - Failing test
- Invite page route (likely `src/app/invite/[token]/page.tsx`)
- Workspace membership check API

## Testing Requirements

- [x] E2E test exists and is failing
- [ ] Manual testing required
- [ ] Fix verification needed

## Notes

This is a UX issue that affects the user experience when they accidentally visit an invite link for a workspace they're already part of. The page should provide clear feedback about their existing membership.

Screenshots available in test results:
- `test-results/invite-Workspace-Invitatio-b635f-show-already-member-message-chromium/test-failed-1.png`
- `test-results/invite-Workspace-Invitatio-b635f-show-already-member-message-chromium/test-failed-2.png`

## Related Bugs

- BUG-38: Join Workspace button not visible (same invite page)
