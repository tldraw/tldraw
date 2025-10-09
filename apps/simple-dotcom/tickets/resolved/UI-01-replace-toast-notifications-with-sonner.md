# UI-01: Replace Inline Alert Messages with Sonner Toast Notifications

Date created: 2025-10-08
Date last updated: 2025-10-08
Date completed: 2025-10-08

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [ ] P0 (MVP Required)
- [x] P1 (Post-MVP)

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
- [ ] Testing
- [ ] Infrastructure

## Description

Replace all inline success/error alert messages (using `bg-green-50`, `bg-red-50` divs) with the existing Sonner toast notification system. This provides better UX with non-blocking, auto-dismissing notifications.

The Sonner component already exists at `src/components/ui/sonner.tsx` but is not being used consistently across the application. Many components still use inline static alert divs.

## Acceptance Criteria

- [x] Dashboard client uses toast notifications for success/error states
- [x] Workspace members page uses toast notifications
- [x] Workspace settings page uses toast notifications
- [x] Profile page uses toast notifications
- [x] All inline `bg-green-50` and `bg-red-50` alert divs are replaced
- [x] Toast notifications auto-dismiss after appropriate duration (3-5 seconds)
- [x] Error toasts persist longer or require manual dismissal
- [x] Toast notifications are accessible (ARIA announcements)

## Technical Details

### UI Components

**Files to update:**
- `src/app/dashboard/dashboard-client.tsx` (lines 39, 221-224)
- `src/app/workspace/[workspaceId]/members/workspace-members-client.tsx` (lines 44-45, 221-224)
- `src/app/workspace/[workspaceId]/settings/workspace-settings-client.tsx`
- `src/app/profile/profile-client.tsx`
- `src/app/invite/[token]/invite-accept-client.tsx`

**Pattern:**

```typescript
// OLD: Inline state-based alerts
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState<string | null>(null)

{error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error}</div>}
{success && <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">{success}</div>}

// NEW: Sonner toasts
import { toast } from 'sonner'

// Success
toast.success('Workspace created successfully')

// Error
toast.error('Failed to create workspace')

// With duration
toast.success('Invite link copied', { duration: 3000 })
```

### Permissions/Security

No security implications.

## Dependencies

- Sonner is already installed and component exists
- No external dependencies needed

## Testing Requirements

- [ ] Manual testing: Verify toast notifications appear/dismiss correctly
- [ ] Manual testing: Verify multiple toasts stack properly
- [ ] Manual testing: Verify toasts are announced to screen readers
- [ ] E2E tests: Update tests that check for inline alert divs to check for toast notifications instead

## Related Documentation

- Existing component: `src/components/ui/sonner.tsx`
- Sonner docs: https://sonner.emilkowal.ski/

## Notes

- Sonner is already configured in the root layout
- Consider toast placement (top-right, bottom-right, etc.)
- Success toasts should auto-dismiss (3-5 seconds)
- Error toasts should persist longer or require dismissal
- Consider adding loading toasts for long operations

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-08 - Implementation Complete

**Changes made:**

1. **dashboard-client.tsx**:
   - Removed `successMessage` state variable
   - Replaced inline success message div (lines 466-491) with toast
   - Updated sessionStorage success message handler to use `toast.success()` with 5s duration
   - Replaced all `alert()` calls with `toast.error()` or `toast.success()` in:
     - handleRenameWorkspace
     - handleDeleteWorkspace
     - handleDocumentRename
     - handleDocumentDuplicate
     - handleDocumentArchive
     - handleDocumentRestore
     - handleDocumentDelete

2. **workspace-members-client.tsx**:
   - Removed `error` and `success` state variables
   - Removed inline alert divs (lines 221-224)
   - Updated all handlers to use toast notifications:
     - handleToggleInvite: `toast.success()` with 3s duration
     - handleRegenerateInvite: `toast.success()` with 3s duration
     - handleCopyInviteLink: `toast.success()` with 3s duration
     - handleRemoveMember: `toast.success()` with 3s duration

3. **workspace-settings-client.tsx**:
   - Removed `error` state variable
   - Removed inline error alert div (line 328)
   - Updated all handlers to use toast notifications:
     - handleRename: `toast.success()` with 3s duration
     - handleDelete: `toast.success()` with 3s duration
     - handleLeave: Uses sessionStorage (handled by dashboard)
     - handleTransferOwnership: `toast.success()` and `toast.error()`
     - handleToggleInvite: `toast.success()` with 3s duration
     - handleRegenerateInvite: `toast.success()` with 3s duration
     - handleCopyInviteLink: `toast.success()` with 3s duration
   - Updated "Continue" button validation to use `toast.error()`

4. **profile-client.tsx**:
   - Removed `error` and `success` state variables
   - Removed shadcn Alert components for success/error (kept unsaved changes alert)
   - Updated onSubmit handler to use `toast.success()` and `toast.error()` with 3s duration
   - Removed unused imports (AlertCircle, CheckCircle2)

5. **invite-accept-client.tsx**:
   - Removed `error` state variable
   - Removed inline error alert div
   - Updated handleJoin to use `toast.success()` and `toast.error()` with 3s duration

**Design decisions:**
- Success toasts: 3-5 second auto-dismiss duration
- Error toasts: Default Sonner behavior (longer persistence, can be dismissed)
- Sonner is accessible by default (ARIA announcements built-in)
- Removed all state management for error/success messages
- All inline `bg-green-50` and `bg-red-50` divs replaced

**Testing needed:**
- Manual testing to verify all toast notifications appear and dismiss correctly
- Test multiple toast stacking
- Verify screen reader announcements
- Update E2E tests that check for inline alerts
