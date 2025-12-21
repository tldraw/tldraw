---
title: Signals - Epoch-based invalidation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - signals
  - reactivity
  - performance
  - epochs
  - dirty checking
---

# Epoch-based invalidation

Tldraw's signal system uses monotonic epoch numbers instead of dirty flags to track when values change. Every time an atom updates, the global epoch counter increments. A computed value knows it's stale when its parent's epoch doesn't match the snapshot it captured during its last computation.

This is faster than traditional dirty flag propagation and simpler to implement correctly.

## The problem with dirty flags

Most reactive systems use boolean dirty flags. When an atom changes, it marks all dependent computations as dirty. Those computations mark their dependents dirty, and so on down the dependency graph. When you read a computed value, it checks if it's dirty and recomputes if needed.

This works, but propagating dirty flags is work. In a document with thousands of shapes, a single atom change can trigger a cascade of flag updates. You're spending cycles marking things dirty even when you might never read those values.

There's also the question of when to clear the dirty flag. Clear it too early and you risk returning stale data. Clear it too late and you lose track of what's actually changed.

## Epochs as timestamps

We use a simpler approach: every atom tracks when it last changed, and every computed tracks when its parents last changed.

The global epoch counter starts at 0 and increments every time any atom changes:

```typescript
export function advanceGlobalEpoch() {
	inst.globalEpoch++
}
```

When an atom's value changes, it records the current epoch:

```typescript
set(value: Value, diff?: Diff): Value {
	if (this.isEqual?.(this.current, value) ?? equals(this.current, value)) {
		return this.current
	}

	// Tick forward the global epoch
	advanceGlobalEpoch()

	// Update the atom's record of the epoch when last changed
	this.lastChangedEpoch = getGlobalEpoch()

	const oldValue = this.current
	this.current = value

	// Notify all children that this atom has changed
	atomDidChange(this as any, oldValue)

	return value
}
```

When a computed value runs, it captures each parent's epoch:

```typescript
export function maybeCaptureParent(p: Signal<any, any>) {
	if (inst.stack) {
		const wasCapturedAlready = inst.stack.child.parentSet.has(p)
		if (wasCapturedAlready) {
			return
		}

		inst.stack.child.parentSet.add(p)
		inst.stack.child.parents[inst.stack.offset] = p
		inst.stack.child.parentEpochs[inst.stack.offset] = p.lastChangedEpoch
		inst.stack.offset++
	}
}
```

Later, when checking if the computed value is stale, we compare the parent's current epoch against the snapshot we captured:

```typescript
export function haveParentsChanged(child: Child): boolean {
	for (let i = 0, n = child.parents.length; i < n; i++) {
		// Get the parent's value without capturing it
		child.parents[i].__unsafe__getWithoutCapture(true)

		// If the parent's epoch does not match the child's view of the parent's epoch, then the parent has changed
		if (child.parents[i].lastChangedEpoch !== child.parentEpochs[i]) {
			return true
		}
	}

	return false
}
```

This is the entire staleness check. No propagation, no flag clearing, just numeric comparison.

## Why this is fast

Comparing two integers is one of the cheapest operations a CPU can perform. Modern processors have dedicated comparison circuits and can often execute multiple comparisons per clock cycle.

The epoch approach also has better cache behavior. Each computed value stores its parent epochs in a flat array. Checking staleness means iterating a packed array of integers and comparing each against another integer. This is about as cache-friendly as it gets—no pointer chasing, no branching beyond the loop, just linear memory access and arithmetic.

Contrast this with dirty flag propagation, which requires traversing the dependency graph and updating boolean flags on potentially distant objects. That's pointer chasing, which means cache misses, which means stalls.

There's also less bookkeeping. With dirty flags, you need to track which values are dirty, clear them after recomputation, and handle edge cases like circular dependencies or interrupted computations. With epochs, you just increment a number. The stale-or-fresh question is answered by comparing two integers you already have.

## No cascading updates

When an atom changes, we don't walk the dependency graph marking things dirty. We increment one counter and update one field on the atom that changed. That's it.

Computed values check staleness lazily when read. If nobody reads a computed value after its parents change, we never spend any cycles thinking about whether it's stale. The epoch comparison only happens when someone actually calls `.get()`.

This matters in tldraw because the document contains thousands of signals but rendering only touches a subset of them. Marking everything dirty would be wasted work.

## Monotonic guarantees

Epochs are strictly monotonic—they only increase, never decrease or reset. This gives us a simple way to reason about ordering.

If a computed value captured parent epoch 100 and the parent's current epoch is 105, we know for certain that the parent changed since the computation ran. We don't need to worry about wraparound, resets, or concurrent modifications.

The monotonic property also lets us use epochs for other purposes beyond staleness checking. History buffers use epoch ranges to identify which diffs apply to which state. Transactions capture the epoch at commit time. The react integration uses epochs as the return value for `useSyncExternalStore`'s `getSnapshot` function, giving React a cheap way to detect changes.

## Where this lives

The epoch counter lives in `/packages/state/src/lib/transactions.ts`:

```typescript
const inst = singleton('transactions', () => ({
	globalEpoch: GLOBAL_START_EPOCH + 1,
	// ...
}))
```

The `haveParentsChanged` check is in `/packages/state/src/lib/helpers.ts`. Epoch capture happens in `/packages/state/src/lib/capture.ts` during parent tracking.

Every signal—atoms, computed values, effect schedulers—uses the same global epoch counter. This keeps the system simple and avoids synchronization issues.

## Tradeoffs

The global counter is 64-bit and increments on every atom change. In JavaScript, numbers are 64-bit floats with 53 bits of integer precision, giving you about 9 quadrillion distinct values. If tldraw updates an atom 1000 times per second, it would take 285 million years to run out of epochs.

The per-parent epoch tracking means each computed value stores an array of epoch numbers equal to its parent count. This is extra memory compared to a single dirty flag. But the array is packed integers, so the cost is low—8 bytes per parent in a 64-bit environment.

The performance gain from avoiding dirty flag propagation outweighs the memory cost, especially at scale where propagation becomes expensive but epoch arrays stay small.
