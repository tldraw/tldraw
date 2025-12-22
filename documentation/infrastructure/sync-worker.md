---
title: Sync worker
created_at: 12/17/2024
updated_at: 12/19/2025
keywords:
  - sync
  - worker
  - cloudflare
  - multiplayer
  - collaboration
status: published
date: 12/19/2025
order: 3
---

The sync worker is the core collaboration service for tldraw.com. It uses Cloudflare Workers and Durable Objects to manage rooms, persist snapshots, and broadcast real-time changes over WebSockets.

## Key components

### Durable Objects

- TLDrawDurableObject: room state and real-time sync
- TLUserDurableObject: user-specific sync data
- TLPostgresReplicator: database replication fan-out
- TLStatsDurableObject: metrics aggregation
- TLLoggerDurableObject: centralized logging

### WebSocket routing

The worker upgrades room routes to WebSocket sessions and connects them to the room Durable Object:

```typescript
const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
const room = await this.getRoom()
room.handleSocketConnect({
	sessionId,
	socket: serverWebSocket,
	meta: { userId: auth?.userId },
	isReadonly: openMode === ROOM_OPEN_MODE.READ_ONLY,
})
return new Response(null, { status: 101, webSocket: clientWebSocket })
```

### Persistence

Room snapshots are persisted to R2 on a throttled interval, with optional version history in a separate bucket.

## Data flow

1. Client connects to a room route and sends schema metadata.
2. The room Durable Object hydrates state and starts the sync loop.
3. Clients send diffs; the room validates and rebroadcasts.
4. The worker periodically writes snapshots to R2.

## Development workflow

```bash
./dev.sh

./reset-db.sh

yarn clean
```

## Key files

- apps/dotcom/sync-worker/src/worker.ts - Worker entry and routing
- apps/dotcom/sync-worker/src/TLDrawDurableObject.ts - Room Durable Object
- apps/dotcom/sync-worker/src/TLUserDurableObject.ts - User Durable Object
- apps/dotcom/sync-worker/src/TLPostgresReplicator.ts - Postgres replication
- apps/dotcom/sync-worker/src/TLStatsDurableObject.ts - Metrics collection
- apps/dotcom/sync-worker/src/TLLoggerDurableObject.ts - Logging
- apps/dotcom/sync-worker/wrangler.toml - Deployment configuration

## Related

- [Multiplayer architecture](../architecture/multiplayer.md)
- [@tldraw/sync](../packages/sync.md)
- [@tldraw/sync-core](../packages/sync-core.md)
