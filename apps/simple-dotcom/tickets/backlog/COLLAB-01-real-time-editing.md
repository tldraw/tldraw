# [COLLAB-01]: Real-Time Editing

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
- [ ] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Integrate tldraw sync worker and WebSocket infrastructure to enable real-time multiplayer editing on canvas documents, ensuring reliable connection management and conflict resolution.

## Acceptance Criteria

- [ ] Document editing sessions connect to Cloudflare Durable Object sync worker, syncing changes across multiple clients with latency under 200ms in nominal conditions.
- [ ] Connection lifecycle handles join, reconnect, and disconnect scenarios without data loss, including session handoff when tab closes.
- [ ] Sync errors and disconnects surface user-facing notifications with auto-retry behavior.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Configure `/api/sync` (or equivalent) to generate auth tokens/room identifiers for tldraw sessions referencing document IDs and permissions.

### UI Components

- Integrate tldraw canvas component with multiplayer adapters and update status indicators (e.g., syncing, reconnecting).

### Permissions/Security

- Validate workspace membership and document sharing permissions before issuing sync access tokens.
- Ensure tokens are short-lived and scoped to specific document sessions.

## Dependencies

- TECH-02 storage integration for snapshot persistence.
- PERM-02 sharing modes to gate access to sync sessions.

## Testing Requirements

- [ ] Unit tests
- [x] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: COLLAB-01.
- Product spec: product.md > Real-Time Collaboration > Multiplayer Editing.
- Engineering notes: eng-meeting-notes.md > Testing > Multiplayer sync.

## Notes

Reuse dotcom sync-worker as blueprint; confirm resource limits with Cloudflare to avoid throttling during load tests.

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

[Track progress, decisions, and blockers as work proceeds. Each entry should include date and brief description.]

## Open questions

[List unresolved questions or areas needing clarification. Remove items as they are answered.]
