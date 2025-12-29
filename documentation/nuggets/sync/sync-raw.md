---
title: Real-time sync - Raw notes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - sync
status: published
date: 12/21/2025
order: 3
---

# Real-time sync - Raw notes

This document contains the technical implementation details, code references, and underlying research that informed the sync article.

## Source files

### Core implementation

- `/packages/sync-core/src/lib/TLSyncClient.ts` - Client-side sync state machine (944 lines)
- `/packages/sync-core/src/lib/TLSyncRoom.ts` - Server-side room management (1191 lines)
- `/packages/sync-core/src/lib/diff.ts` - Diff computation and application (403 lines)
- `/packages/sync-core/src/lib/protocol.ts` - Message types and protocol constants (272 lines)
- `/packages/sync-core/src/lib/RoomSession.ts` - Session state management (144 lines)
- `/packages/sync/src/lib/useSync.ts` - React hook for sync integration (582 lines)

### Supporting files

- `/packages/sync-core/src/lib/TLSyncStorage.ts` - Storage abstraction interface
- `/packages/sync-core/src/lib/InMemorySyncStorage.ts` - In-memory storage implementation
- `/packages/sync-core/src/lib/SQLiteSyncStorage.ts` - SQLite storage implementation
- `/packages/sync-core/src/lib/ClientWebSocketAdapter.ts` - WebSocket client adapter
- `/apps/dotcom/sync-worker/src/TLDrawDurableObject.ts` - Production deployment on Cloudflare

## Protocol version

**Current version**: 8 (as of code inspection)

```typescript
// packages/sync-core/src/lib/protocol.ts:4
const TLSYNC_PROTOCOL_VERSION = 8
```

Version history compatibility notes from code:

- Version 5 treated as version 6 (line 755)
- Version 6 requires legacy rejection handling (line 759)
- Version 7 doesn't support string append operations (line 763)
- Version 8+ supports efficient string append operations

## Clock-based versioning details

### Clock types

**Server clock** (TLSyncClient.ts:339):

```typescript
private lastServerClock = -1
```

- Starts at -1 before connection
- Increments with each change server processes
- Used for partial sync on reconnection

**Client clock** (TLSyncClient.ts:383):

```typescript
private clientClock = 0
```

- Counter for push requests
- Increments with each push
- Returned in server responses to match request/response pairs
- Enables idempotent retries (mentioned in comments but not implemented yet)

**Record clocks** (TLSyncRoom.ts:107):

```typescript
documents: Array<{ state: TLRecord; lastChangedClock: number }>
```

- Each record tracks when it was last modified
- Enables efficient partial sync

**Document clock** (TLSyncRoom.ts:151):

```typescript
private lastDocumentClock = 0
```

- Tracks the latest clock for document changes (not presence)
- Separate from presence updates for efficient filtering

## RoomSnapshot structure

Complete snapshot interface (TLSyncRoom.ts:95-120):

```typescript
export interface RoomSnapshot {
	clock?: number // Current logical clock
	documentClock?: number // Clock for document changes
	documents: Array<{
		state: TLRecord
		lastChangedClock: number
	}>
	tombstones?: Record<string, number> // Map of deleted IDs to deletion clock
	tombstoneHistoryStartsAtClock?: number // Oldest deletion tracked
	schema?: SerializedSchema
}
```

## Tombstone implementation

### Constants (InMemorySyncStorage.ts:25-27):

```typescript
export const TOMBSTONE_PRUNE_BUFFER_SIZE = 1000
export const MAX_TOMBSTONES = 5000
```

### Purpose

Tombstones prevent "resurrection" of deleted records. Without them, a reconnecting client with a deleted record would re-add it to the server.

### Pruning algorithm

Located in `computeTombstonePruning()` function (InMemorySyncStorage.ts:52-85):

Key principles:

1. Only prune when count exceeds MAX_TOMBSTONES (5000)
2. Delete oldest tombstones first (sorted by clock)
3. Never split tombstones with the same clock value - ensures partial history consistency
4. Keep TOMBSTONE_PRUNE_BUFFER_SIZE (1000) extra deletions to avoid frequent pruning
5. Update `tombstoneHistoryStartsAtClock` to the oldest remaining tombstone's clock

Formula:

```typescript
let cutoff = pruneBufferSize + tombstones.length - maxTombstones
// = 1000 + 5500 - 5000 = 1500 tombstones to delete
```

Edge case handling:

```typescript
while (cutoff < tombstones.length && tombstones[cutoff - 1]?.clock === tombstones[cutoff]?.clock) {
	cutoff++
}
```

This prevents splitting deletions that happened at the same clock.

### Storage implementations

Both in-memory and SQLite implementations:

- Store tombstones separately from documents
- Index tombstones by clock for efficient queries
- Automatically create tombstone on delete
- Automatically clear tombstone on put (resurrection)

## The rebase mechanism

### Speculative changes tracking (TLSyncClient.ts:350-354):

```typescript
private speculativeChanges: RecordsDiff<R> = {
  added: {} as any,
  updated: {} as any,
  removed: {} as any,
}
```

This diff represents ALL unconfirmed local changes. If you reverse it and apply to the store, you get the exact server state.

### Pending push queue (TLSyncClient.ts:343):

```typescript
private pendingPushRequests: { request: TLPushRequest<R>; sent: boolean }[] = []
```

Tracks requests that have been created but not acknowledged by server.

### Rebase implementation (TLSyncClient.ts:878-943)

The actual `rebase()` function:

```typescript
private rebase = () => {
  // 1. Ensure store history is flushed
  this.store._flushHistory()
  if (this.incomingDiffBuffer.length === 0) return

  const diffs = this.incomingDiffBuffer
  this.incomingDiffBuffer = []

  try {
    this.store.mergeRemoteChanges(() => {
      // 2. Undo speculative changes
      this.store.applyDiff(reverseRecordsDiff(this.speculativeChanges), { runCallbacks: false })

      // 3. Apply network diffs on top of known-to-be-synced data
      for (const diff of diffs) {
        if (diff.type === 'patch') {
          this.applyNetworkDiff(diff.diff, true)
          continue
        }
        // Handle push_result: 'commit', 'discard', or rebase action
        if (diff.action === 'discard') {
          this.pendingPushRequests.shift()
        } else if (diff.action === 'commit') {
          const { request } = this.pendingPushRequests.shift()!
          if ('diff' in request && request.diff) {
            this.applyNetworkDiff(request.diff, true)
          }
        } else {
          this.applyNetworkDiff(diff.action.rebaseWithDiff, true)
          this.pendingPushRequests.shift()
        }
      }

      // 4. Update speculative diff while re-applying pending changes
      this.speculativeChanges = this.store.extractingChanges(() => {
        for (const { request } of this.pendingPushRequests) {
          if (!('diff' in request) || !request.diff) continue
          this.applyNetworkDiff(request.diff, true)
        }
      })
    })
    this.lastServerClock = diffs.at(-1)?.serverClock ?? this.lastServerClock
  } catch (e) {
    console.error(e)
    this.store.ensureStoreIsUsable()
    this.resetConnection()
  }
}
```

Key insight from line 889-890: The undo happens with `runCallbacks: false` to avoid triggering UI updates for the temporary state.

### Rebase scheduling (TLSyncClient.ts:942):

```typescript
private scheduleRebase = fpsThrottle(this.rebase)
```

Uses FPS throttling (approximately 60fps) to batch rebase operations for performance.

## Push request lifecycle

### Creating a push (TLSyncClient.ts:778-813):

1. Compute network diff (removes no-ops using deep equality):

```typescript
const diff = getNetworkDiff(change)
if (!diff) return
```

2. Merge into speculative changes:

```typescript
this.speculativeChanges = squashRecordDiffs([this.speculativeChanges, change])
```

