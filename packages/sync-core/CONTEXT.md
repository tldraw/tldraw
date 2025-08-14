# Sync-Core Package Context

## Overview

The `@tldraw/sync-core` package provides the core infrastructure for real-time collaboration and synchronization in tldraw. It implements a robust client-server synchronization protocol for sharing drawing state across multiple users, handling network issues, conflict resolution, and maintaining data consistency.

## Architecture

### Core Components

#### `TLSyncClient` - Client-Side Synchronization

Manages client-side synchronization with the server:

```typescript
class TLSyncClient<R extends UnknownRecord> {
	// Connection management
	connect(): void
	disconnect(): void

	// State synchronization
	status: Signal<TLPersistentClientSocketStatus>
	store: Store<R>

	// Error handling
	TLSyncErrorCloseEventCode: 4099
	TLSyncErrorCloseEventReason: Record<string, string>
}
```

Key features:

- **Automatic Reconnection**: Handles network drops and reconnection
- **Optimistic Updates**: Local changes applied immediately
- **Conflict Resolution**: Server authoritative with rollback capability
- **Presence Management**: Real-time cursor and user presence

#### `TLSyncRoom` - Server-Side Room Management

Manages server-side state for collaboration rooms:

```typescript
class TLSyncRoom<R extends UnknownRecord, Meta> {
	// Session management
	sessions: Map<string, RoomSession<R, Meta>>

	// State management
	state: DocumentState
	store: Store<R>

	// Room lifecycle
	getNumActiveConnections(): number
	close(): void
}
```

Responsibilities:

- **Session Lifecycle**: Connect, disconnect, timeout management
- **State Broadcasting**: Distribute changes to all connected clients
- **Persistence**: Coordinate with storage backends
- **Schema Management**: Handle schema migrations and compatibility

### Protocol System

#### WebSocket Protocol (`protocol.ts`)

Defines the communication protocol between client and server:

**Client → Server Messages:**

```typescript
type TLSocketClientSentEvent =
	| TLConnectRequest // Initial connection with schema
	| TLPushRequest // State changes to apply
	| TLPingRequest // Keepalive ping
```

**Server → Client Messages:**

```typescript
type TLSocketServerSentEvent =
	| ConnectEvent // Connection established with initial state
	| DataEvent // State updates to apply
	| IncompatibilityError // Schema/version mismatch
	| PongEvent // Ping response
```

#### Connection Lifecycle

1. **Connect Request**: Client sends schema and initial state
2. **Hydration**: Server responds with full state snapshot
3. **Incremental Sync**: Bidirectional diff-based updates
4. **Presence Sync**: Real-time user cursor/selection state
5. **Graceful Disconnect**: Proper cleanup and persistence

### Diff System

#### `NetworkDiff` - Efficient Change Representation

Compact, network-optimized change format:

```typescript
interface NetworkDiff<R extends UnknownRecord> {
	[recordId: string]: RecordOp<R>
}

type RecordOp<R> =
	| [RecordOpType.Put, R] // Add/replace record
	| [RecordOpType.Patch, ObjectDiff] // Partial update
	| [RecordOpType.Remove] // Delete record
```

#### Object Diffing

Fine-grained property-level changes:

```typescript
interface ObjectDiff {
	[key: string]: ValueOp
}

type ValueOp =
	| [ValueOpType.Put, any] // Set property value
	| [ValueOpType.Patch, ObjectDiff] // Nested object update
	| [ValueOpType.Append, any] // Array append
	| [ValueOpType.Delete] // Remove property
```

### Session Management

#### `RoomSession` - Individual Client Sessions

Tracks state for each connected client:

```typescript
type RoomSession<R, Meta> = {
	state: RoomSessionState // Connection state
	sessionId: string // Unique session identifier
	presenceId: string | null // User presence identifier
	socket: TLRoomSocket<R> // WebSocket connection
	meta: Meta // Custom session metadata
	isReadonly: boolean // Permission level
	lastInteractionTime: number // For timeout detection
}

enum RoomSessionState {
	AwaitingConnectMessage, // Initial connection
	Connected, // Fully synchronized
	AwaitingRemoval, // Disconnection cleanup
}
```

Session lifecycle constants:

- `SESSION_START_WAIT_TIME`: 10 seconds for initial connection
- `SESSION_IDLE_TIMEOUT`: 20 seconds before idle detection
- `SESSION_REMOVAL_WAIT_TIME`: 5 seconds for cleanup delay

### Network Adapters

#### `ClientWebSocketAdapter` - Client Connection Management

Manages WebSocket connections with reliability features:

```typescript
class ClientWebSocketAdapter implements TLPersistentClientSocket<TLRecord> {
	// Connection state
	status: Atom<TLPersistentClientSocketStatus>

	// Reliability features
	restart(): void // Force reconnection
	sendMessage(msg: any): void // Send with queuing

	// Event handling
	onReceiveMessage: SubscribingFn<any>
	onStatusChange: SubscribingFn<TLPersistentClientSocketStatus>
}
```

