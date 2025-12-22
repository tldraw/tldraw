---
title: Signals - Always-on caching
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - signals
  - reactivity
  - performance
  - caching
  - computed
status: published
date: 12/21/2025
order: 1
---

# Signals: Always-on caching

When we built tldraw's signal system, we made a deliberate choice that differs from other reactive systems like MobX: computed values stay cached even when nothing is listening to them. This might seem wasteful—why keep values in memory if no one needs them?—but it prevents a subtle performance problem that shows up at scale.

## The problem with cache clearing

In MobX, when the last observer stops watching a computed value, the cache is cleared. The next time someone needs that value, it has to be recomputed from scratch. This makes sense for small apps: if you're not using a value, why keep it around?

But tldraw has thousands of shapes on the canvas. When you scroll, shapes move in and out of view constantly. If we cleared computed caches for off-screen shapes, we'd recompute the same values over and over as shapes appear, disappear, and reappear during scrolling or zooming.

Here's what happens in a typical scrolling scenario with cache clearing:

1. Shape scrolls off screen → React component unmounts → computed cache cleared
2. User scrolls back → React component remounts → entire geometry recomputed
3. This happens for dozens of shapes during smooth scrolling

The recomputation cost isn't just the final calculation—it's traversing the entire dependency graph. A shape's screen position depends on its local position, the camera position, the camera zoom, the page position, and more. Each of these might have its own computed values. Clearing the cache means rebuilding this entire chain.

## Always-on caching

In tldraw's signal system, computed values never discard their cache. Once computed, the value stays in memory:

```typescript
class __UNSAFE__Computed<Value, Diff = unknown> {
	// The cached value stays here regardless of listeners
	private state: Value = UNINITIALIZED as unknown as Value

	// Track whether anyone is listening
	get isActivelyListening(): boolean {
		return !this.children.isEmpty
	}
}
```

The `isActivelyListening` property tracks subscriptions, but we don't use it to clear the cache. The cached `state` persists whether `children.isEmpty` is true or false.

When a computed value needs to be recalculated, we check if parents changed using epoch comparison:

```typescript
__unsafe__getWithoutCapture(ignoreErrors?: boolean): Value {
	const globalEpoch = getGlobalEpoch()

	// Return cached value if parents haven't changed
	if (!isNew &&
		(this.lastCheckedEpoch === globalEpoch ||
		 !haveParentsChanged(this))) {
		return this.state
	}

	// Only recompute if necessary
	const result = this.derive(this.state, this.lastCheckedEpoch)
	// ...
}
```

The `haveParentsChanged()` check is cheap—just numeric epoch comparison. This is far faster than recomputing a complex derived value.

## Memory vs computation tradeoff

The tradeoff is straightforward: we use more memory to avoid redundant computation. For tldraw, this is worth it.

A typical tldraw document might have 500 shapes. Each shape has a handful of computed values: screen bounds, hit test geometry, label position, arrow binding points. If each cached value uses 100 bytes (a rough estimate), we're using 50KB of memory to cache 500 computed values.

That's negligible compared to the shape data itself, which includes full SVG paths, text content, and styling information. And it's tiny compared to the cost of recomputing these values hundreds of times per second during scrolling.

The memory cost scales with the number of shapes, not with time. Whether you've been using the canvas for five minutes or five hours, the memory footprint stays the same. There's no leak, just a bounded cache that persists for the lifetime of the document.

## When subscriptions matter

We do track `isActivelyListening`, but we use it for a different purpose: managing parent-child relationships in the dependency graph.

When a computed value has no listeners, it doesn't need to be in its parents' child lists. We detach from parents when `children.isEmpty` becomes true:

```typescript
export function maybeCaptureParent(p: Signal<any, any>) {
	if (inst.stack) {
		inst.stack.child.parentSet.add(p)
		if (inst.stack.child.isActivelyListening) {
			// Only attach if we have listeners
			attach(p, inst.stack.child)
		}
	}
}
```

This keeps the dependency graph compact. An atom with 10,000 children doesn't need to notify 10,000 computed values if only 100 are actively being watched. The other 9,900 still have their caches—they just won't be proactively notified of changes. They'll check epochs lazily the next time they're accessed.

## Where this lives

The computed implementation is in `/packages/state/src/lib/Computed.ts`. The `__unsafe__getWithoutCapture()` method handles cache hits and misses. The `isActivelyListening` property is used throughout the codebase, but never to clear cached state—only to manage subscriptions.

This pattern appears in thousands of places across tldraw. Every shape's bounds, every visible arrow's path, every label's measured size—all kept in memory, ready to return instantly when needed. The canvas stays fast because we already know the answer.
