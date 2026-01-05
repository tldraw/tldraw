---
title: Fine-grained reactivity with signals
created_at: 12/20/2025
updated_at: 12/20/2025
keywords:
  - signals
  - reactivity
  - state
  - atoms
  - computed
status: published
date: 12/20/2025
order: 4
---

# Fine-grained reactivity with signals

tldraw uses a custom signals library for state management. When an application has thousands of shapes that need to update independently, React's top-down rendering model doesn't cut it. We needed something faster—a system where changing one value only recomputes exactly what depends on it, nothing more.

## The problem with standard reactive systems

Most React applications store state in component state or context. When state changes, React re-renders components from the root down. For a typical application with a few hundred components, this works fine. For a canvas with thousands of shapes where each needs independent reactive updates, it becomes a bottleneck.

MobX and similar libraries solve this with fine-grained reactivity—only components that depend on changed values re-render. This is much better, but we hit scaling limitations. MobX uses dirty flags and push-based reactivity, which means every change immediately propagates to all dependents. For large documents with complex dependency graphs, this creates cascading updates that slow everything down.

We needed a system that could:

- Track dependencies automatically without explicit subscriptions
- Handle incremental updates for large data structures
- Maintain computed value caches even when no one is listening
- Support thousands of reactive values with minimal overhead
- Roll back changes atomically when needed

## What signals are

A signal is a value that changes over time and automatically notifies dependents when it changes. The system has three primitives:

**Atoms** hold mutable state:

```typescript
import { atom } from '@tldraw/state'

const count = atom('count', 0)
count.set(5)
console.log(count.get()) // 5
```

**Computed signals** derive values from other signals:

```typescript
import { computed } from '@tldraw/state'

const doubled = computed('doubled', () => count.get() * 2)
console.log(doubled.get()) // 10
```

**Reactions** run side effects when dependencies change:

```typescript
import { react } from '@tldraw/state'

const stop = react('logger', () => {
	console.log('Count changed to:', doubled.get())
})
```

The key difference from other reactive systems: when you call `.get()` inside a computed function or reaction, the dependency is automatically tracked. No manual subscriptions, no dependency arrays. This is standard for signals libraries, but the performance characteristics matter more than the API.

## Epoch-based invalidation

Most reactive systems use dirty flags—a boolean that marks whether a value needs recomputation. When a dependency changes, it marks all dependents dirty. This works, but checking dirty flags requires traversing the dependency graph.

tldraw's signals use epoch numbers instead. There's a global epoch counter that increments on every state change. Each signal stores the epoch when it last changed:

```typescript
// Simplified for clarity - see Atom.ts for full implementation
class Atom<Value> {
	private current: Value
	lastChangedEpoch: number

	set(value: Value): Value {
		if (this.isEqual(value, this.current)) return value
		this.current = value
		this.lastChangedEpoch = advanceGlobalEpoch()
		// Notify children...
	}
}
```

To check if a computed value is stale, compare epochs:

```typescript
function haveParentsChanged(child: Child): boolean {
	for (let i = 0; i < child.parents.length; i++) {
		if (child.parents[i].lastChangedEpoch !== child.parentEpochs[i]) {
			return true
		}
	}
	return false
}
```

This is faster than traversing dirty flags because it's a simple numeric comparison. For a canvas with thousands of shapes, this difference matters.

## Always-on caching

Most reactive libraries discard computed values when no components are subscribing. This makes sense for memory—why cache values no one is using? But it creates performance problems when subscriptions come and go.

Consider viewport culling: shapes outside the viewport are hidden but stay in the DOM to preserve state. When they're culled, React unmounts their components and stops subscribing to their signals. When you scroll and they come back, the subscriptions restart and trigger recomputation of all derived state.

tldraw's signals never discard caches. Computed values stay computed until their dependencies change, regardless of whether anyone is listening. This means scrolling a shape in and out of view doesn't trigger expensive recomputation—the cached value is already there.

The memory tradeoff is worth it. We're caching computation results, not copying data. For an application that already holds thousands of shape records in memory, caching their derived values adds minimal overhead.

## Incremental computation

Large collections are expensive to recompute from scratch. When you have 10,000 shapes and change one, you don't want to recalculate derived values for all 10,000.

Signals support incremental updates through diffs. A computed signal can receive its previous value and compute the new value incrementally:

```typescript
const visibleShapes = computed('visible', (prevValue) => {
	if (isUninitialized(prevValue)) {
		// First computation: build from scratch
		return getAllShapes().filter(isVisible)
	}

	// Incremental update: apply changes to previous result
	const changes = getShapeChanges()
	return applyChangesToSet(prevValue, changes)
})
```

The store system uses this heavily. When shapes change, the store computes a diff (added, updated, removed) and passes it to dependent computed values. Instead of iterating through all shapes, computations can apply just the diff to their previous result.

## Transactions and rollback

When you drag a shape, you're updating its position hundreds of times per second. Without batching, each position change would trigger all dependent reactions independently. Reactions run side effects—logging, persistence, network updates. Running them hundreds of times is wasteful.

Transactions batch updates:

```typescript
import { transact } from '@tldraw/state'

transact(() => {
	shape.set({ x: 100 })
	shape.set({ y: 100 })
	shape.set({ rotation: 45 })
	// Reactions run once after the transaction
})
```

Transactions also support rollback. When an error occurs during a transaction, all changes revert:

```typescript
try {
	transact(() => {
		makeRiskyChange()
		if (shouldAbort) {
			throw new Error('Aborting')
		}
	})
} catch (error) {
	// All changes rolled back automatically
}
```

This is critical for maintaining document consistency. If a shape update fails halfway through, you don't end up with partially-applied changes.

## Integration with React

The `@tldraw/state-react` package provides React hooks that subscribe to signals using `useSyncExternalStore`:

```typescript
import { useValue } from '@tldraw/state-react'

function Counter() {
	const currentCount = useValue(count)
	return <div>Count: {currentCount}</div>
}
```

The `useValue` hook creates a subscription. When the signal changes, React re-renders the component. This is standard React integration, but the signal's automatic dependency tracking means you only subscribe to exactly what you read—no manual dependency arrays.

For shape rendering, we bypass React entirely for transforms. The `useQuickReactor` hook writes directly to the DOM:

```typescript
useQuickReactor('set shape transform', () => {
	const transform = editor.getShapePageTransform(id)
	setStyleProperty(containerRef.current, 'transform', Mat.toCssString(transform))
})
```

This runs synchronously when dependencies change—no React batching, no scheduling. Position updates happen immediately, before the next frame. For smooth dragging interactions, this matters.

## The store abstraction

The `@tldraw/store` package builds on signals to create a reactive database. Instead of managing individual signal atoms, you work with typed records:

```typescript
const shapeRecord = createShapeRecordType()
const store = createTLStore({ schema: { shapes: shapeRecord } })

// Records are automatically reactive
store.put([{ id: 'shape1', type: 'geo', x: 0, y: 0 }])
const shape = store.get('shape1') // Returns reactive value
```

The store system provides:

- Record validation and migrations
- Change history with diffs
- Reactive queries and indexes
- Automatic persistence
- Undo/redo support

All of this runs on the signal system. When you update a record, the store's internal atoms change, which triggers computed indexes and queries to update incrementally, which notifies React components to re-render—all automatically tracked through the signal dependency graph.

## Why not existing solutions

We evaluated several reactive systems before building our own:

**MobX** is mature and battle-tested, but uses push-based reactivity where changes immediately propagate. For large documents, this creates cascading updates. It also discards computed caches when unobserved, which hurts performance with viewport culling.

**Solid signals** are fast and use pull-based reactivity, but weren't designed for our scale. We needed incremental computation with diffs, always-on caching, and transactional rollback—features that would require significant customization.

**Preact signals** are lightweight but similarly lack the features we needed. Building on an existing solution would have meant wrapping it with enough custom logic that we'd effectively be maintaining a fork.

We built `@tldraw/state` specifically for tldraw's requirements. The library was originally developed as a standalone project called signia, but we incorporated it back into the tldraw monorepo where it lives as `@tldraw/state`.

## Related

- [React as a canvas renderer](./react-canvas.md) - How the signals system integrates with React rendering
- [Architecture: Reactive state](../architecture/reactive-state.md) - High-level overview of tldraw's reactivity architecture
- [Package: @tldraw/state](../packages/state.md) - Detailed package documentation
- [Package: @tldraw/store](../packages/store.md) - Store system built on signals
