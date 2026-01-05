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
status: published
date: 12/20/2025
order: 4
---

# Incremental bindings index

Bindings connect shapes to each other. When an arrow binds to a rectangle, the arrow needs to know about that connection so it can update when the rectangle moves. Finding all bindings for a shape requires iterating through every binding in the document. With a handful of arrows, that's fine. With hundreds or thousands, it becomes a performance problem—especially when you need to do this lookup every time something changes.

The bindings index solves this with a `Map<TLShapeId, TLBinding[]>` that maps each shape to all its bindings. Given a shape ID, you get all connected bindings instantly. But now there's a different problem: keeping the index updated. Every time a binding changes, the index must reflect that change. The naive approach is to rebuild the entire index from scratch—iterate through all bindings and construct a fresh map. With thousands of bindings, that means thousands of iterations just because one arrow moved.

tldraw uses incremental updates instead. Rather than rebuilding the whole index, the system tracks what changed since the last computation and applies only those changes. An arrow moves? Update just that binding in the index. This turns an O(N) operation into O(1) for the common case.

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

The signals system tracks when things change using epoch numbers—a global counter that increments with every state change. Each computed signal remembers the epoch when it last ran. To check if a computation is stale, compare your last computed epoch against your dependencies' last changed epochs.

This enables incremental updates for the bindings index. The store maintains a diff history: a log of what records were added, updated, or removed. When the index recomputes, it asks: "What changed since epoch N?" If the diff history has that information, apply just those changes. If not—maybe the history buffer overflowed—fall back to rebuilding from scratch.

The `filterHistory` method provides this, returning a computed signal that tracks changes for a specific record type:

```typescript
const bindingsHistory = store.query.filterHistory('binding')

// Later, in the computed function:
const diff = bindingsHistory.getDiffSince(lastComputedEpoch)
```

This returns either an array of diffs or a special `RESET_VALUE` sentinel.

## The RESET_VALUE sentinel

`RESET_VALUE` means "I can't tell you what changed—my history doesn't go back far enough." This happens in two cases:

1. **First computation**: The signal has never run before, so there's no "last computed epoch" to compare against.
2. **History overflow**: The circular history buffer has a fixed size (typically 100 entries). If more changes happened than the buffer can hold, older diffs get overwritten. Requesting diffs from before that point returns RESET_VALUE.

The computed function handles both:

```typescript
computed('arrowBindingsIndex', (_lastValue, lastComputedEpoch) => {
	if (isUninitialized(_lastValue)) {
		return fromScratch(bindingsQuery)
	}

	const diff = bindingsHistory.getDiffSince(lastComputedEpoch)

	if (diff === RESET_VALUE) {
		return fromScratch(bindingsQuery)
	}

	// Apply incremental changes...
})
```

The incremental path is the optimization. The from-scratch path is correctness. You need both.

## Lazy copy-on-write

The incremental update uses copy-on-write semantics to avoid unnecessary allocations. If nothing changed, return the same Map object. If something changed, create a new Map—but only copy the arrays that need modification:

```typescript
let nextValue: TLBindingsIndex | undefined = undefined

function ensureNewArray(shapeId: TLShapeId) {
	nextValue ??= new Map(lastValue)

	let result = nextValue.get(shapeId)
	if (!result) {
		result = []
		nextValue.set(shapeId, result)
	} else if (result === lastValue.get(shapeId)) {
		result = result.slice(0)
		nextValue.set(shapeId, result)
	}
	return result
}
```

The `??=` operator defers allocation. `nextValue` stays `undefined` until we actually need to make a change. If the diff contains no relevant changes, return the original `lastValue` unchanged. This preserves reference equality—downstream consumers see the same object and know nothing changed.

The array copying check prevents mutation of shared arrays. When we create the new Map with `new Map(lastValue)`, both maps initially point to the same array objects. Before modifying an array, check if it's still shared with the old value. If so, copy it first.

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

		if (fromEpoch <= sinceEpoch && sinceEpoch < toEpoch) {
			return collectDiffs(offset, i + 1)
		}
	}

	return RESET_VALUE
}
```

The buffer size determines how far back history is retained. tldraw uses `historyLength: 100` for most incremental computations. That's enough to handle typical edit sequences without overflow, small enough to keep memory usage reasonable. If you overflow the buffer, you fall back to from-scratch computation—not ideal for performance, but correct.

## Performance characteristics

For a document with N bindings:

- **Full rebuild**: O(N) to iterate all bindings and build the index
- **Incremental update**: O(D) where D is the number of changed bindings

Most user actions change a small number of bindings. Dragging a shape updates its arrow bindings—maybe a handful. The incremental path turns an O(N) operation into O(1) for typical edits.

The tradeoff is memory and complexity. You store the previous index value plus a history buffer of recent diffs. You need fallback logic for RESET_VALUE cases. You need copy-on-write semantics to avoid unnecessary allocations. For tldraw, this is worth it. Bindings are small, the performance improvement for interactive editing is substantial, and the memory cost is modest.

But the complexity is real. History buffers, epoch tracking, fallback logic—these aren't free. The pattern works for frequently-updated derived state in interactive applications. It would be overkill for data that rarely changes or where full recomputation is cheap. The same approach powers other indexes and queries across the editor: shape culling, selection queries, anything where you need fast lookups on data that changes incrementally.

## Related

- [Signals](./signals.md) - The reactive system that powers incremental computation
- [Sync](./sync.md) - How the store's change tracking integrates with real-time collaboration
