---
title: Cross-tab synchronization
created_at: 12/20/2025
updated_at: 12/20/2025
keywords:
  - sync
  - tabs
  - BroadcastChannel
  - IndexedDB
  - offline
---

# Cross-tab synchronization

When the same document is open in multiple browser tabs, those tabs need to stay synchronized—even when the user is offline. Without this, you get data loss. Two tabs write to the same IndexedDB database, and whichever one persists last wins. The other tab's changes disappear silently.

This is surprisingly common. Users open a second tab without thinking about it, or hit refresh while another tab is still open in the background. Local persistence creates the illusion of save points, but IndexedDB doesn't handle concurrent writers gracefully.

## The data loss scenario

Consider what happens without cross-tab sync:

1. User opens document in Tab A, draws a shape
2. User opens same document in Tab B (or refreshes into a new tab)
3. Tab A persists its state to IndexedDB
4. User makes changes in Tab B
5. Tab B persists its state to IndexedDB
6. Tab A's shape is gone—overwritten by Tab B's state

Both tabs think they have the authoritative version. The user loses work.

## BroadcastChannel to the rescue

The browser's `BroadcastChannel` API lets tabs communicate. When you create a `BroadcastChannel` with a name, all tabs sharing that name can send and receive messages:

```typescript
const channel = new BroadcastChannel('tldraw-tab-sync-my-document')

channel.onmessage = (event) => {
	console.log('Received from another tab:', event.data)
}

channel.postMessage({ type: 'hello' })
```

This works even when the browser is offline—no network involved. The browser handles message routing between tabs in the same origin.

## How tldraw uses it

Each document gets its own channel based on its persistence key. When a tab makes changes, it immediately broadcasts a diff to other tabs:

```typescript
store.listen(
	({ changes }) => {
		channel.postMessage({
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

When a tab receives a diff, it applies it to its local store as a "remote" change:

```typescript
channel.onmessage = ({ data }) => {
	if (data.type === 'diff') {
		this.store.mergeRemoteChanges(() => {
			this.store.applyDiff(data.changes)
		})
	}
}
```

The `mergeRemoteChanges` wrapper tells the store this change came from outside. The tab doesn't re-broadcast it, avoiding infinite loops.

## Schema version management

Tabs might be running different versions of the application. User opens Tab A on Monday, leaves it open, then opens Tab B on Tuesday after a deployment. The tabs now have different schemas.

Every message includes the sender's schema version. When a tab receives a message, it checks compatibility:

```typescript
const res = this.store.schema.getMigrationsSince(msg.schema)

if (!res.ok) {
	// Sender has newer schema - we're outdated
	window.location.reload()
	return
}

if (res.value.length > 0) {
	// Sender has older schema - tell them to reload
	this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
}
```

The newer tab stays, the older tab reloads. This prevents old tabs from writing data that newer tabs can't understand.

New tabs announce themselves when connecting, triggering this version check before any data exchange. There's also a safety check to prevent reload loops—if a tab was just created and finds itself outdated, it shows an error instead of reloading infinitely.

## Two persistence layers

Cross-tab sync and IndexedDB persistence serve different purposes:

**BroadcastChannel** handles immediate synchronization between active tabs. Changes propagate instantly—users see updates in real time if they have multiple tabs visible.

**IndexedDB** handles persistence across sessions. When you close all tabs and reopen the document tomorrow, it loads from IndexedDB.

The two work together: changes broadcast immediately to other tabs, then persist to IndexedDB on a throttled schedule (350ms debounce). If a persist fails, it retries after 10 seconds.

## Edge cases

**Corrupted tabs**: If a tab's store becomes corrupted (invalid state that can't be safely persisted), it stops writing to IndexedDB. This prevents one broken tab from overwriting good data from other tabs.

**Newer tab writes during schema mismatch**: When an older tab detects a newer schema, it's told to reload and stop writing. But network timing means it might have written something in the gap. The newer tab schedules a full database write to overwrite any stale data.

**No BroadcastChannel**: Some environments (older browsers, some iframes) don't support `BroadcastChannel`. tldraw falls back to a mock implementation that does nothing. Cross-tab sync simply doesn't happen—each tab operates independently. This is acceptable for environments where multi-tab scenarios are unlikely.

## localStorage atoms for user preferences

User preferences (like dark mode) sync differently. They use localStorage with the `storage` event instead of BroadcastChannel:

```typescript
const handleStorageEvent = (event: StorageEvent) => {
	if (event.key !== name) return
	if (event.newValue === null) {
		outAtom.set(initialValue)
		return
	}
	const newValue = JSON.parse(event.newValue)
	outAtom.set(newValue)
}

window.addEventListener('storage', handleStorageEvent)
```

The `storage` event fires when localStorage changes in a different tab. Same-tab changes don't trigger it, so there's no loop. This is simpler than BroadcastChannel but only works for small, JSON-serializable values.

## Key files

- `packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts` — Main cross-tab sync implementation
- `packages/editor/src/lib/utils/sync/LocalIndexedDb.ts` — IndexedDB persistence layer
- `packages/state/src/lib/localStorageAtom.ts` — localStorage atoms with cross-tab sync for preferences
- `packages/editor/src/lib/config/TLSessionStateSnapshot.ts` — Session state handling

## Related

- [Signals](./signals.md) — How the reactive store system works
- [Sync](./sync.md) — Real-time collaboration over the network
