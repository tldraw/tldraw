# [WS-01]: Shared Workspace CRUD

Date created: 2025-10-04
Date last updated: 2025-10-04
Date completed: 2025-10-04

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
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Implement creation, renaming, and soft deletion for shared workspaces backed by Supabase. Provide UI affordances on the dashboard and settings screens with confirmation flows for destructive actions.

## Acceptance Criteria

- [ ] Users with appropriate permissions can create shared workspaces via UI and `/api/workspaces` endpoint, with records persisted in Supabase including `is_deleted` flag defaulting to false.
- [ ] Workspace rename updates name across UI contexts and is persisted to Supabase.
- [ ] Soft deletion marks workspace as deleted, removes it from default listings, and surfaces undo/restore option where applicable.

## Technical Details

### Database Schema Changes

- Ensure `workspaces` table includes `is_deleted`, `name`, `owner_id`, and timestamps; add fields/migrations if missing.

### API Endpoints

- Build REST handlers for POST (create), PATCH (rename), and DELETE (soft delete) under `/api/workspaces` with RLS enforcement.
- Implement restore endpoint or reuse PATCH to toggle `is_deleted`.

### UI Components

- Add create workspace modal/button on dashboard.
- Provide inline rename controls and soft delete confirmation dialog with guard rails explaining impact.

### Permissions/Security

- Restrict create to authenticated users; rename/delete limited to owners per WS-02 ticket logic.
- Suppress soft-deleted workspaces from general lists except archive/owner views.

## Dependencies

- AUTH-02 private workspace provisioning for reuse of creation service.
- WS-02 owner permission enforcement.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright) — add cases described below.
- [x] Manual testing scenarios

### E2E Test Coverage (Playwright)

- Authenticated owner creates a shared workspace from dashboard modal and sees it populate sidebar and API payloads immediately.
- Rename workspace from settings/sidebar inline control and verify change persists after reload and in other sessions via presence stub.
- Soft delete workspace, confirm removal from default listing, then restore via undo/archive view to reinstate it.
- Attempt creation/rename/delete without required permissions (e.g., member role) and assert UI blocks the action with appropriate error messaging.

## Related Documentation

- Product requirements: product-requirements.md: WS-01.
- Product spec: product.md > MVP Scope > P0 Features > Shared workspaces.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Shared workspaces.

## Notes

Coordinate with workspace archive ticket to ensure soft-deleted workspaces remain recoverable until hard-delete policy is defined.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-04

- ✅ Implemented shared workspace creation UI with modal dialog
- ✅ Implemented workspace rename functionality with inline controls
- ✅ Implemented workspace soft deletion with confirmation dialog
- ✅ Updated API routes to use Better Auth for authentication
- ✅ Created admin Supabase client helper for bypassing RLS
- ✅ Added RLS policy for workspace_members INSERT operations
- ✅ Wrote comprehensive E2E tests for all workspace CRUD operations
- ✅ Dashboard now displays all workspaces with appropriate controls based on ownership and workspace type
- ✅ Private workspaces correctly show "(Cannot modify)" and hide action buttons

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
