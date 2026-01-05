---
title: Real-time sync
created_at: 12/20/2025
updated_at: 12/20/2025
keywords:
  - sync
  - multiplayer
  - collaboration
  - rebase
  - CRDT
  - WebSocket
status: published
date: 12/20/2025
order: 4
---

# Real-time sync

When multiple people edit the same canvas simultaneously, their changes need to merge without data loss. This is one of the hardest problems in collaborative software. Most solutions reach for CRDTs—data structures designed to merge concurrent changes automatically. We took a different approach.

## Why not CRDTs

CRDTs (Conflict-free Replicated Data Types) are mathematically elegant. Any two replicas can merge their states without coordination, and the result is always consistent. For text editing, this is powerful. For a canvas with structured shapes, bindings between shapes, and complex invariants, it becomes a straitjacket.

Consider what happens when two users move the same shape simultaneously. With CRDTs, you need a merge function that produces a valid result from any two inputs. Last-writer-wins is simple but loses data. Vector clocks preserve both changes but now you have a shape at two positions. Custom merge logic for every shape property gets complicated fast.

Worse, CRDTs require encoding your entire data model in CRDT-compatible structures. Every shape property becomes a register or counter. Relationships between shapes become sets with element IDs. The data model serves the CRDT machinery instead of serving the application.

We wanted a system where:

- The server has authority over the final state
- Clients feel responsive with optimistic updates
- Conflicts resolve predictably without custom merge logic
- The data model stays clean

## Git for canvases

Instead of CRDTs, we use a rebase model—similar to how git handles concurrent commits. When you make a change locally, it applies immediately to your canvas. Meanwhile, the server is receiving changes from other users and building its authoritative history.

When your changes reach the server, one of three things happens:

**Commit**: Your change applies cleanly. The server accepts it as-is and broadcasts it to other clients.

**Discard**: Your change is rejected. Maybe you were in read-only mode, or the record no longer exists. The server tells you to drop the change.

**Rebase**: Your change conflicts with something that happened on the server. Instead of failing, the server applies a corrected version of your change and tells you what it actually did. You update your local state to match.

The rebase case is where it gets interesting. Say you moved shape A to position (100, 100), but another user deleted shape A before your change arrived. The server can't apply your move—the shape doesn't exist. It responds with a rebase instruction: "I couldn't do what you asked, here's what actually happened (nothing)."

Your client receives this, undoes its optimistic change, and applies the server's version. From the user's perspective, the shape they were dragging disappeared—because someone else deleted it. This matches reality better than any CRDT merge could.

## Clock-based versioning

The system tracks causality with logical clocks—simple incrementing counters that establish ordering without wall-clock time.

**Server clock**: Increments with each change the server processes. When you connect with `lastServerClock: 150`, the server knows to send you everything after clock 150.

**Client clock**: Increments with each push request you send. When the server responds to push request 7, you know which local changes it's acknowledging.

**Record clocks**: Each record stores when it was last modified. This enables efficient partial sync—reconnecting clients only receive records that changed since they disconnected.

```typescript
interface RoomSnapshot {
	clock: number
	documents: Array<{
		state: TLRecord
		lastChangedClock: number
	}>
	tombstones: Record<string, number>
}
```

Tombstones track deleted records by the clock value when they were deleted. This prevents a subtle bug: without tombstones, a reconnecting client that still has a deleted record would re-add it. The tombstone says "this record was explicitly deleted at clock 150—don't resurrect it."

## The rebase dance

When a client receives patches from the server while it has pending local changes, it needs to reconcile. This is the rebase operation:

```typescript
// Simplified from TLSyncClient.ts
private rebase() {
  // 1. Undo all speculative changes
  this.store.applyDiff(this.speculativeChanges.invert())

  // 2. Apply server patches
  for (const patch of this.incomingPatches) {
    this.store.applyDiff(patch)
  }

  // 3. Replay pending local changes
  for (const pending of this.pendingPushRequests) {
    this.store.applyDiff(pending.diff)
  }

  // 4. Capture new speculative state
  this.speculativeChanges = this.captureCurrentDiff()
}
```

