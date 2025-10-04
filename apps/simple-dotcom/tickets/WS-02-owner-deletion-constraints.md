# [WS-02]: Owner Deletion Constraints

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
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Enforce owner-only workspace deletion and prevent owners from leaving a workspace without first transferring ownership or deleting the workspace. Provide clear UI messaging explaining blocked actions and available next steps.

## Acceptance Criteria

- [ ] Workspace delete endpoint validates that the requester is the owner and rejects non-owner requests with descriptive errors.
- [ ] Owner attempting to leave a workspace is blocked unless ownership is transferred or workspace is deleted, with UI prompts guiding the process.
- [ ] Transfer-or-delete requirement is documented in settings UI and mirrored in API responses for clients.

## Technical Details

### Database Schema Changes

- None beyond ensuring `workspace_members.role` tracks owner/member.

### API Endpoints

- Add middleware for `/api/workspaces/[id]` DELETE and `/api/workspaces/[id]/leave` to enforce owner checks.
- Update `/api/workspaces/[id]/leave` to require ownership transfer confirmation when requester is owner.

### UI Components

- Modify workspace settings deletion/leave dialogs to display ownership warnings and link to transfer flow.

### Permissions/Security

- Ensure RLS policies prevent non-owners from deleting workspace rows.

## Dependencies

- MEM-01 ownership transfer mechanics.
- WS-01 workspace CRUD base endpoints.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright) — incorporate the guard scenarios below.
- [x] Manual testing scenarios

### E2E Test Coverage (Playwright)

- Member attempts to delete workspace and is blocked with descriptive error toast/dialog.
- Owner attempts to leave workspace; flow requires transferring ownership or deleting first and surfaces guidance modal.
- After transferring ownership (stubbed via API helper or UI), former owner can leave successfully and workspace remains accessible to new owner.
- Deleting workspace as owner succeeds only after confirmation and logs event; verify resulting redirect and state cleanup.

## Related Documentation

- Product requirements: product-requirements.md: WS-02.
- Product spec: product.md > Core Features > Shared Workspaces (ownership).
- Engineering notes: eng-meeting-notes.md > MVP Definition > Workspace membership.

## Notes

Coordinate with copywriting to ensure owner-specific warnings are concise and consistent with invitation flows.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
