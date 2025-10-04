# [TECH-02]: tldraw Storage and Snapshots

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
- [x] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [x] Infrastructure

## Description

Integrate Cloudflare R2 storage for persisting tldraw document snapshots while application data lives in Supabase, ensuring autosave and backup flows meet MVP reliability expectations.

## Acceptance Criteria

- [ ] Sync worker writes periodic snapshots of document state to R2 with retention policy aligned to requirements.
- [ ] Application can retrieve latest snapshot when loading document, falling back gracefully if snapshot unavailable.
- [ ] Backup strategy documented, including lifecycle management and error handling for storage failures.

## Technical Details

### Database Schema Changes

- Add references in `documents` table to track snapshot metadata (e.g., `snapshot_key`, `last_snapshot_at`).

### API Endpoints

- Implement services for reading/writing snapshots via Cloudflare Workers; expose necessary endpoints for manual restore if needed.

### UI Components

- Surface autosave indicator reflecting snapshot status (integrated with COLLAB-03 offline state).

### Permissions/Security

- Secure R2 access with signed URLs scoped per document; ensure public documents only expose derived data as permitted.

## Dependencies

- COLLAB-01 real-time editing pipeline.
- DOC-05 archive hard delete to trigger snapshot cleanup.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: TECH-02.
- Product spec: product.md > Technical Architecture > Storage.
- Engineering notes: eng-meeting-notes.md > Technical Implementation Details > Document versioning.

## Notes

Plan for storage cost monitoring and budget alerts; document how to restore snapshots manually if UI not yet built.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
