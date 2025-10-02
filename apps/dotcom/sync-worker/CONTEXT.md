# Sync Worker Context

## Overview

The `sync-worker` (also known as `@tldraw/dotcom-worker`) is the core multiplayer synchronization service for tldraw.com. It handles real-time collaboration, room management, file persistence, user authentication, and data synchronization across all tldraw applications. The worker operates as a distributed system using Cloudflare Workers and Durable Objects to provide scalable, low-latency collaboration worldwide.

## Architecture

### Core Components

The sync-worker consists of several specialized Durable Objects and services:

#### TLDrawDurableObject - Room Management

The primary collaboration engine that manages individual drawing rooms:

```typescript
export class TLDrawDurableObject extends DurableObject {
	private _room: Promise<TLSocketRoom<TLRecord, SessionMeta>> | null = null

	// Handles WebSocket connections and real-time synchronization
	async onRequest(req: IRequest, openMode: RoomOpenMode) {
		// Create WebSocket pair for client communication
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()

		// Validate authentication and permissions
		const auth = await getAuth(req, this.env)

		// Configure room access mode (read-write, read-only, etc.)
		const room = await this.getRoom()
		room.handleSocketConnect({
			sessionId,
			socket: serverWebSocket,
			meta: { storeId, userId: auth?.userId || null },
			isReadonly: openMode === ROOM_OPEN_MODE.READ_ONLY,
		})
	}
}
```

#### TLUserDurableObject - User Data Synchronization

Manages individual user data and application-level state:

```typescript
export class TLUserDurableObject extends DurableObject<Environment> {
	private cache: UserDataSyncer | null = null

	// Handles user-specific data synchronization with Zero/Rocicorp
	// Manages user preferences, file lists, and collaborative state
}
```

#### TLPostgresReplicator - Database Synchronization

Replicates PostgreSQL database changes to user Durable Objects:

```typescript
export class TLPostgresReplicator extends DurableObject<Environment> {
	// Uses PostgreSQL logical replication to stream database changes
	// Distributes changes to relevant user Durable Objects
	// Ensures eventual consistency across the distributed system
}
```

### Request Routing System

The worker handles multiple types of requests through a comprehensive routing system:

#### Legacy Room Routes

```typescript
// Read-write collaborative rooms
.get(`/${ROOM_PREFIX}/:roomId`, (req, env) =>
  joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_WRITE)
)

// Read-only room access
.get(`/${READ_ONLY_PREFIX}/:roomId`, (req, env) =>
  joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_ONLY)
)

// Legacy read-only rooms
.get(`/${READ_ONLY_LEGACY_PREFIX}/:roomId`, (req, env) =>
  joinExistingRoom(req, env, ROOM_OPEN_MODE.READ_ONLY_LEGACY)
)
```

#### Modern App Routes

```typescript
// TLA (Tldraw App) file collaboration
.get('/app/file/:roomId', (req, env) => {
  if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    return forwardRoomRequest(req, env)
  }
})

// User data synchronization
.get('/app/:userId/connect', async (req, env) => {
  const auth = await getAuth(req, env)
  const stub = getUserDurableObject(env, auth.userId)
  return stub.fetch(req)
})
```

#### Asset Management

```typescript
// Asset uploads
.post('/app/uploads/:objectName', upload)

// Asset retrieval with optimization
.get('/app/uploads/:objectName', async (request, env, ctx) => {
  return handleUserAssetGet({
    request,
    bucket: env.UPLOADS,
    objectName: request.params.objectName,
    context: ctx,
  })
})
```

#### API Endpoints

```typescript
// File creation and management
.post('/app/tldr', createFiles)

// Bookmark metadata extraction
.get('/unfurl', extractBookmarkMetadata)

// Room snapshots and history
.post('/snapshots', createRoomSnapshot)
.get('/snapshot/:roomId', getRoomSnapshot)
```

## Data Persistence Architecture

### Multi-Layer Storage System

The sync-worker uses a sophisticated multi-layer storage approach:

#### R2 Object Storage

Primary storage for room data and history:

