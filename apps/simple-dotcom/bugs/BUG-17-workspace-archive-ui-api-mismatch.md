# [BUG-17]: Workspace Archive UI API Endpoint Mismatch

Date reported: 2025-10-05
Date resolved: -

## Status
- [x] New
- [ ] In Progress
- [ ] Resolved
- [ ] Won't Fix
- [ ] Duplicate

## Severity
- [ ] Critical (System down, data loss, security breach)
- [x] High (Major functionality broken, affecting many users)
- [ ] Medium (Feature partially broken, workaround available)
- [ ] Low (Cosmetic issue, minor inconvenience)

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
- [ ] Other

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

## Environment
- Browser: All browsers
- OS: All operating systems
- User Role: Owner/Member
- Timestamp: Discovered during code review

## Error Messages/Logs
No direct error logs as the wrong endpoints are being called successfully, but they perform the wrong actions.

## Screenshots
N/A - Issue found during code analysis

## Affected Files/Components
- `/simple-client/src/app/workspace/[workspaceId]/archive/workspace-archive-client.tsx` (lines 24-76)
- `/simple-client/src/app/api/documents/[documentId]/restore/route.ts` (not being called)
- `/simple-client/src/app/api/documents/[documentId]/delete/route.ts` (not being called)

## Additional Context
The API endpoints for restore and permanent delete exist and are correctly implemented:
- `POST /api/documents/[documentId]/restore` - properly restores archived documents
- `DELETE /api/documents/[documentId]/delete` - properly deletes documents permanently (with confirmation header)

The issue is purely in the client code which is not calling the correct endpoints.

## Possible Cause
The workspace-archive-client.tsx was likely implemented before the dedicated restore and delete endpoints were created, and was using the general document PATCH/DELETE endpoints as a workaround.

## Suggested Fix
1. Update `handleRestore` to call `POST /api/documents/${documentId}/restore` instead of PATCH
2. Update `handlePermanentDelete` to call `DELETE /api/documents/${documentId}/delete` with the required `X-Confirm-Delete: true` header
3. Add permission check to only show "Delete Forever" button when `isOwner === true`
4. Consider adding a proper modal confirmation instead of browser confirm() for better UX

## Priority Justification
High severity because core functionality (restore and permanent delete) is completely broken in the archive management feature, which is a P0 MVP requirement (WS-04).

## Related Issues
- WS-04: Workspace Archive Management ticket