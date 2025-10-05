# [BUG-17]: Workspace Archive UI API Endpoint Mismatch

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
The workspace archive client UI component makes incorrect API calls for restore and permanent delete operations, causing these features to fail completely. The UI calls the wrong endpoints with incorrect HTTP methods.

## Steps to Reproduce
1. Navigate to a workspace as an owner or member
2. Archive a document (this works correctly)
3. Go to the Archive page via the Archive link
4. Click "Restore" on an archived document
5. Click "Delete Forever" on an archived document

## Expected Behavior
- Restore should call `POST /api/documents/[documentId]/restore` and restore the document
- Delete Forever should call `DELETE /api/documents/[documentId]/delete` with confirmation header and permanently delete the document (owner only)
- Only workspace owners should see the "Delete Forever" button

## Actual Behavior
- Restore calls `PATCH /api/documents/[documentId]` with `{ is_archived: false }` - this endpoint exists but the client isn't using the dedicated restore endpoint
- Delete Forever calls `DELETE /api/documents/[documentId]` which archives the document instead of permanently deleting it
- Delete Forever button is shown to all users, not just owners
- No confirmation header is sent for permanent deletion

## Screenshots/Videos

N/A

## Error Messages/Logs

```
No direct error logs as the wrong endpoints are being called successfully, but they perform the wrong actions.
```

## Related Files/Components

- `/simple-client/src/app/workspace/[workspaceId]/archive/workspace-archive-client.tsx` (lines 24-76)
- `/simple-client/src/app/api/documents/[documentId]/restore/route.ts` (not being called)
- `/simple-client/src/app/api/documents/[documentId]/delete/route.ts` (not being called)

## Possible Cause

The workspace-archive-client.tsx was likely implemented before the dedicated restore and delete endpoints were created, and was using the general document PATCH/DELETE endpoints as a workaround.

The API endpoints for restore and permanent delete exist and are correctly implemented:
- `POST /api/documents/[documentId]/restore` - properly restores archived documents
- `DELETE /api/documents/[documentId]/delete` - properly deletes documents permanently (with confirmation header)

The issue is purely in the client code which is not calling the correct endpoints.

## Proposed Solution

1. Update `handleRestore` to call `POST /api/documents/${documentId}/restore` instead of PATCH
2. Update `handlePermanentDelete` to call `DELETE /api/documents/${documentId}/delete` with the required `X-Confirm-Delete: true` header
3. Add permission check to only show "Delete Forever" button when `isOwner === true`
4. Consider adding a proper modal confirmation instead of browser confirm() for better UX

## Related Issues

- Related to: WS-04 (Workspace Archive Management)

## Worklog

**2025-10-05:**
- Bug discovered during code review
- Identified incorrect endpoint usage in archive client
- Upon investigation, found all issues already fixed in current codebase:
  - `handleRestore` correctly calls `POST /api/documents/[documentId]/restore` (line 30)
  - `handlePermanentDelete` correctly calls `DELETE /api/documents/[documentId]/delete` with `X-Confirm-Delete: true` header (lines 58-61)
  - Delete Forever button only visible to workspace owners via `{isOwner && (` conditional (line 142)

## Resolution

**Status**: Already Fixed

All three issues described in this bug report were found to be already implemented correctly in the current codebase at `simple-client/src/app/workspace/[workspaceId]/archive/workspace-archive-client.tsx`. The bug was likely fixed in a previous commit before this bug report was filed.