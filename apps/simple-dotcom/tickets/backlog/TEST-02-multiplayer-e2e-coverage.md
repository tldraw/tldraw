# [TEST-02]: Multiplayer E2E Coverage

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
- [x] Real-time Collaboration
- [ ] UI/UX
- [ ] API
- [ ] Database
- [x] Testing
- [x] Infrastructure

## Description

Extend Playwright suite to simulate multiple concurrent users editing the same document, verifying presence indicators, real-time sync, and permission changes propagate correctly.

## Acceptance Criteria

- [ ] Tests run with multiple browser contexts to simulate concurrent editors, verifying real-time canvas updates and presence avatars.
- [ ] Scenarios cover permission change mid-session (e.g., owner revokes access) and ensure disconnected client receives proper messaging.
- [ ] Tests capture latency metrics to ensure sync performance within target bounds.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Reuse existing endpoints; provide test helpers to seed multi-user workspaces quickly.

### UI Components

- Ensure presence UI exposes deterministic selectors for assertions.

### Permissions/Security

- Validate test accounts only access intended workspaces to avoid cross-test contamination.

## Dependencies

- COLLAB-01 real-time editing.
- COLLAB-02 presence indicators.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: TEST-02.
- Engineering notes: eng-meeting-notes.md > Testing > Multiplayer scenarios.

## Notes

Set generous timeouts for realtime assertions but keep suite parallelizable to avoid slowing CI pipeline.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
