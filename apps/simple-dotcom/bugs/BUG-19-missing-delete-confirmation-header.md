# [BUG-19]: Missing Delete Confirmation Header in Workspace Browser

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
- [x] High (Major feature broken, significant impact)
- [ ] Medium (Feature partially broken, workaround exists)
- [ ] Low (Minor issue, cosmetic)

## Category

- [ ] Authentication
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Performance
- [ ] Infrastructure

## Environment

- Browser: All
- OS: All
- Environment: local/staging/production
- Affected version/commit: simple-dotcom branch

## Description

When clicking "Delete permanently" from the three-dot menu on a document card in the workspace browser page, the delete request fails because the required `X-Confirm-Delete: true` header is missing from the API call. This causes the hard delete functionality to fail silently for users.

## Steps to Reproduce

1. Navigate to workspace browser page (`/workspace/[workspaceId]`)
2. Locate any document card
3. Click the three-dot menu (⋮) on the document card
4. Click "Delete permanently"
5. Observe that the delete operation fails

## Expected Behavior

The document should be permanently deleted from the database when "Delete permanently" is clicked, and the document should disappear from the UI.

## Actual Behavior

The API request fails with error: "Confirmation header X-Confirm-Delete: true is required for hard delete"

## Screenshots/Videos

N/A

## Error Messages/Logs

```
API Error: 400 Bad Request
{ success: false, error: { code: 'MISSING_CONFIRMATION', message: 'Confirmation header X-Confirm-Delete: true is required for hard delete' } }
```

## Related Files/Components

- `src/app/workspace/[workspaceId]/workspace-browser-client.tsx:230-246` - Missing header in delete handler
- `src/app/api/documents/[documentId]/delete/route.ts:26-33` - API validation requiring header
- `src/app/workspace/[workspaceId]/archive/workspace-archive-client.tsx:58-63` - Working reference implementation
- `src/components/documents/DocumentActions.tsx:119-141` - UI component calling delete handler

## Possible Cause

The API route `/api/documents/[documentId]/delete` requires a confirmation header for hard delete operations. The workspace archive page correctly includes this header, but the workspace browser page does not.

**API Route** (`src/app/api/documents/[documentId]/delete/route.ts:26-33`):
```typescript
// Require confirmation header for hard delete
const confirmHeader = request.headers.get('X-Confirm-Delete')
if (confirmHeader !== 'true') {
  return NextResponse.json(
    { success: false, error: { code: 'MISSING_CONFIRMATION', message: 'Confirmation header X-Confirm-Delete: true is required for hard delete' } },
    { status: 400 }
  )
}
```

**Broken Implementation** (`workspace-browser-client.tsx:230-246`):
```tsx
const response = await fetch(`/api/documents/${documentId}/delete`, {
  method: 'DELETE',
  // ← MISSING: headers: { 'X-Confirm-Delete': 'true' }
})
```

**Working Implementation** (`workspace-archive-client.tsx:58-63`):
```tsx
const res = await fetch(`/api/documents/${documentId}/delete`, {
  method: 'DELETE',
  headers: {
    'X-Confirm-Delete': 'true',
  },
})
```

## Proposed Solution

Update the `handleDeleteDocument` function in `workspace-browser-client.tsx` to include the confirmation header:

```tsx
const response = await fetch(`/api/documents/${documentId}/delete`, {
  method: 'DELETE',
  headers: {
    'X-Confirm-Delete': 'true',
  },
})
```

This matches the working implementation in the archive page and satisfies the API route's requirement.

## Related Issues

- Related to: WS-04 (Workspace Archive Management - contains working implementation)

## Worklog

**2025-10-05:**
- Bug discovered via code review
- Identified inconsistency between archive and browser page implementations

## Resolution

Pending fix.
