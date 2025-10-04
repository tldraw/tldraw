# [WS-01]: Shared Workspace CRUD

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
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

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
