# [BUG-20]: Workspace Name Not Visible After Creation

Date reported: 2025-10-05
Date last updated: 2025-10-05
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
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [x] Workspaces
- [x] Documents
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

When creating a new workspace via the UI, after clicking the confirm button, the workspace name is not visible on the resulting page. The test expects the workspace name to appear (likely in a header or title), but it times out waiting for it.

## Steps to Reproduce

1. Click create workspace button (`[data-testid="create-workspace-button"]`)
2. Fill workspace name input (`[data-testid="workspace-name-input"]`)
3. Click confirm (`[data-testid="confirm-create-workspace"]`)
4. **FAILS**: Expect workspace name to be visible on page

## Expected Behavior

After creating a workspace, the workspace name should be clearly visible on the workspace page (likely in a header, breadcrumb, or title area).

## Actual Behavior

The workspace creation modal closes immediately after clicking confirm, but the workspace name does not appear in the dashboard sidebar because the data refetch hasn't completed yet. This creates a race condition where the test looks for the workspace name before it's rendered.

## Screenshots/Videos

N/A

## Error Messages/Logs

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Archive Test 1759691390609')
Expected: visible
Received: <element(s) not found>
Timeout:  10000ms
```

## Related Files/Components

- `e2e/document-crud.spec.ts:197` - archived documents do not appear in active lists

## Root Cause

The bug was caused by a race condition in the workspace creation flow:

1. When a workspace is created successfully, the code called `queryClient.invalidateQueries()` to trigger a refetch of dashboard data
2. However, `invalidateQueries()` returns immediately without waiting for the refetch to complete
3. The modal closed before the new workspace data was fetched and rendered
4. The test expected the workspace name to be visible immediately after modal close, but it wasn't rendered yet

The workspace name IS displayed correctly in the dashboard sidebar (line 532 of `dashboard-client.tsx`), but only after the refetch completes. The timing issue made it appear that the workspace name was not being displayed.

## Implemented Solution

Changed the workspace creation handler to use `refetchQueries()` instead of `invalidateQueries()` and await its completion:

**File**: `simple-client/src/app/dashboard/dashboard-client.tsx`
**Line**: 153

**Before**:
```typescript
queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
```

**After**:
```typescript
await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
```

This ensures that:
1. The refetch completes before the modal closes
2. The new workspace data is loaded and rendered
3. The workspace name is visible in the sidebar before any visibility checks
4. Tests can reliably find the workspace name after creation

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

**2025-10-07:**
- Investigated the issue and found it was a timing/race condition
- Identified that the workspace name IS rendered correctly in the sidebar
- Found that `invalidateQueries()` doesn't wait for refetch completion
- Changed to use `refetchQueries()` with await to ensure data is loaded before modal closes
- Fixed in `simple-client/src/app/dashboard/dashboard-client.tsx` line 153

## Resolution

**FIXED** - Changed workspace creation to use `await queryClient.refetchQueries()` instead of `queryClient.invalidateQueries()`. This ensures the dashboard data refetch completes and the new workspace is rendered in the sidebar before the creation modal closes. The workspace name now appears immediately and reliably after creation.
