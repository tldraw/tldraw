---
title: NetworkDiff wire format optimization
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - sync
  - wire format
  - protocol
  - optimization
  - bandwidth
status: published
date: 12/21/2025
order: 2
---

# NetworkDiff wire format optimization

When you type in a text shape, your browser sends the changes to the server. The naive approach would send the entire text content every time. If you're typing a paragraph, that's hundreds of bytes per keystroke. We don't do that.

Instead, we send only what changed. For text editing, that's often just a few characters. For arrays where you append items, just the new items. The protocol is designed to minimize bytes on the wire while keeping the implementation simple enough to handle in real time.

Here's how it works.

## Record operations

Every change to a record falls into one of three categories:

- **Put** - A new record, or replacing an existing one entirely
- **Patch** - Updating specific properties on an existing record
- **Remove** - Deleting a record

When the client modifies a shape and syncs it to the server, it sends a diff that describes which records changed and how. The server applies these operations, validates them, and broadcasts the results to other clients.

The interesting optimization happens inside patches. Rather than always sending full property values, we detect when we can send just the delta.

## String append optimization

When text content changes, we check if the new string starts with the old string. If it does, we only send the appended portion plus an offset.

```typescript
if (valueB.startsWith(valueA)) {
	const appendedText = valueB.slice(valueA.length)
	return ['append', appendedText, valueA.length]
}
```

If you're editing "Hello" into "Hello World", the wire format is:

```typescript
;['append', ' World', 5]
```

The offset ensures the append only succeeds if the client's base state matches. If the client has "Hello" at length 5, the append works. If another client's edit already changed it to "Hi there", the offset won't match and the operation falls back to a full replacement.

This optimization matters most for text shapes during active editing. A user typing a sentence sends ~10-20 bytes per keystroke instead of the full text content each time.

## Array append optimization

Arrays work similarly. When an array grows, we check if all the existing items are unchanged. If they are, we send only the new items.

```typescript
// Check if only items were appended
for (let i = 0; i < prevArray.length; i++) {
	if (!isEqual(prevArray[i], nextArray[i])) {
		return ['put', nextArray] // Fall back to full replacement
	}
}
return ['append', nextArray.slice(prevArray.length), prevArray.length]
```

This helps when building lists of things incrementally. If you have an array of 50 items and append one more, we send one item instead of 51.

The tradeoff is that any modification to existing items forces a full array replacement. We don't try to patch arbitrary array edits—only the append case, which is common enough to optimize for.

## Array patch optimization

For equal-length arrays with few changes, we can send patches for just the modified indices:

```typescript
const maxPatchIndexes = Math.max(prevArray.length / 5, 1)
```

We only use this approach if fewer than 20% of items changed. If more items are different, sending the full array is cheaper than sending individual patches.

This isn't as dramatic as the append optimization, but it helps when you're modifying a few elements in a larger array without changing the length.

## Protocol version 8

The string append optimization requires both the client and server to understand the `append` operation. Earlier protocol versions didn't have this.

Protocol version 7 and earlier fall back to full property replacements. Version 8 introduced the append operation, which is why the code checks the protocol version before deciding whether to use it:

```typescript
if (!legacyAppendMode && valueB.startsWith(valueA)) {
	const appendedText = valueB.slice(valueA.length)
	return ['append', appendedText, valueA.length]
}
```

When a client connects, it sends its protocol version. If the server is running version 7, the client won't send append operations—it'll use the older put operations instead. This keeps clients and servers from different versions working together during deployments.

We don't guarantee server backwards compatibility forever, but supporting one or two protocol versions during rollout prevents synchronization failures when users have mixed client/server versions.

## Why not CRDTs?

You might wonder why we don't use CRDTs (Conflict-free Replicated Data Types) for text editing. CRDTs can merge concurrent edits from multiple users without coordination. They're great for that use case.

The tradeoff is that CRDTs require more metadata. Algorithms like RGA or YATA track positions with unique identifiers, which means your text representation grows with edit history. For a short document, that's fine. For a large document with lots of edits, the metadata overhead adds up.

We chose a simpler model: the server is authoritative. Clients send their changes, the server decides what to accept, and everyone converges on the server's state. This means concurrent edits from multiple clients require a rebase when conflicts occur, but the wire format stays minimal.

For text editing in a canvas editor, this is the right tradeoff. Most shapes are edited by one person at a time. When conflicts happen, the rebase logic handles them without requiring CRDT-level coordination overhead.

## Where this lives

The diff computation logic is in `/packages/sync-core/src/lib/diff.ts`. The protocol version constant and message types are in `/packages/sync-core/src/lib/protocol.ts`.

The string append optimization is at line 243-247 of `diff.ts`. Array append is at line 297-305. The protocol version check is at line 34-38 of `protocol.ts`.

One thing we haven't optimized yet: partial updates to very large arrays. If you have a 1000-item array and modify one element in the middle, we still send the full array. A more sophisticated diff could detect this and send just the index and new value, but the added complexity hasn't been worth it for our use cases so far.

The current implementation handles the common cases—text editing and list building—with minimal wire overhead, and that's enough to keep real-time collaboration feeling fast.
