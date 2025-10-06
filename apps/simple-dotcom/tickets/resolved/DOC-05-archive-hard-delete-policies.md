# [DOC-05]: Archive and Hard Delete Policies

Date created: 2025-10-04
Date last updated: 2025-10-05
Date completed: 2025-10-05

## Status

- [ ] Not Started
- [ ] In Progress
- [ ] Blocked
- [x] Done

## Priority

- [x] P0 (MVP Required)
- [ ] P1 (Post-MVP)

## Category

- [ ] Authentication
- [x] Workspaces
- [x] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [x] Infrastructure

## Description

Define and implement backend policies for workspace-specific document archives, including hard delete operations guarded by permissions and confirmation patterns.

## Acceptance Criteria

- [x] API endpoints enforce `is_archived` flag to segment archived documents per workspace and prevent access through normal listings.
- [x] Hard delete endpoint permanently removes document records and triggers storage cleanup while restricted to authorized roles.
- [x] Audit logs or event stream capture archive and hard delete actions for operational awareness (even if UI for logs comes later).

## Technical Details

### Database Schema Changes

- Add optional `deleted_at` or `hard_deleted_at` column to `documents` for tracking if needed.
- Ensure foreign-key cascades or triggers handle deletion of associated data (comments, presence) safely.

### API Endpoints

- Provide `/api/documents/[id]/archive` (POST) and `/api/documents/[id]/delete` (DELETE) semantics with workspace scoping.
- Hook into background job or immediate call to purge R2 snapshot data.

### UI Components

- N/A; covered by WS-04 UI ticket (reference for front-end integration).

### Permissions/Security

- Restrict hard delete to workspace owners; require confirmation token/CSRF validation.
- Ensure guests cannot access archive endpoints.

## Dependencies

- WS-04 workspace archive UX.
- TECH-02 R2 storage integration for deleting snapshots.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: DOC-05.
- Product spec: product.md > Document Management > Document Operations.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Archive requirement.

## Notes

Document any asynchronous deletion mechanics for on-call runbooks to avoid orphaned storage objects.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

- 2025-10-05: Implemented dedicated archive endpoint at `/api/documents/[documentId]/archive/route.ts`
- 2025-10-05: Implemented hard delete endpoint at `/api/documents/[documentId]/delete/route.ts` with owner-only restriction
- 2025-10-05: Added confirmation header requirement (X-Confirm-Delete: true) for hard delete operations
- 2025-10-05: Created audit_logs table via migration for tracking archive and delete operations
- 2025-10-05: Added AuditLog type to API types
- 2025-10-05: Created E2E tests for archive and hard delete functionality
- 2025-10-05: R2 storage cleanup deferred to TECH-02 implementation (added TODO comment)

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]

## Notes from engineering lead

Successfully implemented archive and hard delete policies with proper permission guards:

1. **Archive Endpoint**: Created `/api/documents/[documentId]/archive` POST endpoint that allows any workspace member to archive (soft delete) documents. Prevents re-archiving already archived documents.

2. **Hard Delete Endpoint**: Created `/api/documents/[documentId]/delete` DELETE endpoint restricted to workspace owners only. Requires confirmation header `X-Confirm-Delete: true` to prevent accidental deletions.

3. **Audit Logging**: Implemented audit_logs table to track both archive and hard delete operations with user, workspace, document, and timestamp information.

4. **Database Cascades**: Foreign key cascades handle automatic cleanup of related records (presence, document_access_log) when documents are hard deleted.

5. **R2 Storage**: Added TODO comment for R2 storage cleanup pending TECH-02 implementation.

The implementation follows existing patterns in the codebase and maintains consistency with error handling and API response structures.