3. If offline, stop here (changes stay in speculativeChanges)

4. If online, create push request:

```typescript
const pushRequest: TLPushRequest<R> = {
	type: 'push',
	diff,
	clientClock: this.clientClock++,
}
this.pendingPushRequests.push({ request: pushRequest, sent: false })
```

5. Schedule flush (throttled):

```typescript
this.flushPendingPushRequests()
```

### Push result types (protocol.ts:147-158):

**Commit**: Server applied changes verbatim

```typescript
{
  type: 'push_result',
  clientClock: number,
  serverClock: number,
  action: 'commit'
}
```

**Discard**: Server rejected changes entirely

```typescript
{
  type: 'push_result',
  clientClock: number,
  serverClock: number,
  action: 'discard'
}
```

**Rebase**: Server applied modified version

```typescript
{
  type: 'push_result',
  clientClock: number,
  serverClock: number,
  action: { rebaseWithDiff: NetworkDiff<R> }
}
```

The rebaseWithDiff contains what the server actually did instead of what was requested.

## NetworkDiff wire format

### Type definitions (diff.ts:10-46):

```typescript
export const RecordOpType = {
	Put: 'put', // Full record (new or replaced)
	Patch: 'patch', // Partial update
	Remove: 'remove', // Deletion
} as const

export type RecordOp<R> =
	| [typeof RecordOpType.Put, R]
	| [typeof RecordOpType.Patch, ObjectDiff]
	| [typeof RecordOpType.Remove]

export interface NetworkDiff<R> {
	[id: string]: RecordOp<R>
}
```

### Value operations (diff.ts:106-159):

```typescript
export const ValueOpType = {
	Put: 'put', // Set property
	Delete: 'delete', // Remove property
	Append: 'append', // Array/string append
	Patch: 'patch', // Nested object update
} as const

export type PutOp = [type: 'put', value: unknown]
export type AppendOp = [type: 'append', value: unknown[] | string, offset: number]
export type PatchOp = [type: 'patch', diff: ObjectDiff]
export type DeleteOp = [type: 'delete']

export interface ObjectDiff {
	[k: string]: ValueOp
}
```

### String append optimization (diff.ts:243-247):

```typescript
if (!legacyAppendMode && valueB.startsWith(valueA)) {
	const appendedText = valueB.slice(valueA.length)
	return [ValueOpType.Append, appendedText, valueA.length]
}
```

Only sends the new text, not the entire string. The offset ensures append only succeeds if client state matches.

Example for text editing:

- Before: "Hello"
- After: "Hello World"
- Wire: `['append', ' World', 5]`

Legacy mode (protocol version < 8) falls back to full replacement.

### Array append optimization (diff.ts:297-305):

```typescript
// Check if only items were appended
for (let i = 0; i < prevArray.length; i++) {
	if (!isEqual(prevArray[i], nextArray[i])) {
		return [ValueOpType.Put, nextArray] // Fall back to full replacement
	}
}
return [ValueOpType.Append, nextArray.slice(prevArray.length), prevArray.length]
```

Only sends new items if all existing items unchanged.

### Array patch optimization (diff.ts:262-294):

For equal-length arrays with few changes:

```typescript
const maxPatchIndexes = Math.max(prevArray.length / 5, 1)
```

Only uses patch mode if ≤20% of items changed. Otherwise sends full array.

## Presence system

### Separate lifecycle from documents

Two scoped listeners (TLSyncClient.ts:457-464):

```typescript
this.store.listen(
	({ changes }) => {
		this.push(changes)
	},
	{ source: 'user', scope: 'document' }
)
```

Presence handled separately with reactive signal (TLSyncClient.ts:527-535):

```typescript
react('pushPresence', () => {
	const mode = this.presenceMode?.get()
	if (mode !== 'full') return
	this.pushPresence(this.presenceState!.get())
})
```

### Presence modes (TLSyncClient.ts:199-204):

