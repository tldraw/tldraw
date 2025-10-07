# [BUG-41]: Invite Page "Link Expired" Message Not Visible for Regenerated Tokens

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

When a user attempts to access an invitation link using an old token (after the link has been regenerated), the page should display a "Link Expired" error message explaining that a new link was generated. This message is not visible, preventing users from understanding why the link doesn't work.

This affects the E2E test:
- `invite.spec.ts` > "Error Scenarios" > "should show error for regenerated token"

## Steps to Reproduce

1. Create a workspace with an enabled invitation link (get token A)
2. Regenerate the invitation link via API (creates token B, invalidates token A)
3. As an authenticated user, visit `/invite/[tokenA]` (the old token)
4. Look for "Link Expired" and "A new link was generated" messages

## Expected Behavior

- The invite page should load successfully
- "Link Expired" error heading should be visible
- Message explaining "A new link was generated" should be visible
- User should understand that they need the new link from workspace owner
- Page should remain stable

## Actual Behavior

- "Link Expired" text is NOT visible (element not found)
- Expected explanation message is not displayed
- Page may not be detecting regenerated/expired tokens correctly

## Error Message

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=Link Expired')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms
```

## Potential Causes

1. **No regeneration detection**: The page doesn't differentiate between invalid and regenerated tokens
2. **Different message text**: The UI might use different wording (e.g., "Invalid Link")
3. **API doesn't distinguish**: The invite API might return the same error for all invalid tokens
4. **Database schema issue**: No tracking of superseded tokens
5. **Missing UI implementation**: The error state isn't implemented in the invite page

## Acceptance Criteria

- [ ] Invite page detects regenerated tokens correctly
- [ ] "Link Expired" or equivalent message is visible
- [ ] Explanation about regeneration is shown to users
- [ ] Different error message from truly invalid tokens (if possible)
- [ ] Helpful guidance provided (contact workspace owner for new link)
- [ ] E2E test passes

## Related Files

- `e2e/invite.spec.ts:245-278` - Failing test
- Invite page route (likely `src/app/invite/[token]/page.tsx`)
- Invite regenerate API endpoint (`/api/workspaces/[id]/invite/regenerate`)
- Invite validation/lookup API

## Testing Requirements

- [x] E2E test exists and is failing
- [ ] Manual testing required
- [ ] Fix verification needed

## Implementation Notes

The database/API should ideally track:
- When a token was regenerated
- What the previous token was
- Timestamp of regeneration

This allows the UI to show specific messages:
- "This link expired when a new one was created on [date]"
- "Please ask the workspace owner for the new invitation link"

## Notes

This is an important UX detail for security. When invitation links are regenerated (e.g., to revoke access), users with old links should clearly understand why they can't join, rather than seeing a generic error.

Screenshots available in test results:
- `test-results/invite-Workspace-Invitatio-02ebf-error-for-regenerated-token-chromium/test-failed-1.png`
- `test-results/invite-Workspace-Invitatio-02ebf-error-for-regenerated-token-chromium/test-failed-2.png`
- `test-results/invite-Workspace-Invitatio-02ebf-error-for-regenerated-token-chromium/test-failed-3.png`

## Related Bugs

- BUG-38: Join Workspace button not visible
- BUG-39: Already member message not visible
- BUG-40: Disabled link causes crash

All suggest the invite page error states are not properly implemented.
