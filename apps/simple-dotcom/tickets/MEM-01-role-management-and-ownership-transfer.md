# [MEM-01]: Role Management and Ownership Transfer

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
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Maintain owner/member roles within each workspace and provide an ownership transfer flow that validates target members and communicates role changes in the UI.

## Acceptance Criteria

- [ ] `workspace_members` table stores role values (owner/member) and endpoints return role metadata with member listings.
- [ ] Ownership transfer UI allows current owner to select another member, confirms action, and updates database, emitting notifications to both parties.
- [ ] API blocks transfers to non-members and ensures at least one owner remains per workspace.

## Technical Details

### Database Schema Changes

- Ensure `workspace_members` table has `role` column with enum or constrained text values and updated timestamps.

### API Endpoints

- Implement `/api/workspaces/[id]/transfer-ownership` requiring owner authentication.
- Extend membership listing endpoint to include role field and computed abilities for clients.

### UI Components

- Add ownership transfer section to workspace settings with searchable member dropdown and confirmation modal.

### Permissions/Security

- Enforce owner-only access to transfer endpoint via RLS and middleware.
- Prevent transfers that would remove the last owner without replacement.

## Dependencies

- MEM-02 member listing UI/API.
- WS-02 owner constraints to align leave/delete logic.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: MEM-01.
- Product spec: product.md > MVP Scope > Workspace membership.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Workspace membership.

## Notes

Consider event tracking for ownership transfers to support audit logging in future phases.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
