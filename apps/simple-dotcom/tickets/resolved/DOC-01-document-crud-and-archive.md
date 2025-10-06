# [DOC-01]: Document CRUD and Archive

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

Build document lifecycle management within workspaces—create, rename, duplicate, delete, archive, and restore—ensuring Supabase records track status and UI provides appropriate controls and confirmations. **M2 Scope: Canvas-agnostic** - documents treated as files with metadata; canvas integration deferred to M2B/M3.

## Acceptance Criteria

- [x] `/api/workspaces/[id]/documents` supports:
  - POST (create new document with metadata only)
  - PATCH (rename document)
  - POST `/api/documents/[id]/duplicate` (duplicate metadata only, see below)
  - DELETE (soft delete/archive - sets `is_archived = true`)
  - POST `/api/documents/[id]/restore` (unarchive - sets `is_archived = false`)
- [x] Dashboard/workspace views expose document-level action menus with: rename, duplicate, archive, restore, delete options with confirmation prompts.
- [x] Archived documents hidden from active lists and appear in workspace archive (WS-04) for restoration.

### MVP Duplication Scope (M2 Canvas-Agnostic)
- **Duplicate creates:** New document record with copied metadata (name + " (copy)", workspace_id, folder_id, same creator)
- **Does NOT copy:** Canvas content (M2 treats documents as files, no canvas yet)
- **Rationale:** Canvas integration deferred to M2B/M3, so duplication is metadata-only
- **Post-M2:** Canvas content duplication can be added when canvas integrated (M2B/M3)

## Technical Details

### Database Schema Changes

- Ensure `documents` table includes fields: `id`, `workspace_id`, `folder_id`, `name`, `creator_id`, `is_archived`, `is_deleted`, timestamps.
- Add triggers or constraints to maintain referential integrity to folders/workspaces.

### API Endpoints

- Implement REST handlers for document operations:
  - `POST /api/workspaces/[id]/documents` - Create new document (metadata only)
  - `PATCH /api/documents/[id]` - Rename document
  - `POST /api/documents/[id]/duplicate` - Duplicate metadata only
  - `DELETE /api/documents/[id]` - Soft delete (archive)
  - `POST /api/documents/[id]/restore` - Restore from archive
- Publish Supabase Realtime events for CRUD operations to update UI lists.

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

**M2 Canvas-Agnostic Approach:**
- Documents are metadata files without canvas content in M2
- Create/duplicate operations work with metadata only
- UI shows document info/metadata instead of canvas
- Architecture designed for easy canvas integration later (M2B/M3)

**Duplication Strategy:**
- M2: Metadata-only duplication (no canvas to copy)
- Duplicated documents are independent metadata records
- UI should indicate "Duplicate" creates new document with same metadata
- Post-M2: Add canvas content duplication when canvas integrated (M2B/M3)

**Realtime Updates:**
- Use Supabase Realtime to broadcast CRUD events to connected clients
- Clients should update document lists without page refresh
- Events: `document.created`, `document.updated`, `document.archived`, `document.restored`

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-05: Clarified duplication scope - metadata only for M2 canvas-agnostic approach. Documents treated as files without canvas content; canvas integration deferred to M2B/M3.

2025-10-05: Implemented document CRUD operations
- Created `/api/documents/[id]/duplicate` endpoint for metadata-only duplication
- Created `/api/documents/[id]/restore` endpoint for unarchiving documents
- Modified DELETE endpoint to perform soft delete (archive) instead of hard delete
- Added document action handlers to workspace documents client
- Integrated DocumentActions component (already existed) into document lists
- Created comprehensive E2E tests for CRUD operations
- All acceptance criteria met

## Open questions

- Should "duplicate" be disabled in UI until canvas integrated?
  → No, keep it enabled - duplicates metadata. In M2, documents are just metadata anyway.
- Do we need undo for accidental archive/delete?
  → Not for MVP; archive provides safety net. Consider post-MVP undo system.

## Notes from engineering lead

Implementation complete. All acceptance criteria met:
- All API endpoints implemented (create, rename, duplicate, archive, restore)
- Duplicate creates metadata-only copy (canvas integration deferred to M2B/M3)
- DELETE performs soft delete (archive) with is_archived flag
- Document actions integrated into UI with confirmation prompts
- Archived documents filtered from active lists
- Comprehensive E2E tests created

Key implementation decisions:
- Used existing DocumentActions component for consistent UI
- Soft delete implemented as primary delete mechanism
- Hard delete deferred to DOC-05 ticket
- Document limit check (1000 per workspace) enforced
- Realtime updates ready to be added when needed
