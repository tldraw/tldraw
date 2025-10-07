# [BUG-28]: Ownership Transfer Not Redirecting to Workspace Page

Date reported: 2025-10-05
Date last updated: 2025-10-07
Date resolved: 2025-10-07

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

- [ ] Authentication
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

After transferring workspace ownership to another member, the page does not redirect back to the workspace page. The test times out waiting for the redirect after 30 seconds.

## Steps to Reproduce

1. Create workspace with owner and member
2. Navigate to workspace settings
3. Perform ownership transfer operation
4. **FAILS**: Page does not redirect to workspace page

## Expected Behavior

After transferring workspace ownership:
1. The transfer should complete successfully in the database
2. The page should redirect to the workspace page
3. The UI should reflect the new ownership

## Actual Behavior

After successful ownership transfer API call, the page did not redirect. The router.push() call was executed, but Next.js router cache was not invalidated, causing the navigation to fail or use stale cached data.

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Test timeout of 30000ms exceeded.

Error: page.waitForURL: Test timeout of 30000ms exceeded.
waiting for navigation to "**/workspace/7b995540-caa3-4348-9a3b-a1e537925cd3" until "load"

  68 | 			await page.waitForURL(`**/workspace/${workspace.id}`)
```

## Related Files/Components

- `e2e/ownership-transfer.spec.ts:4` - owner can transfer ownership to another member

## Root Cause

The ownership transfer API call was completing successfully, but the client-side navigation was failing because:
- After the transfer, the user's role changes from "owner" to "member"
- The workspace page server component fetches fresh data based on the user's role
- router.push() was called without first calling router.refresh()
- Next.js router cache still had the old ownership data cached
- The navigation attempted to use stale cached data, causing the redirect to fail

## Solution Implemented

Added router.refresh() call before router.push() in the handleTransferOwnership function:
- router.refresh() invalidates the Next.js router cache
- This forces Next.js to refetch fresh server-side data on navigation
- The workspace page then loads with the updated ownership information
- User successfully navigates to the workspace page as a member

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

**2025-10-07:**
- Investigated the issue in workspace-settings-client.tsx
- Identified that router.push() was being called without router.refresh()
- Added router.refresh() call before router.push() in handleTransferOwnership
- Verified fix with e2e test - all 4 ownership transfer tests now pass
- Bug resolved

## Resolution

Fixed by adding router.refresh() before router.push() in the handleTransferOwnership function in workspace-settings-client.tsx (line 175). This ensures the Next.js router cache is invalidated before navigation, allowing the workspace page to load with fresh server-side data reflecting the new ownership structure.

File changed: simple-client/src/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx
