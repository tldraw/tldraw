# [BUG-59]: Browser/Page Crashes During Workspace Deletion Confirmation

Date reported: 2025-10-09
Date last updated: 2025-10-09
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

## Priority

**P1 (High) - Fix Soon**

**Rationale:**
- **Affects 2 E2E tests** (workspace deletion tests)
- **Severe symptom**: Page/browser crashes completely (not just UI issue)
- **May be related to BUG-58**: If BUG-58's deletion tests also crash, may share root cause
- **Safety issue**: Crashes during deletion could indicate data integrity problems
- **User impact**: Users cannot delete workspaces without browser crash

**Why not P0:**
- Only affects 2 tests
- BUG-58 has broader impact and should be fixed first
- May be resolved when BUG-58 is fixed (if related to realtime/broadcast issues)
- Deletion is less frequent operation than create/view

**Investigation Priority:**
1. **After BUG-58 is fixed**, re-run these tests to see if issue persists
2. If still crashing, investigate DeleteWorkspaceDialog component
3. Check for navigation issues or redirect loops
4. Review error handling in DELETE API route

**Note:** Consider investigating alongside BUG-58 since both affect workspace operations

## Category

- [ ] Authentication
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

- Browser: Chromium (Playwright E2E tests)
- OS: macOS
- Environment: local
- Affected version/commit: current (2025-10-09)

## Description

When attempting to delete a workspace by clicking the "Confirm Delete" button in the deletion confirmation dialog, the browser page/context closes unexpectedly, causing tests to timeout. This affects at least 2 E2E tests and may indicate a navigation error, redirect loop, or JavaScript crash.

This is a **different issue** from BUG-58. While BUG-58 is about UI not updating after successful operations, this bug is about the page/browser crashing during the deletion operation itself.

## Steps to Reproduce

1. Navigate to workspace settings or dashboard
2. Click "Delete Workspace" button for a shared workspace
3. Deletion confirmation dialog appears
4. Click "Confirm Delete Workspace" button
5. Browser context closes/crashes before operation completes
6. Test timeout error: "Target page, context or browser has been closed"

## Expected Behavior

- Clicking "Confirm Delete Workspace" should:
  1. Send DELETE request to `/api/workspaces/[workspaceId]`
  2. Wait for server response
  3. Close the confirmation modal
  4. Redirect to dashboard (if on workspace page)
  5. Remove workspace from listings
  6. Show success message

## Actual Behavior

- Clicking "Confirm Delete Workspace" causes:
  1. Browser page/context to close immediately
  2. Test timeout after 30 seconds
  3. Error: "Target page, context or browser has been closed"
  4. Cannot complete the deletion flow

## Affected E2E Tests

### workspace.spec.ts (2 failures):
1. "should soft delete a shared workspace" - browser closes at line 360
2. "should remove workspace from listings after soft delete" - browser closes at line 440

## Error Messages/Logs

```
Test timeout of 30000ms exceeded.

Error: page.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('[data-testid="confirm-delete-workspace"]')

  358 |
  359 |     // Confirm deletion
> 360 |     await page.click('[data-testid="confirm-delete-workspace"]')
      |                ^
  361 |
  362 |     // Wait for modal to close
  363 |     await page.waitForSelector('[data-testid="confirm-delete-workspace"]', { state: 'hidden' })
```

## Related Files/Components

**Deletion Dialog:**
- `src/components/workspace/DeleteWorkspaceDialog.tsx` - deletion confirmation UI
- Likely contains the problematic button/form handler

**API Route:**
- `src/app/api/workspaces/[workspaceId]/route.ts` - DELETE endpoint
- May have redirect or error that crashes page

**Dashboard/Workspace Pages:**
- `src/app/dashboard/dashboard-client.tsx` - where workspace list is displayed
- `src/app/workspace/[workspaceId]/page.tsx` - workspace page that may redirect

## Possible Cause

Several potential causes:

1. **Navigation error**: DELETE response may trigger redirect to invalid/non-existent route
2. **Redirect loop**: Page may redirect to itself or create infinite redirect loop
3. **JavaScript crash**: Unhandled error in deletion handler crashes the page
4. **Modal state bug**: Dialog close/unmount triggers error that crashes page
5. **Race condition**: Page navigates away before dialog properly closes
6. **API error handling**: 500/error response not properly handled, causing crash

## Proposed Solution

### Investigation Steps:

1. **Review DELETE API route** (`src/app/api/workspaces/[workspaceId]/route.ts`):
   - Check if it returns proper redirect
   - Verify error handling doesn't cause crashes
   - Look for any navigation logic

2. **Review DeleteWorkspaceDialog component**:
   - Check onClick handler for confirm button
   - Look for navigation logic (router.push, redirect, etc.)
   - Verify error handling in mutation callbacks
   - Check if modal closes before navigation completes

3. **Check browser console logs** in test results:
   - Screenshots available in test-results directory
   - May show JavaScript errors before crash

4. **Add defensive error handling**:
   - Wrap deletion in try/catch
   - Add error boundaries around modal
   - Ensure proper loading states

### Potential Fix Pattern:

```typescript
// In DeleteWorkspaceDialog.tsx
const handleDelete = async () => {
  setIsDeleting(true)
  try {
    // Call DELETE API
    const response = await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error('Failed to delete workspace')
    }

    // Wait for query invalidation BEFORE navigation
    await queryClient.invalidateQueries({ queryKey: ['workspaces'] })

    // Close modal
    onClose()

    // THEN navigate (if needed)
    if (onWorkspacePage) {
      router.push('/dashboard')
    }
  } catch (error) {
    console.error('Failed to delete workspace:', error)
    setError('Failed to delete workspace. Please try again.')
  } finally {
    setIsDeleting(false)
  }
}
```

## Related Issues

- May be related to: BUG-58 (workspace UI not updating - different issue)
- Similar pattern to: BUG-43 (page crash during signin), BUG-37, BUG-40 (invite page crashes)
- Blocks: 2 E2E tests in workspace.spec.ts

## Worklog

**2025-10-09:**
- Identified 2 test failures with browser crash pattern during E2E review
- Pattern distinct from BUG-58 (which is about UI not updating after success)
- This bug is about page crashing during deletion operation
- Created bug ticket for investigation

## Resolution

(To be filled when resolved)
