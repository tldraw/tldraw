# [COLLAB-01B]: Multiplayer Sync Worker Integration

Date created: 2025-10-05
Date last updated: 2025-10-05
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

Deploy Cloudflare Durable Objects sync worker and integrate WebSocket infrastructure to enable real-time multiplayer editing on canvas documents. This builds on COLLAB-01A's basic tldraw integration by adding the sync layer for multi-user collaboration.

## Acceptance Criteria

- [ ] Cloudflare Workers sync endpoint deployed and accessible with Durable Objects for room persistence.
- [ ] Document editing sessions connect to sync worker via WebSocket, syncing changes across multiple clients with latency under 200ms in nominal conditions.
- [ ] Connection lifecycle handles join, reconnect, and disconnect scenarios without data loss, including session handoff when tab closes.
- [ ] Sync errors and disconnects surface user-facing notifications with auto-retry behavior.
- [ ] Multiple users can simultaneously edit the same document with automatic conflict resolution.

## Technical Details

### Database Schema Changes

- None directly; TECH-02 handles Supabase metadata for snapshots.

### API Endpoints

- Implement `/api/sync/[documentId]/token` to generate authentication tokens for sync worker access.
- Tokens should encode: document ID, user ID, permission level (read/write), expiration.

### Infrastructure

**Cloudflare Workers Setup:**
- Deploy sync worker based on tldraw dotcom architecture (reference: `apps/dotcom/sync-worker`).
- Configure Durable Objects for document room state.
- Set up WebSocket routing and connection pooling.

**Client Integration:**
- Replace local persistence adapter with multiplayer sync adapter.
- Connect tldraw canvas to WebSocket endpoint with auth token.
- Implement reconnection logic with exponential backoff.

### Permissions/Security

- Validate workspace membership and document sharing permissions before issuing sync tokens.
- Tokens must be short-lived (e.g., 1 hour) and scoped to specific document + permission level.
- Sync worker must validate token on every connection attempt.

## Dependencies

**Prerequisites:**
- COLLAB-01A (basic tldraw integration) - REQUIRED
- TECH-02 (R2 storage) - snapshot persistence depends on this
- Document permission system must be functional

**Blocks:**
- COLLAB-02 (presence indicators)
- COLLAB-03 (offline resilience)
- Full multiplayer testing in TEST-02

## Testing Requirements

- [x] Unit tests (token generation, validation)
- [x] Integration tests (multi-client sync)
- [x] E2E tests (Playwright multi-browser)
- [x] Manual testing scenarios (load testing)

## Related Documentation

- Product spec: product.md > Real-Time Collaboration > Multiplayer Editing.
- tldraw sync docs: https://tldraw.dev/docs/collaboration
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/

## Notes

**Implementation Strategy:**
1. Start with dotcom sync-worker as blueprint (apps/dotcom/sync-worker)
2. Simplify for MVP: remove features we don't need (e.g., complex rate limiting)
3. Confirm Cloudflare resource limits before load testing
4. Consider local WebSocket fallback for development

**Performance Targets:**
- P50 latency: < 100ms
- P95 latency: < 200ms
- Support 10+ concurrent users per document

**Deferred to Post-MVP:**
- Advanced rate limiting per connection
- Detailed analytics/telemetry integration
- Horizontal scaling optimization

## Estimated Complexity

- [ ] Small (< 1 day)
- [ ] Medium (1-3 days)
- [x] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-05: Split from original COLLAB-01 to isolate multiplayer infrastructure from basic canvas integration.

## Open questions

- Do we need separate sync workers per environment (dev/staging/prod)?
  → Yes, use wrangler environments.
- Should sync tokens be refreshable or require full re-authentication?
  → Start with non-refreshable for MVP, revisit if UX suffers.
- How do we handle sync worker deployments during active sessions?
  → Graceful shutdown with 30s drain period; clients auto-reconnect.