```typescript
const r2 = {
  rooms: env.ROOMS,                    // Main room snapshots
  versionCache: env.ROOMS_HISTORY_EPHEMERAL, // Version history
}

// Persist room snapshot with version history
async persistToDatabase() {
  const snapshot = room.getCurrentSnapshot()
  const key = getR2KeyForRoom({ slug, isApp: this.documentInfo.isApp })

  // Upload to main bucket
  await this.r2.rooms.put(key, JSON.stringify(snapshot))

  // Upload to version cache with timestamp
  const versionKey = `${key}/${new Date().toISOString()}`
  await this.r2.versionCache.put(versionKey, JSON.stringify(snapshot))
}
```

#### PostgreSQL Database

Structured data for users, files, and metadata:

```typescript
// File metadata
const file = table('file').columns({
	id: string(),
	name: string(),
	ownerId: string(),
	shared: boolean(),
	published: boolean(),
	createdAt: number(),
	updatedAt: number(),
})

// User preferences and state
const user = table('user').columns({
	id: string(),
	name: string(),
	email: string(),
	preferences: string(), // JSON blob
})
```

#### Durable Object Storage

Cached state and session data:

```typescript
// Document metadata cached in DO storage
interface DocumentInfo {
	version: number
	slug: string
	isApp: boolean
	deleted: boolean
}
```

### Persistence Strategy

The worker implements intelligent persistence with configurable intervals:

```typescript
const PERSIST_INTERVAL_MS = 8_000 // 8 seconds

// Throttled persistence to avoid excessive writes
triggerPersist = throttle(() => {
	this.persistToDatabase()
}, PERSIST_INTERVAL_MS)
```

## Real-Time Collaboration

### WebSocket Communication

The worker manages WebSocket connections for real-time collaboration:

#### Connection Establishment

```typescript
// Upgrade HTTP request to WebSocket
const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()
serverWebSocket.accept()

// Validate authentication and permissions
const auth = await getAuth(req, this.env)
if (this.documentInfo.isApp && !file.shared && !auth) {
	return closeSocket(TLSyncErrorCloseEventReason.NOT_AUTHENTICATED)
}

// Connect to room with appropriate permissions
room.handleSocketConnect({
	sessionId,
	socket: serverWebSocket,
	meta: { storeId, userId: auth?.userId || null },
	isReadonly: openMode === ROOM_OPEN_MODE.READ_ONLY,
})
```

#### Message Handling

```typescript
// Real-time message processing and broadcasting
onBeforeSendMessage: ({ message, stringified }) => {
	this.logEvent({
		type: 'send_message',
		roomId: slug,
		messageType: message.type,
		messageLength: stringified.length,
	})
}
```

#### Session Management

```typescript
// Automatic cleanup when users disconnect
onSessionRemoved: async (room, args) => {
	// Log user departure
	this.logEvent({
		type: 'client',
		roomId: slug,
		name: 'leave',
		instanceId: args.sessionId,
	})

	// Persist room state if last user
	if (args.numSessionsRemaining === 0) {
		await this.persistToDatabase()
		this._room = null
		room.close()
	}
}
```

### Conflict Resolution

The worker uses tldraw's sync system for operational transformation:

- **Clock-based Versioning**: Each change has a logical clock timestamp
- **Last-Write-Wins**: Simple conflict resolution for most operations
- **Presence Tracking**: Real-time cursor and selection synchronization
- **Undo/Redo Support**: Complete operation history maintenance

## Authentication and Authorization

### Multi-Provider Authentication

The worker supports multiple authentication providers:

#### Clerk Integration

```typescript
// JWT-based authentication with Clerk
const auth = await getAuth(req, env)
if (auth) {
	// User is authenticated
	userId = auth.userId
}
```

#### Permission System

```typescript
// File-based permissions
if (file.ownerId !== auth?.userId) {
	if (!file.shared) {
		return closeSocket(TLSyncErrorCloseEventReason.FORBIDDEN)
	}
	if (file.sharedLinkType === 'view') {
		openMode = ROOM_OPEN_MODE.READ_ONLY
	}
}
```

#### Rate Limiting

```typescript
// Per-user rate limiting
const rateLimited = await isRateLimited(this.env, userId)
if (rateLimited) {
	return closeSocket(TLSyncErrorCloseEventReason.RATE_LIMITED)
}
```

