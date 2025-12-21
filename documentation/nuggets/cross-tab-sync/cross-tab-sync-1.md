---
title: BroadcastChannel for instant tab synchronization
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - sync
  - tabs
  - BroadcastChannel
  - IndexedDB
---

# Cross-tab synchronization

Imagine drawing a rectangle in one browser tab. You switch to another tab with the same document open, add a circle, and return to the first tab. The rectangle is gone. IndexedDB persisted both changes, but the last write won.

When we added local persistence to tldraw, this failure mode appeared immediately. Users open multiple tabs naturally — duplicating tabs to compare versions, keeping reference material in one tab while working in another, or simply forgetting a tab is open. Each tab believes it owns the document. Each reads from IndexedDB on load, makes changes, and writes back. No coordination, no awareness of concurrent writers.

The problem lives in IndexedDB's design. It provides no locking mechanism for concurrent access. Two tabs can both read the same document state, diverge independently, then write back their versions. The second write silently overwrites the first. From the user's perspective, work vanishes without warning.

We needed tabs to stay synchronized. Changes in one tab should appear instantly in others. No refresh required, no conflict dialogs, no lost work. The solution turned out to be simpler than coordinating writes: prevent concurrent states entirely by broadcasting every change as it happens.

## BroadcastChannel for tab-to-tab messaging

The browser provides a built-in API designed exactly for this: `BroadcastChannel`. It lets same-origin tabs send messages to each other without server involvement. Works offline, fires synchronously, handles cleanup automatically when tabs close.

We create one channel per document:

```typescript
// From TLLocalSyncClient.ts
const channel = new BroadcastChannel(`tldraw-tab-sync-${persistenceKey}`)
```

The persistence key identifies the document. Each document gets its own channel. Tabs working on different documents don't interfere with each other.

When the store changes, we post those changes to the channel:

```typescript
store.listen(
	({ changes }) => {
		this.channel.postMessage({
			type: 'diff',
			storeId: this.store.id,
			changes,
			schema: this.serializedSchema,
		})
		this.schedulePersist()
	},
	{ source: 'user', scope: 'document' }
)
```

The filters matter. `source: 'user'` excludes changes that originated from other tabs — we only broadcast user-initiated changes. Otherwise we'd create an infinite loop: Tab A broadcasts to Tab B, Tab B applies the change and broadcasts back, Tab A applies it again. The `scope: 'document'` filter excludes session-specific state like camera position and selection. Those stay local to each tab.

## Receiving and applying changes

Other tabs receive these messages and apply them directly to their stores:

```typescript
this.channel.onmessage = ({ data }) => {
	const msg = data as Message

	// Schema version check (covered later)

	if (msg.type === 'diff') {
		this.store.mergeRemoteChanges(() => {
			this.store.applyDiff(msg.changes)
		})
	}
}
```

The `mergeRemoteChanges` wrapper marks these changes as remote-originated. This prevents the store from triggering the `source: 'user'` listener again. The change gets applied, the UI updates reactively, but nothing broadcasts back out.

`applyDiff` converts the diff structure into store operations:

```typescript
applyDiff(diff: RecordsDiff<R>) {
  this.atomic(() => {
    const toPut = objectMapValues(diff.added)

    for (const [_from, to] of objectMapValues(diff.updated)) {
      toPut.push(to)
    }

    const toRemove = objectMapKeys(diff.removed)

    for (const id of toRemove) {
      this.remove([id])
    }

    this.put(toPut)
  })
}
```

The diff structure separates additions, updates, and removals. Updates include both the old and new state as a tuple `[from, to]` for undo/redo support. We don't need the old state here, just the new one to merge in.

## Coordinating persistence

Broadcasting changes solves the synchronization problem but creates a new one: if every tab persists independently, we're back to concurrent writes. The solution is straightforward — the tab that makes the change persists it. Other tabs only apply changes in memory.

The store listener calls `schedulePersist()` immediately after broadcasting:

```typescript
store.listen(
	({ changes }) => {
		this.channel.postMessage(/* ... */)
		this.schedulePersist()
	},
	{ source: 'user', scope: 'document' }
)
```

But receiving tabs don't call it. They apply the change through `mergeRemoteChanges`, which doesn't trigger the persistence path. Only the originating tab writes to IndexedDB.

This eliminates concurrent writes entirely. At any given moment, exactly one tab persists any particular change. Changes appear instantly across tabs through `BroadcastChannel`, but only the source tab touches the database.

## Schema version mismatches

Tabs can run different code versions. A user might have one tab open for hours while we deploy a new version. They open a new tab, which loads the updated code. Both tabs are now active, but they speak different schema versions.

We handle this by including the schema in every message:

