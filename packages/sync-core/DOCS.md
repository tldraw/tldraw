# @tldraw/sync-core

The `@tldraw/sync-core` package provides the foundational infrastructure for real-time collaboration and synchronization in tldraw applications. It implements a robust client-server protocol for sharing drawing state across multiple users, handling network reliability, conflict resolution, and maintaining data consistency in distributed environments.

## 1. Introduction

**Sync-core** is the engine that powers real-time collaboration in tldraw. It enables multiple users to work on the same drawing simultaneously, automatically synchronizing changes while gracefully handling network issues and conflicts.

You create collaborative tldraw applications by connecting clients to sync rooms, where each room manages the shared state for a document. Changes made by any user are automatically distributed to all other connected users in near real-time.

```ts
import { TLSyncClient } from '@tldraw/sync-core'

// Connect to a collaborative room
const syncClient = new TLSyncClient({
	store: myTldrawStore,
	socket: myWebSocketAdapter,
	roomId: 'drawing-room-123',
})

syncClient.connect()
// Now all changes to myTldrawStore are synchronized with other users
```

When you update the store locally, the changes are immediately visible in your UI (optimistic updates), then sent to the server for validation and distribution to other clients.

> Tip: Sync-core is designed to work with any WebSocket implementation, making it suitable for various deployment scenarios from simple Node.js servers to edge computing platforms.

## 2. Core Concepts

### Client-Server Architecture

Sync-core uses a **server-authoritative** model where the server is the single source of truth for all changes. This ensures data consistency while still providing responsive local interactions:

- **Optimistic Updates**: Your local changes apply immediately for responsive UI
- **Server Validation**: The server validates and potentially modifies your changes
- **Conflict Resolution**: If conflicts occur, the server's version takes precedence

### Rooms and Sessions

A **room** represents a collaborative document space where multiple users can work together:

```ts
// Server-side room management
const room = new TLSyncRoom({
	store: serverStore,
	roomId: 'drawing-room-123',
})

// Each connected client creates a session
room.handleSocketConnect(clientSocket, sessionMeta)
```

Each client connection creates a **session** within the room, tracking that user's connection state, permissions, and presence information.

### Network Diffs and Synchronization

Instead of sending entire document states, sync-core uses **network diffs** - compact representations of what actually changed:

```ts
// Example network diff for updating a shape's position
const diff = {
	'shape:abc123': [
		RecordOpType.Patch,
		{
			x: [ValueOpType.Put, 150],
			y: [ValueOpType.Put, 200],
		},
	],
}
```

This approach minimizes bandwidth usage and enables efficient synchronization even with large documents.

## 3. Basic Usage

### Setting Up a Sync Client

To enable synchronization in your tldraw application, you need three components: a store, a WebSocket adapter, and a sync client:

```ts
import { createTLStore } from '@tldraw/store'
import { createTLSchema } from '@tldraw/tlschema'
import { TLSyncClient, ClientWebSocketAdapter } from '@tldraw/sync-core'

// Create your tldraw store
const store = createTLStore({
	schema: createTLSchema(),
})

// Create a WebSocket connection
const socket = new ClientWebSocketAdapter('ws://localhost:3000/sync')

// Create the sync client
const syncClient = new TLSyncClient({
	store,
	socket,
	roomId: 'my-drawing-room',
})

// Start synchronization
syncClient.connect()
```

Once connected, any changes to your store will automatically sync with other clients in the same room.

### Monitoring Connection Status

The sync client provides reactive status information:

```ts
import { react } from '@tldraw/state'

// React to connection status changes
react('connection status', () => {
	const status = syncClient.status.get()

	switch (status) {
		case 'offline':
			console.log('No network connection')
			break
		case 'connecting':
			console.log('Connecting to server...')
			break
		case 'online':
			console.log('Connected and synchronized')
			break
	}
})
```

The status signal automatically updates as network conditions change, allowing your UI to reflect the current connection state.

### Handling Connection Events

You can listen to specific sync events for custom behavior:

```ts
syncClient.onReceiveMessage((message) => {
	switch (message.type) {
		case 'connect':
			console.log('Successfully connected to room')
			break
		case 'incompatibility-error':
			console.log('Client version incompatible with server')
			break
	}
})
```

> Tip: Always handle incompatibility errors gracefully - they indicate version mismatches between your client and server.

## 4. Advanced Topics

### Server-Side Room Management

