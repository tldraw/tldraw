---
title: Clock-based versioning in sync
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - sync
  - clocks
  - versioning
  - hydration
  - reconnection
status: published
date: 12/21/2025
order: 1
---

# Clock-based versioning in sync

When you disconnect from a tldraw sync server and reconnect, the client doesn't download the entire document again. It tells the server "I've seen everything up to version N, what happened since then?" and receives only the changes. This partial sync on reconnection is powered by three different clock systems working together: the server's logical clock, per-record clocks, and each client's counter.

## The server clock

Every time the server processes a change—any change—it increments a single counter. This is the server clock. It's not a timestamp. It's a strictly increasing logical version number for the entire document.

```typescript
// TLSyncRoom.ts
private lastDocumentClock = 0

// When changes are applied
this.lastDocumentClock++
```

The server clock gives every change a sequential version number. Change 47 happened after change 46 and before change 48. No ambiguity.

When a client disconnects, it remembers the last server clock value it saw. When it reconnects, it sends that value in the connect message:

```typescript
// TLSyncClient.ts
private lastServerClock = -1

private sendConnectMessage() {
  this.socket.sendMessage({
    type: 'connect',
    lastServerClock: this.lastServerClock,
    // ... other fields
  })
}
```

A value of `-1` means "I've never connected before, send me everything." Any other value means "I've seen up to version N, send me N+1 onwards."

## Per-record clocks

The server doesn't just track its own clock. Every record stored on the server has a `lastChangedClock` field indicating which server clock value it was last modified at:

```typescript
// TLSyncRoom.ts
documents: Array<{
	state: TLRecord
	lastChangedClock: number
}>
```

When a client reconnects and says "I've seen up to version 100," the server walks through its records and sends only those where `lastChangedClock > 100`. Records that haven't changed since version 100 are skipped.

This is what makes partial sync efficient. Instead of sending 10,000 shapes every reconnection, the server sends only the 3 shapes that changed while you were offline.

## Tombstones and history limits

There's a wrinkle: what about deleted records?

If you disconnect at version 100, a shape gets deleted at version 105, and you reconnect at version 110, the server needs to tell you "shape X was deleted." But the record itself is gone. We can't attach a `lastChangedClock` to a record that doesn't exist.

The solution is tombstones. When a record is deleted, the server stores its ID and the clock value of the deletion:

```typescript
// InMemorySyncStorage.ts
tombstones: Map<string, number> // ID -> deletion clock
```

When you reconnect, the server checks tombstones the same way it checks records. Any tombstone with a deletion clock greater than your `lastServerClock` gets sent as a delete operation.

Tombstones accumulate. We keep up to 5,000 of them, pruning the oldest when the limit is exceeded:

```typescript
export const MAX_TOMBSTONES = 5000
export const TOMBSTONE_PRUNE_BUFFER_SIZE = 1000
```

When pruning happens, the server updates `tombstoneHistoryStartsAtClock` to the oldest remaining tombstone's clock value. This is the earliest version the server can reconstruct.

If you reconnect with a `lastServerClock` older than `tombstoneHistoryStartsAtClock`, the server can't give you a partial diff. It responds with `hydrationType: 'wipe_all'` and the client discards its state and reloads everything.

## The client clock

While the server uses its clock to version the document, each client has its own counter for push requests:

```typescript
// TLSyncClient.ts
private clientClock = 0

const pushRequest = {
  type: 'push',
  diff: networkDiff,
  clientClock: this.clientClock++,
}
```

The client clock increments with every push. The server echoes it back in push results:

```typescript
{
  type: 'push_result',
  clientClock: 42,
  serverClock: 305,
  action: 'commit'
}
```

This lets the client match responses to requests. If push #42 comes back as a commit, the client knows which pending request succeeded.

The client clock doesn't participate in versioning the document. It's purely for request/response pairing. The comments note it could enable idempotent retries in the future—the server could track each client's clock and refuse to apply the same request twice—but we don't implement that yet.

## Why lastServerClock matters for hydration

When you first connect, the server sends a snapshot of the entire document. This snapshot includes a `clock` field:

```typescript
// TLSyncRoom.ts
export interface RoomSnapshot {
	clock?: number
	documents: Array<{
		state: TLRecord
		lastChangedClock: number
	}>
	tombstones?: Record<string, number>
	tombstoneHistoryStartsAtClock?: number
}
```

The client stores this `clock` value as its `lastServerClock`. From that moment on, the client knows: "I have a local copy of the document as of version N."

When the connection drops and you work offline, your local changes accumulate as speculative edits. When you reconnect:

1. The client sends `lastServerClock: N`
2. The server computes `getChangesSince(N)`
3. The server sends only records and tombstones where `lastChangedClock > N`
4. The client rebases its speculative changes on top of the new data

Without `lastServerClock`, reconnection would be expensive. With it, reconnection is just another rebase—the same operation the client performs continuously while online.

## The invariant

The server maintains a single invariant: if the client has seen up to clock N, and the server's tombstone history goes back to clock M, and N >= M, then the server can reconstruct the exact diff from N to the current clock.

This invariant is why we limit tombstones to 5,000 and prune aggressively. Old history gets discarded. If you disconnect for days and the document churns through 10,000 deletions, your `lastServerClock` falls outside the history window and you get `wipe_all`.

For most users, this never happens. Tombstones accumulate slowly in typical documents, and 5,000 deletions is a lot of churn. The tradeoff favors performance: keeping tombstones forever would bloat storage and slow down `getChangesSince` queries.

## The benefit of logical clocks

Why not use timestamps?

Timestamps have ordering problems. If two changes arrive within the same millisecond, which came first? If the server clock skips backward (NTP adjustment, VM migration), does version 305 come before or after version 304?

Logical clocks are strictly sequential. There's no ambiguity. The Nth change is version N, full stop.

They also compress well. A `lastServerClock` of 50,000 means "50,000 changes have occurred." A timestamp of 1734825600000 means "it's currently December 21, 2025 at some particular time," which is less useful for diffing and takes more bytes to encode.

## Where this lives

- Server clock management: `/packages/sync-core/src/lib/TLSyncRoom.ts`
- Client clock tracking: `/packages/sync-core/src/lib/TLSyncClient.ts`
- Per-record clocks: `/packages/sync-core/src/lib/InMemorySyncStorage.ts`
- Tombstone pruning: `/packages/sync-core/src/lib/InMemorySyncStorage.ts` (function `computeTombstonePruning`)
- Snapshot interface: `/packages/sync-core/src/lib/TLSyncRoom.ts` (interface `RoomSnapshot`)

The clock system is central to how sync works. Without it, we'd need CRDTs or vector clocks or some other mechanism to track causality. With it, we get cheap versioning and efficient partial sync using plain integers.
