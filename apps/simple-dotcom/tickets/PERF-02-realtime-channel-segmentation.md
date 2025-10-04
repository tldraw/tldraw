# [PERF-02]: Realtime Channel Segmentation

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
- [x] Permissions & Sharing
- [x] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Configure separate realtime channels for canvas sync traffic and application data (lists, presence, permissions) to avoid contention and maintain responsiveness during collaborative sessions.

## Acceptance Criteria

- [ ] tldraw sync uses dedicated channel managed by Cloudflare Durable Objects, while Supabase Realtime handles app-level updates on independent channels.
- [ ] Application remains responsive when many realtime events fire simultaneously, with no noticeable lag in UI updates.
- [ ] Documentation outlines channel topology for future maintenance.

## Technical Details

### Database Schema Changes

- None.

### API Endpoints

- Adjust realtime subscription endpoints or token issuance to specify channel names and scopes.

### UI Components

- Update client realtime hooks to subscribe/unsubscribe to correct channels for documents, workspaces, and presence.

### Permissions/Security

- Ensure channel permissions align with sharing modes and workspace membership.

## Dependencies

- COLLAB-01 sync implementation.
- COLLAB-02 presence signals.

## Testing Requirements

- [ ] Unit tests
- [ ] Integration tests
- [x] E2E tests (Playwright)
- [x] Manual testing scenarios

## Related Documentation

- Product requirements: product-requirements.md: PERF-02.
- Engineering notes: eng-meeting-notes.md > Performance > Realtime channel separation.

## Notes

Load test both channels simultaneously to validate resource allocation and detect message loss.

## Estimated Complexity

- [ ] Small (< 1 day)
- [x] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)