```typescript
export type TLPresenceMode =
	| 'solo' // No presence sharing
	| 'full' // Full presence including cursors and selections
```

Mode automatically switches based on connected users (useSync.ts:300-303):

```typescript
const presenceMode = computed<TLPresenceMode>('presenceMode', () => {
	if (otherUserPresences.get().size === 0) return 'solo'
	return 'full'
})
```

### Presence push request format (protocol.ts:188):

```typescript
presence?: [typeof RecordOpType.Patch, ObjectDiff] | [typeof RecordOpType.Put, R]
```

Can send either:

- Full presence record (first time)
- Patch of changes (subsequent updates)

### Presence storage (TLSyncRoom.ts:186):

```typescript
readonly presenceStore = new PresenceStore<R>()
```

Separate from document storage. Deleted automatically when session ends - no tombstones needed.

## Connection lifecycle details

### Session states (RoomSession.ts:13-20):

```typescript
export const RoomSessionState = {
	AwaitingConnectMessage: 'awaiting-connect-message', // Initial connection
	AwaitingRemoval: 'awaiting-removal', // Disconnection cleanup
	Connected: 'connected', // Fully synchronized
}
```

### Timeouts (RoomSession.ts:45-65):

```typescript
export const SESSION_START_WAIT_TIME = 10000 // 10 seconds for connect message
export const SESSION_REMOVAL_WAIT_TIME = 5000 // 5 seconds grace period
export const SESSION_IDLE_TIMEOUT = 20000 // 20 seconds idle before cleanup
```

### Health checking (TLSyncClient.ts:273-274):

```typescript
const PING_INTERVAL = 5000 // 5 seconds
const MAX_TIME_TO_WAIT_FOR_SERVER_INTERACTION_BEFORE_RESETTING_CONNECTION = PING_INTERVAL * 2 // 10 seconds
```

Two intervals run continuously:

1. Ping loop (line 494): Sends ping every 5 seconds
2. Health check (line 506): Resets connection if no server message for 10 seconds

### Connect message (TLSyncClient.ts:551-565):

```typescript
private sendConnectMessage() {
  this.latestConnectRequestId = uniqueId()
  this.socket.sendMessage({
    type: 'connect',
    connectRequestId: this.latestConnectRequestId,
    schema: this.store.schema.serialize(),
    protocolVersion: getTlsyncProtocolVersion(),
    lastServerClock: this.lastServerClock,
  })
}
```

The `lastServerClock` enables partial hydration on reconnect.

### Hydration types (protocol.ts:102):

```typescript
hydrationType: 'wipe_all' | 'wipe_presence'
```

**wipe_all**: Server doesn't have enough history for partial sync

- Client's clock is older than server's tombstone history
- Client must discard all local state and reload

**wipe_presence**: Normal reconnection

- Only presence data wiped
- Documents incrementally synced

Implementation (TLSyncClient.ts:625-643):

```typescript
const wipeAll = event.hydrationType === 'wipe_all'
if (!wipeAll) {
	// only wiping presence data, undo the speculative changes first
	this.store.applyDiff(reverseRecordsDiff(stashedChanges), { runCallbacks: false })
}

// now wipe all presence data and, if needed, all document data
for (const [id, record] of objectMapEntries(this.store.serialize('all'))) {
	if (
		(wipeAll && this.store.scopedTypes.document.has(record.typeName)) ||
		record.typeName === this.presenceType
	) {
		wipeDiff[id] = [RecordOpType.Remove]
	}
}
```

## Server-side conflict resolution

### Server authoritative model

Push request handler (TLSyncRoom.ts:860-1145) processes client changes:

1. **Validation**: Check schema compatibility, readonly mode, record types
2. **Migration**: Upgrade client schema to server schema if needed
3. **Application**: Apply changes to storage with validation
4. **Propagation**: Compute actual changes and broadcast to other clients

### Push result determination (TLSyncRoom.ts:1082-1115):

