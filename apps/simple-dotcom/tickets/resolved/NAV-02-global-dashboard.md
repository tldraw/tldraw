# [NAV-02]: Global Dashboard

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
- [x] Testing
- [ ] Infrastructure

## Description

Build the `/dashboard` view aggregating all workspaces, documents, folders, and recent items in a single unified experience. The dashboard displays **all accessible workspaces simultaneously** in a sidebar-first layout with collapsible sections for each workspace, eliminating the need for a workspace switcher.

## Acceptance Criteria

- [x] Dashboard displays **all accessible workspaces simultaneously** - no workspace switcher or dropdown needed.
- [x] Sidebar includes collapsible sections for each workspace showing documents and folder trees at once.
- [x] Dashboard lists private and shared workspaces, recent documents, and folder shortcuts with responsive layout.
- [x] Quick access to all workspaces and their documents is available without navigation between workspace views.
- [ ] Search bar or filters allow locating documents quickly (linked to NAV-06 search ticket - not yet implemented).
- [x] Data loads efficiently with loading skeletons and empty states for new users.

## Technical Details

### Database Schema Changes

- None beyond existing models; ensure indexes support aggregate queries.

### API Endpoints

- Implement consolidated dashboard API returning user’s workspaces, recents, and favorites in minimal round trips.

### UI Components

- Create reusable cards/list components for workspaces and documents, integrated with action menus.
- Implement responsive sidebar layout with collapsible sections.

### Permissions/Security

- Ensure data respects workspace access controls (PERM-01) and hides soft-deleted content.

## Dependencies

- WS-01 workspace CRUD for data.
- NAV-06 search integration.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright) — extend TEST-01 suite with dashboard flows below.
- [x] Manual testing scenarios

### E2E Test Coverage (Playwright)

- Authenticated user loads `/dashboard` and sees all private + shared workspaces rendered simultaneously with collapsible sections.
- Toggle workspace sections open/closed and confirm state persists across navigation or refresh (per design decision).
- Create/Rename workspace (from WS-01 flows) and ensure dashboard reflects updates in real time without manual refresh.
- Remove user from workspace (via API helper) and verify the workspace disappears from dashboard lists instantly.

## Related Documentation

- Product requirements: product-requirements.md: NAV-02.
- Product spec: product.md > Navigation, Discovery & UI Structure > Dashboard/sidebar.

## Notes

Coordinate with analytics to capture dashboard engagement metrics for future iteration.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

**2025-10-05**: Implemented global dashboard with all features:
- Created `/api/dashboard` endpoint that consolidates workspaces, documents, folders, and recent documents in a single API call
- Built dashboard UI with sidebar-first layout displaying all accessible workspaces simultaneously
- Implemented collapsible workspace sections with expand/collapse functionality (all expanded by default)
- Added workspace CRUD operations (create, rename, delete) directly from dashboard
- Integrated recent documents display showing last 20 accessed documents
- Added loading states and empty states for new users
- Created Playwright E2E test suite in `e2e/dashboard.spec.ts` covering all major flows
- Dashboard uses Better Auth client-side session management consistent with rest of app

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
