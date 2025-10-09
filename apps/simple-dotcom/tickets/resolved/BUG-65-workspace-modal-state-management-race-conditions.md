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

- Browser: Chrome (Playwright tests), all browsers affected
- OS: macOS, Linux CI environment
- Environment: local/test/development
- Affected version/commit: All versions prior to 2025-10-09 fix

## Description

The workspace creation and rename modal components suffered from multiple concurrent state management issues that created race conditions and unpredictable behavior:

1. **Stale Closure Problem**: Modal callbacks captured outdated state values due to React's closure behavior
2. **State Update Ordering**: Loading state was reset after modal closure, leaving buttons disabled
3. **Async Query Pattern**: Used `invalidateQueries` instead of `await refetchQueries`, causing premature modal closure

These issues combined to create an unreliable user experience where modals would:
- Remain stuck open with disabled buttons
- Close before operations completed
- Use incorrect data from stale closures
- Fail E2E tests intermittently

## Steps to Reproduce

### Scenario 1: Stale Closure Issue
1. Open dashboard at `/dashboard`
2. Click "Create Workspace" button
3. Type "Test Workspace" in the input
4. Click "Create" button
5. Observe: The modal would sometimes create a workspace with no name or the previous name

### Scenario 2: Button Stuck Disabled
1. Open dashboard
2. Click on workspace dropdown menu
3. Select "Rename"
4. Enter new name and click "Rename"
5. If network was slow, observe: Button remained disabled even after modal closed

### Scenario 3: Premature Modal Close
1. Open dashboard
2. Create or rename a workspace
3. During the operation (before completion)
4. Observe: Modal closes but workspace list doesn't update immediately

## Expected Behavior

1. **Correct Data Flow**: Modal should use the current input value, not stale state
2. **Button State**: Confirm button should disable during operation, then re-enable before modal closes
3. **Synchronous Updates**: Modal should remain open until data is fully fetched and UI updated
4. **Clean State Transitions**: All state should be properly reset in the correct order

## Actual Behavior

Multiple race conditions occurred:
- **Stale closures**: Created workspaces with empty or old names
- **Stuck buttons**: Buttons remained disabled after operations completed
- **Premature closure**: Modals closed before data was refreshed
- **Test failures**: E2E tests timed out waiting for modals to close

## Screenshots/Videos

Not applicable - state management issue visible only through debugging and test failures.

## Error Messages/Logs

### E2E Test Failure:
```
Test timeout of 60000ms exceeded.

Error: page.waitForSelector: Target page, context or browser has been closed
Call log:
  - waiting for locator('[data-testid="rename-workspace-input"]') to be hidden
  - 2 × locator resolved to visible <input disabled ...>
  - 119 × locator resolved to visible <input ...>
```

The "119 × locator resolved to visible" indicates the modal never closed properly.

### Console Errors (Development):
```javascript
Warning: Can't perform a React state update on an unmounted component.
This is a no-op, but it indicates a memory leak in your application.
```

## Related Files/Components

- `simple-client/src/app/dashboard/dashboard-client.tsx`
  - Lines 477-520: Create workspace modal handler
  - Lines 540-594: Rename workspace modal handler
  - Lines 137-184: handleCreateWorkspace function (old implementation)
  - Lines 186-215: handleRenameWorkspace function (old implementation)

- `simple-client/src/components/ui/prompt-dialog.tsx`
  - Modal component that accepts onConfirm callbacks

## Possible Cause

### Root Cause Analysis:

#### 1. Stale Closure Problem

The original implementation separated the modal callback from the handler:

```typescript
// BAD: Stale closure pattern
onConfirm={async (name) => {
    setNewWorkspaceName(name)  // Set state
    await handleCreateWorkspace()  // This uses state, but state is async!
}}

const handleCreateWorkspace = useCallback(async () => {
    // This captures newWorkspaceName from closure
    // But the state update from onConfirm hasn't completed yet!
    body: JSON.stringify({ name: newWorkspaceName.trim() })
}, [newWorkspaceName, ...])
```