On the server side, you manage rooms that coordinate multiple client sessions:

```ts
import { TLSyncRoom } from '@tldraw/sync-core'

class CollaborationServer {
	private rooms = new Map<string, TLSyncRoom>()

	getOrCreateRoom(roomId: string) {
		if (!this.rooms.has(roomId)) {
			const room = new TLSyncRoom({
				store: this.createRoomStore(),
				roomId,
				// Optional persistence adapter
				persistenceAdapter: this.createPersistenceAdapter(roomId),
			})

			this.rooms.set(roomId, room)
		}

		return this.rooms.get(roomId)!
	}

	handleClientConnection(socket: WebSocket, roomId: string) {
		const room = this.getOrCreateRoom(roomId)
		room.handleSocketConnect(socket, {
			sessionId: generateSessionId(),
			userId: extractUserId(socket),
			isReadonly: checkPermissions(socket),
		})
	}
}
```

Rooms automatically handle session lifecycle, broadcasting changes, and cleaning up disconnected clients.

### Custom WebSocket Adapters

While sync-core provides a `ClientWebSocketAdapter`, you can implement custom adapters for specific requirements:

```ts
import { TLPersistentClientSocket } from '@tldraw/sync-core'

class CustomSocketAdapter implements TLPersistentClientSocket {
	status = atom<TLPersistentClientSocketStatus>('offline')

	sendMessage(message: any): void {
		// Your custom sending logic
		this.customWebSocket.send(JSON.stringify(message))
	}

	onReceiveMessage = createNanoEvents<any>()
	onStatusChange = createNanoEvents<TLPersistentClientSocketStatus>()

	restart(): void {
		// Your reconnection logic
	}
}
```

Custom adapters let you integrate with existing WebSocket libraries or add custom authentication and error handling.

### Conflict Resolution Strategies

When multiple users edit simultaneously, conflicts can occur. Sync-core's server-authoritative model resolves these automatically:

```ts
// Client A moves shape to x: 100
store.update('shape:abc', (shape) => ({ ...shape, x: 100 }))

// Simultaneously, Client B moves same shape to x: 200
// Server receives both changes and determines the final state
// All clients receive the server's authoritative version

react('shape changes', () => {
	const shape = store.get('shape:abc')
	// Final position will be whatever the server decided
	console.log('Final position:', shape?.x)
})
```

The server applies changes in the order it receives them, with later changes taking precedence for conflicting properties.

### Presence and Live Cursors

Sync-core supports real-time presence information like cursor positions:

```ts
// Client sends presence updates
syncClient.updatePresence({
	cursor: { x: 150, y: 200 },
	selection: ['shape:abc123'],
	userName: 'Alice',
})

// Other clients receive presence updates
syncClient.onPresenceUpdate((presenceUpdates) => {
	for (const [sessionId, presence] of presenceUpdates) {
		updateLiveCursor(sessionId, presence.cursor)
		updateUserSelection(sessionId, presence.selection)
	}
})
```

Presence updates are ephemeral - they don't persist to storage and are only visible to currently connected users.

### Schema Evolution and Migrations

When your application's data schema changes, sync-core coordinates migrations across clients:

```ts
const schema = createTLSchema({
	// Your shape definitions
	shapes: {
		myShape: MyShapeUtil,
	},
})

// The client sends its schema version during connection
const syncClient = new TLSyncClient({
	store: createTLStore({ schema }),
	socket,
	roomId: 'room-123',
})
```

If schema versions don't match between client and server, sync-core will:

1. Attempt automatic migration if possible
2. Send an incompatibility error if migration fails
3. Allow graceful degradation for unknown record types

> Tip: Design your schema changes to be backward-compatible when possible to avoid forcing all users to upgrade simultaneously.

## 5. Debugging

Sync-core provides several tools for understanding and debugging synchronization behavior in your collaborative applications.

### Connection Diagnostics

Monitor the detailed connection lifecycle:

```ts
import { TLSyncClient } from '@tldraw/sync-core'

const syncClient = new TLSyncClient({
	/* ... */
})

// Enable detailed logging
syncClient.onReceiveMessage((message) => {
	console.log('Received:', message.type, message)
})

syncClient.onStatusChange((status, previous) => {
	console.log(`Status: ${previous} → ${status}`)
})

// Connection attempt
syncClient.connect()

// Output shows the complete handshake:
// Status: offline → connecting
// Received: connect { hydrationType: 'wipe_all', ... }
// Status: connecting → online
```

