# [NAV-05]: Route Structure and Guards

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
- [x] Folders
- [x] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Define Next.js routing structure covering member management, settings, archive, folder, profile, and invitation routes with appropriate role-based guards and layout composition.

## Acceptance Criteria

- [x] Routes exist for workspace settings, member management, archive, folder views, invite management, profile, and marketing pages using shared layouts.
- [x] Navigation guards redirect unauthorized users to `/403` or login as appropriate, with consistent handling across server/client transitions.
- [x] Route-level loading and error boundaries are implemented to improve resilience.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Ensure route handlers align with API endpoints defined in other tickets (workspaces, members, invite, share).

### UI Components

- Construct shared layout components (dashboard shell, workspace shell) reused across nested routes.

### Permissions/Security

- Integrate server-side checks in Server Components (using `auth.api.getSession()` with `redirect()`) and/or middleware to guard routes before render.

## Dependencies

- PERM-01 access control policies.
- NAV-02, NAV-03, MEM tickets for page content.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright) — add guard path coverage below.
- [x] Manual testing scenarios

### E2E Test Coverage (Playwright)

- Unauthenticated user navigates directly to protected routes (workspace settings, member management, archive) and is redirected to login.
- Authenticated but unauthorized member hits owner-only pages and receives `/403` UI without data leakage.
- Authenticated owner navigates across nested routes and experiences consistent layout transitions without full reloads.
- Server-rendered navigation (hard refresh) and client-side router transitions both enforce the same guard logic.

## Related Documentation

- Product requirements: product-requirements.md: NAV-05.
- Product spec: product.md > Navigation, Discovery & UI Structure > Route map.

## Notes

Ensure route naming and parameter patterns align with analytics tracking and future localization plans.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

**2025-10-05**: Completed implementation
- Created workspace route structure with nested layouts:
  - `/workspace/[workspaceId]` - Workspace browser with folder tree and documents list
  - `/workspace/[workspaceId]/settings` - Workspace settings (rename, delete, leave)
  - `/workspace/[workspaceId]/members` - Member management with invitation links
  - `/workspace/[workspaceId]/archive` - Archived documents management
- Created document view route `/d/[documentId]` with member/guest access modes
- Created invite acceptance route `/invite/[token]` with authentication flow
- Implemented server-side role-based guards in all routes using Better Auth session checks
- Added loading.tsx and error.tsx boundaries for resilient UX
- Updated middleware to handle new route patterns
- Added E2E tests for route guards covering:
  - Unauthenticated access redirects
  - Unauthorized member access (403)
  - Document sharing modes (private/public)
  - Invite link validation
  - Server-side and client-side guard consistency
- All TypeScript type checks passing

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
