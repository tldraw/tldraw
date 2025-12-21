---
title: Incremental bindings index
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - bindings
  - incremental
  - copy-on-write
  - performance
---

# Incremental bindings index

When we built the bindings index for tldraw, we needed to update it incrementally—apply just the changes instead of rebuilding from scratch every time. The data structure is simple: a `Map<TLShapeId, TLBinding[]>` mapping each shape to its connected bindings. The challenge was updating it efficiently without unnecessary allocations.

The straightforward approach would create a new Map and copy everything, then apply changes. That works, but it allocates a new Map and new arrays even when most of the data didn't change. We wanted copy-on-write semantics: return the same object if nothing changed, only allocate new objects for the parts that actually need updates.

Here's how we implemented it.

## Deferred allocation with `??=`

The incremental update function starts with this:

```typescript
let nextValue: TLBindingsIndex | undefined = undefined
```

Not `let nextValue = new Map(lastValue)`. Not `let nextValue = lastValue`. Just `undefined`. We don't know yet if we need to make any changes, so we defer allocation until we're sure we need it.

Later, when we need to modify the index:

```typescript
nextValue ??= new Map(lastValue)
```

The `??=` operator only assigns if the left side is nullish. First time this runs, `nextValue` is undefined, so we create `new Map(lastValue)`. This creates a shallow copy—the Map itself is new, but it points to the same array objects as the old Map. Subsequent modifications find `nextValue` already allocated, so this line does nothing.

At the end of the function:

```typescript
return nextValue ?? lastValue
```

If we never allocated `nextValue`, it's still undefined, so we return the original `lastValue`. Reference equality preserved. Downstream consumers compare `newIndex === oldIndex` and see no change. No unnecessary work.

## Why shallow copy matters

When we create `new Map(lastValue)`, both the new Map and the old Map point to the same array objects:

```typescript
// Before: lastValue points to these arrays
lastValue.get(shapeA) // -> [binding1, binding2]
lastValue.get(shapeB) // -> [binding3]

// After: nextValue ??= new Map(lastValue)
nextValue.get(shapeA) === lastValue.get(shapeA) // true - same array
nextValue.get(shapeB) === lastValue.get(shapeB) // true - same array
```

This is intentional. We only want to copy arrays that we're about to modify. Arrays that don't change can stay shared between the old and new Map.

## Detecting shared arrays

Before modifying an array, we check if it's shared:

```typescript
function ensureNewArray(shapeId: TLShapeId) {
  nextValue ??= new Map(lastValue)

  let result = nextValue.get(shapeId)
  if (!result) {
    // Shape not in map - create new array
    result = []
    nextValue.set(shapeId, result)
  } else if (result === lastValue.get(shapeId)) {
    // Array is shared - copy it
    result = result.slice(0)
    nextValue.set(shapeId, result)
  }
  return result
}
```

The key check is `result === lastValue.get(shapeId)`. Reference equality tells us if this array is still shared with the old Map. If they point to the same array object, we copy it with `slice(0)` before modifying.

This check works because we only call `ensureNewArray` before modifying arrays. Once we've copied an array for one modification, the reference equality check returns false for subsequent modifications—the array in `nextValue` is already different from the array in `lastValue`, so we don't need to copy it again.

## Three cases for array handling

When we call `ensureNewArray(shapeId)`, we hit one of three cases:

**Case 1: Shape not in map**
```typescript
if (!result) {
  result = []
  nextValue.set(shapeId, result)
}
```

This shape has no bindings yet. Create an empty array. We'll push the new binding into it.

**Case 2: Shape in map, array shared**
```typescript
else if (result === lastValue.get(shapeId)) {
  result = result.slice(0)
  nextValue.set(shapeId, result)
}
```

This shape exists in both maps, and they point to the same array. Copy the array before modifying it. The old Map still points to the old array, the new Map points to the copy.

**Case 3: Shape in map, array already copied**
```typescript
// else - just return result
```

