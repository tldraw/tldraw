---
title: The rebase mechanism
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - sync
  - rebase
  - multiplayer
  - optimistic updates
status: published
date: 12/21/2025
order: 0
---

# The rebase mechanism

When you edit shapes in tldraw, your changes appear immediately. Behind the scenes, those changes travel to the server, get processed, and come back as confirmation. Meanwhile, you're still editing—making more changes, moving things around, typing into text boxes. When the server's response arrives, we need to integrate it without disrupting the optimistic updates you've already seen.

The naive approach would be to treat local changes as provisional and discard them when the server responds. That creates noticeable flicker—your edits disappear for a frame, then reappear. Instead, we use a git-like rebase: undo all speculative changes, apply the server's version, then replay remaining pending changes on top.

## Tracking speculative changes

Every change you make goes into the store immediately. At the same time, we track it in `speculativeChanges`, a diff that represents all unconfirmed local edits:

```typescript
private speculativeChanges: RecordsDiff<R> = {
  added: {} as any,
  updated: {} as any,
  removed: {} as any,
}
```

This diff accumulates as you work. If you reverse it and apply it to the store, you get the exact server state—what the store would look like if we undid all optimistic updates.

We also maintain a queue of pending push requests:

```typescript
private pendingPushRequests: { request: TLPushRequest<R>; sent: boolean }[] = []
```

Each request in this queue is a batch of changes we've sent to the server but haven't received confirmation for yet.

## When the server responds

The server processes push requests and responds in one of three ways:

**Commit**: Your changes were applied verbatim. The server sends back confirmation but no additional data.

**Discard**: Your changes were rejected entirely—maybe they violated validation rules, or you tried to edit in read-only mode.

**Rebase**: The server modified your changes. For example, if you edited a shape and someone else deleted it, the server might accept the delete but reject your edit. The server sends back what it actually did instead of what you requested.

When these responses arrive, we schedule a rebase operation. The rebase is throttled to roughly 60fps using `fpsThrottle`—if multiple responses arrive quickly, we batch them into a single rebase.

## The rebase operation

The rebase happens in four steps, all inside a single `store.mergeRemoteChanges()` transaction to prevent intermediate states from triggering UI updates:

**1. Undo speculative changes**

```typescript
this.store.applyDiff(reverseRecordsDiff(this.speculativeChanges), { runCallbacks: false })
```

We reverse the accumulated diff and apply it to the store. The `runCallbacks: false` option prevents listeners from firing—this is an internal bookkeeping operation, not a real state change users should react to.

After this step, the store contains only server-confirmed data. All your optimistic updates are temporarily gone.

**2. Apply server diffs**

We iterate through the responses in order:

```typescript
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
```

For commits, we apply the original changes from the pending request. For rebases, we apply the modified diff the server sent back. For discards, we just remove the request from the queue without applying anything.

Patch messages (changes from other users) are applied directly.

**3. Update speculative changes**

After applying server diffs, we recalculate `speculativeChanges` by replaying remaining pending requests:

```typescript
this.speculativeChanges = this.store.extractingChanges(() => {
	for (const { request } of this.pendingPushRequests) {
		if (!('diff' in request) || !request.diff) continue
		this.applyNetworkDiff(request.diff, true)
	}
})
```

The `store.extractingChanges()` utility captures whatever changes happen inside its callback. We replay all pending requests that haven't been confirmed yet, and the resulting diff becomes our new `speculativeChanges`.

**4. Commit the transaction**

When `mergeRemoteChanges()` exits, the store fires a single update event. From the UI's perspective, this looks like one atomic state change. No flicker, no intermediate states.

## Why this works

The key insight is that speculative changes are always relative to the last known server state. When we undo them, we're not discarding user work—we're temporarily rewinding to a known-good state, integrating new server information, then fast-forwarding back through unconfirmed edits.

This means:

- The user never sees their changes disappear, even momentarily
- Conflicts are resolved automatically—the server's version wins
- Multiple rapid edits don't cause UI thrashing
- The approach scales to many simultaneous pending requests

The tradeoff is memory: we need to keep a diff of all unconfirmed changes in memory. For typical editing sessions, this is small—a few hundred records at most. Even in heavy use, it's worth it for the smooth experience.

## Squashing during rebase

One subtlety: when we replay pending requests to recalculate `speculativeChanges`, we squash them using `squashRecordDiffs`. If you moved a shape twice, the resulting speculative diff contains only the final position, not both intermediate moves. This keeps the diff size bounded.

The squashing happens automatically when we create new push requests:

```typescript
this.speculativeChanges = squashRecordDiffs([this.speculativeChanges, change])
```

Each new change merges into the accumulated diff. The older intermediate states disappear—we only need to track the net effect of all unconfirmed edits.

## Where to find it

The rebase implementation lives in `/packages/sync-core/src/lib/TLSyncClient.ts`. Look for the `rebase()` method around line 878.

The diff reversal utility is in `/packages/sync-core/src/lib/diff.ts`. The `reverseRecordsDiff` function computes the inverse of a diff—swapping added/removed, reversing updates.

Related: the server-side conflict resolution logic lives in `/packages/sync-core/src/lib/TLSyncRoom.ts`, where push requests are validated and processed.
