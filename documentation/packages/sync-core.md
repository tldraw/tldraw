---
title: "@tldraw/sync-core"
created_at: 17/12/2024
updated_at: 17/12/2024
keywords:
  - sync
  - collaboration
  - multiplayer
  - websocket
  - real-time
---

The `@tldraw/sync-core` package provides the core infrastructure for real-time collaboration in tldraw. It implements a client-server synchronization protocol for sharing drawing state across multiple users, handling network issues, conflict resolution, and maintaining data consistency.

## Overview

This package is the foundation of tldraw's multiplayer capabilities. It provides:

- Bidirectional WebSocket communication protocol
- Efficient diff-based state synchronization
- Server-authoritative conflict resolution
- Automatic reconnection with exponential backoff
- Real-time presence (cursors, selections)
- Session management and lifecycle handling

The package is framework-agnostic and can be used in any JavaScript environment. For React-specific bindings, see `@tldraw/sync`.

## Architecture

### Client-server model

The sync system uses a server-authoritative model:

1. Clients apply changes optimistically for immediate feedback
2. Changes are sent to the server for validation
3. Server broadcasts the canonical version to all clients
4. Clients reconcile their state with the server's authoritative version

```
┌─────────┐     push      ┌─────────┐     broadcast    ┌─────────┐
│ Client  │ ────────────► │ Server  │ ───────────────► │ Client  │
│   A     │ ◄──────────── │  Room   │ ◄─────────────── │   B     │
└─────────┘     data      └─────────┘      push        └─────────┘
```

### Core components

**`TLSyncClient`** - Client-side synchronization manager:

```typescript
class TLSyncClient<R extends UnknownRecord> {
  // Connection management
  connect(): void
  disconnect(): void

  // Reactive state
  status: Signal<TLPersistentClientSocketStatus>
  store: Store<R>
}
```

**`TLSyncRoom`** - Server-side room management:

```typescript
class TLSyncRoom<R extends UnknownRecord, Meta> {
  // Session tracking
  sessions: Map<string, RoomSession<R, Meta>>

  // State management
  store: Store<R>

  // Room lifecycle
  getNumActiveConnections(): number
  close(): void
}
```

## Protocol

### Message types

The protocol defines specific message types for client-server communication:

**Client → Server:**

| Message | Purpose |
|---------|---------|
| `TLConnectRequest` | Initial connection with schema information |
| `TLPushRequest` | State changes to apply |
| `TLPingRequest` | Keepalive ping |

**Server → Client:**

| Message | Purpose |
|---------|---------|
| `ConnectEvent` | Connection established with initial state |
| `DataEvent` | State updates to apply |
| `IncompatibilityError` | Schema or version mismatch |
| `PongEvent` | Ping response |

### Connection lifecycle

1. **Connect**: Client sends schema and version information
2. **Hydration**: Server responds with full state snapshot
3. **Sync**: Bidirectional incremental updates via diffs
4. **Presence**: Real-time cursor and selection state
5. **Disconnect**: Graceful cleanup and state persistence

```typescript
// Client connection flow
const client = new TLSyncClient({
  store,
  socket: websocketAdapter,
  onSyncError: (error) => console.error('Sync error:', error),
})

client.connect()

// Monitor connection status
react('connection-status', () => {
  const status = client.status.get()
  console.log('Status:', status)
})
```

## Diff system

### NetworkDiff

The sync system uses compact, network-optimized change representations:

```typescript
interface NetworkDiff<R extends UnknownRecord> {
  [recordId: string]: RecordOp<R>
}

type RecordOp<R> =
  | [RecordOpType.Put, R]       // Add or replace record
  | [RecordOpType.Patch, ObjectDiff]  // Partial update
  | [RecordOpType.Remove]       // Delete record
```

### Object diffing

Fine-grained property-level changes minimize bandwidth:

```typescript
interface ObjectDiff {
  [key: string]: ValueOp
}

type ValueOp =
  | [ValueOpType.Put, any]      // Set property value
  | [ValueOpType.Patch, ObjectDiff]  // Nested object update
  | [ValueOpType.Append, any]   // Array append
  | [ValueOpType.Delete]        // Remove property
```

Instead of sending entire records, only changed properties are transmitted:

```typescript
// Original record
{ id: 'shape1', x: 100, y: 200, props: { color: 'red', size: 10 } }

// After moving shape
{ id: 'shape1', x: 150, y: 200, props: { color: 'red', size: 10 } }

// NetworkDiff sent (only the changed property)
{ 'shape1': [RecordOpType.Patch, { x: [ValueOpType.Put, 150] }] }
```

## Session management

### RoomSession

Each connected client has a session tracking its state:

```typescript
type RoomSession<R, Meta> = {
  state: RoomSessionState
  sessionId: string
  presenceId: string | null
  socket: TLRoomSocket<R>
  meta: Meta  // Custom metadata (user info, permissions, etc.)
  isReadonly: boolean
  lastInteractionTime: number
}

enum RoomSessionState {
  AwaitingConnectMessage,  // Initial connection pending
  Connected,               // Fully synchronized
  AwaitingRemoval,         // Disconnection in progress
}
```

### Timeout constants

```typescript
SESSION_START_WAIT_TIME = 10_000   // 10s to complete connection
SESSION_IDLE_TIMEOUT = 20_000     // 20s before idle detection
SESSION_REMOVAL_WAIT_TIME = 5_000 // 5s cleanup delay
```