**Commit** - Changes applied verbatim:

```typescript
if (isEqual(result.docChanges.diffs?.networkDiff, message.diff)) {
	pushResult = {
		type: 'push_result',
		clientClock: message.clientClock,
		serverClock: documentClock,
		action: 'commit',
	}
}
```

**Discard** - No changes made:

```typescript
else if (!result.docChanges.diffs?.networkDiff) {
  pushResult = {
    type: 'push_result',
    clientClock: message.clientClock,
    serverClock: documentClock,
    action: 'discard',
  }
}
```

**Rebase** - Changes modified:

```typescript
else if (session) {
  const diff = this.migrateDiffOrRejectSession(
    session.sessionId,
    session.serializedSchema,
    session.requiresDownMigrations,
    result.docChanges.diffs.diff,
    result.docChanges.diffs.networkDiff
  )
  if (diff.ok) {
    pushResult = {
      type: 'push_result',
      clientClock: message.clientClock,
      serverClock: documentClock,
      action: { rebaseWithDiff: diff.value },
    }
  }
}
```

### Record validation (TLSyncRoom.ts:928-941):

```typescript
const recordType = assertExists(getOwnProperty(this.schema.types, state.typeName))
validateRecord(state, recordType)
```

Server validates all records against schema before accepting.

### Patch vs Put strategy (TLSyncRoom.ts:924-943):

When server receives a Put for existing document:

```typescript
if (doc) {
	// If there's an existing document, replace it with the new state
	// but propagate a diff rather than the entire value
	const recordType = assertExists(getOwnProperty(this.schema.types, doc.typeName))
	const diff = diffAndValidateRecord(doc, state, recordType)
	if (diff) {
		storage.set(id, state)
		propagateOp(changes, id, [RecordOpType.Patch, diff], doc, state)
	}
} else {
	// Otherwise, create the document and propagate the put op
	const recordType = assertExists(getOwnProperty(this.schema.types, state.typeName))
	validateRecord(state, recordType)
	storage.set(id, state)
	propagateOp(changes, id, [RecordOpType.Put, state], undefined, undefined)
}
```

Server converts full puts into patches when possible to minimize bandwidth.

## Schema migration during sync

### Down migrations for older clients (TLSyncRoom.ts:566-615):

```typescript
private migrateDiffOrRejectSession(
  sessionId: string,
  serializedSchema: SerializedSchema,
  requiresDownMigrations: boolean,
  diff: TLSyncForwardDiff<R>,
  unmigrated?: NetworkDiff<R>
): Result<NetworkDiff<R>, MigrationFailureReason>
```

When broadcasting to older clients:

1. Migrate each record down to client's schema version
2. For updates, migrate both before and after, then compute patch
3. If migration fails, reject the session

Example for updates (line 583-597):

```typescript
if (Array.isArray(put)) {
	// Update: [before, after] tuple - migrate both and compute patch
	const [from, to] = put
	const fromResult = this.schema.migratePersistedRecord(from, serializedSchema, 'down')
	if (fromResult.type === 'error') {
		this.rejectSession(sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
		return Result.err(fromResult.reason)
	}
	const toResult = this.schema.migratePersistedRecord(to, serializedSchema, 'down')
	if (toResult.type === 'error') {
		this.rejectSession(sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
		return Result.err(toResult.reason)
	}
	const patch = diffRecord(fromResult.value, toResult.value)
	if (patch) {
		result[id] = [RecordOpType.Patch, patch]
	}
}
```

### Up migrations from older clients (TLSyncRoom.ts:914-918):

```typescript
const res = session
	? this.schema.migratePersistedRecord(_state, session.serializedSchema, 'up')
	: { type: 'success' as const, value: _state }
if (res.type === 'error') {
	throw new TLSyncError(res.reason, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
}
```

Server upgrades incoming records from client's schema to server's schema.

### Compatible migration requirements (TLSyncRoom.ts:783):

