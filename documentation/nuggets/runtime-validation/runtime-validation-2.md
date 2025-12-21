---
title: Runtime validation
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - validation
  - runtime
  - TypeScript
---

# Runtime validation

When we built tldraw's validation system, we knew we'd be validating the same shape objects hundreds of times per user action. A user drags a shape, updating its x and y coordinates—we validate the shape. They resize it, changing width and height—we validate again. Full validation every time would mean checking every property of every shape on every update, even though most properties haven't changed.

The solution comes down to a single insight: if you structure your data immutably, reference equality checks can skip most validation work.

## The basic algorithm

Here's what `validateUsingKnownGoodVersion` does in `ObjectValidator`:

```typescript
validateUsingKnownGoodVersion(knownGoodValue, newValue) {
  // Fast path: same reference means no changes
  if (Object.is(knownGoodValue, newValue)) {
    return knownGoodValue
  }

  let isDifferent = false

  for (const key in config) {
    const validator = config[key]
    const prev = knownGoodValue[key]
    const next = newValue[key]

    // Skip validation for unchanged properties
    if (Object.is(prev, next)) {
      continue
    }

    // Validate only what changed
    const checked = validator.validateUsingKnownGoodVersion
      ? validator.validateUsingKnownGoodVersion(prev, next)
      : validator.validate(next)

    if (!Object.is(checked, prev)) {
      isDifferent = true
    }
  }

  return isDifferent ? newValue : knownGoodValue
}
```

The trick is `Object.is()`. We're not deep-comparing values—we're checking references. If a property's reference hasn't changed, we know the value is identical. No need to validate it again.

This only works because tldraw's data is immutable. When you update a shape's x coordinate, you create a new object with a new x property, but the unchanged properties keep the same references they had before. The validator can skip them entirely.

## Complexity characteristics

Best case: O(1). If `Object.is(knownGoodValue, newValue)` returns true, we return immediately. One reference check.

Typical case: O(m) where m is the number of changed properties. For a shape with 10 properties where you change the x coordinate, you validate one property instead of ten.

Worst case: O(n) where n is the total number of properties. This happens when every property has changed, falling back to full validation.

The worst case is the same as full validation, but the typical case is much faster. In a canvas editor where most updates touch one or two properties, this matters.

## Composing validators

The same pattern applies recursively. An `ArrayOfValidator` checks each element:

```typescript
validateUsingKnownGoodVersion(knownGoodValue, newValue) {
  if (Object.is(knownGoodValue, newValue)) {
    return knownGoodValue
  }

  const arr = array.validate(newValue)
  let isDifferent = knownGoodValue.length !== arr.length

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i]

    // Quick reference equality check
    if (Object.is(knownGoodValue[i], item)) {
      continue
    }

    // Validate changed elements
    const checkedItem = itemValidator.validateUsingKnownGoodVersion(
      knownGoodValue[i],
      item
    )
    if (!Object.is(checkedItem, knownGoodValue[i])) {
      isDifferent = true
    }
  }

  return isDifferent ? newValue : knownGoodValue
}
```

Same idea. We check each array element by reference first. Only the elements that changed get validated.

This compounds. A shape with an array of points where one point changed validates only that point. A document with 100 shapes where one shape changed validates only that shape. The reference checks cost almost nothing, and validation work stays proportional to what actually changed.

## Preserving references

There's a subtle but important detail: when validation passes and nothing has changed, we return the `knownGoodValue` reference, not `newValue`. This preserves referential equality for downstream systems.

If React is rendering based on these validated objects, returning the same reference means React sees no change and skips re-rendering. If you're using signals or other reactive systems, same deal—no reference change means no update propagation.

The validator becomes a deduplication layer. If the data is semantically identical to what we already validated, we return the same reference. This cuts work not just in validation but in everything that depends on validated data.

## Where this lives

The incremental validation algorithm is in `/packages/validate/src/lib/validation.ts`. `ObjectValidator`, `ArrayOfValidator`, and `DictValidator` all implement `validateUsingKnownGoodVersion`. The base `Validator` class provides the interface, but each concrete validator type implements the logic for its specific data structure.

Validators compose through `optional()`, `nullable()`, and `refine()`, which preserve the `validateUsingKnownGoodVersion` behavior from inner validators. The result is a tree of validators where incremental validation works at every level.

tldraw's `Store` calls `validateUsingKnownGoodVersion` when updating records. Every shape update, every state change, every reactive recomputation—they all go through this system. The reference equality checks make it fast enough to run on every write without slowing the editor down.

## Tradeoffs

This approach is specific to immutable data structures. If you're mutating objects in place, reference equality checks don't help—the reference stays the same even when the value changes. You'd fall back to full validation every time.

The algorithm also assumes you have a known-good previous version to compare against. That means you need to store validated objects, which costs memory. For tldraw's use case—a reactive store holding validated records—that's fine. We're already keeping those objects in memory. For one-shot API validation, this approach doesn't apply.

The speedup comes from validating the same objects repeatedly as they change incrementally. If your validation pattern doesn't match that—say, validating incoming API payloads once and discarding them—incremental validation won't help. Use something like Zod for that instead.

## Implementation file

The full implementation is in `/packages/validate/src/lib/validation.ts`. The `ObjectValidator` class starts around line 663. `ArrayOfValidator` is at line 515, `DictValidator` at line 977. Each one follows the same pattern: `Object.is()` checks first, validate only what changed, preserve references when nothing changed.
