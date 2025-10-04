# [PERF-03]: Permission Cache with Invalidation

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
- [x] UI/UX
- [x] API
- [x] Database
- [ ] Testing
- [x] Infrastructure

## Description

Implement short-lived caching (5–10s) for permission checks to reduce load on Supabase while ensuring immediate invalidation when permissions change.

## Acceptance Criteria

- [ ] Permission lookup layer caches recent workspace/document access decisions with configurable TTL (<=10 seconds).
- [ ] Cache invalidates instantly when membership, sharing, or ownership changes occur via event-driven triggers.
- [ ] Monitoring confirms cache hit rate improvements without stale authorization decisions reaching users.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Integrate caching middleware around permission checks in API layer.

### UI Components

- Ensure UI receives realtime updates when permissions change so cached decisions don’t cause stale UI states.

### Permissions/Security

- Validate that cache cannot outlive change events; fallback to fresh lookup if invalidation uncertain.

## Dependencies

- PERM-01 access control baseline.
- MEM-02/03 for emitting change events.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [ ] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: PERF-03.
- Engineering notes: eng-meeting-notes.md > Performance > Permission caching strategy.

## Notes

Consider using edge cache (e.g., Cloudflare KV) or in-memory cache per deployment depending on complexity; document chosen approach.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)