```typescript
if (!migrations.ok || migrations.value.some((m) => m.scope !== 'record' || !m.down)) {
	this.rejectSession(sessionId, TLSyncErrorCloseEventReason.CLIENT_TOO_OLD)
	return
}
```

Connection only allowed if:

- All migrations are record-scoped (not document-wide)
- All migrations have down migrations (reversible)

## Message batching and debouncing

### Data message debouncing (TLSyncRoom.ts:85):

```typescript
export const DATA_MESSAGE_DEBOUNCE_INTERVAL = 1000 / 60 // ~16.67ms (60 FPS)
```

### Batch message format (protocol.ts:118):

```typescript
| { type: 'data'; data: TLSocketServerSentDataEvent<R>[] }
```

Multiple patch/push_result messages batched into single data message.

### Batching logic (TLSyncRoom.ts:317-328):

First message after flush sent immediately:

```typescript
if (session.debounceTimer === null) {
	// this is the first message since the last flush, don't delay it
	session.socket.sendMessage({ type: 'data', data: [message] })

	session.debounceTimer = setTimeout(
		() => this._flushDataMessages(sessionId),
		DATA_MESSAGE_DEBOUNCE_INTERVAL
	)
} else {
	session.outstandingDataMessages.push(message)
}
```

Subsequent messages queued and flushed after debounce interval.

### Client-side flush throttling (TLSyncClient.ts:816):

```typescript
private flushPendingPushRequests = fpsThrottle(() => {
  // ... send logic
})
```

Uses FPS throttling (~60fps) to batch client sends.

## Error handling and close reasons

### Close event code (TLSyncClient.ts:60):

```typescript
export const TLSyncErrorCloseEventCode = 4099 as const
```

### Error reasons (TLSyncClient.ts:92-111):

```typescript
export const TLSyncErrorCloseEventReason = {
	NOT_FOUND: 'NOT_FOUND', // Room doesn't exist
	FORBIDDEN: 'FORBIDDEN', // No permission
	NOT_AUTHENTICATED: 'NOT_AUTHENTICATED', // Auth required
	UNKNOWN_ERROR: 'UNKNOWN_ERROR', // Server error
	CLIENT_TOO_OLD: 'CLIENT_TOO_OLD', // Client needs upgrade
	SERVER_TOO_OLD: 'SERVER_TOO_OLD', // Server needs upgrade
	INVALID_RECORD: 'INVALID_RECORD', // Bad data
	RATE_LIMITED: 'RATE_LIMITED', // Too many requests
	ROOM_FULL: 'ROOM_FULL', // Max capacity
} as const
```

### Error propagation (TLSyncClient.ts:486-490):

```typescript
if (ev.status === 'error') {
	didLoad = true
	config.onSyncError(ev.reason)
	this.close()
}
```

On error, client fires callback then closes. No automatic retry.

## Performance optimizations

### Diff computation optimizations

**Deep equality checks** (diff.ts:223):

```typescript
if (!isEqual(prevValue, nextValue)) {
	result[key] = [ValueOpType.Put, nextValue]
}
```

Avoids creating diffs for semantically equal but not identical objects.

**Nested object patching** (diff.ts:213-222):

```typescript
if (
	nestedKeys?.has(key) ||
	(Array.isArray(prevValue) && Array.isArray(nextValue)) ||
	(typeof prevValue === 'string' && typeof nextValue === 'string')
) {
	const diff = diffValue(prevValue, nextValue, legacyAppendMode)
	if (diff) {
		result[key] = diff
	}
}
```

Special handling for `props` and `meta` keys - always diff nested instead of replacing.

**Array patch threshold** (diff.ts:265):

```typescript
const maxPatchIndexes = Math.max(prevArray.length / 5, 1)
```

Only use array patching if ≤20% of items changed.

### Store update batching

**mergeRemoteChanges** (TLSyncClient.ts:888):

```typescript
this.store.mergeRemoteChanges(() => {
	// All operations here batched into single update
})
```

