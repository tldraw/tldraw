# [TECH-09]: Real-time Update Architecture

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
- [x] Workspaces
- [x] Documents
- [x] Folders
- [ ] Permissions & Sharing
- [x] Real-time Collaboration
- [ ] UI/UX
- [x] API
- [ ] Database
- [ ] Testing
- [x] Infrastructure

## Description

Define and document the real-time update architecture for non-canvas changes (workspace/document/folder CRUD, membership changes) using Supabase Realtime. This ticket establishes shared patterns, channel structure, subscription lifecycle, and event types referenced by multiple M2 tickets (DOC-01, MEM-02, NAV-03, etc.).

## Acceptance Criteria

- [ ] **Channel Structure Defined:**
  - Channel naming convention documented (e.g., `workspace:{workspace_id}`, `document:{document_id}`)
  - Scope rules: which updates belong in which channels
  - Authorization model: how channel access is validated

- [ ] **Event Types Documented:**
  - Standard event format with type, payload, timestamp, actor_id
  - Events for: workspace updates, membership changes, document CRUD, folder CRUD
  - Example payloads for each event type

- [ ] **Subscription Patterns:**
  - Client-side hooks/utilities for subscribing to channels
  - Reconnection handling and missed-update recovery
  - Cleanup on component unmount

- [ ] **Shared Utilities Implemented:**
  - `useWorkspaceRealtimeUpdates(workspaceId)` hook
  - `useDocumentListRealtimeUpdates(workspaceId)` hook
  - Server-side helper for broadcasting events consistently

## Technical Details

### Database Schema Changes

- None (uses Supabase Realtime on existing tables).

### API Endpoints

- Server-side utilities to broadcast Realtime events after mutations:
  - `broadcastWorkspaceEvent(workspaceId, eventType, payload)`
  - `broadcastDocumentEvent(documentId, eventType, payload)`

### UI Components

- React hooks wrapping Supabase Realtime subscriptions
- Automatic re-rendering when events received
- Error boundaries for subscription failures

### Permissions/Security

- Supabase RLS policies control who can subscribe to channels
- Client attempts to subscribe to unauthorized channels fail gracefully
- Events never leak data across workspace boundaries

## Dependencies

**Prerequisites:**
- Supabase Realtime enabled on database
- RLS policies from PERM-01 functional

**Blocks:**
- DOC-01 (document CRUD realtime updates)
- MEM-02 (membership list realtime updates)
- NAV-03 (workspace browser realtime updates)
- WS-04 (archive list realtime updates)

## Testing Requirements

- [x] Unit tests (event broadcasting utilities)
- [ ] Integration tests (end-to-end subscription flows)
- [ ] E2E tests (Playwright - not critical)
- [x] Manual testing scenarios

## Related Documentation

- Supabase Realtime docs: https://supabase.com/docs/guides/realtime
- Product spec: product.md > Real-Time Collaboration (non-canvas updates)

## Notes

**Why This Ticket:**
- Multiple M2 tickets reference "Supabase Realtime updates" without shared patterns
- Defining architecture upfront prevents inconsistencies and duplication
- Shared utilities reduce implementation time for dependent tickets

**Channel Design Recommendations:**
- Workspace-level channel for workspace metadata, memberships, folders
- Document-specific channels NOT needed (canvas sync uses separate WebSocket)
- Minimize channel count to reduce connection overhead

**Event Format Example:**
```typescript
{
  type: 'document.created' | 'document.updated' | 'document.archived',
  payload: { documentId, workspaceId, name, ... },
  timestamp: '2025-10-05T12:34:56Z',
  actor_id: 'user-uuid'
}
```

**Reconnection Strategy:**
- Supabase Realtime handles reconnect automatically
- On reconnect: refetch current state to catch missed updates
- Use optimistic UI updates + reconciliation pattern

## Estimated Complexity

- [x] Small (< 1 day)
- [ ] Medium (1-3 days)
- [ ] Large (3-5 days)
- [ ] Extra Large (> 5 days)

## Worklog

2025-10-05: Created to define real-time architecture for non-canvas updates across M2 tickets.

## Open questions

- Do we need event ordering guarantees?
  → No for MVP; optimistic UI + eventual consistency acceptable.
- Should we batch events or send individually?
  → Individual for simplicity; consider batching post-MVP if performance issues.
- How do we handle missed events if user offline for extended period?
  → Full data refetch on reconnect; don't try to replay all missed events.
