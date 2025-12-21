---
title: Incremental bindings index
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - bindings
  - incremental
  - index
---

# Incremental bindings index

When you have hundreds of shapes connected by arrows, the last thing you want is to rebuild the entire bindings index every time you move one of them. We use epoch tracking to apply only the changes that have occurred since we last checked—but epochs aren't enough on their own. History has limits, and sometimes we don't have the information we need to compute a diff. That's where RESET_VALUE comes in.

## Epochs and history

Every signal in tldraw's reactive system tracks when its value last changed. This number is called an epoch—a monotonically increasing counter that starts at zero and increments with every transaction. When a computed value needs to know if its dependencies have changed, it compares its own `lastCheckedEpoch` against the `lastChangedEpoch` of each dependency.

The bindings index is a computed value. When it recalculates, it receives its `lastComputedEpoch` as a parameter. That epoch tells us where we were the last time we ran. If the bindings store has changes since then, we want to grab those changes and apply them incrementally without rebuilding the entire index.

Here's the thing: you can't keep infinite history. Memory is finite, and storing every single diff ever produced would be unsustainable. We keep a circular buffer with a fixed capacity—100 entries by default. Each entry is a tuple: `[fromEpoch, toEpoch, diff]`. These tuples represent changes that occurred between two epochs.

When the bindings index asks for changes since its `lastComputedEpoch`, the history buffer walks backward from the most recent entry. It's searching for a tuple where `fromEpoch <= lastComputedEpoch < toEpoch`. Once it finds that entry, it collects all diffs from there forward and returns them as an array.

```typescript
// HistoryBuffer.ts
getChangesSince(sinceEpoch: number): RESET_VALUE | Diff[] {
  const { index, capacity, buffer } = this

  for (let i = 0; i < capacity; i++) {
    const offset = (index - 1 + capacity - i) % capacity
    const elem = buffer[offset]

    // If there's no element, history doesn't go back far enough
    if (!elem) {
      return RESET_VALUE
    }

    const [fromEpoch, toEpoch] = elem

    // Nothing has changed since we last checked
    if (i === 0 && sinceEpoch >= toEpoch) {
      return []
    }

    // Found the range containing sinceEpoch
    if (fromEpoch <= sinceEpoch && sinceEpoch < toEpoch) {
      const len = i + 1
      const result = new Array(len)
      for (let j = 0; j < len; j++) {
        result[j] = buffer[(offset + j) % capacity]![2]
      }
      return result
    }
  }

  // Walked the entire buffer without finding the epoch
  return RESET_VALUE
}
```

## The RESET_VALUE sentinel

Sometimes history isn't enough. The bindings index calls `getDiffSince(lastComputedEpoch)` expecting an array of diffs, but there are cases where that's impossible:

1. **First computation**: The index has never run before. There's no previous state to diff against.
2. **Buffer overflow**: More than 100 changes occurred since the last check. The history buffer wrapped around and overwrote the epoch we need.
3. **Empty slots**: The buffer has gaps because it hasn't filled up yet, and we hit an undefined entry.

In all these cases, `getChangesSince` returns a unique symbol called `RESET_VALUE`. This isn't `null` or `undefined`—it's a Symbol created specifically to signal that incremental updates are impossible:

```typescript
// types.ts
export const RESET_VALUE: unique symbol = Symbol.for('com.tldraw.state/RESET_VALUE')
export type RESET_VALUE = typeof RESET_VALUE
```

When the bindings index receives `RESET_VALUE`, it knows it can't apply diffs. The only option is to rebuild from scratch:

```typescript
// bindingsIndex.ts
const diff = bindingsHistory.getDiffSince(lastComputedEpoch)

if (diff === RESET_VALUE) {
  return fromScratch(bindingsQuery)
}
```

The `fromScratch` function iterates over all bindings in the store and constructs the index from the ground up. It's O(N), but that's fine—this fallback only happens when we genuinely don't have the information needed to do better.

## When RESET_VALUE gets pushed