This reveals the exact sequence of messages during connection establishment and any errors that occur.

### Message Flow Analysis

Track all synchronization messages to understand data flow:

```ts
// Log outgoing messages
const originalSend = syncClient.socket.sendMessage
syncClient.socket.sendMessage = (message) => {
	console.log('Sending:', message.type, message)
	originalSend.call(syncClient.socket, message)
}

// Example output when making a change:
// Sending: push { diff: { "shape:abc123": [2, { x: [1, 150] }] } }
// Received: data { diff: { "shape:abc123": [2, { x: [1, 150] }] } }
```

This shows how local changes become push messages and return as data messages from the server.

### Network Diff Inspection

Understand what changes are being synchronized:

```ts
import { diffRecord } from '@tldraw/sync-core'

// Monitor store changes and see their diff representation
const unsubscribe = store.listen(
	(entry) => {
		if (entry.changes.length > 0) {
			for (const change of entry.changes) {
				console.log('Change type:', change.source)
				console.log('Record diff:', change)

				// For detailed diff analysis
				if (change.type === 'update') {
					const diff = diffRecord(change.prev, change.record)
					console.log('Network diff would be:', diff)
				}
			}
		}
	},
	{ source: 'user' }
)

// Example output:
// Change type: user
// Record diff: { type: 'update', id: 'shape:abc123', ... }
// Network diff would be: { x: [1, 150], y: [1, 200] }
```

### Session and Room Debugging

On the server side, inspect room and session states:

```ts
class DebuggableRoom extends TLSyncRoom {
	debugSessions() {
		console.log(`Room ${this.roomId} has ${this.getNumActiveConnections()} connections:`)

		for (const [sessionId, session] of this.sessions) {
			console.log(
				`  ${sessionId}: ${session.state} (${session.isReadonly ? 'readonly' : 'read-write'})`
			)
		}
	}

	debugLastChange() {
		console.log('Last document change:', this.documentState.clock)
		console.log('Store has', Object.keys(this.store.serialize()).length, 'records')
	}
}

// Use during development
const room = new DebuggableRoom({
	/* ... */
})
setInterval(() => room.debugSessions(), 5000)
```

### Error Diagnosis

Handle and debug common synchronization errors:

```ts
syncClient.onReceiveMessage((message) => {
	switch (message.type) {
		case 'incompatibility-error':
			console.error('Schema mismatch:', {
				clientSchema: message.clientSchema,
				serverSchema: message.serverSchema,
				reason: message.reason,
			})
			break

		case 'error':
			console.error('Sync error:', message.error)
			// Common causes:
			// - Room not found (check roomId)
			// - Permission denied (check authentication)
			// - Invalid record data (check schema validation)
			break
	}
})

// Network-level debugging
syncClient.socket.onStatusChange((status) => {
	if (status === 'offline') {
		console.log('Connection lost - check network and server health')

		// Attempt manual reconnection
		setTimeout(() => {
			syncClient.socket.restart()
		}, 1000)
	}
})
```

### Performance Monitoring

Track synchronization performance metrics:

```ts
class SyncProfiler {
	private messageCount = 0
	private bytesTransferred = 0
	private roundTripTimes: number[] = []

	profile(syncClient: TLSyncClient) {
		const startTime = Date.now()

		syncClient.onReceiveMessage((message) => {
			this.messageCount++
			this.bytesTransferred += JSON.stringify(message).length

			// Track ping/pong for latency
			if (message.type === 'pong') {
				const roundTrip = Date.now() - message.sentAt
				this.roundTripTimes.push(roundTrip)
			}
		})

		// Periodic reporting
		setInterval(() => {
			const avgLatency =
				this.roundTripTimes.length > 0
					? this.roundTripTimes.reduce((a, b) => a + b, 0) / this.roundTripTimes.length
					: 0

			console.log('Sync Performance:', {
				uptime: Date.now() - startTime,
				messages: this.messageCount,
				bytesTransferred: this.bytesTransferred,
				avgLatencyMs: avgLatency,
			})

			this.roundTripTimes = [] // Reset for next period
		}, 30000)
	}
}

new SyncProfiler().profile(syncClient)
```

> Tip: High message counts or latency often indicate network issues or inefficient change patterns. Consider batching rapid changes or optimizing your shape update logic.

