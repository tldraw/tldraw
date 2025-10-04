# [WS-04]: Workspace Archive Management

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
- [x] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Expose workspace archives that list archived documents, allow restoring them, and enable permanent deletion for authorized users. Provide navigation entry points and clear state indicators distinguishing archived items from active content.

## Acceptance Criteria

- [ ] Workspace archive route displays archived documents with metadata and actions to restore or permanently delete (owner-only for hard delete).
- [ ] Restore action reactivates document (removes archive flag) and returns it to appropriate folder/workspace lists.
- [ ] Permanent delete requires confirmation, enforces permissions, and removes document metadata and binary payload where applicable.

## Technical Details

### Database Schema Changes

- Confirm `documents` table includes `is_archived` and `deleted_at` fields; add as needed.

### API Endpoints

- Implement `/api/workspaces/[id]/archive` list endpoint filtering `is_archived = true`.
- Add restore and hard-delete endpoints with authorization checks.

### UI Components

- Add archive navigation entry within workspace sidebar; design list view with badges and action buttons.
- Provide confirmation modals and success toasts for restore/delete actions.

### Permissions/Security

- Restrict permanent delete to owners or designated roles.
- Ensure archived documents are hidden from standard listings but accessible via archive route.

## Dependencies

- DOC-05 document archive handling.
- NAV-03 workspace view routing.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: WS-04.
- Product spec: product.md > Document Management > Document Operations and Archive.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Archive requirement.

## Notes

Coordinate with storage team to determine when permanent delete should purge R2 snapshots versus mark for background cleanup.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
