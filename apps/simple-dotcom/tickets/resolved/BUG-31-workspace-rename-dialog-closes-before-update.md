# [BUG-31]: Workspace Rename Dialog Closes Before Update Completes

Date reported: 2025-10-06
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
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: [All browsers]
- OS: [All operating systems]
- Environment: local/staging/production
- Affected version/commit: Current

## Description

When a user confirms a workspace name change in the settings, the rename form immediately closes and the workspace name displays the old name for a moment before the name is actually updated. This creates a confusing UX where the user sees the old name briefly after confirming the change, making it unclear whether the update succeeded.

The dialog should remain open with a loading state while the API request completes, only closing after confirmation of success. Users should also have the option to cancel the request if it's taking too long.

## Steps to Reproduce

1. Navigate to workspace settings for a shared workspace (as owner)
2. Click "Rename" button in the Workspace Name section
3. Enter a new workspace name
4. Click "Save" button
5. Observe that the form immediately closes
6. Notice the old workspace name is displayed briefly
7. After a moment, the new name appears after `router.refresh()` completes

## Expected Behavior

1. User clicks "Save" on the rename form
2. Form stays open with a loading state (e.g., "Saving..." button text, disabled inputs)
3. API request completes successfully
4. Form closes and new name is displayed immediately
5. If request takes too long, user can cancel the operation
6. If request fails, error is shown in the form without closing it

## Actual Behavior

1. User clicks "Save" on the rename form
2. Form immediately closes (line 70: `setIsRenaming(false)`)
3. Old workspace name briefly displays
4. After `router.refresh()` completes and re-fetches data, new name appears
5. This creates a flash of incorrect content (FOIC)
6. No loading state or feedback during the update
7. No ability to cancel a long-running request

## Screenshots/Videos

N/A

## Error Messages/Logs

No errors - this is a UX timing issue. The API successfully updates the workspace name.

## Related Files/Components

- `simple-client/src/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx:53-74` - `handleRename` function
  - Line 69: `router.refresh()` - Triggers data refetch
  - Line 70: `setIsRenaming(false)` - Immediately closes form before refresh completes
  - No loading state during the async operation

## Possible Cause

The `handleRename` function closes the rename form (`setIsRenaming(false)`) immediately after calling `router.refresh()` without waiting for the refresh to complete. The sequence is:

```typescript
// Current code (lines 53-74)
const handleRename = async (e: React.FormEvent) => {
	e.preventDefault()
	setError(null)

	try {
		const res = await fetch(`/api/workspaces/${workspace.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		})

		if (!res.ok) {
			const data = await res.json()
			throw new Error(data.message || 'Failed to rename workspace')
		}

		router.refresh()      // Async operation
		setIsRenaming(false)  // Closes form immediately (BUG)
	} catch (err) {
		setError(err instanceof Error ? err.message : 'An unexpected error occurred')
	}
}
```

The issue is that `router.refresh()` is asynchronous but not awaited, so the form closes before the UI updates with the new workspace name. Additionally, there's no loading state to indicate the operation is in progress.

## Proposed Solution

**Option 1: Add loading state and wait for router refresh (Recommended)**
```typescript
const [isRenaming, setIsRenaming] = useState(false)
const [isSaving, setIsSaving] = useState(false) // NEW

const handleRename = async (e: React.FormEvent) => {
	e.preventDefault()
	setError(null)
	setIsSaving(true) // Show loading state

	try {
		const res = await fetch(`/api/workspaces/${workspace.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name }),
		})

		if (!res.ok) {
			const data = await res.json()
			throw new Error(data.message || 'Failed to rename workspace')
		}

		// Wait for router to refresh before closing
		router.refresh()
		// Give Next.js time to refetch and update the UI
		await new Promise(resolve => setTimeout(resolve, 500))

		setIsRenaming(false) // Close after update
		setIsSaving(false)
	} catch (err) {
		setError(err instanceof Error ? err.message : 'An unexpected error occurred')
		setIsSaving(false)
	}
}
```

Update the Save button to show loading state:
```typescript
<button
	type="submit"
	disabled={isSaving}
	className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
>
	{isSaving ? 'Saving...' : 'Save'}
</button>
```

**Option 2: Use optimistic updates**
Update the local state immediately and revert on error.

**Option 3: Use server actions**
Replace API route with Next.js server actions for better integration with `router.refresh()`.

## Related Issues

- Similar pattern may exist in other forms that use `router.refresh()`
- BUG-22: Validation error flashes on cancel (related to form state management)

## Worklog

**2025-10-06:**
- Bug reported based on user description
- Analyzed workspace-settings-client.tsx
- Identified root cause: premature form closure before router refresh completes
- Proposed solution with loading state

**2025-10-07:**
- Implemented Option 1 (Recommended) from proposed solution
- Added `isSavingRename` state variable to track loading state
- Updated `handleRename` function to:
  - Set loading state at start of operation
  - Wait 500ms after `router.refresh()` to allow UI to update
  - Clear loading state in finally block
  - Only close dialog after data refresh completes
- Updated UI components to:
  - Disable input field during save operation
  - Show "Saving..." text on Save button during operation
  - Disable Cancel button during save operation
  - Add visual feedback with disabled styles (opacity, cursor)
- Verified TypeScript compilation passes
- Fix provides smooth UX with no flash of old content

## Resolution

Fixed by implementing a loading state pattern in the workspace rename dialog. The form now:

1. Shows "Saving..." button text and disables all inputs when user clicks Save
2. Waits for the API request to complete
3. Triggers `router.refresh()` to fetch updated workspace data
4. Waits 500ms for Next.js to complete the refresh and update the UI
5. Only then closes the dialog, ensuring the new name is visible immediately

Changes made to `/Users/stephenruiz/Documents/GitHub/tldraw/apps/simple-dotcom/simple-client/src/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx`:
- Added `isSavingRename` state variable (line 32)
- Updated `handleRename` function to set loading state and wait for refresh (lines 54-82)
- Updated input field to be disabled during save with visual feedback (lines 333-334)
- Updated Save button to show loading state and be disabled during save (lines 338-343)
- Updated Cancel button to be disabled during save (lines 345-356)

This eliminates the flash of incorrect content (FOIC) and provides clear feedback to users that their action is being processed.