## File Management System

### File Lifecycle

The worker manages the complete file lifecycle:

#### File Creation

```typescript
// Create new tldraw files
async createFiles(req: IRequest, env: Environment) {
  const body = await req.json() as CreateFilesRequestBody
  const auth = await requireAuth(req, env)

  for (const snapshot of body.snapshots) {
    const fileId = uniqueId()
    const slug = generateSlug()

    // Create file record in database
    await db.insertInto('file').values({
      id: fileId,
      name: snapshot.name || 'Untitled',
      ownerId: auth.userId,
      slug,
      shared: false,
    }).execute()

    // Initialize room with snapshot data
    const room = getRoomDurableObject(env, fileId)
    await room.appFileRecordCreated(fileRecord)
  }
}
```

#### File Updates

```typescript
// Automatic file updates when room changes
async appFileRecordDidUpdate(file: TlaFile) {
  const room = await this.getRoom()

  // Sync file name with document name
  const documentRecord = room.getRecord(TLDOCUMENT_ID) as TLDocument
  if (documentRecord.name !== file.name) {
    room.updateStore((store) => {
      store.put({ ...documentRecord, name: file.name })
    })
  }

  // Handle permission changes
  if (!file.shared) {
    // Kick out non-owners if file becomes private
    for (const session of room.getSessions()) {
      if (session.meta.userId !== file.ownerId) {
        room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.FORBIDDEN)
      }
    }
  }
}
```

#### File Deletion

```typescript
// Soft deletion with cleanup
async appFileRecordDidDelete({ id, publishedSlug }: Pick<TlaFile, 'id' | 'publishedSlug'>) {
  // Close all active sessions
  const room = await this.getRoom()
  for (const session of room.getSessions()) {
    room.closeSession(session.sessionId, TLSyncErrorCloseEventReason.NOT_FOUND)
  }

  // Clean up storage
  await this.env.ROOMS.delete(getR2KeyForRoom({ slug: id, isApp: true }))
  await this.env.ROOMS_HISTORY_EPHEMERAL.delete(historyKeys)
  await this.env.SNAPSHOT_SLUG_TO_PARENT_SLUG.delete(publishedSlug)
}
```

### Asset Management

#### Asset Upload Pipeline

```typescript
// Handle asset uploads with queue processing
.post('/app/uploads/:objectName', async (request, env) => {
  const objectName = request.params.objectName
  const auth = await requireAuth(request, env)

  // Upload to R2 bucket
  await env.UPLOADS.put(objectName, request.body)

  // Queue asset association
  await env.QUEUE.send({
    type: 'asset-upload',
    objectName,
    fileId: extractFileId(request),
    userId: auth.userId,
  })
})

// Process queue messages
async queue(batch: MessageBatch<QueueMessage>) {
  for (const message of batch.messages) {
    const { objectName, fileId, userId } = message.body

    // Associate asset with file in database
    await db.insertInto('asset').values({
      objectName,
      fileId,
      userId,
    }).execute()

    message.ack()
  }
}
```

### Publishing System

```typescript
// Publish files for public access
async publishFile(fileId: string, auth: AuthData) {
  const file = await getFileRecord(fileId)
  if (file.ownerId !== auth.userId) {
    throw new Error('Unauthorized')
  }

  const publishedSlug = generateSlug()

  // Update file record
  await db.updateTable('file').set({
    published: true,
    publishedSlug,
    lastPublished: Date.now(),
  }).where('id', '=', fileId).execute()

  // Create snapshot for published version
  const room = getRoomDurableObject(env, fileId)
  const snapshot = room.getCurrentSnapshot()
  await env.ROOM_SNAPSHOTS.put(
    getR2KeyForRoom({ slug: `${fileId}/${publishedSlug}`, isApp: true }),
    JSON.stringify(snapshot)
  )
}
```

## Environment Configuration

### Multi-Environment Setup

The worker supports multiple deployment environments:

#### Development Environment

```toml
[env.dev]
name = "dev-tldraw-multiplayer"
vars.TLDRAW_ENV = "development"
vars.MULTIPLAYER_SERVER = "http://localhost:3000"
```

#### Staging Environment

