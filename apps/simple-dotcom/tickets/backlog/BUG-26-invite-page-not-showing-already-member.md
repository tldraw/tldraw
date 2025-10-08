# [BUG-26]: Invite Page Not Showing "Already a Member" Message

Date reported: 2025-10-05
Date last updated: 2025-10-08
Date resolved: 2025-10-08

## Status

- [ ] New
- [ ] Investigating
- [ ] In Progress
- [ ] Blocked
- [x] Resolved
- [ ] Cannot Reproduce
- [ ] Won't Fix

## Severity

- [ ] Critical (System down, data loss, security)
- [ ] High (Major feature broken, significant impact)
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

The workspace invitation page is not showing the "Already a Member" message when a user visits their own workspace's invite link. The workspace creation API is working correctly, but the invite page UI is not properly detecting that the authenticated user is already a member/owner of the workspace.

## Steps to Reproduce

1. Create a workspace via API as authenticated user
2. Get the invite token for that workspace
3. Visit `/invite/{inviteToken}` as the same authenticated user
4. **FAILS**: Does not show "Already a Member" message

## Expected Behavior

When an authenticated user visits their own workspace's invite link, the page should:
1. Detect that the user is already a member/owner
2. Display "Already a Member" message
3. Show "You are the owner of this workspace" text
4. Provide a "Go to Workspace" link

## Actual Behavior

The invite page does not show the "Already a Member" message. The test fails with:
- Locator 'text=Already a Member' is not found
- Timeout after 5000ms waiting for the element to be visible

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: expect(locator).toBeVisible() failed

Locator:  locator('text=Already a Member')
Expected: visible
Received: <element(s) not found>
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Already a Member')

  195 | await expect(authenticatedPage.locator('text=Already a Member')).toBeVisible()
```

## Related Files/Components

- `e2e/invite.spec.ts:187` - should show already member message
- `app/invite/[token]/page.tsx` - Invite page component
- `app/invite/[token]/invite-page-client.tsx` - Client component for invite page logic

## Possible Cause

The invite page logic is not correctly:
- Checking if the current user is already a member of the workspace
- Fetching the membership status before rendering the UI
- Handling the case where the user is the owner vs a regular member
- The API call to check membership might be failing or returning incorrect data

## Proposed Solution

1. Review the invite page component to ensure it's checking membership status
2. Verify the API endpoint for checking membership is working correctly
3. Ensure the UI conditionally renders based on membership status
4. Add proper error handling for the membership check

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

**2025-10-07:**
- Investigation shows workspace creation API is working correctly (backend.log shows multiple successful creations)
- The real issue is the invite page not showing "Already a Member" message when user visits their own invite link
- Test failure in invite.spec.ts line 187 - UI component not detecting membership status
- Bug report updated to reflect actual issue (invite page UI, not API)

## Resolution

**Date Resolved:** 2025-10-08

**Duplicate Of:** BUG-39

**Root Cause:**
This ticket is a duplicate of BUG-39. The issue was caused by incorrect check ordering in `/invite/[token]/page.tsx`. The page was checking if the invitation link was disabled BEFORE checking if the user was already a member/owner. This caused owners/members to see "Link Disabled" instead of the "Already a Member" message.

**Fix Applied:**
Reordered the checks in `page.tsx` (lines 48-120) so that membership status is verified FIRST, before any link validity checks:
1. Check if user is owner → show "Already a Member" with owner message
2. Check if user is member → show "Already a Member" with member message
3. Then check link validity (disabled, expired, etc.)

**Files Modified:**
- `simple-client/src/app/invite/[token]/page.tsx:48-120` - Reordered status checks

**Test Results:**
✅ Test now passing: `invite.spec.ts` > "Authenticated User Flow" > "should show already member message"

**Note:** The UI implementation in `invite-accept-client.tsx` was always correct. The issue was purely in the server-side status determination logic.