## Network adapters

### ClientWebSocketAdapter

Manages WebSocket connections with reliability features:

```typescript
class ClientWebSocketAdapter implements TLPersistentClientSocket<TLRecord> {
  // Connection state
  status: Atom<TLPersistentClientSocketStatus>

  // Reliability
  restart(): void
  sendMessage(msg: any): void

  // Events
  onReceiveMessage: SubscribingFn<any>
  onStatusChange: SubscribingFn<TLPersistentClientSocketStatus>
}
```

### Connection status states

```typescript
type TLPersistentClientSocketStatus =
  | 'initial'      // Not yet connected
  | 'connecting'   // Connection in progress
  | 'online'       // Connected and synced
  | 'offline'      // Disconnected, will retry
  | 'error'        // Fatal error, won't retry
```

### ReconnectManager

Handles automatic reconnection with exponential backoff:

```typescript
// Reconnection attempts with increasing delays
// Attempt 1: 1s delay
// Attempt 2: 2s delay
// Attempt 3: 4s delay
// ... up to maximum delay
```

## Conflict resolution

### Server-authoritative model

The server is the source of truth for all state:

1. Client makes local change optimistically
2. Change sent to server via push message
3. Server validates and potentially modifies the change
4. Server broadcasts canonical version
5. All clients update to match server state

### Handling conflicts

When the server's version differs from what the client expected:

```typescript
// Client has local changes not yet acknowledged
// Server broadcasts different state

// Resolution:
// 1. Roll back local optimistic changes
// 2. Apply server's authoritative state
// 3. Re-apply local changes if still valid
```

### Change ordering

- **Causal ordering**: Changes applied in dependency order
- **Tombstone management**: Deletions tracked to prevent resurrection
- **Schema validation**: All changes validated before broadcast

## Presence system

Real-time presence shows other users' cursors and selections:

```typescript
// Presence record structure
interface TLPresence {
  id: string
  cursor: { x: number; y: number } | null
  selection: string[]  // Selected shape IDs
  userName: string
  color: string
}
```

### Presence optimization

- **Throttled updates**: Cursor movements throttled to reduce bandwidth
- **Selective broadcasting**: Only send presence to relevant clients
- **Ephemeral state**: Presence doesn't persist to storage

## Error handling

### TLRemoteSyncError

Specialized error types for synchronization issues:

```typescript
class TLRemoteSyncError extends Error {
  code: TLSyncErrorCloseEventCode
  reason: TLSyncErrorCloseEventReason
}

// Error reasons
enum TLSyncErrorCloseEventReason {
  NOT_FOUND = 'not_found',       // Room doesn't exist
  FORBIDDEN = 'forbidden',       // Permission denied
  CLIENT_TOO_OLD = 'clientTooOld', // Client needs upgrade
  SERVER_TOO_OLD = 'serverTooOld', // Server needs upgrade
}
```

### Error recovery

- **Automatic retry**: Reconnection with exponential backoff
- **State reconciliation**: Re-sync state after reconnection
- **Graceful degradation**: Handle partial sync failures

## Performance optimizations

### Batching

Multiple changes are batched before sending:

```typescript
// Instead of sending each change immediately
// Changes are collected and sent together
const batch = collectChanges(startTime, endTime)
socket.send(batch)
```

### Chunking

Large updates are split into manageable chunks:

```typescript
function chunk<T>(items: T[], maxSize: number): T[][] {
  // Split large arrays into smaller pieces
  // Prevents overwhelming the network or parser
}
```

### Throttling

High-frequency updates are throttled:

```typescript
// Cursor position updates throttled to ~30fps
// Prevents flooding the network with position changes
```

## Integration with store

The sync system integrates directly with `@tldraw/store`:

```typescript
// Changes from the store are captured and synced
store.listen((event) => {
  if (event.source === 'user') {
    syncClient.push(event.changes)
  }
})

// Incoming changes are applied to the store
syncClient.onData((changes) => {
  store.mergeRemoteChanges(changes)
})
```

## Schema compatibility

### Version checking

Client and server schema versions are compared on connection:

```typescript
// Connect request includes schema info
{
  type: 'connect',
  schema: {
    version: 3,
    storeVersion: 1,
    recordVersions: { shape: 5, page: 2 }
  }
}
```

### Handling mismatches

When schemas don't match:

- **Client too old**: Error prompting client upgrade
- **Server too old**: Error indicating server needs update
- **Compatible**: Migration applied if possible

## Key files

- packages/sync-core/src/lib/TLSyncClient.ts - Client-side synchronization
- packages/sync-core/src/lib/TLSyncRoom.ts - Server-side room management
- packages/sync-core/src/lib/protocol.ts - WebSocket protocol definitions
- packages/sync-core/src/lib/diff.ts - Diff calculation and application
- packages/sync-core/src/lib/ClientWebSocketAdapter.ts - WebSocket adapter
- packages/sync-core/src/lib/ReconnectManager.ts - Reconnection handling

## Related

- [@tldraw/sync](./sync.md) - React hooks built on sync-core
- [@tldraw/store](./store.md) - Record storage that sync-core synchronizes
- [Multiplayer architecture](../architecture/multiplayer.md) - High-level collaboration design