```toml
[env.staging]
name = "main-tldraw-multiplayer"

[[env.staging.routes]]
zone_name = "tldraw.com"
pattern = "staging.tldraw.com/api/*"
```

#### Production Environment

```toml
[env.production]
name = "tldraw-multiplayer"

[[env.production.routes]]
zone_name = "tldraw.com"
pattern = "www.tldraw.com/api/*"
```

### Durable Object Configuration

All environments use the same Durable Object setup:

```toml
[durable_objects]
bindings = [
  { name = "TLDR_DOC", class_name = "TLDrawDurableObject" },
  { name = "TL_PG_REPLICATOR", class_name = "TLPostgresReplicator" },
  { name = "TL_USER", class_name = "TLUserDurableObject" },
  { name = "TL_LOGGER", class_name = "TLLoggerDurableObject" },
  { name = "TL_STATS", class_name = "TLStatsDurableObject" },
]
```

### Storage Bindings

Environment-specific storage configurations:

```toml
# R2 Buckets for different data types
[[env.production.r2_buckets]]
binding = "ROOMS"                    # Main room data
bucket_name = "rooms"

[[env.production.r2_buckets]]
binding = "ROOMS_HISTORY_EPHEMERAL"  # Version history
bucket_name = "rooms-history-ephemeral"

[[env.production.r2_buckets]]
binding = "UPLOADS"                  # User assets
bucket_name = "uploads"

# KV Namespaces for metadata
[[env.production.kv_namespaces]]
binding = "SLUG_TO_READONLY_SLUG"
id = "2fb5fc7f7ca54a5a9dfae1b07a30a778"
```

## Data Synchronization System

### Zero/Rocicorp Integration

The worker uses Zero (Rocicorp) for client-server data synchronization:

#### Schema Definition

```typescript
// Shared schema between client and server
const schema = {
	version: 1,
	tables: {
		user: table('user').columns({
			id: string(),
			name: string(),
			preferences: string(),
		}),
		file: table('file').columns({
			id: string(),
			name: string(),
			ownerId: string(),
			shared: boolean(),
		}),
	},
}
```

#### Mutation System

```typescript
// Type-safe mutations with validation
const mutators = createMutators(userId)
	// Client sends mutations to server
	.post('/app/zero/push', async (req, env) => {
		const auth = await requireAuth(req, env)
		const processor = new PushProcessor(
			new ZQLDatabase(new PostgresJSConnection(makePostgresConnector(env)), schema),
			'debug'
		)
		const result = await processor.process(createMutators(auth.userId), req)
		return json(result)
	})
```

#### Real-Time Replication

```typescript
// PostgreSQL logical replication to Durable Objects
export class TLPostgresReplicator extends DurableObject<Environment> {
	private readonly replicationService = new LogicalReplicationService(/*...*/)

	// Stream database changes to user Durable Objects
	async handleReplicationEvent(event: ReplicationEvent) {
		for (const change of event.changes) {
			const affectedUsers = extractAffectedUsers(change)

			for (const userId of affectedUsers) {
				const userDO = getUserDurableObject(this.env, userId)
				await userDO.handleReplicationEvent(change)
			}
		}
	}
}
```

### Conflict Resolution Strategy

```typescript
// Optimistic updates with server reconciliation
class UserDataSyncer {
	// Apply optimistic changes immediately
	async applyOptimisticUpdate(mutation: Mutation) {
		this.optimisticUpdates.push(mutation)
		this.broadcastChange(mutation)
	}

	// Reconcile with server state
	async handleReplicationEvent(event: ReplicationEvent) {
		// Remove confirmed optimistic updates
		this.optimisticUpdates = this.optimisticUpdates.filter(
			(update) => !event.confirmedMutations.includes(update.id)
		)

		// Apply server changes
		for (const change of event.changes) {
			this.applyServerChange(change)
		}
	}
}
```

## Performance Optimizations

### Caching Strategy

Multiple layers of caching for optimal performance:

#### Durable Object State Caching

