---
title: Handling schema mismatches and edge cases
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - sync
  - tabs
  - BroadcastChannel
  - IndexedDB
---

# Cross-tab synchronization

What happens when tabs disagree? You've got two browser tabs open with the same document. One's running version 3.2 of your app with an old schema. The other just loaded version 3.3 with breaking changes. Both are writing to IndexedDB. Both think they're authoritative. You refresh the page and half your data is gone.

We shipped cross-tab synchronization in 2023. Within a week we had bug reports. Tab A would draw a rectangle, Tab B would delete a circle, and somehow both changes would vanish. Users would work in one tab, switch to another, and see stale data. The BroadcastChannel API worked fine for the happy path. The edge cases nearly killed us.

The hard part isn't broadcasting changes. It's handling schema mismatches, corruption guards, reload timing, and the subtle race conditions that emerge when tabs run different code versions simultaneously. This is the story of making it work.

## The failure modes

Start with the obvious problem. User opens a document in Tab A, draws some shapes, and those writes go to IndexedDB. They duplicate the tab (or open the same document URL in Tab B), make different changes, and those also go to IndexedDB. Last write wins. No coordination, no merge conflict, just silent data loss.

The first fix is simple: use BroadcastChannel to broadcast changes between tabs. When Tab A makes a change, it sends a diff to all other tabs. They apply the diff and everyone stays in sync. Works great until you hit the edge cases.

**Edge case one: schema version mismatch.** Tab A is running yesterday's build with schema version 12. Tab B just loaded today's deploy with schema version 13 and a breaking change to the arrow shape format. Tab B broadcasts a diff containing the new arrow format. Tab A receives it and tries to deserialize a shape structure it doesn't understand. Validation fails. Should it reject the change? Write invalid data to IndexedDB? Reload?

**Edge case two: the reload race.** You detect a schema mismatch and decide the outdated tab should reload. Tab A posts a "please reload" message. Tab B receives it and calls `window.location.reload()`. But reloading takes time. In the 200ms between receiving the reload signal and actually reloading, Tab B has already written three more changes to IndexedDB with its outdated schema. Those writes persist. The new tab loads, sees corrupted data, and crashes.

**Edge case three: corruption propagation.** Something goes wrong in Tab A. Maybe a bug in a custom shape, maybe a failed migration, maybe cosmic rays. The store's integrity checker marks it as `isPossiblyCorrupted()`. If Tab A keeps broadcasting changes to other tabs, the corruption spreads. If it keeps writing to IndexedDB, the corruption persists across sessions.

**Edge case four: the fresh tab paradox.** You open Tab A, which loads the app with schema version 13. But the document in IndexedDB was last saved by schema version 12. The tab migrates the data forward and everything works. Two seconds later, Tab B finishes loading and sends an "announce" message with schema version 13. Tab A compares versions, sees they match, and everything is fine. But what if Tab B finished loading with schema version 12 because the browser cached an old bundle? Now Tab A (which has already migrated to v13) receives an announce with v12 and thinks _it's_ outdated. It reloads. Tab B sees the reload, reloads itself. Infinite reload loop.

These aren't theoretical. We hit every single one in production.

## Schema version checking

Every message includes the sender's serialized schema. When you receive a message, you check whether you can migrate from their version to yours:

```typescript
this.channel.onmessage = ({ data }) => {
	const msg = data as Message
	const res = this.store.schema.getMigrationsSince(msg.schema)

	if (!res.ok) {
		// Sender has newer schema - we're outdated
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

	// Same version - apply diff
	if (msg.type === 'diff') {
		transact(() => {
			this.store.mergeRemoteChanges(() => {
				this.store.applyDiff(msg.changes)
			})
		})
	}
}
```

`getMigrationsSince()` returns the list of migrations needed to upgrade from the sender's schema to yours. If it returns an error, the sender is ahead of you and you're running stale code. Reload immediately. If it returns a non-empty array, the sender is behind you. Send them an "announce" message telling them to upgrade.

The tricky part is the reload race. When you detect you're outdated and call `window.location.reload()`, you need to stop writing to IndexedDB immediately. Otherwise you'll persist stale data in the moment between receiving the reload signal and actually reloading:

```typescript
private persistIfNeeded() {
	if (this.scheduledPersistTimeout) {
		clearTimeout(this.scheduledPersistTimeout)
		this.scheduledPersistTimeout = null
	}

	if (this.isPersisting) return
	if (this.isReloading) return
	if (this.store.isPossiblyCorrupted()) return

	if (this.shouldDoFullDBWrite || this.diffQueue.length > 0) {
		this.doPersist()
	}
}
```

Once `this.isReloading` is set, no more writes. But there's still a problem. What if the outdated tab has pending changes in its diff queue that haven't been broadcast yet? It'll reload, lose those changes, and the user's work disappears.

We handle this by scheduling a full database write on the newer tab. When you detect an older tab and send it the "announce" message, you also set `shouldDoFullDBWrite = true`. This ensures that even if the older tab manages to write stale data before reloading, your next persist will overwrite it with the correct schema version:

```typescript
} else if (res.value.length > 0) {
	// Sender has older schema - tell them to reload
	this.channel.postMessage({ type: 'announce', schema: this.serializedSchema })
	// Schedule full DB write in case they wrote stale data
	this.shouldDoFullDBWrite = true
	this.persistIfNeeded()
	return
}
```

The full database write is expensive (it serializes the entire store and calls `clear()` on the IndexedDB records table), but it's the only way to guarantee correctness when tabs are racing to write.

## The fresh tab paradox

Now for the reload loop bug. If a tab just finished loading and it's already outdated, that's suspicious. Either you have a deployment in progress and the user is extremely unlucky, or something is wrong with your caching headers and the browser served an old bundle.

We add a grace period:

```typescript
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
}
```

If your tab is less than 5 seconds old and someone tells you you're outdated, don't reload. Instead, throw an error and tell the user to close all tabs and try again. This prevents the reload loop (outdated bundle cached) and gives the user a clear action to take.

The 5 second number is arbitrary. It needs to be long enough that tabs don't reload during the initial BroadcastChannel handshake, but short enough that users with legitimately stale tabs still get reloaded promptly. Five seconds felt right.

## Corruption guards

When the store's integrity checker detects invalid data, it calls `store.markAsPossiblyCorrupted()`. This sets a flag that prevents all writes:

```typescript
if (this.isReloading) return
if (this.store.isPossiblyCorrupted()) return
```

