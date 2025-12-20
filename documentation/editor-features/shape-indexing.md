---
title: Shape indexing
created_at: 12/20/2024
updated_at: 12/20/2024
keywords:
  - index
  - z-order
  - fractional
  - sorting
  - layers
---

## Overview

The shape indexing system determines the visual stacking order (z-order) of shapes on the canvas. Every shape has an `index` property that controls whether it appears above or below other shapes. Instead of using integer indices that require renumbering when reordering shapes, tldraw uses string-based fractional indices that can always be inserted between any two existing values. This design enables efficient reordering without modifying other shapes and works well with real-time collaboration where multiple users might reorder shapes simultaneously.

## Why fractional indices

Integer-based indexing systems require renumbering when inserting shapes between existing ones. If you have shapes with indices `[0, 1, 2]` and want to insert a shape between 0 and 1, you must either renumber all subsequent shapes or use floating-point numbers which eventually exhaust precision.

Fractional indexing solves this by using lexicographically sortable strings where you can always generate a new index between any two existing indices:

```typescript
// Example indices showing infinite insertability
'a0'    // First shape
'a1'    // Second shape
'a0V'   // Inserted between 'a0' and 'a1'
'a0G'   // Inserted between 'a0' and 'a0V'
```

The strings compare correctly using standard JavaScript string comparison, so sorting shapes by index is a simple lexicographic sort. No renumbering is required, which means reordering shapes only updates the shapes being moved, not every shape on the canvas.

## How fractional indices work

Fractional indices are based on the [jittered fractional indexing](https://www.npmjs.com/package/jittered-fractional-indexing) algorithm. Each index is a string consisting of an integer part followed by an optional fractional part.

### Index structure

Indices use base-62 encoding (a-z, A-Z, 0-9) to maximize density:

- The integer part determines the rough position in the sequence
- The fractional part provides precision for inserting between existing indices
- No trailing zeros in the fractional part keeps indices compact

```typescript
'a0'     // Integer part: a, no fractional part
'a1'     // Integer part: a, fractional part: 1
'a0V'    // Integer part: a, fractional part: 0V
'b0'     // Integer part: b (comes after all 'a' indices)
```

### Generating indices

The `@tldraw/utils` package provides functions for generating indices:

```typescript
import { getIndexBetween, getIndicesAbove, getIndicesBelow } from '@tldraw/utils'

// Get a single index between two others
const index = getIndexBetween('a0', 'a2')  // Returns 'a1'

// Get multiple indices at once
const indices = getIndicesAbove('a0', 3)    // Returns ['a1', 'a2', 'a3']
const below = getIndicesBelow('a2', 2)      // Returns ['a1', 'a0V']
```

The algorithm includes optional jittering (randomization) to reduce conflicts in collaborative environments where multiple users might simultaneously insert shapes at the same position. Jittering is disabled during tests for deterministic behavior.

## Shape ordering methods

The Editor class provides four methods for reordering shapes:

### Send to back

Moves shapes to the bottom of the z-order within their parent:

```typescript
editor.sendToBack(['shape1', 'shape2'])
```

The `sendToBack` method finds the lowest non-moving shape and inserts the selected shapes below it. If some of the bottom shapes are already being moved, they stay in their relative order and only the shapes above them are reindexed.

### Bring to front

Moves shapes to the top of the z-order within their parent:

```typescript
editor.bringToFront(['shape1', 'shape2'])
```

Similar to `sendToBack` but works from the top of the stack. The method finds the highest non-moving shape and inserts the selected shapes above it.

### Send backward

Moves shapes one position down in the z-order:

```typescript
editor.sendBackward(['shape1'], { considerAllShapes: true })
```

By default, `sendBackward` only moves shapes behind overlapping shapes. Pass `considerAllShapes: true` to move shapes behind the next shape regardless of overlap. This creates intuitive behavior where keyboard shortcuts move shapes past only the shapes they visually overlap.

### Bring forward

Moves shapes one position up in the z-order:

```typescript
editor.bringForward(['shape1'])
```

Like `sendBackward`, this considers only overlapping shapes by default. Use `considerAllShapes: true` to move past any shape in the stack.

### Preserving relative order

All reordering methods maintain the relative order of moved shapes. If you select shapes A, B, and C (where A is below B which is below C) and bring them forward, they maintain that A-B-C ordering at their new position in the stack.

## Reordering algorithm

The reordering logic in `packages/editor/src/lib/utils/reorderShapes.ts` follows this pattern:

1. Group shapes by their parent (since indices are relative to siblings)
2. For each parent, identify which children are moving and which are stationary
3. Find the insertion point based on the operation (toFront, toBack, forward, backward)
4. Generate new indices for moved shapes using `getIndicesBetween`
5. Update only the shapes that need new indices

For example, when bringing shapes to front:

```typescript
// Children: [A, B, C, D, E] where C and D are selected
// Start from top and find first non-moving shape
// E is moving, skip
// Found B as stationary
// Generate indices between B and E for [C, D]
// Result: [A, B, C, D, E] with C and D now at the top
```

The algorithm optimizes by not generating indices for shapes that don't need to move. If you're already at the front and try to bring shapes to front, no updates occur.

## Collaboration and conflicts

Fractional indexing is particularly important for real-time collaboration. When two users simultaneously reorder shapes, they generate different indices in the same region of the index space. Since indices are strings, these don't conflict - both operations succeed and the final order depends on which operation completed last.

The jittering in the fractional indexing algorithm reduces the likelihood that two users generate identical indices for different shapes. Without jittering, two users inserting shapes at the same position would generate the same index, requiring conflict resolution. With jittering, they generate different indices that sort near each other but remain distinct.

The store's synchronization system (in `@tldraw/sync`) handles merging concurrent updates. Since reordering operations only update the moved shapes' indices, they don't interfere with other concurrent operations on different shapes.

## Index validation

The `IndexKey` type is branded to prevent accidentally using arbitrary strings as indices:

```typescript
type IndexKey = string & { __brand: 'indexKey' }
```

The `validateIndexKey` function ensures a string is a valid index by attempting to generate an index after it. Invalid indices throw an error during validation.

All shapes must have valid indices. The store validates indices when shapes are created or updated, ensuring the editor never enters an invalid state.

## Key files

- packages/utils/src/lib/reordering.ts - Fractional index generation functions
- packages/editor/src/lib/utils/reorderShapes.ts - Reordering logic for sendToBack, bringToFront, etc.
- packages/editor/src/lib/editor/Editor.ts - Shape ordering methods (sendToBack, bringToFront, sendBackward, bringForward)
- packages/tlschema/src/shapes/TLBaseShape.ts - Base shape interface with index property

## Related

- [Store](../packages/store.md)
- [Editor](../packages/editor.md)