The sentinel also flows in the opposite direction. When a computed value produces a new result, it can optionally push a diff into its history buffer. If no diff is available—either because the computation doesn't produce one or because the change is too complex to describe—it pushes `RESET_VALUE` instead:

```typescript
// Computed.ts
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
```

When `pushEntry` receives `RESET_VALUE`, it clears the entire buffer:

```typescript
// HistoryBuffer.ts
pushEntry(lastComputedEpoch: number, currentEpoch: number, diff: Diff | RESET_VALUE) {
  if (diff === undefined) {
    return
  }

  if (diff === RESET_VALUE) {
    this.clear()
    return
  }

  this.buffer[this.index] = [lastComputedEpoch, currentEpoch, diff]
  this.index = (this.index + 1) % this.capacity
}
```

This clears the slate. The next consumer asking for changes will get `RESET_VALUE` back because the buffer is empty. That forces them to rebuild, which is the correct behavior when upstream can't describe its changes incrementally.

## Why epochs matter

Epochs give us a shared timeline. Without them, we'd need to store complete snapshots of every state or rely on timestamps (which aren't reliable in a single-threaded environment where time might not advance between operations). Epochs are simple: a monotonic counter that increments with every transaction.

The global epoch counter starts at zero and lives in a singleton. Every signal has its own `lastChangedEpoch`, initialized to `-1` (called `GLOBAL_START_EPOCH`). This ensures that uninitialized signals are always considered dirty when first checked:

```typescript
// constants.ts
export const GLOBAL_START_EPOCH = -1

// Computed.ts
lastChangedEpoch = GLOBAL_START_EPOCH
```

When a transaction commits, the global epoch increments. Signals that changed during that transaction update their `lastChangedEpoch` to the new global value. Downstream computations can now compare their cached `lastCheckedEpoch` against their dependencies' `lastChangedEpoch` to decide whether they need to recompute.

This epoch system is what makes the circular buffer work. Each entry `[fromEpoch, toEpoch, diff]` describes a range of time. We can walk backward through history and find the exact moment a consumer last checked, then return all changes since then.

## Tradeoffs

The circular buffer with 100 entries works well in practice. Typical user interactions—moving a shape, drawing a line, selecting something—produce one or two history entries. Even batch operations like pasting dozens of arrows usually stay within bounds.

The rare cases where the buffer overflows are exactly the cases where rebuilding from scratch is acceptable. If 100+ changes occurred between checks, something unusual happened: a large paste, a programmatic batch update, or the user was away and many concurrent updates piled up. In those scenarios, the O(N) rebuild isn't significantly worse than applying 100+ diffs.

The memory overhead is small. Each history entry stores a `RecordsDiff` with `added`, `updated`, and `removed` objects keyed by ID. For typical documents with a few hundred shapes and bindings, 100 entries is negligible.

The real benefit is that normal operations stay fast. Moving a single arrow connected to two shapes? That's one diff entry, applied incrementally in effectively O(1) time. The index updates only the affected shape entries. No full rebuild, no iteration over unrelated bindings.

## Where this lives

- `/packages/state/src/lib/HistoryBuffer.ts` — Circular buffer and `getChangesSince` algorithm
- `/packages/state/src/lib/Computed.ts` — Computed signals with epoch tracking and history
- `/packages/state/src/lib/constants.ts` — `GLOBAL_START_EPOCH` and related constants
- `/packages/state/src/lib/types.ts` — `RESET_VALUE` sentinel definition
- `/packages/editor/src/lib/editor/derivations/bindingsIndex.ts` — Bindings index using history diffs
- `/packages/store/src/lib/StoreQueries.ts` — `filterHistory` and other query helpers that use epochs

The epoch and history system isn't specific to bindings—it's used throughout tldraw's reactive layer. Any computed value can opt into history tracking by specifying a `historyLength` and providing a `computeDiff` function. The bindings index is one example, but the same pattern appears in general-purpose indexes, filtered queries, and other derived state.
