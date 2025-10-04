# [DOC-03]: Document Move Operations

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
- [x] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Allow documents to be moved between folders within a workspace and across workspaces when initiated by the document creator, enforcing permissions and maintaining data integrity.

## Acceptance Criteria

- [ ] Move dialogs/UI allow selecting target workspace (if creator) and folder, with restricted options for non-creators.
- [ ] Backend move endpoint verifies creator ownership for cross-workspace moves and updates `workspace_id`, `folder_id` atomically.
- [ ] Moves trigger realtime updates so source and destination lists refresh without reload.

## Technical Details

### Database Schema Changes

- Ensure foreign keys and indexes (`workspace_id`, `folder_id`) on `documents` table support efficient updates.

### API Endpoints

- Implement `/api/documents/[id]/move` covering folder and workspace moves with transactional logic and validation.

### UI Components

- Build modal or command palette for move action with workspace/folder selectors and permission messaging.

### Permissions/Security

- Only creators can move documents between workspaces; members can move within workspace if they have access.
- Validate destination workspace membership before allowing move.

## Dependencies

- DOC-01 document CRUD for base actions.
- PERM-01 workspace access policies.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: DOC-03.
- Product spec: product.md > Document Management > Document Operations.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Document organization.

## Notes

Ensure move operation triggers background jobs to migrate associated assets if storage is partitioned by workspace.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)
