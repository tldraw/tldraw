---
title: Sync worker
created_at: 12/17/2024
updated_at: 12/17/2024
keywords:
  - sync
  - worker
  - cloudflare
  - multiplayer
  - collaboration
---

The sync-worker is the core multiplayer synchronization service for tldraw.com. It handles real-time collaboration, room management, file persistence, and user authentication using Cloudflare Workers and Durable Objects.

## Overview

A distributed system that powers tldraw's collaboration features:

- Real-time WebSocket synchronization
- Room management via Durable Objects
- File persistence to R2 storage
- User authentication via Clerk
- PostgreSQL replication for metadata

## Architecture

### Durable Objects

| Object                  | Purpose                            |
| ----------------------- | ---------------------------------- |
| `TLDrawDurableObject`   | Room management and real-time sync |
| `TLUserDurableObject`   | User data synchronization          |
| `TLPostgresReplicator`  | Database change replication        |
| `TLLoggerDurableObject` | Centralized logging                |
| `TLStatsDurableObject`  | Metrics collection                 |

### Request flow

```
Client → Cloudflare Edge → sync-worker → Durable Object
   ↑                                          ↓
   ←──────────── WebSocket ──────────────────←
```

## Core features

### Room management

```typescript
class TLDrawDurableObject extends DurableObject {
	private _room: Promise<TLSocketRoom<TLRecord, SessionMeta>> | null = null

	async onRequest(req: IRequest, openMode: RoomOpenMode) {
		const { 0: clientWebSocket, 1: serverWebSocket } = new WebSocketPair()

		const auth = await getAuth(req, this.env)
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

### Routes

```typescript
// Legacy rooms
.get('/r/:roomId', joinExistingRoom)       // Read-write
.get('/ro/:roomId', joinExistingRoom)      // Read-only

// Modern app routes
.get('/app/file/:roomId', forwardRoomRequest)
.get('/app/:userId/connect', connectUserSync)

// API endpoints
.post('/app/uploads/:objectName', upload)
.get('/unfurl', extractBookmarkMetadata)
.post('/snapshots', createRoomSnapshot)
```

## Persistence

### Storage layers

| Layer          | Purpose        | Technology          |
| -------------- | -------------- | ------------------- |
| R2             | Room snapshots | Object storage      |
| PostgreSQL     | File metadata  | Relational database |
| Durable Object | Session state  | Edge storage        |

### Persistence strategy

```typescript
const PERSIST_INTERVAL_MS = 8_000

triggerPersist = throttle(() => {
  this.persistToDatabase()
}, PERSIST_INTERVAL_MS)

async persistToDatabase() {
  const room = await this.getRoom()
  const clock = room.getCurrentDocumentClock()

  if (this._lastPersistedClock === clock) return

  const snapshot = room.getCurrentSnapshot()
  await this.r2.rooms.put(key, JSON.stringify(snapshot))

  // Version history
  const versionKey = `${key}/${new Date().toISOString()}`
  await this.r2.versionCache.put(versionKey, JSON.stringify(snapshot))
}
```

## Authentication

### Clerk integration

```typescript
const auth = await getAuth(req, env)

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

## Session management

```typescript
interface RoomSession<R, Meta> {
	sessionId: string
	presenceId: string | null
	socket: TLRoomSocket<R>
	meta: Meta
	isReadonly: boolean
	lastInteractionTime: number
}

// Timeouts
SESSION_START_WAIT_TIME = 10_000 // 10s handshake
SESSION_IDLE_TIMEOUT = 20_000 // 20s idle
SESSION_REMOVAL_WAIT_TIME = 5_000 // 5s cleanup
```

## Environment configuration

### Production

```toml
[env.production]
name = "tldraw-multiplayer"

[[env.production.routes]]
pattern = "www.tldraw.com/api/*"

[[env.production.r2_buckets]]
binding = "ROOMS"
bucket_name = "rooms"

[[env.production.r2_buckets]]
binding = "UPLOADS"
bucket_name = "uploads"
```

### Storage bindings

- `ROOMS` - Room snapshots
- `ROOMS_HISTORY_EPHEMERAL` - Version history
- `UPLOADS` - User assets
- `SLUG_TO_READONLY_SLUG` - KV namespace

## Data synchronization

### Zero/Rocicorp integration

```typescript
const schema = {
	tables: {
		user: table('user').columns({ id, name, preferences }),
		file: table('file').columns({ id, name, ownerId, shared }),
	},
}

// Server-side mutation processing
const processor = new PushProcessor(database, schema, 'debug')
const result = await processor.process(createMutators(userId), req)
```

### PostgreSQL replication

```typescript
class TLPostgresReplicator extends DurableObject<Environment> {
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

## Performance

### Caching

- Durable Object memory cache
- R2 caching for snapshots
- Database connection pooling

### Scalability

```typescript
const MAX_CONNECTIONS = 50

if (room.getNumActiveSessions() > MAX_CONNECTIONS) {
	return closeSocket(TLSyncErrorCloseEventReason.ROOM_FULL)
}
```

## Error handling

### Sentry integration

```typescript
const sentry = createSentry(this.ctx, this.env, request)

try {
	return await this.router.fetch(req)
} catch (err) {
	sentry?.captureException(err)
	return new Response('Error', { status: 500 })
}
```

### Analytics

```typescript
logEvent(event: TLServerEvent) {
  this.writeEvent(event.name, {
    blobs: [event.roomId, event.instanceId],
    indexes: [event.localClientId],
  })
}
```

## Development

### Local development

```bash
./dev.sh          # Start development server
./reset-db.sh     # Reset database
yarn clean        # Clean DO state
```

### Environment setup

```bash
# .dev.vars
SUPABASE_URL=<url>
SUPABASE_KEY=<key>
```

## Key files

- `src/TLDrawDurableObject.ts` - Room management
- `src/TLUserDurableObject.ts` - User data sync
- `src/TLPostgresReplicator.ts` - Database replication
- `wrangler.toml` - Deployment configuration

## Related

- [Multiplayer architecture](../architecture/multiplayer.md)
- [@tldraw/sync](../packages/sync.md)
- [@tldraw/sync-core](../packages/sync-core.md)
