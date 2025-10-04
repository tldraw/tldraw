# [NAV-07]: Recent Documents Tracking & Display

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

- [ ] System records document access timestamps per user when opening or editing a document.
- [ ] Dashboard/sidebar renders a Recent Documents list (configurable length, default 5–10 items) sorted by most recent activity, including workspace context.
- [ ] Entries respect permissions—documents removed from access disappear immediately from the list.
- [ ] Recent list updates in real time (or near-real time) when users open documents in other tabs.

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

- [ ] Unit tests
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

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