Wraps rebase operations in a transaction to batch all store updates.

**runCallbacks: false** (TLSyncClient.ts:890):

```typescript
this.store.applyDiff(reverseRecordsDiff(this.speculativeChanges), { runCallbacks: false })
```

Disables callbacks during intermediate states of rebase.

### Throttling mechanisms

**FPS throttling** (from @tldraw/utils):

```typescript
import { fpsThrottle } from '@tldraw/utils'

private flushPendingPushRequests = fpsThrottle(() => { ... })
private scheduleRebase = fpsThrottle(this.rebase)
```

Limits operations to ~60fps maximum rate.

**Debouncing** (TLSyncRoom.ts:85):

```typescript
const DATA_MESSAGE_DEBOUNCE_INTERVAL = 1000 / 60
```

Groups rapid updates into batches.

### Structural sharing

Diff operations use structural sharing (diff.ts:331-401):

```typescript
let newObject: any | undefined = undefined
const set = (k: any, v: any) => {
	if (!newObject) {
		if (isArray) {
			newObject = [...object]
		} else {
			newObject = { ...object }
		}
	}
	newObject[k] = v
}
```

Only creates new object if changes actually occur.

## Storage layer abstraction

### Interface (TLSyncStorage.ts:76-87):

```typescript
export interface TLSyncStorage<R extends UnknownRecord> {
	transaction<T>(
		callback: TLSyncStorageTransactionCallback<R, T>,
		opts?: TLSyncStorageTransactionOptions
	): TLSyncStorageTransactionResult<T, R>

	getClock(): number
	onChange(callback: (arg: TLSyncStorageOnChangeCallbackProps) => unknown): () => void
	getSnapshot?(): RoomSnapshot
}
```

### Transaction interface (TLSyncStorage.ts:13-31):

```typescript
export interface TLSyncStorageTransaction<R extends UnknownRecord> extends SynchronousStorage<R> {
	getClock(): number
	getChangesSince(sinceClock: number): TLSyncStorageGetChangesSinceResult<R> | undefined
}
```

### Transaction options (TLSyncStorage.ts:37-55):

```typescript
export interface TLSyncStorageTransactionOptions {
	id?: string // For logging/debugging or ignoring changes
	emitChanges?: 'always' | 'when-different' // Control change emission
}
```

**emitChanges modes**:

- `'always'` - Always emit actual changes
- `'when-different'` - Only emit if storage modified records

### Change detection (TLSyncStorage.ts:160-195):

```typescript
getChangesSince(sinceClock: number): TLSyncStorageGetChangesSinceResult<R> | undefined {
  const wipeAll = sinceClock < this.storage.tombstoneHistoryStartsAtClock.get()

  if (wipeAll) {
    // Can't provide partial history, must wipe all
    return {
      wipeAll: true,
      diff: {
        puts: Object.fromEntries(
          Array.from(this.storage.documents.entries()).map(([id, doc]) => [id, doc.state])
        ),
        deletes: [],
      },
    }
  }

  // Build incremental diff
  const diff: TLSyncForwardDiff<R> = { puts: {}, deletes: [] }

  // Changed documents
  for (const [id, doc] of this.storage.documents.entries()) {
    if (doc.lastChangedClock > sinceClock) {
      diff.puts[id] = doc.state
    }
  }

  // Deleted documents (tombstones)
  for (const [id, clock] of this.storage.tombstones.entries()) {
    if (clock > sinceClock) {
      diff.deletes.push(id)
    }
  }

  return { wipeAll: false, diff }
}
```

## React integration (useSync hook)

### Store states (useSync.ts:75-78):

```typescript
export type RemoteTLStoreWithStatus = Exclude<
	TLStoreWithStatus,
	{ status: 'synced-local' } | { status: 'not-synced' }
>
```

Only `loading`, `synced-remote`, or `error`.

### Presence computation (useSync.ts:286-294):

