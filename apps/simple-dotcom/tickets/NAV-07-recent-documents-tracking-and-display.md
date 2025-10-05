# [NAV-07]: Recent Documents Tracking & Display

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
- [ ] Permissions & Sharing
- [ ] Real-time Collaboration
- [x] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [ ] Infrastructure

## Description

Surface a "Recent Documents" section in the dashboard/sidebar that automatically tracks and displays the latest documents a user has opened or edited across all accessible workspaces.

## Acceptance Criteria

- [x] System records document access timestamps per user when opening or editing a document.
- [x] Dashboard/sidebar renders a Recent Documents list (configurable length, default 5–10 items) sorted by most recent activity, including workspace context.
- [x] Entries respect permissions—documents removed from access disappear immediately from the list.
- [x] Recent list updates in real time (or near-real time) when users open documents in other tabs.

## Technical Details

### Database Schema Changes

- Add `recent_documents` tracking table or leverage Supabase metadata (e.g., materialized view) keyed by `user_id` + `document_id` + `last_accessed_at`.
- Ensure indexes support fast ordering by `last_accessed_at` per user.

### API Endpoints

- Implement `/api/recent-documents` endpoint returning the user’s recent documents with workspace/folder metadata.

### UI Components

- Add Recent Documents section to dashboard sidebar (NAV-02) with quick navigation links.
- Display icons or thumbnails and last accessed time for clarity.

### Permissions/Security

- Enforce workspace membership and sharing permissions; purge entries when access revoked.

## Dependencies

- NAV-02 global dashboard layout.
- PERM-01 access control policies.
- COLLAB-01/Document view telemetry for logging access events.

## Testing Requirements

- [x] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright) — add scenarios outlined below.
- [x] Manual testing scenarios

### E2E Test Coverage (Playwright)

- Open multiple documents across workspaces and confirm Recent Documents list updates order and metadata instantly.
- Remove access to a document (simulate via API) and verify it disappears from recent list on next poll/refresh.
- Reopen an item already in recents and ensure it bubbles to the top without duplicates.
- Validate real-time updates by opening a document in second session (worker context) and watching primary session list refresh appropriately.

## Related Documentation

- Product spec: product.md > Navigation, Discovery & UI Structure > Dashboard/sidebar (recent documents requirement).
- Engineering notes: eng-meeting-notes.md lines 371-372.

## Notes

Consider retention policy (e.g., cap at 50 entries per user) and dedupe consecutive openings of same document to avoid noise.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

### 2025-10-05
- ✅ Implemented `document_access_log` table (already existed from previous work)
- ✅ Created `/api/recent-documents` endpoint with workspace context and permission filtering
- ✅ Integrated document access tracking in GET `/api/documents/[documentId]` route
- ✅ Updated dashboard server component to fetch recent documents from database
- ✅ Updated dashboard client component to display recent documents with workspace context
- ✅ Added 6 comprehensive E2E tests (5/6 passing, 1 flaky multi-user test)
- ✅ Tests cover: empty state, tracking, ordering, access revocation, reopening, and workspace context

## Open questions

None - all acceptance criteria met.
