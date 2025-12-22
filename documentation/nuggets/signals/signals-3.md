---
title: Incremental computation with diffs
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - signals
  - incremental computation
  - diffs
  - history buffer
  - optimization
status: published
date: 12/21/2025
order: 2
---

# Incremental computation with diffs

Computed signals can be expensive to recalculate. When you're building a database query that processes thousands of records, you don't want to rebuild the entire result set just because one record changed. You'd rather apply the change incrementally—add the new record, remove the deleted one, update what changed.

This is where diff tracking comes in. Instead of just returning a new value, a computed signal can return both the value and a description of what changed. The system stores these diffs in a circular buffer, letting other parts of the system (like undo/redo or sync) reconstruct how state evolved without keeping the full value history in memory.

## Returning diffs from computed functions

By default, a computed signal's derive function just returns a value:

```typescript
const allBooks = computed('allBooks', () => {
	return store.query.records('book').get()
})
```

Every time this recomputes, it builds a fresh array from scratch. If you add one book, the entire array rebuilds.

To support incremental updates, you can return a `WithDiff` instead:

```typescript
const allBooks = computed('allBooks', (prev) => {
	if (isUninitialized(prev)) {
		// First run: build from scratch
		return buildFromScratch()
	}

	const changes = getRecordChanges()
	const nextValue = applyChangesTo(prev, changes)

	return withDiff(nextValue, changes)
})
```

The `withDiff` helper wraps both the new value and a diff object. The system extracts them separately—the value becomes the signal's state, the diff goes into the history buffer.

From `/packages/state/src/lib/Computed.ts` (lines 306-324):

```typescript
const result = this.derive(this.state, this.lastCheckedEpoch)
const newState = result instanceof WithDiff ? result.value : result
const isUninitialized = this.state === UNINITIALIZED
if (isUninitialized || !this.isEqual(newState, this.state)) {
	if (this.historyBuffer && !isUninitialized) {
		const diff = result instanceof WithDiff ? result.diff : undefined
		this.historyBuffer.pushEntry(
			this.lastChangedEpoch,
			getGlobalEpoch(),
			diff ??
				this.computeDiff?.(this.state, newState, this.lastCheckedEpoch, getGlobalEpoch()) ??
				RESET_VALUE
		)
	}
	this.lastChangedEpoch = getGlobalEpoch()
	this.state = newState
}
```

If the result is a `WithDiff`, the system uses the provided diff. Otherwise it falls back to calling `computeDiff` (if provided) or stores `RESET_VALUE` (meaning "no incremental diff available, full reset required").

## The WithDiff class

`WithDiff` is a simple container—just a value and a diff bundled together:

```typescript
class WithDiff<Value, Diff> {
	constructor(
		public value: Value,
		public diff: Diff
	) {}
}
```

The `withDiff` helper is the preferred way to create instances:

```typescript
export function withDiff<Value, Diff>(value: Value, diff: Diff): WithDiff<Value, Diff> {
	return new WithDiff(value, diff)
}
```

This pattern avoids recomputing the diff. If you already calculated what changed while building the new value, you can return both at once rather than forcing the system to diff the old and new values after the fact.

## The HistoryBuffer

A history buffer stores a sequence of diffs as a circular buffer. Each entry is a tuple of `[fromEpoch, toEpoch, diff]`, representing a change that happened between two global epochs.

From `/packages/state/src/lib/HistoryBuffer.ts` (lines 28-52):

```typescript
export class HistoryBuffer<Diff> {
  /**
   * Current write position in the circular buffer.
   */
  private index = 0

  /**
   * Circular buffer storing range tuples. Uses undefined to represent empty slots.
   */
  buffer: Array<RangeTuple<Diff> | undefined>

  /**
   * Creates a new HistoryBuffer with the specified capacity.
   */
  constructor(private readonly capacity: number) {
    this.buffer = new Array(capacity)
  }
```

### Pushing entries

When a signal's value changes, the system pushes the diff into the buffer:

```typescript
pushEntry(lastComputedEpoch: number, currentEpoch: number, diff: Diff | RESET_VALUE) {
  if (diff === undefined) {
    return
  }

  if (diff === RESET_VALUE) {
    this.clear()
    return
  }

  // Add the diff to the buffer as a range tuple.
  this.buffer[this.index] = [lastComputedEpoch, currentEpoch, diff]

  // Bump the index, wrapping around if necessary.
  this.index = (this.index + 1) % this.capacity
}
```

The circular buffer automatically overwrites the oldest entry when full. No manual eviction logic needed—modulo arithmetic handles wraparound.

If the diff is `RESET_VALUE`, the buffer clears entirely. This signals that incremental updates are no longer possible (maybe the signal errored and reset to `UNINITIALIZED`, or the diff was too complex to track).

### Reading changes since an epoch