```typescript
const presence = computed('instancePresence', () => {
	const presenceState = getUserPresence(store, userPreferences.get())
	if (!presenceState) return null

	return InstancePresenceRecordType.create({
		...presenceState,
		id: InstancePresenceRecordType.createId(store.id),
	})
})
```

Reactively updates presence based on store and user changes.

### Store configuration (useSync.ts:275-284):

```typescript
const store = createTLStore({
	id: storeId,
	schema,
	assets,
	onMount,
	collaboration: {
		status: collaborationStatusSignal,
		mode: syncMode, // 'readonly' | 'readwrite'
	},
})
```

Collaboration configuration embedded in store.

### Readonly mode handling (useSync.ts:337-347):

```typescript
onAfterConnect(_, { isReadonly }) {
  transact(() => {
    syncMode.set(isReadonly ? 'readonly' : 'readwrite')
    // Safety check: if server crashes and loses data, ensure app still works
    store.ensureStoreIsUsable()
  })
}
```

Server controls whether client can edit.

## Cross-tab synchronization

Referenced in article but implemented separately in cross-tab-sync.md. Key difference: local tabs use BroadcastChannel instead of WebSocket, skip network serialization, share same storage.

## Production deployment notes

### Cloudflare Workers implementation

File: `/apps/dotcom/sync-worker/src/TLDrawDurableObject.ts`

Uses Durable Objects for:

- Per-room state isolation
- Automatic geographic distribution
- Built-in persistence
- WebSocket connections

### Session ID parameters (useSync.ts:243-257):

```typescript
withParams.searchParams.set('sessionId', TAB_ID)
withParams.searchParams.set('storeId', storeId)
```

Reserved parameters automatically added to connection URI:

- `sessionId` - Browser tab identifier
- `storeId` - Store instance identifier

## Testing and validation

Key test files:

- `TLSyncClient.test.ts` - Client state machine tests
- `TLSyncRoom.test.ts` - Server room tests
- `diff.test.ts` - Diff computation tests
- `syncFuzz.test.ts` - Fuzz testing for edge cases

Test strategy emphasizes:

- Concurrent operations
- Network interruptions
- Schema migrations
- Edge cases in diff computation
- Rebase correctness

## Algorithm complexity notes

### Diff computation

- **Best case**: O(1) when objects are identical
- **Average case**: O(n) where n is number of properties
- **Worst case**: O(n\*m) for nested objects with m depth

### Rebase operation

- **Time complexity**: O(p + s) where p = pending requests, s = server patches
- **Space complexity**: O(s) for speculative changes storage

### Tombstone pruning

- **Time complexity**: O(t log t) where t = tombstone count (due to sorting)
- **Frequency**: Throttled, only when count exceeds 5000

## Security considerations

### Server validation

All client data validated before acceptance:

- Schema conformance (TLSyncRoom.ts:928)
- Type checking (TLSyncRoom.ts:1038)
- Readonly enforcement (TLSyncRoom.ts:1031)

### Read-only mode enforcement

```typescript
if (message.diff && !session?.isReadonly) {
	// Only process document changes if not readonly
}
```

Server ignores document changes from readonly sessions.

### Rate limiting support

Error code `RATE_LIMITED` exists but implementation left to server deployment.

## Future improvements mentioned in code

### Idempotent retries (TLSyncClient.ts:378-381):

```typescript
/**
 * The clock may also be used at one point in the future to allow the client to re-send push
 * requests idempotently (i.e. the server will keep track of each client's clock and not execute
 * requests it has already handled), but at the time of writing this is neither needed nor
 * implemented.
 */
```

Client clock designed for idempotent retries but not yet implemented.

### Partial array updates

Currently array patches only work for equal-length arrays with few changes. Could be extended for more cases.

### Chunked connect responses (TLSyncClient.ts:276):

```typescript
// Should connect support chunking the response to allow for large payloads?
```

Large initial hydrations could be chunked for better streaming.
