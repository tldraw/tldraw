---
title: Cross-tab synchronization
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - sync
  - tabs
  - BroadcastChannel
  - IndexedDB
---

# Cross-tab synchronization

IndexedDB has no built-in protection against concurrent writers. If two tabs have the same document open and both write to the database, the last write wins. The first tab's changes disappear silently.

We needed cross-tab sync for tldraw because users often work with the same document in multiple tabs. Opening a link in a new tab, refreshing while another tab is still open, or intentionally comparing versions in side-by-side tabs are all common workflows. Without coordination, any of these scenarios could result in data loss.

The solution uses two layers: BroadcastChannel for immediate in-memory sync between tabs, and IndexedDB for persistence to disk. BroadcastChannel keeps all tabs showing the same state in real time, while IndexedDB provides durability. The key insight is that only one tab needs to write to the database, not all of them.

## Two-tier architecture

When a user makes a change in one tab, that change follows two paths simultaneously:

1. The change broadcasts to all other tabs via BroadcastChannel
2. The change queues for persistence to IndexedDB (debounced to 350ms)

Other tabs receive the broadcast immediately and apply the change to their in-memory store. They don't write to IndexedDB because they know another tab is handling persistence. This avoids the concurrent writer problem entirely.

Here's the store listener that triggers both paths:

```typescript
store.listen(
	({ changes }) => {
		this.diffQueue.push(changes)
		this.channel.postMessage(
			msg({
				type: 'diff',
				storeId: this.store.id,
				changes,
				schema: this.serializedSchema,
			})
		)
		this.schedulePersist()
	},
	{ source: 'user', scope: 'document' }
)
```

The listener filters for `source: 'user'` to broadcast only user-initiated changes, not changes that came from another tab. This prevents infinite broadcast loops. The `scope: 'document'` filter ensures we only broadcast document content, not session-specific state like camera position or selection.

## BroadcastChannel messaging

BroadcastChannel is a browser API for same-origin communication between tabs, frames, and workers. It works entirely in memory with no network round-trip. Each document gets its own channel:

```typescript
public readonly channel = new BC(`tldraw-tab-sync-${persistenceKey}`)
```

There are two message types. The `diff` message contains record changes:

```typescript
interface SyncMessage {
	type: 'diff'
	storeId: string
	changes: RecordsDiff<UnknownRecord>
	schema: SerializedSchema
}
```

And the `announce` message broadcasts a tab's schema version when it connects:

```typescript
interface AnnounceMessage {
	type: 'announce'
	schema: SerializedSchema
}
```

When a tab receives a `diff` message, it applies the changes through `mergeRemoteChanges`:

```typescript
if (msg.type === 'diff') {
	transact(() => {
		this.store.mergeRemoteChanges(() => {
			this.store.applyDiff(msg.changes as any)
		})
	})
}
```

The `mergeRemoteChanges` wrapper sets a flag that tells the store these changes originated remotely. This prevents the store from re-broadcasting them back to the channel, which would create an infinite loop.

## Schema version coordination

Every message includes a serialized schema. When a tab receives a message, it checks whether the sender's schema version is compatible:

```typescript
this.channel.onmessage = ({ data }) => {
	const msg = data as Message
	const res = this.store.schema.getMigrationsSince(msg.schema)

	if (!res.ok) {
		// Sender has newer schema - we're outdated
		const timeSinceInit = Date.now() - this.initTime
		if (timeSinceInit < 5000) {
			onLoadError(new Error('Schema mismatch, please close other tabs and reload the page'))
			return
		}
		this.isReloading = true
		window?.location?.reload?.()
		return
	} else if (res.value.length > 0) {
		// Sender has older schema - tell them to reload
		this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
		this.shouldDoFullDBWrite = true
		this.persistIfNeeded()
		return
	}
	// ...
}
```

If the sender has a newer schema version, the receiver reloads the page to get the latest code. If the sender has an older schema, the receiver sends an `announce` message to trigger a reload in the outdated tab.

The 5-second grace period prevents reload loops. If a tab just launched but already sees a newer schema version, something is wrong (possibly a schema version rollback during development). In this case, the tab shows an error instead of reloading.

When a newer tab detects an older tab, it schedules a full database write (`shouldDoFullDBWrite = true`) because the old tab might have already written stale data to IndexedDB before seeing the reload signal. The full write ensures the database contains the current schema version.

## Persistence throttling

Each tab maintains a diff queue that accumulates changes between persistence operations:

```typescript
private diffQueue: Array<RecordsDiff<UnknownRecord> | typeof UPDATE_INSTANCE_STATE> = []
```

The `schedulePersist` method debounces database writes to 350ms:

```typescript
private schedulePersist() {
	if (this.scheduledPersistTimeout) return
	this.scheduledPersistTimeout = setTimeout(
		() => {
			this.scheduledPersistTimeout = null
			this.persistIfNeeded()
		},
		this.didLastWriteError ? PERSIST_RETRY_THROTTLE_MS : PERSIST_THROTTLE_MS
	)
}
```

If a write fails, the retry delay increases to 10 seconds. This prevents hammering the database with failing writes while still giving the user time to free up disk space or switch to a non-private window.

Before persisting, diffs in the queue get squashed into a single operation:

```typescript
const diffs = squashRecordDiffs(
	diffQueue.filter((d): d is RecordsDiff<UnknownRecord> => d !== UPDATE_INSTANCE_STATE)
)
await this.db.storeChanges({
	changes: diffs,
	schema: this.store.schema,
	sessionId: this.sessionId,
	sessionStateSnapshot: this.$sessionStateSnapshot.get(),
})
```