```typescript
// Cache frequently accessed data in DO memory
class TLDrawDurableObject {
	private _fileRecordCache: TlaFile | null = null

	async getAppFileRecord(): Promise<TlaFile | null> {
		if (this._fileRecordCache) {
			return this._fileRecordCache
		}

		// Fetch from database with retries
		const result = await retry(
			async () => {
				return await this.db
					.selectFrom('file')
					.where('id', '=', this.documentInfo.slug)
					.selectAll()
					.executeTakeFirst()
			},
			{ attempts: 10, waitDuration: 100 }
		)

		this._fileRecordCache = result
		return result
	}
}
```

#### Connection Pooling

```typescript
// Efficient database connection management
const pool = new Pool({
	connectionString: env.BOTCOM_POSTGRES_POOLED_CONNECTION_STRING,
	application_name: 'sync-worker',
	max: 5, // Maximum connections per DO
	idleTimeoutMillis: 30_000,
})

const db = new Kysely<DB>({
	dialect: new PostgresDialect({ pool }),
})
```

#### Throttled Persistence

```typescript
// Batch database writes to reduce load
const triggerPersist = throttle(() => {
  this.persistToDatabase()
}, PERSIST_INTERVAL_MS)

// Only persist if room state actually changed
async persistToDatabase() {
  const room = await this.getRoom()
  const clock = room.getCurrentDocumentClock()

  if (this._lastPersistedClock === clock) {
    return // No changes since last persist
  }

  // Persist to R2 with version history
  await this._uploadSnapshotToR2(room, snapshot, key)
  this._lastPersistedClock = clock
}
```

### Memory Management

```typescript
// Automatic resource cleanup
onSessionRemoved: async (room, args) => {
	if (args.numSessionsRemaining === 0) {
		// Persist final state
		await this.persistToDatabase()

		// Clean up room resources
		this._room = null
		room.close()

		// Log room closure
		this.logEvent({ type: 'room', roomId: slug, name: 'room_empty' })
	}
}
```

### Scalability Features

#### Connection Limits

```typescript
const MAX_CONNECTIONS = 50

// Prevent room overload
if (room.getNumActiveSessions() > MAX_CONNECTIONS) {
	return closeSocket(TLSyncErrorCloseEventReason.ROOM_FULL)
}
```

#### Rate Limiting

```typescript
// Global rate limiting per user/session
async function isRateLimited(env: Environment, identifier: string): Promise<boolean> {
	const result = await env.RATE_LIMITER.limit({ key: identifier })
	return !result.success
}
```

## Error Handling and Monitoring

### Comprehensive Error Tracking

#### Sentry Integration

```typescript
// Automatic error reporting with context
const sentry = createSentry(this.ctx, this.env, request)

try {
	return await this.router.fetch(req)
} catch (err) {
	console.error(err)
	sentry?.captureException(err)
	return new Response('Something went wrong', { status: 500 })
}
```

#### Analytics and Metrics

```typescript
// Real-time analytics with Cloudflare Analytics Engine
logEvent(event: TLServerEvent) {
  switch (event.type) {
    case 'client':
      this.writeEvent(event.name, {
        blobs: [event.roomId, event.instanceId],
        indexes: [event.localClientId],
      })
      break
    case 'send_message':
      this.writeEvent('send_message', {
        blobs: [event.roomId, event.messageType],
        doubles: [event.messageLength],
      })
      break
  }
}
```

#### Health Monitoring

```typescript
// Health check endpoints
.get('/app/replicator-status', async (_, env) => {
  await getReplicator(env).ping()
  return new Response('ok')
})

// Debug logging in development
.get('/app/__debug-tail', (req, env) => {
  if (isDebugLogging(env)) {
    return getLogger(env).fetch(req)
  }
  return new Response('Not Found', { status: 404 })
})
```

### Graceful Degradation

```typescript
// Fallback strategies for various failure modes
async loadFromDatabase(slug: string): Promise<DBLoadResult> {
  try {
    // Try R2 first
    const roomFromBucket = await this.r2.rooms.get(key)
    if (roomFromBucket) {
      return { type: 'room_found', snapshot: await roomFromBucket.json() }
    }

    // Fallback to Supabase (legacy)
    const { data, error } = await this.supabaseClient
      .from(this.supabaseTable)
      .select('*')
      .eq('slug', slug)

    if (error) {
      return { type: 'error', error: new Error(error.message) }
    }

    return data.length > 0
      ? { type: 'room_found', snapshot: data[0].drawing }
      : { type: 'room_not_found' }

  } catch (error) {
    return { type: 'error', error: error as Error }
  }
}
```