React state updates are asynchronous and batched. The `handleCreateWorkspace` function captured the old value of `newWorkspaceName` from its closure.

#### 2. Wrong State Update Order

```typescript
// BAD: Finally block runs after modal close
try {
    // ... API call ...
    if (success) {
        setShowModal(false)  // Close modal first
        // ... other updates ...
    }
} finally {
    setActionLoading(false)  // This runs AFTER modal is closed!
}
```

The `finally` block executes after all other code, including modal closure. This left the button in a disabled state.

#### 3. Async Query Timing

```typescript
// BAD: Doesn't wait for refetch
queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })
setShowModal(false)  // Closes immediately
```

`invalidateQueries` only marks queries as stale; it doesn't wait for the refetch. The modal closed before data was updated.

## Proposed Solution

### Solution Implementation:

1. **Inline all async logic** in the onConfirm callback to avoid closures
2. **Use the parameter directly** instead of state values
3. **Reset loading state BEFORE closing modal**
4. **Use `await refetchQueries()`** for synchronous data updates
5. **Remove `finally` blocks** that interfere with state ordering

## Related Issues

- Related to: BUG-58 (Workspace creation UI not updating realtime)
- Related to: BUG-63 (PromptDialog premature auto-close)
- Related to: BUG-59 (Workspace deletion crash - similar refetchQueries pattern)
- Blocks: None (resolved)

## Worklog

**2025-10-09:**
- Identified race conditions through E2E test failures
- Traced stale closure issue in onConfirm callbacks
- Found state update ordering problem with finally blocks
- Discovered invalidateQueries vs refetchQueries timing difference
- Refactored all modal handlers to inline pattern
- Fixed state update ordering: loading=false before modal close
- Changed to await refetchQueries for synchronous updates
- Verified all workspace CRUD operations work correctly
- All E2E tests now passing consistently

## Resolution

**Fixed by refactoring modal state management patterns:**

### 1. Inlined Create Workspace Logic

```typescript
// GOOD: Direct parameter usage, no stale closure
onConfirm={async (name) => {
    if (!name.trim()) {
        setValidationError('Workspace name is required')
        return
    }

    try {
        setActionLoading(true)
        setValidationError(null)

        const response = await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }), // Use parameter directly!
            signal: abortController.signal,
        })

        const data = await response.json()

        if (data.success && data.data) {
            // Synchronous refetch
            await queryClient.refetchQueries({ queryKey: ['dashboard', userId] })

            // Reset state BEFORE closing modal
            setActionLoading(false)
            setShowCreateModal(false)
        } else {
            setValidationError(data.error?.message || 'Failed')
            setActionLoading(false)
        }
    } catch (err) {
        setActionLoading(false)
        // Error handling...
    }
    // NO finally block!
}}
```

### 2. Fixed Rename Workspace Pattern

Similar refactoring applied to rename modal:
- Inlined all logic in onConfirm
- Used parameter directly
- Proper state ordering
- Await refetchQueries

### 3. Key Patterns Established

**DO:**
- Inline async logic in modal callbacks
- Use callback parameters directly
- Reset loading state before closing modal
- Use `await refetchQueries()` for synchronous updates
- Handle errors without `finally` blocks

**DON'T:**
- Separate handler functions that rely on state
- Use state values in callbacks (use parameters)
- Put state resets in `finally` blocks
- Use `invalidateQueries` when synchronous update needed
- Close modal before data is refreshed

### Test Verification:

All E2E tests now passing:
- ✅ Workspace creation (3/3 tests)
- ✅ Workspace rename (3/3 tests)
- ✅ Workspace deletion (3/3 tests)
- ✅ No timeout errors
- ✅ No stuck modals
- ✅ Proper state management

### Impact Assessment:

This fix resolves a class of React state management issues that affected:
- User experience (stuck UI, confusing behavior)
- Test reliability (intermittent failures)
- Code maintainability (complex state dependencies)

The refactored pattern is now consistent across all modal interactions and provides a template for future modal implementations.