No persistence. No broadcasts. The tab keeps running (so the user doesn't lose their work), but it won't poison other tabs or the database.

But there's still a problem. What if the corruption happened several changes ago, and you've already broadcast those changes to other tabs? They've applied the diff and now they're corrupted too.

We don't have a perfect answer for this. Corruption is rare (almost always a bug in custom shapes or a failed migration), and when it happens, the blast radius is already large by the time we detect it. The best we can do is stop the bleeding immediately and prevent further propagation.

In practice, the corruption flag is mainly useful for preventing bad data from persisting across sessions. If you hit corruption in Tab A due to a one-time bug, close the tab, and the corruption doesn't make it to IndexedDB, you're fine. If it does make it to IndexedDB, every new tab will load the corrupted data and also mark itself as corrupted until you fix the underlying bug and migrate the schema.

## Diff squashing

IndexedDB writes are slow. If you persist on every change, you'll hammer the disk and tank performance. So we batch changes into a diff queue and persist every 350ms:

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

The diff queue accumulates all changes since the last persist. When it's time to write, we squash the diffs:

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

Squashing combines multiple diffs intelligently. If you add a shape, move it three times, and delete it, the squashed diff is empty. If you add a shape and then update it twice, the squashed diff is a single add with the final state. This reduces IndexedDB churn and speeds up migrations (fewer intermediate states to migrate).

The squashing algorithm handles every combination:

- Add then update → single add with final state
- Add then remove → cancel both (net zero change)
- Update then update → chain updates, preserve original 'from' state for undo
- Remove then add → convert to update (shape was there, now it's different)

The tricky case is remove-then-add. If you delete shape X and then create a new shape that happens to reuse ID X (possible with certain ID generation schemes), that's not a remove and an add. It's an update from the old shape to the new shape:

```typescript
if (target.removed[id]) {
	const original = target.removed[id]
	delete target.removed[id]
	if (original !== value) {
		target.updated[id] = [original, value]
	}
}
```

This preserves undo/redo correctness. If the user undoes, we need to restore the original shape, not delete the new one.

## Write error recovery

If IndexedDB writes fail (disk full, private browsing mode, database corruption), there's no good recovery path. You can't work offline if you can't persist. So we alert the user and reload:

```typescript
} catch (e) {
	this.shouldDoFullDBWrite = true
	this.didLastWriteError = true
	console.error('failed to store changes in indexed db', e)

	showCantWriteToIndexDbAlert()
	if (typeof window !== 'undefined') {
		window.location.reload()
	}
}
```

The alert tells users to check for private browsing mode or free up disk space. The reload gives them a fresh start. And `shouldDoFullDBWrite = true` ensures that when the reload succeeds, we don't try to apply incremental diffs on top of whatever partial state made it to disk. We just write the whole store.

We also throttle retry attempts. If a write fails, we wait 10 seconds before trying again instead of the normal 350ms:

```typescript
const PERSIST_RETRY_THROTTLE_MS = 10_000

this.scheduledPersistTimeout = setTimeout(
	() => {
		this.scheduledPersistTimeout = null
		this.persistIfNeeded()
	},
	this.didLastWriteError ? PERSIST_RETRY_THROTTLE_MS : PERSIST_THROTTLE_MS
)
```

This prevents spamming the disk if writes are failing due to temporary quota issues. If the problem resolves (user frees up space), the next write succeeds and we go back to the normal 350ms throttle. If it doesn't resolve, the user will see the error alert and reload anyway.

## The reload cascade

Here's a scenario we didn't anticipate: user has four tabs open. Tab A is running schema v13. Tabs B, C, and D are running v12. Tab A broadcasts a change. Tab B receives it, detects the mismatch, and reloads. Tab C and D do the same. Now you have three tabs reloading simultaneously, all hitting the network to fetch the new bundle, all racing to load the document from IndexedDB, all trying to broadcast their initial "announce" message.

In practice, this works fine. BroadcastChannel is fast enough that the messages don't pile up. The reloaded tabs finish loading in a staggered fashion (network jitter), so they don't all announce simultaneously. And because they're all running the same schema version after reloading, they all agree and no one reloads again.

But we did add one defensive check. When you receive a schema mismatch and decide to reload, you set `this.isReloading = true` and then call `window.location.reload()`. But `reload()` is asynchronous. The tab continues running for a few frames before the navigation happens. During that time, you might receive _another_ message from a different outdated tab. Without the `isReloading` guard, you'd process that message, detect a mismatch, and reload again. This does nothing (you're already reloading), but it does log duplicate errors and confuse the user.

So we gate all message processing on `isReloading`:

```typescript
if (this.isReloading) return
if (this.store.isPossiblyCorrupted()) return
```

Once you've decided to reload, you're done. Ignore all further messages and wait for the navigation.

## Where this lives

The main logic is in `packages/editor/src/lib/utils/sync/TLLocalSyncClient.ts`. Schema version checking happens in the `channel.onmessage` handler. Corruption guards are in `persistIfNeeded()`. Diff squashing is in `packages/store/src/lib/RecordsDiff.ts`.

The full database write path is in `LocalIndexedDb.ts` in `storeSnapshot()`, which calls `recordsStore.clear()` before writing. Incremental writes use `storeChanges()`, which applies put/remove operations directly.

Session state (camera, selection) persists separately in the SessionState table and doesn't sync across tabs. Each tab maintains its own view state. Only document-scoped records (shapes, pages, assets) broadcast and sync.

The 5-second grace period for fresh tabs is hardcoded in `TLLocalSyncClient.ts:216`. The 350ms persist throttle is at the top of the same file. Both are constants you can tune if you find better values.

Cross-tab sync is one of those features that seems simple until you ship it. The happy path takes an afternoon. The edge cases take weeks. Schema mismatches, reload races, corruption guards, write failures, and the subtle timing issues that only show up when users have five tabs open during a deployment. You can't predict all of them. You just have to handle them as they come.
