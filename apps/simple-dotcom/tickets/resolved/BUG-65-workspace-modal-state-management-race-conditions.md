# [BUG-65]: Workspace Modal State Management Race Conditions

Date reported: 2025-10-09
Date last updated: 2025-10-09
Date resolved: 2025-10-09

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

- Browser: Chrome (Playwright tests)
- OS: macOS
- Environment: local/test
- Affected version/commit: Before fix on 2025-10-09

## Description

The workspace creation and rename modal handlers in dashboard-client had race conditions due to improper state management order. Specifically:

1. **Stale closure issue**: The `onConfirm` callback called a separate `handleCreateWorkspace` function that relied on `newWorkspaceName` state instead of using the parameter passed to `onConfirm`
2. **State update order**: The `actionLoading` state was reset in a `finally` block, which executed AFTER modal close, leaving the button disabled
3. **React Query pattern**: Used `invalidateQueries` instead of `await refetchQueries`, causing modal to close before data was fetched

These issues caused modals to remain stuck open with disabled buttons, or to close prematurely before operations completed.

## Steps to Reproduce

1. Open dashboard
2. Click "Create Workspace" or "Rename Workspace"
3. Enter a name and click confirm
4. Observe:
   - Button stays disabled
   - Modal doesn't close
   - Or modal closes but data doesn't update

## Expected Behavior

When creating or renaming a workspace:
1. Button disables and shows "Processing..." immediately
2. API call completes
3. React Query refetches data and waits for completion
4. Button re-enables
5. Modal closes cleanly
6. UI shows updated workspace list

## Actual Behavior

Multiple issues occurred:
- Modal stayed open indefinitely with button disabled
- Modal closed before API response arrived (race condition)
- State updates happened in wrong order
- Stale closure caused wrong workspace name to be used

## Error Messages/Logs

```
Test timeout of 60000ms exceeded.

Error: page.waitForSelector: Target page, context or browser has been closed
Call log:
  - waiting for locator('[data-testid="rename-workspace-input"]') to be hidden
  - 2 × locator resolved to visible <input disabled ...>
  - 119 × locator resolved to visible <input ...>
```

The "119 × locator resolved to visible" indicates the modal never closed.

## Related Files/Components

- `simple-client/src/app/dashboard/dashboard-client.tsx:137-184` (handleCreateWorkspace)
- `simple-client/src/app/dashboard/dashboard-client.tsx:186-215` (handleRenameWorkspace)
- `simple-client/src/app/dashboard/dashboard-client.tsx:477-524` (create modal)
- `simple-client/src/app/dashboard/dashboard-client.tsx:527-575` (rename modal)

## Possible Cause

### Issue 1: Stale Closure

Original code:
```typescript
onConfirm={async (name) => {
    setNewWorkspaceName(name)  // Set state
    await handleCreateWorkspace()  // Uses newWorkspaceName state (stale!)
}}
```

The `handleCreateWorkspace` function used `newWorkspaceName` state, but React state updates are async. So the function ran with the OLD value.

### Issue 2: State Update Order

Original code in `handleRenameWorkspace`:
```typescript
if (data.success && data.data) {
    await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
    setShowRenameModal(false)
    setNewWorkspaceName('')
    setSelectedWorkspace(null)
    toast.success('Workspace renamed successfully')
} else {
    toast.error(data.error?.message || 'Failed to rename workspace')
}
} catch (err) {
    console.error('Failed to rename workspace:', err)
    toast.error('Failed to rename workspace')
} finally {
    setActionLoading(false)  // Runs AFTER modal closes!
}
```

The `finally` block ran after the modal close, so button stayed disabled.

### Issue 3: Invalidate vs Refetch

Original code used:
```typescript
queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
```

This marks queries as stale but doesn't wait for refetch to complete before closing modal.

## Proposed Solution

1. Inline all async logic directly in `onConfirm` callback
2. Use the `name` parameter instead of state
3. Set `actionLoading=false` BEFORE closing modal
4. Use `await refetchQueries()` instead of `invalidateQueries()`
5. Remove `finally` blocks that reset loading state

## Related Issues

- Part of BUG-58: Workspace creation UI not updating realtime
- Related to BUG-63: PromptDialog auto-close timing
- Related to BUG-59: Workspace deletion browser crash (same refetchQueries pattern)

## Worklog

**2025-10-09:**
- Identified stale closure issue in onConfirm callbacks
- Found state update order problem in finally blocks
- Discovered invalidateQueries vs refetchQueries timing issue
- Refactored all modal handlers to inline logic
- Fixed state update order: actionLoading=false before modal close
- Changed to await refetchQueries for proper synchronization
- Verified all tests pass with new implementation

## Resolution

### 1. Inlined workspace creation logic

In `simple-client/src/app/dashboard/dashboard-client.tsx:477-520`:

```typescript
onConfirm={async (name) => {
    if (!name.trim()) {
        setValidationError('Workspace name is required')
        return
    }

    try {
        setActionLoading(true)
        setValidationError(null)

        const abortController = new AbortController()
        currentRequestRef.current = abortController

        const response = await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }),  // Use parameter, not state!
            signal: abortController.signal,
        })

        const data = await response.json()

        if (data.success && data.data) {
            await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
            setExpandedWorkspaces((prev) => new Set([...prev, data.data.id]))
            setNewWorkspaceName('')
            setValidationError(null)
            setActionLoading(false)  // BEFORE close
            currentRequestRef.current = null
            setShowCreateModal(false)  // AFTER loading=false
        } else {
            setValidationError(data.error?.message || 'Failed to create workspace')
            setActionLoading(false)
            currentRequestRef.current = null
        }
    } catch (err: any) {
        if (err.name !== 'AbortError') {
            console.error('Failed to create workspace:', err)
            setValidationError('Failed to create workspace. Please try again.')
        }
        setActionLoading(false)
        currentRequestRef.current = null
    }
}}
```

Key changes:
- Use `name` parameter directly (no stale closure)
- `setActionLoading(false)` before `setShowCreateModal(false)`
- `await refetchQueries()` ensures data is loaded before close
- No `finally` block

### 2. Inlined workspace rename logic

In `simple-client/src/app/dashboard/dashboard-client.tsx:540-569`:

```typescript
onConfirm={async (name) => {
    if (!selectedWorkspace || !name.trim()) return

    try {
        setActionLoading(true)
        const response = await fetch(`/api/workspaces/${selectedWorkspace.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }),
        })

        const data = await response.json()

        if (data.success && data.data) {
            await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
            setActionLoading(false)  // BEFORE close
            setShowRenameModal(false)
            setNewWorkspaceName('')
            setSelectedWorkspace(null)
            toast.success('Workspace renamed successfully')
        } else {
            setActionLoading(false)
            toast.error(data.error?.message || 'Failed to rename workspace')
        }
    } catch (err) {
        console.error('Failed to rename workspace:', err)
        setActionLoading(false)
        toast.error('Failed to rename workspace')
    }
}}
```

Same pattern: explicit state management with proper ordering.

**Test Results:**
- Workspace creation: 3/3 PASS ✅
- Workspace rename: 3/3 PASS ✅
- Workspace deletion: 3/3 PASS ✅ (from previous fix)
- No more stuck modals
- Clean state transitions
- Proper button enable/disable