```typescript
this.channel.postMessage({
	type: 'diff',
	storeId: this.store.id,
	changes,
	schema: this.serializedSchema,
})
```

When receiving a message, we check if we can understand the sender's schema:

```typescript
const res = this.store.schema.getMigrationsSince(msg.schema)

if (!res.ok) {
	// Sender has newer schema — we're outdated
	window?.location?.reload?.()
	return
} else if (res.value.length > 0) {
	// Sender has older schema — tell them to reload
	this.channel.postMessage({
		type: 'announce',
		schema: this.serializedSchema,
	})
	// Do a full DB write to ensure our version wins
	this.shouldDoFullDBWrite = true
	this.persistIfNeeded()
	return
}
```

If the sender has a newer schema and we can't migrate forward, we reload. The new code loads and we rejoin with the current schema. If we have the newer schema, we send an announcement. The old tab receives it, checks its version, and reloads.

There's one edge case: a tab might be outdated at creation time. During development, you might check out an older commit while tabs from the newer version remain open. To prevent immediate reload loops, we allow a grace period:

```typescript
const timeSinceInit = Date.now() - this.initTime
if (timeSinceInit < 5000) {
	onLoadError(new Error('Schema mismatch, please close other tabs and reload'))
	return
}
```

If we detect a mismatch within the first five seconds, we show an error instead of reloading. This prevents infinite loops where a tab reloads, detects it's still outdated, and reloads again.

## Session state stays local

Camera position, selected shapes, and UI state are session-specific. If you're zoomed in on one part of the canvas in Tab A, opening Tab B shouldn't snap your view elsewhere. These changes persist locally but don't broadcast.

We set up a second listener for session-scoped changes:

```typescript
store.listen(
	() => {
		this.diffQueue.push(UPDATE_INSTANCE_STATE)
		this.schedulePersist()
	},
	{ scope: 'session' }
)
```

Note the absence of `channel.postMessage`. Session changes schedule persistence but don't broadcast. They write to a separate table in IndexedDB:

```typescript
await sessionStateStore.put(
	{
		snapshot: sessionStateSnapshot,
		updatedAt: Date.now(),
		id: sessionId,
	},
	sessionId
)
```

Each tab has a unique session ID. When a tab loads, it looks for its session state by ID. If not found (new tab or cleared storage), it falls back to the most recently updated session:

```typescript
let sessionStateSnapshot = sessionId
	? ((await sessionStateStore.get(sessionId)) as SessionStateSnapshotRow)?.snapshot
	: null

if (!sessionStateSnapshot) {
	const all = (await sessionStateStore.getAll()) as SessionStateSnapshotRow[]
	sessionStateSnapshot = all.sort((a, b) => a.updatedAt - b.updatedAt).pop()?.snapshot
}
```

This gives new tabs a sensible starting point while preserving each tab's independent session state.

## Throttling persistence

Writing to IndexedDB on every change would be expensive. We throttle writes to 350ms:

```typescript
const PERSIST_THROTTLE_MS = 350

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

Changes accumulate in a queue during the throttle window:

```typescript
store.listen(
	({ changes }) => {
		this.diffQueue.push(changes)
		this.channel.postMessage(/* ... */)
		this.schedulePersist()
	},
	{ source: 'user', scope: 'document' }
)
```

When the timeout fires, we squash the queued diffs and write them as a batch. The squashing algorithm combines redundant operations:

- Added then removed: cancel both
- Added then updated: single add with final state
- Updated then updated: chain updates, preserve original state for undo
- Removed then added: convert to update

This optimization reduces IndexedDB transactions and preserves a cleaner change history for undo/redo.

## Where this lives

The cross-tab sync implementation spans several files:

**`packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts`** — Main sync client. Sets up `BroadcastChannel`, listens to store changes, handles message passing, coordinates persistence.

**`packages/editor/src/lib/utils/sync/LocalIndexedDb.ts`** — IndexedDB wrapper. Manages the database structure, provides `storeChanges` and `storeSnapshot` methods, handles transactions.

**`packages/store/src/lib/Store.ts`** — Store's `mergeRemoteChanges` and `applyDiff` methods. Marks changes as remote-originated to prevent broadcast loops.

**`packages/store/src/lib/RecordsDiff.ts`** — Diff structure definitions and the `squashRecordDiffs` algorithm for combining changes.

**`packages/editor/src/lib/config/TLSessionStateSnapshot.ts`** — Session state structure, tab ID generation, and computed signal for tracking camera/selection state.

The system works because we inverted the typical approach. Instead of coordinating writes to shared storage, we eliminated the coordination problem by ensuring all tabs see changes as they happen. Each tab holds the same live state. Persistence becomes a background concern for the originating tab only.