The key insight: we undo optimistic changes, apply the server's authoritative state, then replay our pending changes on top. If any pending change conflicts with what the server did, the replay produces the correct merged result.

This is exactly how `git rebase` works. Your local commits replay on top of upstream changes. Conflicts surface naturally at replay time.

## Compact wire format

Network bandwidth matters for real-time collaboration. Sending entire records on every keystroke would overwhelm the connection. Instead, we send diffs:

```typescript
type NetworkDiff = Record<string, RecordOp>

type RecordOp =
	| ['put', TLRecord] // Full record (new or replaced)
	| ['patch', ObjectDiff] // Partial update
	| ['remove'] // Deletion

type ObjectDiff = Record<string, ValueOp>

type ValueOp =
	| ['put', unknown] // Set property
	| ['patch', ObjectDiff] // Nested object update
	| ['append', unknown[], number] // Array append with offset
	| ['delete'] // Remove property
```

For a shape move, we send `{ 'shape:abc': ['patch', { x: ['put', 100], y: ['put', 100] }] }` instead of the entire shape record. The `append` operation handles a special case: string properties that grow (like text content) can append to their previous value instead of replacing it entirely.

## Presence: ephemeral state

Cursor positions and selections aren't document data—they're ephemeral presence information. If you refresh the page, your cursor position shouldn't persist. If you disconnect, other users should stop seeing your cursor immediately.

The sync system handles presence separately from documents:

```typescript
// Presence scoped differently from document data
store.listen(
	(changes) => sendToServer(changes),
	{ scope: 'presence' } // Only presence records
)

store.listen(
	(changes) => sendToServer(changes),
	{ scope: 'document' } // Only document records
)
```

Presence uses the same diff format and rebase machinery, but with different lifecycle. When a session ends, its presence records are automatically removed. No tombstones needed—presence is expected to disappear.

Two presence modes control what gets shared:

- **solo**: No presence sharing. Single-user documents, or when you want privacy.
- **full**: Full presence including cursors and selections. Standard multiplayer experience.

## Connection lifecycle

A connection goes through distinct phases:

1. **Connect**: Client sends protocol version, schema, and `lastServerClock`
2. **Hydrate**: Server sends full state (or partial if clock-based catch-up is possible)
3. **Sync**: Bidirectional patches flow as users make changes
4. **Reconnect**: On disconnect, client queues changes locally and replays on reconnection

The protocol version and schema exchange prevents incompatible clients from corrupting data. If you're running an old client against a new server (or vice versa), the connection fails cleanly with an error code instead of silently mangling records.

```typescript
// Server checks client compatibility
if (message.protocolVersion < MIN_SUPPORTED_VERSION) {
	socket.close(TLCloseEventCode.CLIENT_TOO_OLD)
	return
}

if (message.protocolVersion > CURRENT_VERSION) {
	socket.close(TLCloseEventCode.SERVER_TOO_OLD)
	return
}
```

## Optimistic UI, authoritative server

The rebase model gives us the best of both worlds. Clients apply changes instantly—no waiting for server round-trips. The UI feels local. But the server remains authoritative—it can reject changes, modify them, or impose constraints the client doesn't know about.

This is powerful for features like:

- **Read-only mode**: Server discards write attempts without the client needing special logic
- **Permissions**: Server enforces who can edit what
- **Validation**: Server rejects malformed records
- **Rate limiting**: Server can throttle aggressive clients

The client doesn't need to implement these checks. It optimistically assumes success, and the server corrects it when necessary.

## Related

- [Cross-tab synchronization](./cross-tab-sync.md) — Local sync between browser tabs
- [Signals](./signals.md) — The reactive system that sync builds on
- [Jittered fractional indices](./jittered-indices.md) — How z-ordering handles concurrent inserts
