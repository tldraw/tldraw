# [AUTH-02]: Provision Private Workspace on Signup

Date created: 2025-10-04
Date last updated: 2025-10-04
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

- [x] Authentication
- [x] Workspaces
- [ ] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

Automatically provision a non-deletable, non-renamable private workspace for every new account immediately after signup. The workspace must exist before redirecting users to the dashboard so private content can be created without additional setup.

## Acceptance Criteria

- [ ] Successful signup triggers creation of a private workspace linked to the new user with immutable name and deletion flags enforced.
- [ ] Private workspace appears in dashboard lists alongside shared workspaces with explanatory labeling.
- [ ] Attempts to rename or delete the private workspace are blocked in both API and UI layers with clear error messaging.
- [ ] Private workspace **cannot be deleted** under any circumstances (only account deletion removes it).
- [ ] Private workspace **cannot be renamed** - the name remains fixed as determined by the system.
- [ ] UI explicitly hides rename and delete controls for private workspaces; API returns 403 Forbidden if rename/delete operations are attempted.

## Technical Details

### Database Schema Changes

- Add `is_private` and `immutable_name` flags to `workspaces` table if not already present.
- Ensure `workspaces.owner_id` is populated for private workspaces.

### API Endpoints

- Extend signup pipeline to call workspace provisioning service post-user creation.
- Expose read-only metadata (`is_private`, `display_name`) through `/api/workspaces` responses.

### UI Components

- Update dashboard workspace list component to highlight the private workspace and hide rename/delete affordances.

### Permissions/Security

- Restrict API mutations on private workspaces (rename, delete) via middleware/RLS checks.

## Dependencies

- AUTH-01 authentication flows.
- Workspace list UI from NAV-02.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product spec: product.md > Core Features > Private Workspace.
- Product requirements: apps/simple-dotcom/product-requirements.md: AUTH-02.
- Engineering notes: eng-meeting-notes.md > MVP Definition > Private workspace.

## Notes

Coordinate with workspace CRUD ticket to reuse shared workspace creation logic and guard rails across both flows.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)
