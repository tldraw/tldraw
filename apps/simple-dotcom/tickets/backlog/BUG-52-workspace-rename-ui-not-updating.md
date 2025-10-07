# BUG-52: Workspace Rename UI Not Updating After Successful Rename

## Status
- **State**: Backlog
- **Priority**: High
- **Category**: UI Bug
- **Component**: Dashboard - Workspace Management
- **Related Tests**: `e2e/workspace.spec.ts:184` - "should rename a shared workspace"

## Description
After successfully renaming a workspace, the new name does not appear in the UI even though the modal closes. The database is updated correctly (test verifies this), but the UI doesn't reflect the change.

## Test Failure
```
Error: expect(locator).toBeVisible() failed
Locator: locator('text=Renamed 1759875628157')
Expected: visible
Received: <element(s) not found>

At: e2e/workspace.spec.ts:230:50
```

## Steps to Reproduce
1. Log in as an authenticated user
2. Create a shared workspace (not private)
3. Add user as owner/member
4. Reload page
5. Click rename button for the workspace
6. Enter new name in rename input field
7. Click confirm rename button
8. Wait for modal to close
9. **Expected**: New name appears in the UI
10. **Actual**: New name does not appear in the UI

## Expected Behavior
- After renaming a workspace, the new name should immediately appear in the dashboard UI
- The UI should update to show the renamed workspace name
- Users should see the change without needing to manually reload

## Actual Behavior
- The workspace rename succeeds at the API/database level
- The modal closes after rename
- The UI still displays the old workspace name
- The new name does not appear anywhere in the UI

## Technical Details
Test location: `simple-client/e2e/workspace.spec.ts:184-244`

The test:
1. Creates a workspace with original name
2. Renames it via the UI
3. Waits for modal to close
4. Checks that new name is visible in UI ❌ FAILS HERE
5. Checks that old name is no longer visible
6. Verifies database was updated correctly ✅ PASSES

## Root Cause Analysis Needed
Possible causes:
1. Missing state update after successful rename API call
2. Cache invalidation issue - UI not refetching workspace data
3. Optimistic update not being applied
4. React query/SWR not revalidating after mutation
5. Component not re-rendering with updated data

## Files Likely Involved
- `simple-client/src/app/dashboard/dashboard-client.tsx` (workspace list rendering)
- `simple-client/src/app/api/workspaces/[workspaceId]/route.ts` (PATCH endpoint)
- Workspace rename modal component (wherever the rename UI is implemented)

## Acceptance Criteria
- [ ] After renaming a workspace, the new name appears in the dashboard UI immediately
- [ ] The UI updates without requiring manual page reload
- [ ] Test `e2e/workspace.spec.ts:184` passes consistently
- [ ] No regression in workspace rename functionality

## Priority Justification
**High Priority** - This is core CRUD functionality for workspace management. Users will expect to see their changes reflected immediately. The broken UI feedback creates a poor user experience even though the backend works correctly.
