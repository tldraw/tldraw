---
title: Multiplayer architecture
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - multiplayer
  - collaboration
  - sync
  - websocket
  - real-time
---

## Overview

tldraw multiplayer enables real-time collaboration by synchronizing store records over WebSockets. The system is server-authoritative: clients apply changes optimistically, then the server validates and rebroadcasts canonical updates. The implementation spans client hooks, a protocol layer, and a Cloudflare Worker with Durable Objects.

## Key components

### Client layer

`@tldraw/sync` and `@tldraw/sync-core` provide a sync client and React hooks. The client owns the synchronized Store, manages connection state, and emits diffs to the server.

### Protocol layer

The protocol sends compact diffs (put, patch, remove) and includes schema metadata during the handshake. This keeps bandwidth low and allows compatibility checks before sync begins.

### Server layer

The sync worker hosts a Durable Object per room. Each room validates incoming changes, updates its Store, broadcasts diffs to connected clients, and persists snapshots to storage.

### Persistence layer

Room snapshots are stored in R2 with version history, and metadata lives in Postgres. Assets are stored separately and referenced by asset records.

## Architecture diagram

```
Clients (browsers)
    │ WebSocket
    ▼
Cloudflare sync-worker
  └─ TLDrawDurableObject (per room)
       └─ TLSocketRoom (session + Store)
    │
    ▼
Storage (R2 snapshots + Postgres metadata)
```

## Data flow

1. Client connects and sends schema versions.
2. Server validates compatibility and sends the room snapshot.
3. Client applies the snapshot and begins bidirectional diff sync.
4. Presence updates (cursor, selection) flow alongside record diffs.
5. Server persists snapshots on a throttled interval.

## Conflict resolution

The server is the source of truth. If the server rebroadcasts a change that conflicts with optimistic local state, the client rolls back the optimistic change, applies the server update, and replays any still-valid local changes.

## Authentication and permissions

The server checks authentication on connect, enforces read-only or read-write access, and rate-limits abusive clients. Permissions are evaluated before the client enters the sync loop.

## Self-hosting

Use the Cloudflare template to run your own sync worker:

```bash
npx create-tldraw my-app --template tldraw-sync-cloudflare
```

## Key files

- packages/sync/src/lib/useSync.tsx - Main React hook
- packages/sync-core/src/lib/TLSyncClient.ts - Client implementation
- packages/sync-core/src/lib/TLSyncRoom.ts - Server room implementation
- packages/sync-core/src/lib/protocol.ts - Message protocol
- packages/sync-core/src/lib/diff.ts - Diff calculation
- apps/dotcom/sync-worker/src/TLDrawDurableObject.ts - Production server

## Related

- [@tldraw/sync](../packages/sync.md) - React hooks for sync
- [@tldraw/sync-core](../packages/sync-core.md) - Core sync infrastructure
- [Sync worker](../infrastructure/sync-worker.md) - Production server
- [Sync Cloudflare template](../templates/sync-cloudflare.md) - Self-hosting guide
