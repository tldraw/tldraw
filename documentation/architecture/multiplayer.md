---
title: Multiplayer architecture
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - multiplayer
  - collaboration
  - sync
  - websocket
  - real-time
---

The multiplayer architecture in tldraw enables real-time collaborative editing across multiple users. This document explains how the synchronization system works, from the client-side hooks to the server-side Cloudflare Workers infrastructure.

## Overview

tldraw's multiplayer system is built on three layers:

1. **Client layer** (`@tldraw/sync`, `@tldraw/sync-core`) - React hooks and sync client
2. **Protocol layer** - WebSocket-based bidirectional communication
3. **Server layer** (sync-worker) - Cloudflare Workers with Durable Objects

The system uses a server-authoritative model where changes are applied optimistically on the client, then validated and broadcast by the server.

## Architecture diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Clients                                  │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  Client A   │  Client B   │  Client C   │  Client D   │   ...   │
│  (Browser)  │  (Browser)  │  (Browser)  │  (Browser)  │         │
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴─────────┘
       │             │             │             │
       │ WebSocket   │ WebSocket   │ WebSocket   │ WebSocket
       │             │             │             │
       ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge Network                       │
├─────────────────────────────────────────────────────────────────┤
│                      sync-worker                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              TLDrawDurableObject (per room)               │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                  TLSocketRoom                       │  │  │
│  │  │  - Session management                               │  │  │
│  │  │  - Change validation                                │  │  │
│  │  │  - State broadcasting                               │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
       │
       │ Persistence
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Storage Layer                               │
├─────────────────┬──────────────────┬────────────────────────────┤
│   R2 (Rooms)    │  R2 (Assets)     │   PostgreSQL (Metadata)    │
└─────────────────┴──────────────────┴────────────────────────────┘
```

## Client-side synchronization

### Using the sync hooks

The simplest way to enable multiplayer is with `useSyncDemo`:

```typescript
import { Tldraw } from 'tldraw'
import { useSyncDemo } from '@tldraw/sync'

function App() {
  const store = useSyncDemo({ roomId: 'my-room' })

  return <Tldraw store={store} />
}
```

For production, use `useSync` with your own backend:

```typescript
import { useSync } from '@tldraw/sync'

function App() {
  const store = useSync({
    uri: 'wss://your-sync-server.com/room/my-room',
    // Optional: provide asset store for uploads
    assets: myAssetStore,
  })

  return <Tldraw store={store} />
}
```

### TLSyncClient internals

The sync client manages the connection lifecycle:

```typescript
class TLSyncClient<R extends UnknownRecord> {
  // Connection state (reactive)
  status: Signal<TLPersistentClientSocketStatus>

  // The synchronized store
  store: Store<R>

  // Connection management
  connect(): void
  disconnect(): void
}
```

Connection states flow through:

```
initial → connecting → online ⟷ offline → error
```

## Protocol

### Message types

**Client → Server:**

| Message | Purpose |
|---------|---------|
| `connect` | Initial handshake with schema information |
| `push` | Send local changes to server |
| `ping` | Keepalive heartbeat |

**Server → Client:**

| Message | Purpose |
|---------|---------|
| `connect` | Confirm connection with initial state |
| `data` | Broadcast state changes |
| `pong` | Respond to keepalive |
| `incompatibility_error` | Schema mismatch detected |

### Diff format

Changes are transmitted as compact diffs:

```typescript
interface NetworkDiff<R extends UnknownRecord> {
  [recordId: string]:
    | [RecordOpType.Put, R]        // Full record
    | [RecordOpType.Patch, ObjectDiff]  // Partial update
    | [RecordOpType.Remove]        // Deletion
}
```

Only changed properties are sent for patches:

```typescript
// Original shape: { id: 'shape1', x: 100, y: 200, props: { color: 'red' } }
// After moving to x: 150

// NetworkDiff sent:
{
  'shape1': [RecordOpType.Patch, {
    x: [ValueOpType.Put, 150]
  }]
}
```

### Connection lifecycle

1. **Connect**: Client sends schema version and capabilities
2. **Hydration**: Server responds with full room state
3. **Sync**: Bidirectional diff-based updates
4. **Presence**: Real-time cursor and selection sync
5. **Disconnect**: Graceful cleanup with persistence

## Server-side architecture

### Durable Objects

The sync-worker uses Cloudflare Durable Objects for stateful room management:

**TLDrawDurableObject** - One per room:

```typescript
class TLDrawDurableObject extends DurableObject {
  private _room: Promise<TLSocketRoom<TLRecord, SessionMeta>> | null = null

  async onRequest(req: IRequest, openMode: RoomOpenMode) {
    // Create WebSocket pair
    const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()

    // Validate authentication
    const auth = await getAuth(req, this.env)

    // Connect to room
    const room = await this.getRoom()
    room.handleSocketConnect({
      sessionId,
      socket: serverWebSocket,
      meta: { userId: auth?.userId },
      isReadonly: openMode === ROOM_OPEN_MODE.READ_ONLY,
    })

    return new Response(null, { status: 101, webSocket: clientWebSocket })
  }
}
```

**TLSocketRoom** - Manages room state:

```typescript
class TLSocketRoom<R extends UnknownRecord, Meta> {
  // Session tracking
  sessions: Map<string, RoomSession<R, Meta>>

  // Room state
  store: Store<R>

