# [DOC-01]: Document CRUD and Archive

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
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [x] Infrastructure

## Description

Build document lifecycle management within workspaces—create, rename, duplicate, delete, archive, and restore—ensuring Supabase records track status and UI provides appropriate controls and confirmations.

## Acceptance Criteria

- [ ] `/api/workspaces/[id]/documents` supports POST (create), PATCH (rename/duplicate metadata), DELETE (soft delete/archive), and restore actions with proper validation.
- [ ] Dashboard/workspace views expose document-level menus for rename, duplicate, archive, restore, and delete with confirmation prompts.
- [ ] Archived documents are hidden from active lists and appear in workspace archive (WS-04) for restoration.

## Technical Details

### Database Schema Changes

- Ensure `documents` table includes fields: `id`, `workspace_id`, `folder_id`, `name`, `creator_id`, `is_archived`, `is_deleted`, timestamps.
- Add triggers or constraints to maintain referential integrity to folders/workspaces.

### API Endpoints

- Implement REST handlers for document operations; include duplication logic that clones metadata and optionally workspace references.
- Publish Supabase Realtime events for CRUD to update UI lists.

### UI Components

- Create document action menu component reused across list, card, and detail views.
- Provide archive confirmation modals and restore banners.

### Permissions/Security

- Validate user has workspace membership and correct role before performing operations.
- Enforce that non-creators cannot move document across workspaces (see DOC-03).

## Dependencies

- WS-04 workspace archive experience.
- DOC-04 metadata tracking for audit fields.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: DOC-01.
- Product spec: product.md > Document Management > Document Operations.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Documents.

## Notes

Coordinate with storage team to ensure document duplication semantics align with tldraw asset duplication strategy.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)
