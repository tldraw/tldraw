# [NAV-02]: Global Dashboard

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

- [ ] Dashboard displays **all accessible workspaces simultaneously** - no workspace switcher or dropdown needed.
- [ ] Sidebar includes collapsible sections for each workspace showing documents and folder trees at once.
- [ ] Dashboard lists private and shared workspaces, recent documents, and folder shortcuts with responsive layout.
- [ ] Quick access to all workspaces and their documents is available without navigation between workspace views.
- [ ] Search bar or filters allow locating documents quickly (linked to NAV-06 search ticket).
- [ ] Data loads efficiently with loading skeletons and empty states for new users.

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
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

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
