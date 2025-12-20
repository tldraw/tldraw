---
title: Incremental bindings index
created_at: 12/20/2025
updated_at: 12/20/2025
keywords:
  - bindings
  - index
  - incremental
  - epochs
  - diffs
  - performance
---

# Incremental bindings index

Bindings connect shapes to each other. An arrow bound to a rectangle needs to know about that connection so it can update when the rectangle moves. But finding all bindings for a given shape requires searching through every binding in the document—expensive when you have thousands. The bindings index solves this with a lookup table: given a shape ID, instantly get all bindings connected to it.

The problem is keeping this index updated. Every time a binding changes, the index must reflect that change. A naive approach rebuilds the entire index from scratch on every change. With thousands of bindings, that's thousands of iterations just because one arrow moved. tldraw uses a smarter approach: track what changed since the last computation and apply only those changes.

## The data structure

The bindings index is a `Map<TLShapeId, TLBinding[]>`. Each shape ID maps to an array of all bindings that reference it—either as the `fromId` or `toId` of the binding. An arrow bound between two shapes appears in both shapes' binding arrays:

```typescript
// Arrow from shape A to shape B creates a binding
// The index stores:
// shapeA -> [binding]
// shapeB -> [binding]
```

This bidirectional indexing means any shape can instantly look up all its connections without iterating through every binding in the document.

## Epochs and diff history

The signals system tracks changes using epoch numbers. Every time state changes, a global epoch counter increments. Each computed signal remembers the epoch when it was last computed. To check if the computation is stale, compare your last computed epoch against your dependencies' last changed epochs.

For the bindings index, this enables incremental updates. The store maintains a diff history—a log of what bindings were added, updated, or removed. When the index recomputes, it can ask: "What changed since epoch N?" If the diff history has that information, we apply just those changes. If not—maybe too many changes happened and the history buffer overflowed—we fall back to rebuilding from scratch.

The `filterHistory` method provides this capability, returning a computed signal that tracks changes for a specific record type:

```typescript
const bindingsHistory = store.query.filterHistory('binding')

// Later, in the computed function:
const diff = bindingsHistory.getDiffSince(lastComputedEpoch)
```

## The RESET_VALUE sentinel

`getDiffSince` returns either an array of diffs or a special `RESET_VALUE` sentinel. RESET_VALUE means "I can't tell you what changed—my history doesn't go back far enough." This happens in two cases:

1. **First computation**: The signal has never run before, so there's no "last computed epoch" to compare against.
2. **History overflow**: The circular history buffer has a fixed size. If more changes happened than the buffer can hold, older diffs get overwritten. Requesting diffs from before that point returns RESET_VALUE.

The computed function checks for both cases:

```typescript
computed('arrowBindingsIndex', (_lastValue, lastComputedEpoch) => {
	// First computation ever
	if (isUninitialized(_lastValue)) {
		return fromScratch(bindingsQuery)
	}

	const diff = bindingsHistory.getDiffSince(lastComputedEpoch)

	// History doesn't go back far enough
	if (diff === RESET_VALUE) {
		return fromScratch(bindingsQuery)
	}

	// Apply incremental changes...
})
```

This pattern appears throughout tldraw's incremental computations. The history buffer provides diffs when it can, and the fallback to full recomputation handles edge cases gracefully.

## Lazy copy-on-write

The incremental update uses copy-on-write semantics to avoid unnecessary allocations. If nothing changed, return the exact same Map object. If something changed, create a new Map—but only copy the arrays that actually need modification:

```typescript
let nextValue: TLBindingsIndex | undefined = undefined

function ensureNewArray(shapeId: TLShapeId) {
	// Create new Map on first modification
	nextValue ??= new Map(lastValue)

	let result = nextValue.get(shapeId)
	if (!result) {
		result = []
		nextValue.set(shapeId, result)
	} else if (result === lastValue.get(shapeId)) {
		// Still pointing to old array - make a copy
		result = result.slice(0)
		nextValue.set(shapeId, result)
	}
	return result
}
```