To reconstruct what changed since a specific epoch, you walk backward through the circular buffer:

```typescript
getChangesSince(epoch: number): RESET_VALUE | Diff[] {
  if (epoch < 0) {
    return RESET_VALUE
  }

  let earliestEpoch = Infinity
  const diffs: Diff[] = []

  // Walk backward through the buffer
  for (let i = 0; i < this.capacity; i++) {
    const entry = this.buffer[i]
    if (!entry) continue

    const [fromEpoch, toEpoch, diff] = entry

    if (toEpoch > epoch) {
      diffs.push(diff)
      earliestEpoch = Math.min(earliestEpoch, fromEpoch)
    }
  }

  // If we don't have enough history, return RESET_VALUE
  if (earliestEpoch > epoch) {
    return RESET_VALUE
  }

  return diffs
}
```

If the requested epoch is older than the oldest entry in the buffer, the function returns `RESET_VALUE`. The caller knows it can't reconstruct incrementally and must do a full rebuild.

Otherwise, it returns all diffs that happened after the given epoch, in the order they were added.

## Why a circular buffer

A circular buffer has fixed memory cost regardless of how many updates happen. The capacity is set at construction time—typically 100 entries—and that's the maximum memory used for history.

This matters for large documents. If every shape's history was unbounded, memory usage would grow without limit. The circular buffer caps it at a predictable size.

The tradeoff: if you fall too far behind (more than 100 changes), you lose the ability to catch up incrementally. Sync and undo systems need to handle `RESET_VALUE` by falling back to full state reconstruction.

For tldraw's use case, 100 entries is enough. In practice, falling that far behind means something went wrong (network disconnection, long pause), and a full state sync is probably needed anyway.

## The diff interface

Diffs are opaque to the signal system. The type parameter `Diff` can be anything—an array of operations, a set of changed keys, a patch object.

For atoms, you can provide a `computeDiff` function:

```typescript
const recordAtom = atom('record:id', initialValue, {
	historyLength: 100,
	computeDiff: (prev, next, prevEpoch, nextEpoch) => {
		return { changed: findDifferences(prev, next) }
	},
})
```

For computed signals, you can provide `computeDiff` as a fallback, but returning `WithDiff` from the derive function is more efficient—you avoid diffing the old and new values after the fact.

## Integration with Store

The Store uses this diff system for two things:

1. **Sync**: When syncing changes to other clients, the Store sends diffs rather than full state. If a client falls too far behind, it sends `RESET_VALUE` and triggers a full snapshot.

2. **Undo/redo**: The history system stores diffs for each undo entry. When you undo, the Store applies the inverse diffs to reconstruct the previous state.

Both systems rely on the circular buffer to keep memory bounded while providing enough history for the common case.

## Clearing the buffer

History buffers clear in three cases:

1. When a signal stores `RESET_VALUE` (explicitly indicating no incremental diff available)
2. When a computed signal throws an error (the state becomes `UNINITIALIZED` and history is lost)
3. When a transaction aborts (all changed atoms have their history cleared during rollback)

From `/packages/state/src/lib/transactions.ts` (lines 669-677):

```typescript
abort() {
  inst.globalEpoch++

  // Reset each of the transaction's atoms to its initial value.
  this.initialAtomValues.forEach((value, atom) => {
    atom.set(value)
    atom.historyBuffer?.clear()
  })

  // Commit the changes.
  this.commit()
}
```

After clearing, the next change will be treated as a fresh start—the buffer begins filling from index 0 again.

## Performance characteristics

Circular buffer operations are constant time:

- **Push**: O(1) - write to current index, increment with modulo
- **Read**: O(capacity) worst case - walk entire buffer to find relevant diffs
- **Memory**: O(capacity \* diff size) - fixed upper bound

In practice, the capacity is small (typically 100), so even the worst-case read is fast. The memory cost is predictable and doesn't grow with document size or usage time.

The cost of constructing diffs depends on your `computeDiff` function or how you build them in your derive function. For simple cases (a few changed fields), diff construction is cheap. For complex cases (large arrays with many changes), you might choose to store `RESET_VALUE` rather than track every detail.

## Where this lives

The implementation spans several files:

- `/packages/state/src/lib/Computed.ts` - `WithDiff` class and handling in computed signals
- `/packages/state/src/lib/Atom.ts` - History buffer integration in atoms
- `/packages/state/src/lib/HistoryBuffer.ts` - Circular buffer implementation
- `/packages/state/src/lib/types.ts` - Type definitions for `ComputeDiff` and `RESET_VALUE`

The Store's use of diffs lives in:

- `/packages/store/src/lib/Store.ts` - Record change tracking and diff application
- `/packages/sync/` - Network sync using diffs for incremental updates

Undo/redo integration is in:

- `/packages/editor/src/lib/editor/managers/HistoryManager.ts` - History entries storing diffs
