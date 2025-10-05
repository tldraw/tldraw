# [BUG-03]: Profile Page Missing Unsaved Changes Warning

Date reported: 2025-10-05
Date last updated: 2025-10-05
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
- [ ] High (Major feature broken, significant impact)
- [x] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
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
- Affected version/commit: Current simple-dotcom branch

## Description

The profile page (`/profile`) does not warn users when they attempt to navigate away with unsaved changes. This can lead to accidental data loss when users modify their name or display name fields but navigate away (via the "Back to Dashboard" link, browser back button, or direct URL navigation) without clicking "Save changes".

This is a standard UX pattern that helps prevent user frustration and data loss, especially for forms with manual save buttons.

## Steps to Reproduce

### Scenario 1: Navigate via Back to Dashboard Link
1. Navigate to `/profile` (logged in as a test user)
2. Change the "Full name" field to a new value (e.g., "John Updated")
3. Do NOT click "Save changes"
4. Click the "Back to Dashboard" link at the top of the page
5. **Expected**: Browser shows a confirmation dialog: "You have unsaved changes. Are you sure you want to leave?"
6. **Actual**: Navigation happens immediately without warning, changes are lost

### Scenario 2: Navigate via Browser Back Button
1. Navigate to `/profile` from the dashboard
2. Change the "Display name" field to a new value
3. Do NOT click "Save changes"
4. Click the browser's back button
5. **Expected**: Browser shows unsaved changes warning
6. **Actual**: Navigation happens immediately, changes are lost

### Scenario 3: Navigate via Direct URL
1. Navigate to `/profile`
2. Modify both name fields
3. Do NOT click "Save changes"
4. Type a different URL in the address bar (e.g., `/dashboard`)
5. Press Enter
6. **Expected**: Browser shows unsaved changes warning
7. **Actual**: Navigation happens immediately, changes are lost

### Scenario 4: Close Browser Tab
1. Navigate to `/profile`
2. Modify either name field
3. Do NOT click "Save changes"
4. Attempt to close the browser tab/window
5. **Expected**: Browser shows "Leave site? Changes you made may not be saved"
6. **Actual**: Tab closes without warning

## Expected Behavior

1. **Detect Unsaved Changes**:
   - Track when form values differ from the initial profile data
   - Consider a field "dirty" if its value has changed from the original

2. **Warn on Navigation Attempts**:
   - Show native browser confirmation dialog when user tries to navigate away
   - Intercept Next.js router navigation (Link clicks)
   - Intercept browser navigation (back/forward buttons, URL bar)
   - Warn on tab/window close

3. **Clear Warning After Save**:
   - After successful save, reset the "dirty" state
   - Allow navigation without warning after successful save

4. **Clear Warning on Explicit Cancel** (optional enhancement):
   - Add a "Cancel" or "Reset" button to explicitly discard changes
   - Clear dirty state when user consciously discards changes

## Actual Behavior

- No warning is shown when navigating away with unsaved changes
- Users can lose their work without any indication
- Form state is not tracked for changes
- No beforeunload event handler is registered

## Screenshots/Videos

N/A - UI interaction issue

## Error Messages/Logs

No errors - this is a missing feature rather than a bug producing errors.

## Related Files/Components

- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/profile/profile-client.tsx`
  - Lines 12-16: State management for form fields
  - Lines 18-52: Form submission handler
  - Lines 66-71: Back to Dashboard link (no warning)
  - Lines 77-159: Form component (no change tracking)

- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/e2e/profile.spec.ts`
  - E2E tests exist but don't test unsaved changes warning
  - Line 54: Test navigates away without checking for warnings

## Possible Cause

1. **No Change Tracking**: Component doesn't track whether form values have changed from initial values
2. **No beforeunload Handler**: No event listener registered for browser navigation events
3. **No Next.js Router Interception**: No route change event handler to intercept Link navigation

## Proposed Solution

### 1. Add Dirty State Tracking

Track whether the form has unsaved changes:

```typescript
const [isDirty, setIsDirty] = useState(false)

// Update isDirty when fields change
const handleNameChange = (value: string) => {
  setName(value)
  setIsDirty(value !== (profile?.name || '') || displayName !== (profile?.display_name || ''))
}

const handleDisplayNameChange = (value: string) => {
  setDisplayName(value)
  setIsDirty(name !== (profile?.name || '') || value !== (profile?.display_name || ''))
}

// Or use a useEffect to compute isDirty
useEffect(() => {
  const hasChanges =
    name !== (profile?.name || '') ||
    displayName !== (profile?.display_name || '')
  setIsDirty(hasChanges)
}, [name, displayName, profile])
```

### 2. Add beforeunload Event Handler

Warn when closing tab or navigating via URL bar:

```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault()
      // Modern browsers ignore custom message and show generic warning
      e.returnValue = ''
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [isDirty])
```

### 3. Intercept Next.js Router Navigation

Use Next.js router events to intercept Link navigation:

```typescript
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProfileClient({ profile }: ProfileClientProps) {
  const router = useRouter()
  // ... existing state ...

  useEffect(() => {
    // This is a workaround for Next.js 13+ App Router
    // which doesn't expose router events like Pages Router did
    const handleRouteChange = () => {
      if (isDirty) {
        const confirmed = window.confirm(
          'You have unsaved changes. Are you sure you want to leave?'
        )
        if (!confirmed) {
          // Prevent navigation by throwing an error
          throw new Error('Route change cancelled by user')
        }
      }
    }

    // For App Router, we need to override the Link click behavior
    // by adding a custom handler to all links
    return () => {
      // Cleanup
    }
  }, [isDirty])
}
```