The `??=` operator is key here. `nextValue` stays `undefined` until we actually need to make a change. If the diff contains no relevant changes, we return the original `lastValue` unchanged, preserving reference equality for downstream consumers.

The array copying check (`result === lastValue.get(shapeId)`) prevents mutation of shared arrays. When we create the new Map with `new Map(lastValue)`, both maps initially point to the same array objects. Before modifying an array, we check if it's still shared with the old value and copy it if so.

## Applying the diff

The diff contains three categories: added, updated, and removed bindings. Each requires different handling:

```typescript
for (const changes of diff) {
	for (const newBinding of objectMapValues(changes.added)) {
		addBinding(newBinding)
	}

	for (const [prev, next] of objectMapValues(changes.updated)) {
		// Updates might change fromId or toId, so remove old and add new
		removingBinding(prev)
		addBinding(next)
	}

	for (const prev of objectMapValues(changes.removed)) {
		removingBinding(prev)
	}
}
```

Updates are treated as remove-then-add because the binding's `fromId` or `toId` might have changed. If an arrow's target changes from shape A to shape B, the binding needs to be removed from A's array and added to B's array. Treating it as a single atomic update would require checking whether the IDs changed—simpler to just remove and re-add.

## The history buffer

The diff history lives in a `HistoryBuffer`—a fixed-size circular buffer that stores epoch ranges and their associated diffs. When you call `getDiffSince(epoch)`, it walks backward through the buffer looking for entries that cover that epoch:

```typescript
getChangesSince(sinceEpoch: number): RESET_VALUE | Diff[] {
	for (let i = 0; i < capacity; i++) {
		const offset = (index - 1 + capacity - i) % capacity
		const elem = buffer[offset]

		if (!elem) return RESET_VALUE

		const [fromEpoch, toEpoch] = elem

		// Found the range containing our epoch
		if (fromEpoch <= sinceEpoch && sinceEpoch < toEpoch) {
			// Return all diffs from here to the present
			return collectDiffs(offset, i + 1)
		}
	}

	return RESET_VALUE
}
```

The buffer size determines how far back history is retained. tldraw uses `historyLength: 100` for most incremental computations—enough to handle typical edit sequences without overflow, small enough to keep memory usage reasonable.

## Performance characteristics

For a document with N bindings:

- **Full rebuild**: O(N) to iterate all bindings and build the index
- **Incremental update**: O(D) where D is the number of changed bindings

Most user actions change a small number of bindings—dragging a shape updates its arrow bindings, maybe a handful. Building the index incrementally turns an O(N) operation into O(1) for the common case.

The tradeoff is memory. We store the previous index value plus a history buffer of recent diffs. For tldraw's use case, this is a good tradeoff. Bindings are small, and the performance improvement for interactive editing is substantial.

## Takeaways

The incremental bindings index demonstrates a pattern used throughout tldraw: avoid unnecessary work by tracking what changed rather than recomputing everything. The epoch-based diff system, combined with copy-on-write semantics and graceful fallback to full recomputation, provides both correctness and performance. The memory cost is modest—a history buffer and previous state—but the payoff is huge for interactive editing where changes are typically localized.

This pattern isn't free. It adds complexity in the form of history buffers, epoch tracking, and fallback logic. But for frequently-updated derived state in interactive applications, the tradeoff is worth it. The same approach powers indexes, queries, and other computed state across the editor.

## Key files

- packages/editor/src/lib/editor/derivations/bindingsIndex.ts - The bindings index computed signal
- packages/store/src/lib/StoreQueries.ts - The `filterHistory` method that provides typed diff history
- packages/state/src/lib/HistoryBuffer.ts - The circular buffer storing epoch ranges and diffs
- packages/state/src/lib/Computed.ts - The computed signal implementation with `lastComputedEpoch` support

## Related

- [Signals](./signals.md) - The reactive system that powers incremental computation
- [Sync](./sync.md) - How the store's change tracking integrates with real-time collaboration