We already copied this array earlier in this update cycle. Use the existing copy.

## Adding bindings

Adding a binding is straightforward once we have `ensureNewArray`:

```typescript
function addBinding(binding: TLBinding) {
  ensureNewArray(binding.fromId).push(binding)
  ensureNewArray(binding.toId).push(binding)
}
```

Each binding appears in two arrays—one for its source shape, one for its target shape. `ensureNewArray` handles the copy-on-write logic, so we just push to the returned arrays.

## Removing bindings

Removing is more expensive because we need to filter the array:

```typescript
function removingBinding(binding: TLBinding) {
  nextValue ??= new Map(lastValue)

  const prevFrom = nextValue.get(binding.fromId)
  const nextFrom = prevFrom?.filter((b) => b.id !== binding.id)
  if (!nextFrom?.length) {
    nextValue.delete(binding.fromId)
  } else {
    nextValue.set(binding.fromId, nextFrom)
  }

  // Same for binding.toId...
}
```

This creates a new array every time via `filter()`. We don't use the `ensureNewArray` pattern here because filtering already creates a new array.

If the filtered array is empty, we delete the map entry entirely. No point storing shapes with empty binding arrays.

## Why updates are remove-then-add

When a binding updates, we handle it as two operations:

```typescript
for (const [prev, next] of objectMapValues(changes.updated)) {
  removingBinding(prev)
  addBinding(next)
}
```

Why not check if the binding's `fromId` and `toId` changed, and only update if they did? Because checking is more complex than just doing the work:

```typescript
// Complex approach - check what changed
if (prev.fromId !== next.fromId) {
  removeFromArray(prev.fromId, prev)
  addToArray(next.fromId, next)
}
if (prev.toId !== next.toId) {
  removeFromArray(prev.toId, prev)
  addToArray(next.toId, next)
}
// And we still need to update the binding reference in arrays
// where the ID didn't change but the binding object did...
```

Remove-then-add is simpler and handles all cases correctly. The performance cost of filtering arrays is negligible compared to the complexity savings.

## The fallback path

All of this copy-on-write logic is an optimization. The correctness comes from the fallback:

```typescript
return computed('arrowBindingsIndex', (_lastValue, lastComputedEpoch) => {
  if (isUninitialized(_lastValue)) {
    return fromScratch(bindingsQuery)
  }

  const diff = bindingsHistory.getDiffSince(lastComputedEpoch)

  if (diff === RESET_VALUE) {
    return fromScratch(bindingsQuery)
  }

  // Incremental update...
  return nextValue ?? lastValue
})
```

`fromScratch` just iterates all bindings and builds a fresh index. O(N) every time. Simple and obviously correct.

The incremental path is the optimization that makes interactive editing fast—O(D) where D is the number of changed bindings. But if the history buffer overflows or we hit other edge cases, we fall back to the simple path. Correctness first, performance second.

## When this pattern applies

This copy-on-write approach works well when:

- The data structure is frequently read but infrequently updated
- Updates affect a small subset of the data
- You need reference equality to detect changes
- The allocation cost of copying everything is non-negligible

We use this pattern throughout tldraw's indexes and queries. The shape culling index, the selection index, the ID queries—they all use variants of this incremental update approach with copy-on-write semantics.

The tradeoff is complexity. You need history tracking, fallback logic, and careful thinking about when to copy. For data that rarely changes or where full recomputation is cheap, the simple approach is better. But for frequently-updated derived state in interactive applications, the pattern pays off.

## Source files

- `/packages/editor/src/lib/editor/derivations/bindingsIndex.ts` - The bindings index implementation
- `/packages/store/src/lib/StoreQueries.ts` - The `filterHistory` method providing typed diffs
- `/packages/state/src/lib/HistoryBuffer.ts` - The circular buffer storing change history
- `/packages/state/src/lib/Computed.ts` - The computed signal with epoch tracking
