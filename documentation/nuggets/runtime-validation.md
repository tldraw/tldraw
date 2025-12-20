# Runtime validation

Some bugs don't crash immediately. A zero-width shape can exist happily in the store until you try to normalize a vector across it—then you get a divide-by-zero error in code that looks completely correct. The bug was introduced somewhere else entirely, possibly minutes ago, possibly by a different user in a multiplayer session.

We built `@tldraw/validate` to catch these problems early, at the boundary where data enters the system. But validation on every store update has to be fast.

## The problem with delayed crashes

Consider a shape with width and height. If somehow a shape ends up with `w: 0`:

1. It renders fine (just invisible)
2. Selection works
3. Dragging works
4. Then someone tries to resize it proportionally, which normalizes the dimensions, and the app crashes

The stack trace points to the resize code. But the resize code is correct—the bug was wherever that zero-width shape was created. Good luck finding it.

This gets worse in multiplayer. The bad data might have been introduced by another user, synced to your client, and now your app crashes on their malformed shape.

## Validation at the boundaries

The solution is to validate data when it enters the store. Every shape, every asset, every page—validated against a schema before it's accepted. If a zero-width shape tries to enter, it's rejected immediately with a clear error pointing at the problem.

```typescript
// packages/tlschema/src/shapes/TLGeoShape.ts
export const geoShapeProps = {
	w: T.nonZeroNumber,  // Must be > 0
	h: T.nonZeroNumber,
	// ...
}
```

The `T.nonZeroNumber` validator rejects zero, NaN, and Infinity. Similar validators exist for URLs (preventing `javascript:` XSS attacks), integers, and constrained ranges.

## Making it fast

Validation on every update sounds expensive. The key insight: most updates only change a small part of the data. If a shape moves from `x: 100` to `x: 150`, we don't need to re-validate the entire shape—just the changed property.

The `validateUsingKnownGoodVersion` method implements this:

```typescript
validateUsingKnownGoodVersion(knownGoodValue: T, newValue: unknown): T {
	// Fast path: same reference means no changes
	if (Object.is(knownGoodValue, newValue)) {
		return knownGoodValue
	}
	// Only validate what changed
	// ...
}
```

For arrays, this means only validating elements that changed. For objects, only validating properties that changed. Unchanged parts are reused without re-validation.

Additional optimizations:

- **Reference equality checks**: Skip validation entirely for unchanged nested objects
- **Avoiding closures in production**: Error handling is inlined to prevent allocation
- **Efficient iteration**: `for...in` instead of `Object.entries()` to avoid array allocation
- **Cached environment checks**: `NODE_ENV` is read once, not on every validation

## Why not Zod?

Zod is a good library, but it's designed for one-shot validation. Our access pattern is different: we validate the same large objects repeatedly, with small changes each time. The `validateUsingKnownGoodVersion` optimization is specific to this pattern and makes a significant performance difference.

The package is also smaller and has no dependencies, which matters for a library that ships to users.

## Key files

- `packages/validate/src/lib/validation.ts` — Core validation implementation
- `packages/tlschema/src/shapes/` — Shape validators using the library
- `packages/store/src/lib/Store.ts` — Store integration with validators
