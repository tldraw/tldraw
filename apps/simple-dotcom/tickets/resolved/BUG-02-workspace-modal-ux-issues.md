# [BUG-02]: Multiple UX Issues in Create Workspace Modal

Date reported: 2025-10-05
Date last updated: 2025-10-05
Date resolved: 2025-10-05

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

- Browser: All browsers
- OS: All operating systems
- Environment: local/staging/production
- Affected version/commit: Current main branch

## Description

The "Create New Workspace" modal in the dashboard has multiple UX issues that significantly degrade the user experience and could lead to data inconsistencies. The modal lacks standard keyboard interactions, proper validation, and has race condition issues with request handling.

## Steps to Reproduce

### Issue 1: Missing Escape Key Handling
1. Navigate to `/dashboard`
2. Click "Create Workspace" button
3. Press Escape key
4. **Expected**: Modal closes
5. **Actual**: Nothing happens, modal remains open

### Issue 2: No Auto-Focus on Input
1. Navigate to `/dashboard`
2. Click "Create Workspace" button
3. **Expected**: Input field is automatically focused
4. **Actual**: Input field is not focused, user must click to start typing

### Issue 3: No Enter Key Submit
1. Navigate to `/dashboard`
2. Click "Create Workspace" button
3. Type a workspace name
4. Press Enter key
5. **Expected**: Form submits
6. **Actual**: Nothing happens

### Issue 4: Missing Empty Name Validation UI
1. Navigate to `/dashboard`
2. Click "Create Workspace" button
3. Leave input field empty
4. Note: Submit button is disabled (good)
5. **Expected**: Clear validation message like "Workspace name is required"
6. **Actual**: No validation message shown, user may not understand why button is disabled

### Issue 5: Missing Duplicate Name Validation
1. Navigate to `/dashboard`
2. Create a workspace named "Test Workspace"
3. Click "Create Workspace" button again
4. Enter "Test Workspace" as the name
5. Click Create button
6. **Expected**: Error message "A workspace with this name already exists"
7. **Actual**: Creates another workspace with the same name (no uniqueness check)

### Issue 6: Modal Closes Prematurely
1. Navigate to `/dashboard`
2. Click "Create Workspace" button
3. Enter a workspace name
4. Simulate slow network (Chrome DevTools → Network → Slow 3G)
5. Click Create button
6. **Expected**: Modal stays open showing "Creating..." until request completes
7. **Actual**: Modal closes immediately (line 74 in dashboard-client.tsx)

### Issue 7: No Request Cancellation
1. Navigate to `/dashboard`
2. Click "Create Workspace" button
3. Enter a workspace name
4. Click Create button
5. Immediately close the modal using the Cancel button (if network is slow)
6. **Expected**: The pending request should be aborted
7. **Actual**: Request continues and workspace is created in background

### Issue 8: No Error Handling in Modal
1. Navigate to `/dashboard`
2. Click "Create Workspace" button
3. Enter a workspace name
4. Simulate API failure (e.g., network offline)
5. Click Create button
6. **Expected**: Error shows in modal with retry option
7. **Actual**: Modal closes, error shown via browser alert() (lines 77, 81)

## Expected Behavior

1. **Keyboard Accessibility**:
   - Escape key should close the modal
   - Enter key should submit the form when input is valid
   - Input field should be auto-focused when modal opens

2. **Validation**:
   - Clear validation messages for empty names
   - Check for duplicate workspace names within user's workspaces
   - Display validation errors inline in the modal

3. **Async Handling**:
   - Modal should remain open during the entire request lifecycle
   - Show loading state during request processing
   - Only close modal after successful completion
   - Display errors within the modal context with retry option

4. **Request Management**:
   - Implement AbortController for request cancellation
   - Cancel pending requests if user closes modal
   - Prevent accidental workspace creation

## Actual Behavior

- No keyboard shortcuts work (Escape, Enter)
- No input auto-focus
- No validation messages shown
- No duplicate name checking
- Modal closes immediately after clicking Create, before request completes
- Uses browser alert() for error messages
- No request cancellation mechanism
- Poor error handling UX

## Screenshots/Videos

N/A - UI interaction issues

## Error Messages/Logs

Current error handling uses browser alert():
```javascript
// Line 77
alert(data.error?.message || 'Failed to create workspace')

// Line 81
alert('Failed to create workspace')
```

## Related Files/Components

- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx` (Lines 369-404)
  - Modal component implementation
  - handleCreateWorkspace function (Lines 54-85)

- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/api/workspaces/route.ts`
  - POST handler for workspace creation
  - Has validation for empty names (Line 73-75)
  - No duplicate name checking

- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/e2e/workspace.spec.ts`
  - E2E tests exist but don't test these UX issues

## Possible Cause

1. **Keyboard handling**: No event listeners attached for keyboard events on modal
2. **Auto-focus**: Missing `autoFocus` prop or `useEffect` to focus input
3. **Premature closing**: `setShowCreateModal(false)` called on Line 74 before error checking
4. **No request cancellation**: Missing AbortController implementation
5. **Poor error UX**: Using browser alert() instead of inline error display
6. **No duplicate validation**: API doesn't check for duplicate workspace names

## Proposed Solution

1. **Add keyboard event handling**:
```typescript
// Add to modal component
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCloseModal()
    } else if (e.key === 'Enter' && newWorkspaceName.trim()) {
      handleCreateWorkspace()
    }
  }

  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [newWorkspaceName])
```

2. **Add auto-focus**:
```typescript
<input
  autoFocus
  type="text"
  // ... rest of props
/>
```

3. **Fix async flow**:
```typescript
const handleCreateWorkspace = async () => {
  if (!newWorkspaceName.trim()) {
    setValidationError('Workspace name is required')
    return
  }

  try {
    setActionLoading(true)
    setValidationError('')

    const abortController = new AbortController()
    setCurrentRequest(abortController)

    const response = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newWorkspaceName.trim() }),
      signal: abortController.signal
    })

    const data = await response.json()

    if (data.success && data.data) {
      // Only close modal on success
      setShowCreateModal(false)
      setNewWorkspaceName('')
      // Update dashboard data...
    } else {
      // Show error in modal
      setValidationError(data.error?.message || 'Failed to create workspace')
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      setValidationError('Failed to create workspace. Please try again.')
    }
  } finally {
    setActionLoading(false)
    setCurrentRequest(null)
  }
}

const handleCloseModal = () => {
  // Cancel any pending request
  if (currentRequest) {
    currentRequest.abort()
  }
  setShowCreateModal(false)
  setNewWorkspaceName('')
  setValidationError('')
}
```

4. **Add duplicate name checking in API**:
```typescript
// In POST /api/workspaces
// Check for duplicate names
const { data: existingWorkspace } = await supabaseAdmin
  .from('workspaces')
  .select('id')
  .eq('owner_id', user.id)
  .eq('name', body.name.trim())
  .eq('is_deleted', false)
  .single()

if (existingWorkspace) {
  throw new ApiException(
    422,
    ErrorCodes.DUPLICATE_WORKSPACE_NAME,
    'A workspace with this name already exists'
  )
}
```

5. **Add validation display in modal**:
```typescript
{validationError && (
  <p className="text-red-500 text-sm mt-2">{validationError}</p>
)}
```

## Related Issues

- Related to: None identified
- Duplicates: None
- Blocks: User onboarding experience

## Worklog

**2025-10-05:**
- Initial bug report created
- Analyzed dashboard-client.tsx implementation
- Identified 8 distinct UX issues in workspace creation modal
- Reviewed E2E tests which don't cover these scenarios
- Proposed comprehensive solutions for each issue

## Resolution

**Resolved on 2025-10-05**

All 8 issues have been successfully fixed:

1. ✅ **Escape Key Handling**: Modal now closes when pressing Escape
2. ✅ **Auto-Focus on Input**: Input field is automatically focused when modal opens
3. ✅ **Enter Key Submit**: Form submits when pressing Enter (if valid)
4. ✅ **Empty Name Validation UI**: Shows clear validation message for empty names
5. ✅ **Duplicate Name Validation**: Checks for duplicate workspace names and shows error
6. ✅ **Modal Stays Open During Request**: Modal no longer closes prematurely
7. ✅ **Request Cancellation**: Implemented AbortController to cancel requests if modal is closed
8. ✅ **Better Error Handling**: Shows errors inline in modal instead of using browser alert()

**Files Modified:**
- `/apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx` - Main modal implementation fixes
- `/apps/simple-dotcom/simple-client/src/app/api/workspaces/route.ts` - Added duplicate name validation
- `/apps/simple-dotcom/simple-client/src/lib/api/errors.ts` - Added DUPLICATE_WORKSPACE_NAME error code

**Tests Added:**
- `/apps/simple-dotcom/simple-client/e2e/workspace-modal-ux.spec.ts` - E2E tests for all UX fixes

All E2E tests pass (94 passing, 3 skipped), including the new UX tests.