#### `ReconnectManager` - Connection Reliability

Handles automatic reconnection with exponential backoff:

- **Progressive Delays**: Increasing delays between reconnection attempts
- **Max Retry Limits**: Prevents infinite reconnection loops
- **Connection Health**: Monitors connection quality
- **Graceful Degradation**: Handles various failure modes

### Data Consistency

#### Conflict Resolution Strategy

**Server Authoritative Model:**

1. Client applies changes optimistically
2. Server validates and potentially modifies changes
3. Server broadcasts canonical version to all clients
4. Clients rollback and re-apply if conflicts detected

#### Change Ordering

- **Causal Ordering**: Changes applied in dependency order
- **Vector Clocks**: Track causality across distributed clients
- **Tombstone Management**: Handle deletions in distributed system

#### Schema Evolution

- **Version Compatibility**: Detect and handle schema mismatches
- **Migration Support**: Upgrade/downgrade data during sync
- **Graceful Degradation**: Handle unknown record types

### Performance Optimizations

#### Batching and Chunking

```typescript
// Message chunking for large updates
chunk<T>(items: T[], maxSize: number): T[][]

// Batch updates for efficiency
throttle(updateFn: () => void, delay: number)
```

#### Presence Optimization

- **Throttled Updates**: Cursor movements throttled to reduce bandwidth
- **Selective Broadcasting**: Only send presence to relevant clients
- **Ephemeral State**: Presence doesn't persist to storage

### Error Handling

#### `TLRemoteSyncError` - Sync-Specific Errors

Specialized error types for synchronization issues:

```typescript
class TLRemoteSyncError extends Error {
	code: TLSyncErrorCloseEventCode
	reason: TLSyncErrorCloseEventReason
}

// Error reasons include:
// - NOT_FOUND: Room doesn't exist
// - FORBIDDEN: Permission denied
// - CLIENT_TOO_OLD: Client needs upgrade
// - SERVER_TOO_OLD: Server needs upgrade
```

#### Connection Recovery

- **Automatic Retry**: Exponential backoff for reconnection
- **State Reconciliation**: Re-sync state after reconnection
- **Partial Recovery**: Handle partial data loss gracefully

## Key Design Patterns

### Event-Driven Architecture

- **nanoevents**: Lightweight event system for internal communication
- **Signal Integration**: Reactive updates using signals
- **WebSocket Events**: Standard WebSocket event handling

### Immutable State Updates

- **Structural Sharing**: Minimize memory usage for state changes
- **Diff-Based Sync**: Only transmit actual changes
- **Rollback Support**: Maintain history for conflict resolution

### Async State Management

- **Promise-Based APIs**: Async operations return promises
- **Effect Scheduling**: Coordinate updates with React lifecycle
- **Transaction Support**: Atomic multi-record updates

## Network Protocol

### Message Types

1. **Connect**: Establish session with schema validation
2. **Push**: Client sends local changes to server
3. **Data**: Server broadcasts changes to clients
4. **Ping/Pong**: Keepalive for connection health
5. **Error**: Communicate protocol violations

### Reliability Features

- **Message Ordering**: Guaranteed order of operations
- **Duplicate Detection**: Prevent duplicate message processing
- **Timeout Handling**: Detect and recover from network issues
- **Graceful Shutdown**: Clean disconnection protocol

## Integration Points

### With Store Package

- **Store Synchronization**: Bidirectional sync with local stores
- **Migration Coordination**: Handle schema changes during sync
- **Query Integration**: Sync affects query results

### With State Package

- **Reactive Integration**: Changes trigger signal updates
- **Transaction Coordination**: Maintain consistency during sync
- **Effect Scheduling**: Coordinate with React updates

### With Schema Package

- **Schema Validation**: Ensure type safety across clients
- **Version Management**: Handle schema evolution
- **Record Validation**: Validate all synchronized records

## Use Cases

### Real-Time Collaboration

- **Multi-User Drawing**: Multiple users editing simultaneously
- **Live Cursors**: Real-time cursor and selection display
- **Conflict Resolution**: Handle simultaneous edits gracefully

### Offline/Online Sync

- **Offline Editing**: Local changes queued for sync
- **Reconnection Sync**: State reconciliation after network recovery
- **Partial Sync**: Handle incomplete synchronization

### Scalable Architecture

- **Room-Based Isolation**: Separate sync contexts per document
- **Horizontal Scaling**: Support multiple server instances
- **Load Management**: Handle varying client loads efficiently

## Security Considerations

### Access Control

- **Read-Only Mode**: Restrict editing permissions per session
- **Session Validation**: Verify client identity and permissions
- **Schema Enforcement**: Prevent malicious schema changes

### Data Integrity

- **Change Validation**: Server validates all client changes
- **Type Safety**: Schema ensures data structure integrity
- **Audit Trail**: Maintain change history for debugging
