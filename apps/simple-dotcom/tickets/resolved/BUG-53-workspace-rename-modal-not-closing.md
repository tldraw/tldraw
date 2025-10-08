# BUG-53: Workspace Rename Modal Does Not Close After Rename Operation

## Status
- **State**: COMPLETED
- **Priority**: High
- **Category**: UI Bug
- **Component**: Dashboard - Workspace Rename Modal
- **Related Tests**: `e2e/workspace.spec.ts:276` - "should persist rename across page reload"
- **Related Bug**: BUG-52 (shared root cause - fixed together)
- **Fixed**: 2025-10-08
- **Fix Commit**: Part of workspace rename refactor

## Description
After clicking the confirm button to rename a workspace, the rename modal remains open and does not close. The test times out waiting 60 seconds for the modal input field to become hidden. The input field goes through multiple state changes (disabled → enabled) but never closes.

## Test Failure
```
Test timeout of 60000ms exceeded.

Error: page.waitForSelector: Target page, context or browser has been closed
Call log:
  - waiting for locator('[data-testid="rename-workspace-input"]') to be hidden
    7 × locator resolved to visible <input disabled ...>
    110 × locator resolved to visible <input type="text" ...>

At: e2e/workspace.spec.ts:308:15
```

## Steps to Reproduce
1. Log in as an authenticated user
2. Create a shared workspace (not private)
3. Add user as owner/member
4. Reload page to see the workspace
5. Click rename button for the workspace
6. Enter a new name in the input field
7. Click "Confirm rename" button
8. **Expected**: Modal closes
9. **Actual**: Modal remains open indefinitely

## Expected Behavior
- After clicking confirm rename button, the modal should close
- The rename input field should become hidden
- User returns to the normal dashboard view
- Modal dismissal should happen within 1-2 seconds

## Actual Behavior
- The confirm button is clicked successfully
- The input field changes state multiple times:
  - Initially appears with disabled state (7 times)
  - Then appears with enabled state (110+ times)
- The modal never closes
- Test times out after 60 seconds waiting for the modal to close

## Technical Details
Test location: `simple-client/e2e/workspace.spec.ts:276-319`

The test sequence:
1. Create workspace ✅
2. Add member ✅
3. Reload page ✅
4. Click rename button ✅
5. Fill in new name ✅
6. Click confirm ✅
7. Wait for modal to close ❌ FAILS - modal never closes
8. (Subsequent steps never execute)

## Interesting Observations
1. The input field shows 7 state changes where it's disabled
2. Followed by 110+ state changes where it's enabled
3. This suggests some kind of rendering loop or repeated re-rendering
4. The modal content is updating but the modal itself never dismisses

## Root Cause Analysis Needed
Possible causes:
1. Missing modal close handler after successful API call
2. Error in API call not being handled properly
3. Optimistic update triggering re-renders but not closing modal
4. React state update causing infinite re-render loop
5. Modal state management issue
6. Missing or broken onSuccess callback in mutation

## Files Likely Involved
- Workspace rename modal component (wherever the UI is implemented)
- `simple-client/src/app/api/workspaces/[workspaceId]/route.ts` (PATCH endpoint)
- Modal state management code

## Connection to BUG-52
This bug and BUG-52 may share a common root cause:
- Both involve the rename operation
- Both suggest state management issues
- Both have symptoms of UI not properly updating after rename
- May be fixed together with a single solution

## Acceptance Criteria
- [x] After clicking confirm rename, the modal closes within 2 seconds
- [x] The rename input field becomes hidden after successful rename
- [x] No infinite re-rendering loops in the modal
- [x] Test `e2e/workspace.spec.ts:276` passes consistently
- [x] Modal properly handles both success and error cases

## Priority Justification
**High Priority** - This completely blocks the rename workflow. Users cannot dismiss the modal after attempting a rename, creating a broken UX. This is worse than BUG-52 because users get stuck in the modal state.

## Related Issues
- BUG-52: Workspace Rename UI Not Updating After Successful Rename

---

## Resolution

### Root Cause
The bug was caused by using `queryClient.invalidateQueries()` instead of `await queryClient.refetchQueries()` in the rename handler. The `invalidateQueries` call only marks the data as stale but doesn't wait for the refetch to complete before executing the modal close logic. This created a race condition where:

1. The modal would attempt to close immediately after the API call
2. The invalidation triggered a background refetch
3. The refetch would cause re-renders while the modal was closing
4. This resulted in the modal state cycling and never properly closing

### The Fix
Changed line 192 in `dashboard-client.tsx` from:
```typescript
queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
```

To:
```typescript
await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
```

This change ensures that:
1. The refetch completes and data updates BEFORE the modal closes
2. The modal close logic (lines 193-195) executes in a stable state
3. No re-render cycles occur during modal dismissal

### Impact
This single change fixed BOTH BUG-52 and BUG-53:
- **BUG-52**: The UI now updates correctly because refetchQueries immediately fetches fresh data
- **BUG-53**: The modal closes properly because the await ensures stable state before dismissal

### Test Results
Test `e2e/workspace.spec.ts:276` - "should persist rename across page reload" now passes consistently:
- Modal closes within 1-2 seconds after rename
- No infinite re-rendering loops
- Workspace name updates correctly in UI
- Rename persists across page reloads

### Files Modified
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx` - Line 192
