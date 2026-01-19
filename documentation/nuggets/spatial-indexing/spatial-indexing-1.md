---
title: Spatial indexing and the computed bounds problem
created_at: 01/19/2026
updated_at: 01/19/2026
keywords:
  - spatial index
  - R-tree
  - RBush
  - performance
  - computed bounds
readability: 9
voice: 8
potential: 9
accuracy: 10
notes: "Strong problem framing and counter-intuitive solution. Code matches source exactly. The 'Where it helps' section with four bolded items is slightly ChatGPT-like; could flow more naturally."
---

# Spatial indexing and the computed bounds problem

When you drag a brush across an infinite canvas, how does the editor know which shapes you're selecting? The naive answer is to check every shape on the page. With 10 shapes that's fine. With 10,000 shapes, it's a problem.

R-trees solve this beautifully. They organize shapes by location so you can query "what's in this rectangle?" in O(log n) time instead of O(n). Libraries like RBush make this easy. We tried it in April 2024 and immediately reverted it.

## The arrow problem

The issue was arrows. Specifically, arrows bound to other shapes.

When you move a rectangle, any arrow pointing to it needs to update too. The arrow's bounds change because its endpoint moved. But the arrow record in the store didn't change—only the rectangle did.

A standard R-tree update looks like this: get the list of changed records, update their entries in the tree. Since the arrow record didn't change, it doesn't appear in the diff, and the index goes stale.

Groups have the same problem. Move a child shape, and the group's bounds change without the group record changing.

This isn't a bug in R-trees. It's a mismatch between "what records changed" and "what bounds changed."

## The fix: check everything anyway

The solution we landed on sounds inefficient: after processing the record diff, check every shape in the index to see if its bounds changed.

```typescript
// After processing shapeDiff, check ALL remaining shapes
const allShapeIds = this.rbush.getAllShapeIds()

for (const shapeId of allShapeIds) {
  if (processedShapeIds.has(shapeId)) continue

  const currentBounds = this.editor.getShapePageBounds(shapeId)
  const indexedBounds = this.rbush.getBounds(shapeId)

  if (!this.areBoundsEqual(currentBounds, indexedBounds)) {
    if (currentBounds) {
      this.rbush.upsert(shapeId, currentBounds)
    } else {
      this.rbush.remove(shapeId)
    }
  }
}
```

Wait, doesn't this defeat the purpose? If we're checking every shape's bounds anyway, why bother with the R-tree?

The distinction matters. We're checking bounds (fast lookups from a cache), not testing each shape against a query region (expensive geometry operations). The R-tree's value is in query time, not update time.

And the update isn't as expensive as it looks. `getShapePageBounds` is a cached computed value. Most shapes' bounds don't change between frames. The bounds comparison is four number comparisons. We're doing O(n) cheap operations to enable O(log n) expensive ones.

## Where it helps

The spatial index now accelerates several operations:

**Viewport culling** — Instead of checking every shape against the viewport, we query the R-tree once. The `notVisibleShapes` derivation went from iterating all shapes to a single spatial query.

**Brush selection** — When you drag a selection rectangle, we first get candidates from the spatial index. If there are none, we skip the expensive sorted-shapes iteration entirely:

```typescript
const candidateIds = editor.getShapeIdsInsideBounds(brush)

// Early return - avoid expensive getCurrentPageShapesSorted()
if (candidateIds.size === 0) {
  editor.updateInstanceState({ brush: { ...brush.toJson() } })
  editor.setSelectedShapes(Array.from(results))
  return
}
```

**Erasing** — Same pattern. We build a bounding box around the eraser stroke and only test shapes that could possibly intersect:

```typescript
const lineBounds = Box.FromPoints([previousPagePoint, currentPagePoint])
  .expandBy(minDist)
const candidateIds = editor.getShapeIdsInsideBounds(lineBounds)

if (candidateIds.size === 0) {
  editor.setErasingShapes(Array.from(erasing))
  return
}
```

**Hit testing** — `getShapeAtPoint` and `getShapesAtPoint` filter candidates through the spatial index before doing precise geometry tests.

## Keeping it internal

We initially exposed `editor.spatialIndex` as public API, but reconsidered. The spatial index is an optimization, not a feature. The public methods for finding shapes (`getShapeAtPoint`, `getShapesAtPoint`) handle edge cases the raw index doesn't—like frame labels that render outside their shape's bounds.

The index is now internal. If you're building something that needs spatial queries, use the existing editor methods. They'll benefit from the index without you needing to think about it.

---

**Source files:**
- [`packages/editor/src/lib/editor/managers/SpatialIndexManager/SpatialIndexManager.ts`](https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/editor/managers/SpatialIndexManager/SpatialIndexManager.ts)
- [`packages/editor/src/lib/editor/managers/SpatialIndexManager/RBushIndex.ts`](https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/editor/managers/SpatialIndexManager/RBushIndex.ts)
