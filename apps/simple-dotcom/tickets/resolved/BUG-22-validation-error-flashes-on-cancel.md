# [BUG-22]: Validation Error Flashes When Clicking Cancel on Create Modals

Date reported: 2025-10-05
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
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [ ] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

When the "Create Document" or "Create Workspace" modal is open with an empty input field, clicking the "Cancel" button briefly flashes a validation error message. This happens because clicking Cancel blurs the input field, which triggers the `onBlur` validation handler that shows "Document name is required" or "Workspace name is required" error before the modal closes.

The validation error should only appear when the user attempts to submit the form (clicks Create button), not when they blur the input field by clicking Cancel or clicking outside the input.

## Steps to Reproduce

1. Open the Dashboard
2. Click "Create Workspace" or "Create Document" button
3. Leave the input field empty (or enter text and then delete it)
4. Click the "Cancel" button
5. Observe a brief flash of red error text/border before the modal closes

**Expected**: No validation error should appear when clicking Cancel
**Actual**: Validation error briefly flashes visible before modal closes

## Expected Behavior

What should happen:

## Actual Behavior

What actually happens:

## Screenshots/Videos

N/A

## Error Messages/Logs

```
No specific error logs available
```

## Related Files/Components

- `simple-client/src/app/dashboard/dashboard-client.tsx`
  - Create Document modal: lines 792-837 (onBlur at 799-803)
  - Create Workspace modal: lines 663-710 (onBlur at 671-676)

- `simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx`
  - Create Document modal: lines 382-427 (onBlur at 389-393)

## Possible Cause

All three affected modals use an `onBlur` validation pattern that triggers on **any** blur event, not just when the user is attempting to submit:

**dashboard-client.tsx (Create Document - lines 799-803)**:
```typescript
onBlur={() => {
  if (!newDocumentName.trim()) {
    setValidationError('Document name is required')
  }
}}
```

**dashboard-client.tsx (Create Workspace - lines 671-676)**:
```typescript
onBlur={() => {
  // Show validation on blur if empty
  if (!newWorkspaceName.trim()) {
    setValidationError('Workspace name is required')
  }
}}
```

**workspace-browser-client.tsx (Create Document - lines 389-393)**:
```typescript
onBlur={() => {
  if (!newDocumentName.trim()) {
    setValidationError('Document name is required')
  }
}}
```

## Proposed Solution

Suggested fix or approach to resolve the bug.

## Related Issues

- Related to: [ticket/bug numbers]

## Worklog

**2025-10-05:**
- Bug report created
- Initial analysis performed

**2025-10-07:**
- Fixed by removing onBlur validation handlers from all affected modals
- Validation now only occurs on form submission (clicking Create button)
- Changes made to 4 modals total across 2 files

## Resolution

Fixed by removing the `onBlur` validation handlers from all four affected modals:

1. **dashboard-client.tsx - Create Workspace modal** (line ~728)
2. **dashboard-client.tsx - Create Document modal** (line ~851)
3. **workspace-browser-client.tsx - Create Document modal** (line ~715)
4. **workspace-browser-client.tsx - Create Folder modal** (line ~763)

The validation logic remains intact in the form submission handlers (`handleCreateWorkspace`, `handleCreateDocument`, `handleCreateFolder`), ensuring users still receive validation errors when attempting to create items with empty names. The only change is that validation no longer triggers on blur events, preventing the error flash when users click Cancel or click outside the input field.

Files modified:
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/dashboard/dashboard-client.tsx`
- `/Users/stephenruiz/Developer/tldraw/apps/simple-dotcom/simple-client/src/app/workspace/[workspaceId]/workspace-browser-client.tsx`
