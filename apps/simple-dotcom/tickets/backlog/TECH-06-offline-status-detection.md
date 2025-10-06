# [TECH-06]: Offline Status Detection

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
- [ ] Workspaces
- [x] Documents
- [ ] Folders
- [ ] Permissions & Sharing
- [x] Real-time Collaboration
- [x] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Implement global offline/online detection integrated with tldraw sync so users receive unobtrusive banners when connectivity changes and understand when edits are queued.

## Acceptance Criteria

- [ ] Application detects network status changes (navigator events and heartbeat checks) and updates global state.
- [ ] Offline banner/toast appears across document and dashboard views, indicating edits will sync when connection returns.
- [ ] Reconnection clears banner automatically once sync confirmed, aligning with COLLAB-03 behavior.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Provide lightweight health check endpoint for active polling/heartbeat if needed to validate connectivity beyond browser events.

### UI Components

- Build reusable connectivity banner component with accessible styling, hooking into global store.

### Permissions/Security

- Ensure offline state does not expose restricted data; prevent banners from leaking workspace names in guest mode.

## Dependencies

- COLLAB-03 offline resilience.
- NAV-04 document view for banner placement.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: TECH-06.
- Product spec: product.md > Technical Architecture > Offline behavior.

## Notes

Document known offline limitations (e.g., invite acceptance requires online) for support scripts.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
