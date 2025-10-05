# [M15-02]: Handle Empty Workspace Lists in Dashboard Queries

Date created: 2025-10-05
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
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [x] Testing
- [ ] Infrastructure

## Description

When a user has no accessible workspaces (for example, immediately after account creation if provisioning fails or a user is only invited later), the dashboard server component and `/api/dashboard` handler pass an empty array into Supabase `.in('workspace_id', [])`. Supabase rejects empty `IN` filters, resulting in a 400 `PGRST116` error and a 500 response (`apps/simple-dotcom/simple-client/src/app/dashboard/page.ts:65-111`, `apps/simple-dotcom/simple-client/src/app/api/dashboard/route.ts:75-121`). We need to short-circuit these queries and return empty collections instead of crashing the dashboard experience.

## Acceptance Criteria

- [ ] Dashboard server component renders successfully when `workspaceIds.length === 0`, returning empty workspaces, documents, folders, and recent documents arrays.
- [ ] `/api/dashboard` responds with `{ success: true, data: { workspaces: [], recentDocuments: [] } }` for accounts without workspace membership (no Supabase error logs).
- [ ] Add regression tests covering the empty-workspace scenario for both the server component helper and API route.

## Technical Details

### Database Schema Changes

None.

### API Endpoints

- Update `/api/dashboard` handler to skip `in` filters when no IDs exist and return early.
- Ensure any shared dashboard data helper returns memoized empty structures without hitting Supabase.

### UI Components

- Dashboard client should continue to show the “No workspaces yet” empty state with no runtime errors.

### Permissions/Security

No changes.

## Dependencies

- Relies on fixes from `M15-01` to ensure provisioning failures are observable.
- Coordinate with `NAV-02` (global dashboard experience) for messaging alignment if empty state copy needs tweaks.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product spec: `product.md` > Navigation & Dashboard

## Notes

- Consider extracting dashboard data fetching into a shared library to avoid duplicate guard logic between server component and API route.

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

-

## Open questions

- Should we instrument Supabase errors to catch similar guard gaps in other routes?