  // Lifecycle methods
  handleSocketConnect(config: SessionConfig): void
  handleSocketMessage(sessionId: string, message: any): void
  closeSession(sessionId: string, reason?: string): void

  // State access
  getCurrentSnapshot(): RoomSnapshot<R>
  getCurrentDocumentClock(): number
}
```

### Persistence strategy

Room state is persisted to R2 with throttling:

```typescript
const PERSIST_INTERVAL_MS = 8_000 // 8 seconds

triggerPersist = throttle(() => {
  this.persistToDatabase()
}, PERSIST_INTERVAL_MS)

async persistToDatabase() {
  const room = await this.getRoom()
  const clock = room.getCurrentDocumentClock()

  // Skip if no changes
  if (this._lastPersistedClock === clock) return

  const snapshot = room.getCurrentSnapshot()
  const key = getR2KeyForRoom({ slug: this.roomId })

  // Persist to main bucket
  await this.r2.rooms.put(key, JSON.stringify(snapshot))

  // Version history
  const versionKey = `${key}/${new Date().toISOString()}`
  await this.r2.versionCache.put(versionKey, JSON.stringify(snapshot))

  this._lastPersistedClock = clock
}
```

### Session management

Sessions track connected clients:

```typescript
interface RoomSession<R, Meta> {
  sessionId: string
  presenceId: string | null
  socket: TLRoomSocket<R>
  meta: Meta
  isReadonly: boolean
  lastInteractionTime: number
  state: RoomSessionState
}

enum RoomSessionState {
  AwaitingConnectMessage,  // Initial connection
  Connected,               // Active session
  AwaitingRemoval,         // Cleanup in progress
}
```

Timeout constants:

- `SESSION_START_WAIT_TIME`: 10s to complete handshake
- `SESSION_IDLE_TIMEOUT`: 20s before idle detection
- `SESSION_REMOVAL_WAIT_TIME`: 5s cleanup delay

## Conflict resolution

### Server-authoritative model

1. Client applies changes optimistically for immediate feedback
2. Changes sent to server via push message
3. Server validates changes (permissions, schema)
4. Server broadcasts canonical version to all clients
5. Clients reconcile their state with server's version

### Handling conflicts

When server state differs from client expectations:

```typescript
// Client has pending optimistic changes
// Server broadcasts different state

// Resolution:
// 1. Roll back local optimistic changes
// 2. Apply server's authoritative state
// 3. Re-apply local changes if still valid
```

### Clock-based versioning

Each change has a logical clock timestamp for ordering:

```typescript
interface DocumentClock {
  epoch: number       // Global epoch counter
  timestamp: number   // Server timestamp
}
```

## Presence system

Real-time presence shows other users' cursors and selections:

```typescript
interface TLPresence {
  id: string
  cursor: { x: number; y: number } | null
  selection: string[]  // Selected shape IDs
  userName: string
  color: string
}
```

Presence is:

- **Throttled**: Updates limited to reduce bandwidth
- **Ephemeral**: Not persisted to storage
- **Selective**: Only sent to relevant clients

## Authentication and permissions

### Permission levels

```typescript
enum ROOM_OPEN_MODE {
  READ_WRITE = 'read-write',
  READ_ONLY = 'readonly',
  READ_ONLY_LEGACY = 'readonly-legacy',
}
```

### File-based permissions

```typescript
// Check access on connection
if (file.ownerId !== auth?.userId) {
  if (!file.shared) {
    return closeSocket(TLSyncErrorCloseEventReason.FORBIDDEN)
  }
  if (file.sharedLinkType === 'view') {
    openMode = ROOM_OPEN_MODE.READ_ONLY
  }
}
```

### Rate limiting

```typescript
const rateLimited = await isRateLimited(this.env, userId)
if (rateLimited) {
  return closeSocket(TLSyncErrorCloseEventReason.RATE_LIMITED)
}
```

## Error handling

### Error codes

```typescript
enum TLSyncErrorCloseEventReason {
  NOT_FOUND = 'not_found',
  FORBIDDEN = 'forbidden',
  NOT_AUTHENTICATED = 'not_authenticated',
  RATE_LIMITED = 'rate_limited',
  CLIENT_TOO_OLD = 'clientTooOld',
  SERVER_TOO_OLD = 'serverTooOld',
  ROOM_FULL = 'room_full',
}
```

### Reconnection

The client automatically reconnects with exponential backoff:

```typescript
// Reconnection attempts with increasing delays
// Attempt 1: 1s delay
// Attempt 2: 2s delay
// Attempt 3: 4s delay
// ... up to maximum delay
```

## Performance optimizations

### Message batching

Multiple changes are batched before sending:

```typescript
const batch = collectChanges(startTime, endTime)
socket.send(batch)
```

### Connection limits

```typescript
const MAX_CONNECTIONS = 50

if (room.getNumActiveSessions() > MAX_CONNECTIONS) {
  return closeSocket(TLSyncErrorCloseEventReason.ROOM_FULL)
}
```

### Caching

- Durable Object memory cache for room state
- R2 caching for room snapshots
- CDN caching for static assets

## Self-hosting

For self-hosted multiplayer, see the sync-cloudflare template:

```bash
npx create-tldraw my-app --template tldraw-sync-cloudflare
```

This provides:

- Cloudflare Worker with Durable Objects
- R2 storage for persistence
- WebSocket handling
- Basic authentication

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