The squashing algorithm handles sequences like add-then-update (collapses to a single add), add-then-remove (cancels both), and remove-then-add (converts to an update). This minimizes IndexedDB operations and preserves undo/redo history by keeping the original "from" state for updates.

## Full writes vs incremental writes

Most persistence operations are incremental, writing only the squashed diffs to IndexedDB. But in certain situations, the system performs a full write that replaces the entire database:

```typescript
if (this.shouldDoFullDBWrite) {
	this.shouldDoFullDBWrite = false
	await this.db.storeSnapshot({
		schema: this.store.schema,
		snapshot: this.store.serialize(),
		sessionId: this.sessionId,
		sessionStateSnapshot: this.$sessionStateSnapshot.get(),
	})
}
```

Full writes happen on the first persist after initialization, after detecting a schema version mismatch, and after any write error. The first-persist full write ensures the database starts with a complete snapshot even if the initial state came from a remote server. The post-error full write recovers from partial write failures that might have left the database in an inconsistent state.

## Session state persistence

Document state (shapes, pages, bindings) persists across browser sessions and syncs across tabs. Session state (camera position, selection, focus mode) persists within a session but doesn't sync to other tabs. Each tab gets its own camera position and selection.

When a tab writes to IndexedDB, it includes a session state snapshot alongside the document changes:

```typescript
interface SessionStateSnapshotRow {
	id: string
	snapshot: TLSessionStateSnapshot
	updatedAt: number
}
```

The session state includes camera position, selected shape IDs, and editor mode flags:

```typescript
export interface TLSessionStateSnapshot {
	version: number
	currentPageId?: TLPageId
	isFocusMode?: boolean
	exportBackground?: boolean
	isDebugMode?: boolean
	isToolLocked?: boolean
	isGridMode?: boolean
	pageStates?: Array<{
		pageId: TLPageId
		camera?: { x: number; y: number; z: number }
		selectedShapeIds?: TLShapeId[]
		focusedGroupId?: TLShapeId | null
	}>
}
```

Each tab has a unique ID stored in a global variable:

```typescript
const tabIdKey = 'TLDRAW_TAB_ID_v2' as const

export const TAB_ID: string = window
	? (window[tabIdKey] ??
		getFromSessionStorage(tabIdKey) ??
		`TLDRAW_INSTANCE_STATE_V1_` + uniqueId())
	: '<error>'
```

On page load, the tab checks for an existing ID in the window global (survives page reload in the same tab) or sessionStorage (iOS Safari fallback). If neither exists, it generates a new unique ID. The `beforeunload` event writes the ID to sessionStorage so it persists across refreshes.

When loading from IndexedDB, the tab first tries to load its own session state by ID. If that doesn't exist (new tab or cleared storage), it falls back to the most recently updated session state:

```typescript
let sessionStateSnapshot = sessionId
	? ((await sessionStateStore.get(sessionId)) as SessionStateSnapshotRow | undefined)
			?.snapshot
	: null

if (!sessionStateSnapshot) {
	const all = (await sessionStateStore.getAll()) as SessionStateSnapshotRow[]
	sessionStateSnapshot = all.sort((a, b) => a.updatedAt - b.updatedAt).pop()?.snapshot
}
```

This ensures new tabs inherit a reasonable camera position from the previous session instead of always starting at the origin.

The database prunes old session states to prevent unbounded growth:

```typescript
async pruneSessions() {
	await this.tx('readwrite', [Table.SessionState], async (tx) => {
		const sessionStateStore = tx.objectStore(Table.SessionState)
		const all = (await sessionStateStore.getAll()).sort((a, b) => a.updatedAt - b.updatedAt)
		if (all.length < 10) {
			await tx.done
			return
		}
		const toDelete = all.slice(0, all.length - 10)
		for (const { id } of toDelete) {
			await sessionStateStore.delete(id)
		}
	})
}
```

Only the 10 most recent session states persist. Older entries get deleted.

## Tradeoffs

This architecture assumes all tabs write to IndexedDB independently. We don't designate a "leader" tab that handles all persistence. This means we still have concurrent writes, but they're writing the same data at roughly the same time, so the last-write-wins behavior doesn't cause problems.

The 350ms debounce introduces a small window where a browser crash could lose changes that were broadcast to other tabs but not yet persisted. If you make an edit, immediately see it reflected in another tab, then crash before 350ms elapses, both tabs lose that change. We could reduce this window by persisting more frequently, but that would increase IndexedDB write volume and potentially cause performance problems.

The schema version coordination only works if tabs are running code from the same origin. If a user has tldraw.com open in one tab and a self-hosted deployment at example.com in another, BroadcastChannel won't connect them even if they're viewing the same document. This is correct behavior, but it means cross-origin tab sync isn't possible.

## Code locations

The main sync client is in `packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts`. The IndexedDB wrapper is in `packages/editor/src/lib/utils/sync/LocalIndexedDb.ts`. Session state structure and TAB_ID generation are in `packages/editor/src/lib/config/TLSessionStateSnapshot.ts`. The store's `mergeRemoteChanges` and `applyDiff` methods are in `packages/store/src/lib/Store.ts`, and the diff squashing logic is in `packages/store/src/lib/RecordsDiff.ts`.
