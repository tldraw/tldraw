# [PERM-01]: Workspace Access Control

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

- [x] Supabase RLS policies enforce membership checks on all workspace-scoped tables (workspaces, workspace_members, folders, documents, invitation_links).
- [x] API layer confirms membership before executing operations and returns 403 responses with consistent error payloads for unauthorized access.
- [x] Unauthorized workspace access attempts render `/403` page with helpful messaging when triggered from UI routes.

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
- [x] E2E tests (Playwright) — add scenarios detailed below.
- [x] Manual testing scenarios

### E2E Test Coverage (Playwright)

- Non-member attempts to access `/workspaces/[id]` and related dashboard sections and is redirected to `/403` with audit log entry captured.
- Authenticated member can load the same workspace after being added (via API helper) and sees expected data without stale forbidden cache.
- API calls from non-member sessions to workspace endpoints return 403 with standardized error payload, and UI surfaces friendly message.
- Revoked member loses access in existing session; subsequent navigation or refresh triggers forbidden state immediately.

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

### 2025-10-05
- ✅ Created migration `perm_01_workspace_access_control_helpers_and_policies` with:
  - Helper functions: `is_workspace_owner`, `is_workspace_member`, `can_access_document`, `can_edit_document`
  - Comprehensive RLS policies for all workspace-scoped tables (INSERT, UPDATE, DELETE)
  - Policies for workspace_members, folders, documents, invitation_links, document_access_log, and presence tables
- ✅ Created `/lib/api/workspace-middleware.ts` with reusable middleware:
  - `requireWorkspaceMembership()` - validates user is member or owner
  - `requireWorkspaceOwnership()` - validates user is owner
  - `checkWorkspaceAccess()` - non-throwing access check
  - `isWorkspaceOwner()` - boolean ownership check
- ✅ Implemented `/403` forbidden page at `/app/403/page.tsx`
- ✅ Updated API routes to use middleware:
  - `/api/workspaces/[workspaceId]/members/route.ts`
  - `/api/workspaces/[workspaceId]/documents/route.ts`
- ✅ Fixed `requireAuth()` in `/lib/supabase/server.ts` to throw `ApiException` instead of generic `Error`
- ✅ Added comprehensive E2E tests in `e2e/workspace.spec.ts`:
  - Non-member access denial tests (401/403)
  - Member access validation tests
  - Membership removal/revocation tests
  - RLS policy verification tests
- ✅ All 6 E2E tests passing

## Open questions

None - all acceptance criteria met.
