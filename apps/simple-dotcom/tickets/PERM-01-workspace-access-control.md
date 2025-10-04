# [PERM-01]: Workspace Access Control

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
- [x] Testing
- [x] Infrastructure

## Description

Restrict workspace data access to owners and members through Supabase RLS policies and API validation, ensuring non-members cannot query or mutate workspace-scoped resources.

## Acceptance Criteria

- [ ] Supabase RLS policies enforce membership checks on all workspace-scoped tables (workspaces, workspace_members, folders, documents, invitation_links).
- [ ] API layer confirms membership before executing operations and returns 403 responses with consistent error payloads for unauthorized access.
- [ ] Unauthorized workspace access attempts render `/403` page with helpful messaging when triggered from UI routes.

## Technical Details

### Database Schema Changes

- Define RLS policies referencing `auth.uid()` ensuring only members/owners can read/write rows.
- Create helper security functions if needed for membership checks.

### API Endpoints

- Instrument middleware to check workspace membership early, minimizing duplicate logic.

### UI Components

- Implement `/403` forbidden page consistent with design spec, triggered on access denial.

### Permissions/Security

- Add audit logging for denied access attempts for security monitoring.

## Dependencies

- TECH-01 Supabase schema foundation.
- NAV-03 workspace routing to handle forbidden states gracefully.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: PERM-01.
- Product spec: product.md > Permissions & Sharing > Workspace-Level Access.
- Engineering notes: eng-meeting-notes.md > Technical Implementation Details > Data Model & RLS.

## Notes

Review RLS with security lead before launch to ensure no gaps for service roles or test environments.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