### 4. Better Approach: Custom Hook

Create a reusable `useUnsavedChanges` hook:

```typescript
// hooks/useUnsavedChanges.ts
import { useEffect } from 'react'

export function useUnsavedChanges(hasUnsavedChanges: boolean, message?: string) {
  useEffect(() => {
    const defaultMessage = 'You have unsaved changes. Are you sure you want to leave?'
    const confirmationMessage = message || defaultMessage

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    // Handle Next.js navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      if (link && hasUnsavedChanges) {
        const href = link.getAttribute('href')
        // Only intercept internal links
        if (href?.startsWith('/')) {
          const confirmed = window.confirm(confirmationMessage)
          if (!confirmed) {
            e.preventDefault()
            e.stopPropagation()
          }
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleClick, true)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleClick, true)
    }
  }, [hasUnsavedChanges, message])
}
```

### 5. Use Hook in Profile Component

```typescript
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'

export default function ProfileClient({ profile }: ProfileClientProps) {
  // ... existing state ...
  const [isDirty, setIsDirty] = useState(false)

  // Track changes
  useEffect(() => {
    const hasChanges =
      name !== (profile?.name || '') ||
      displayName !== (profile?.display_name || '')
    setIsDirty(hasChanges)
  }, [name, displayName, profile])

  // Use the hook
  useUnsavedChanges(isDirty)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // ... existing fetch logic ...

      if (!response.ok || !data.success) {
        setError(data.error?.message || 'Failed to update profile')
        return
      }

      setSuccess(true)
      // Clear dirty state after successful save
      setIsDirty(false)

      // ... rest of success handling ...
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  // ... rest of component ...
}
```

### 6. Add Visual Indicator (Optional Enhancement)

Show a small indicator when there are unsaved changes:

```typescript
{isDirty && (
  <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm text-yellow-800 dark:text-yellow-200 mb-4">
    <p className="font-medium">Unsaved changes</p>
    <p className="text-xs mt-1">Your changes have not been saved yet.</p>
  </div>
)}
```

### 7. Add E2E Test

Add test case to verify warning behavior:

```typescript
// In e2e/profile.spec.ts

test('should warn when navigating away with unsaved changes', async ({
  authenticatedPage
}) => {
  const page = authenticatedPage

  // Navigate to profile
  await page.goto('/profile')
  await page.waitForSelector('[data-testid="name-input"]')

  // Make a change without saving
  await page.fill('[data-testid="name-input"]', 'Changed Name')

  // Set up dialog handler
  let dialogShown = false
  page.on('dialog', async (dialog) => {
    dialogShown = true
    expect(dialog.message()).toContain('unsaved changes')
    await dialog.dismiss() // Don't navigate away
  })

  // Try to navigate away
  await page.click('text=Back to Dashboard')

  // Wait a bit to ensure dialog handler could fire
  await page.waitForTimeout(500)

  // Verify dialog was shown and we're still on profile page
  expect(dialogShown).toBe(true)
  expect(page.url()).toContain('/profile')
})

test('should not warn when navigating after save', async ({
  authenticatedPage
}) => {
  const page = authenticatedPage

  await page.goto('/profile')
  await page.waitForSelector('[data-testid="name-input"]')

  // Make a change and save
  await page.fill('[data-testid="name-input"]', 'Saved Name')
  await page.click('[data-testid="save-button"]')
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible()

  // Set up dialog handler
  let dialogShown = false
  page.on('dialog', async (dialog) => {
    dialogShown = true
    await dialog.accept()
  })

  // Navigate away - should not show dialog
  await page.click('text=Back to Dashboard')
  await page.waitForURL('**/dashboard**')

  // Verify no dialog was shown
  expect(dialogShown).toBe(false)
  expect(page.url()).toContain('/dashboard')
})
```

## Related Issues

- Related to: BUG-02 (Similar UX improvement needs for modals and forms)
- Duplicates: None
- Blocks: None (enhancement, not blocking)

## Impact Assessment

**User Impact**: Medium
- Affects any user editing their profile
- Can lead to frustration when changes are accidentally lost
- Particularly problematic for users on slower connections who may modify fields while waiting

**Frequency**: Medium
- Users don't edit profiles frequently
- But when they do, accidental navigation is relatively common

**Data Loss Risk**: Low to Medium
- Only profile data (name/display name) is at risk
- Easy to re-enter, but frustrating for users
- No critical data is lost (email can't be changed anyway)

**Workaround**: Low effort
- Users can re-enter their changes
- No functional blocker

**Recommended Priority**: Medium
- Should be fixed to improve UX
- Not urgent since workaround is simple
- Good candidate for incremental improvement

## Worklog

**2025-10-05:**
- Initial bug report created
- Analyzed profile-client.tsx implementation
- No change tracking or navigation warning exists
- Reviewed E2E tests which don't cover this scenario
- Proposed comprehensive solution with custom hook
- Suggested visual indicator for unsaved changes
- Provided test cases for E2E verification

## Resolution

Not yet resolved.