## Key Features

### Real-Time Collaboration

- **WebSocket-based Communication**: Low-latency bidirectional communication
- **Operational Transformation**: Conflict-free collaborative editing
- **Presence Tracking**: Real-time cursors and user awareness
- **Session Management**: Automatic cleanup and resource management

### Distributed Architecture

- **Edge Computing**: Deployed globally on Cloudflare Workers
- **Durable Objects**: Stateful, location-pinned computing units
- **Multi-Layer Caching**: Memory, KV, and R2 storage optimization
- **Database Replication**: PostgreSQL logical replication for consistency

### Security and Authentication

- **Multi-Provider Auth**: Support for Clerk and other providers
- **Fine-Grained Permissions**: File-level access control
- **Rate Limiting**: Per-user and per-session protection
- **CORS Management**: Secure cross-origin resource sharing

### File Management

- **Asset Pipeline**: Integrated upload and optimization system
- **Version History**: Complete editing history with restore capability
- **Publishing System**: Public sharing with custom slugs
- **Soft Deletion**: Recoverable file deletion with cleanup

### Performance

- **Global Distribution**: Sub-100ms latency worldwide
- **Automatic Scaling**: Handle traffic spikes seamlessly
- **Resource Efficiency**: Intelligent persistence and cleanup
- **Connection Pooling**: Optimized database connections

## Development and Testing

### Local Development

```bash
# Start development server
./dev.sh

# Reset database state
./reset-db.sh

# Clean durable object state
yarn clean
```

### Environment Setup

```bash
# Create local environment file
cat > .dev.vars << EOF
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-key>
EOF
```

### Testing

```bash
# Run unit tests
yarn test

# Run with coverage
yarn test-coverage

# Bundle size validation
yarn check-bundle-size
```

### Debugging

```bash
# Enable debug logging
curl -X POST https://worker-url/app/__debug-tail/clear

# WebSocket debug tail
wscat -c wss://worker-url/app/__debug-tail
```

## Key Benefits

### Developer Experience

- **Type Safety**: Full TypeScript support across the stack
- **Hot Reloading**: Fast development iteration
- **Comprehensive Logging**: Detailed debugging and monitoring
- **Testing Support**: Unit and integration test frameworks

### User Experience

- **Instant Collaboration**: Real-time synchronization without conflicts
- **Offline Resilience**: Graceful handling of network issues
- **Fast Loading**: Edge caching for sub-second room joining
- **Reliable Persistence**: Automatic saving with version history

### Operations

- **Zero Maintenance**: Serverless architecture with auto-scaling
- **Global Deployment**: Automatic worldwide distribution
- **Cost Efficiency**: Pay-per-request pricing model
- **Monitoring Integration**: Built-in analytics and error tracking

### Architecture

- **Microservice Pattern**: Specialized Durable Objects for different concerns
- **Event-Driven Design**: Reactive system with real-time updates
- **Eventual Consistency**: Distributed system with conflict resolution
- **Horizontal Scaling**: Automatic scaling based on demand

## Integration with tldraw Ecosystem

### Client Integration

The sync-worker integrates seamlessly with tldraw clients:

```typescript
// Client-side connection
const editor = new Editor({
	store: createTLStore({
		schema: getSchema(),
		multiplayerStatus: 'connecting',
	}),
	// Connect to sync-worker
	room: new TLMultiplayerRoom({
		host: 'https://sync.tldraw.xyz',
		roomId: 'my-room-id',
	}),
})
```

### Service Architecture

```
tldraw.com (Client)
├── sync-worker (Real-time collaboration)
├── image-resize-worker (Asset optimization)
└── asset-upload-worker (File uploads)
        ↓
    PostgreSQL (Metadata)
        ↓
    R2 Storage (Room data, assets)
        ↓
    Analytics Engine (Metrics)
```

The sync-worker serves as the central coordination point for all tldraw collaborative features, providing the foundation for scalable, real-time multiplayer drawing experiences.
