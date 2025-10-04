# [DOC-05]: Archive and Hard Delete Policies

Date created: 2025-10-04
Date last updated: -
Date completed: -

## Status

- [x] Not Started
- [ ] In Progress
- [ ] Blocked
- [ ] Done

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

- [ ] API endpoints enforce `is_archived` flag to segment archived documents per workspace and prevent access through normal listings.
- [ ] Hard delete endpoint permanently removes document records and triggers storage cleanup while restricted to authorized roles.
- [ ] Audit logs or event stream capture archive and hard delete actions for operational awareness (even if UI for logs comes later).

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

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