## 6. Integration

### React Integration

Sync-core integrates seamlessly with React applications through the store's reactive signals:

```ts
import { useEditor } from '@tldraw/editor'
import { react } from '@tldraw/state'
import { useEffect, useState } from 'react'

function CollaborationStatusBadge() {
	const editor = useEditor()
	const [status, setStatus] = useState<string>('offline')

	useEffect(() => {
		if (!editor.store.syncClient) return

		return react('sync status', () => {
			setStatus(editor.store.syncClient.status.get())
		})
	}, [editor])

	return (
		<div className={`status-badge ${status}`}>
			{status === 'online' ? '🟢 Connected' : '🔴 Offline'}
		</div>
	)
}
```

The reactive nature of sync-core means your React components automatically update when connection status or synchronized data changes.

### Custom Persistence

Integrate with your existing database or storage systems:

```ts
import { TLSyncRoom } from '@tldraw/sync-core'

class DatabasePersistenceAdapter {
	constructor(
		private db: Database,
		private roomId: string
	) {}

	async loadRoom(): Promise<SerializedStore> {
		const roomData = await this.db.query('SELECT document_state FROM rooms WHERE id = ?', [
			this.roomId,
		])
		return JSON.parse(roomData.document_state)
	}

	async saveRoom(serializedStore: SerializedStore): Promise<void> {
		await this.db.query('UPDATE rooms SET document_state = ?, updated_at = NOW() WHERE id = ?', [
			JSON.stringify(serializedStore),
			this.roomId,
		])
	}
}

const room = new TLSyncRoom({
	store: createTLStore({ schema }),
	roomId: 'room-123',
	persistenceAdapter: new DatabasePersistenceAdapter(myDatabase, 'room-123'),
})
```

This allows rooms to persist their state to your preferred storage backend while maintaining real-time synchronization.

### Authentication and Authorization

Implement custom authentication by extending the WebSocket adapter:

```ts
class AuthenticatedSocketAdapter extends ClientWebSocketAdapter {
	constructor(
		url: string,
		private authToken: string
	) {
		super(url)
	}

	protected connect(): void {
		this.ws = new WebSocket(this.url, [], {
			headers: {
				Authorization: `Bearer ${this.authToken}`,
			},
		})

		this.setupEventHandlers()
	}
}

// Server-side authentication
room.handleSocketConnect(socket, {
	sessionId: generateSessionId(),
	userId: extractUserFromToken(authToken),
	isReadonly: !hasEditPermission(authToken, roomId),
})
```

### Multi-Room Applications

Manage multiple collaborative documents in a single application:

```ts
class RoomManager {
	private rooms = new Map<string, TLSyncClient>()

	joinRoom(roomId: string): TLSyncClient {
		if (this.rooms.has(roomId)) {
			return this.rooms.get(roomId)!
		}

		const store = createTLStore({ schema: mySchema })
		const socket = new ClientWebSocketAdapter(`ws://localhost:3000/rooms/${roomId}`)
		const syncClient = new TLSyncClient({ store, socket, roomId })

		this.rooms.set(roomId, syncClient)
		syncClient.connect()

		return syncClient
	}

	leaveRoom(roomId: string): void {
		const client = this.rooms.get(roomId)
		if (client) {
			client.disconnect()
			this.rooms.delete(roomId)
		}
	}
}

const roomManager = new RoomManager()
const drawingRoom = roomManager.joinRoom('drawing-123')
const presentationRoom = roomManager.joinRoom('slides-456')
```

### Edge Computing and Cloudflare Workers

Sync-core works well with edge computing platforms:

```ts
// Cloudflare Worker example
export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.headers.get('Upgrade') !== 'websocket') {
			return new Response('Expected websocket', { status: 426 })
		}

		const { 0: client, 1: server } = new WebSocketPair()
		const roomId = new URL(request.url).pathname.split('/').pop()

		const room = this.getOrCreateRoom(roomId, env)
		room.handleSocketConnect(server, {
			sessionId: crypto.randomUUID(),
			// Extract user info from request headers or auth
		})

		return new Response(null, {
			status: 101,
			webSocket: client,
		})
	},
}
```

The lightweight nature of sync-core makes it suitable for serverless and edge environments where traditional long-running connections might be challenging.

> Tip: When deploying to edge environments, consider the trade-offs between geographical distribution (lower latency) and consistency (potential for split-brain scenarios).
