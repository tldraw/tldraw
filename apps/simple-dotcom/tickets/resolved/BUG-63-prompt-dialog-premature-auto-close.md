# [BUG-63]: PromptDialog Auto-Closes Before Async Operations Complete

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

The PromptDialog component was closing immediately after the `onConfirm` callback completed, before async operations (like API calls and React Query refetches) could finish. This caused the page state to change mid-operation, leading to "Target page, context or browser has been closed" errors in tests and potential UI issues in production.

## Steps to Reproduce

1. Open dashboard
2. Click "Create Workspace" button
3. Enter a workspace name
4. Click "Create" button
5. Observe modal closes before API call completes
6. Tests fail with "Target page, context or browser has been closed"

## Expected Behavior

The modal should:
1. Show loading state during async operation
2. Wait for async operation to complete (success or error)
3. Only close when parent component explicitly closes it via `onOpenChange(false)` or `open=false`

## Actual Behavior

The modal closes immediately after `await onConfirm()` returns, causing:
- Page state to change mid-operation
- Tests to fail with "Target page, context or browser has been closed"
- Potential race conditions in the UI

## Error Messages/Logs

```
Test timeout of 30000ms exceeded.

Error: page.waitForResponse: Target page, context or browser has been closed

  78 |     const responsePromise = page.waitForResponse(
     |                                  ^
  79 |         (response) =>
  80 |             response.url().includes('/api/workspaces') && response.request().method() === 'POST'
  81 |     )
```

## Related Files/Components

- `simple-client/src/components/ui/prompt-dialog.tsx:66-73`
- `simple-client/src/app/dashboard/dashboard-client.tsx:477-520` (workspace creation)
- `simple-client/src/app/dashboard/dashboard-client.tsx:540-569` (workspace rename)

## Possible Cause

The `handleConfirm` function in PromptDialog had this logic:

```typescript
const handleConfirm = async () => {
    const trimmedValue = value.trim()
    if (!trimmedValue) return

    await onConfirm(trimmedValue)
    if (!loading) {
        onOpenChange(false)
    }
}
```

The problem: `loading` is a prop passed from parent, and it's checked **synchronously** after the async `onConfirm` completes. But React state updates are batched, so even if `onConfirm` sets `loading=true`, the check happens before the re-render.

Additionally, the parent component's `onConfirm` callback was structured incorrectly:

```typescript
onConfirm={async (name) => {
    setNewWorkspaceName(name)
    await handleCreateWorkspace()
}}
```

This called a separate function that used `newWorkspaceName` state instead of the `name` parameter, causing stale closure issues.

## Proposed Solution

1. Remove auto-close logic from PromptDialog
2. Make parent components responsible for closing the modal
3. Inline async logic directly into `onConfirm` callbacks
4. Set `actionLoading=false` BEFORE closing modal to ensure button re-enables

## Related Issues

- Part of BUG-58: Workspace creation UI not updating realtime
- Related to BUG-62: Logger missing .logs directory crash
- Caused test failures in workspace creation and rename flows

## Worklog

**2025-10-09:**
- Identified that PromptDialog was closing prematurely
- Analyzed the timing issue with `loading` prop check
- Removed auto-close logic from PromptDialog
- Refactored dashboard-client to handle modal closing explicitly
- Fixed state management order: `setActionLoading(false)` before `setShowModal(false)`
- Verified all workspace creation and rename tests now pass

## Resolution

### 1. Fixed PromptDialog auto-close behavior

Changed `simple-client/src/components/ui/prompt-dialog.tsx:66-73`:

```typescript
const handleConfirm = async () => {
    const trimmedValue = value.trim()
    if (!trimmedValue) return

    await onConfirm(trimmedValue)
    // Note: Parent component is responsible for closing the dialog
    // via onOpenChange or by setting open=false
}
```

Removed the premature auto-close logic.

### 2. Fixed workspace creation modal

Inlined async logic in `dashboard-client.tsx:477-520`:

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
            body: JSON.stringify({ name: name.trim() }),
            signal: abortController.signal,
        })

        const data = await response.json()

        if (data.success && data.data) {
            await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })
            setExpandedWorkspaces((prev) => new Set([...prev, data.data.id]))
            setNewWorkspaceName('')
            setValidationError(null)
            setActionLoading(false)
            currentRequestRef.current = null
            setShowCreateModal(false) // Close AFTER setting actionLoading=false
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
- Inlined all async logic instead of calling separate function
- Set `actionLoading=false` BEFORE closing modal
- Explicit modal close on success only

### 3. Fixed workspace rename modal

Applied same pattern to rename in `dashboard-client.tsx:540-569`.

**Test Results:**
- Workspace creation: 3/3 tests PASS ✅
- Workspace rename: 3/3 tests PASS ✅
- No more "Target page closed" errors
- Modals close cleanly after operations complete
