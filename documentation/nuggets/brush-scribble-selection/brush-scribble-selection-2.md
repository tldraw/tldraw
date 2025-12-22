---
title: Incremental selection for scribble mode
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - selection
  - brush
  - scribble
status: published
date: 12/21/2025
order: 1
---

# Brush vs scribble selection

When we built selection tools for tldraw, we knew from other canvas apps that users expect two modes: a rectangular brush (click and drag) and a freeform lasso (hold Alt while dragging). What wasn't obvious at first was that these modes need fundamentally different algorithms. The brush can afford to retest every shape on every frame because it's just checking rectangle intersection. But scribble draws arbitrary paths—testing all shapes against all segments would be too slow.

The solution is incremental selection. Instead of retesting shapes every frame, scribble tests each shape exactly once. Once selected, a shape stays selected.

## Three selection sets

Scribble maintains three sets of shape IDs:

```typescript
initialSelectedShapeIds = new Set<TLShapeId>()
newlySelectedShapeIds = new Set<TLShapeId>()
```

When the scribble starts, `initialSelectedShapeIds` captures whatever was already selected (if you're holding Shift for additive selection). As you drag, shapes that the scribble crosses get added to `newlySelectedShapeIds`. The final selection is the union of both sets.

The key difference from brush: once a shape enters `newlySelectedShapeIds`, it's never removed. The selection only grows.

```typescript
if (
	editor.isShapeOfType(shape, 'group') ||
	newlySelectedShapeIds.has(shape.id) ||
	editor.isShapeOrAncestorLocked(shape)
) {
	continue
}
```

This check skips shapes that are groups, already selected in this scribble pass, or locked. Notice the second condition: if we've already added this shape, we never test it again. This keeps the algorithm efficient even as the scribble path gets long.

## Bounding box early-out

Before testing a shape's geometry, scribble checks whether the line segment could possibly intersect the shape's bounding box:

```typescript
const { bounds } = geometry
if (
	bounds.minX - minDist > Math.max(A.x, B.x) ||
	bounds.minY - minDist > Math.max(A.y, B.y) ||
	bounds.maxX + minDist < Math.min(A.x, B.x) ||
	bounds.maxY + minDist < Math.min(A.y, B.y)
) {
	continue
}
```

Four conditions cull the shape if the segment is entirely to the left, above, right, or below the bounds. This is cheap—just comparing numbers—and eliminates most shapes without touching the geometry.

After that, we do the expensive test: transform the line segment into the shape's local space and call `geometry.hitTestLineSegment()`. But we only do this for shapes that passed the bounding box check.

## Frame special handling

Frames are containers, and we don't want to select them when you're scribbling inside to select their children. So we check the scribble's origin point:

```typescript
if (
	editor.isShapeOfType(shape, 'frame') &&
	geometry.bounds.containsPoint(editor.getPointInShapeSpace(shape, originPagePoint))
) {
	continue
}
```

If the scribble started inside the frame's bounds, we skip the frame entirely. This means you can scribble freely inside a frame without accidentally selecting the frame itself.

Brush selection doesn't need this check because it uses wrap mode for frames—you must completely enclose a frame to select it.

## Scribble visual feedback

The scribble path itself is rendered using the same system as the eraser visual:

```typescript
const scribbleItem = this.editor.scribbles.addScribble({
	color: 'selection-stroke',
	opacity: 0.32,
	size: 12,
})
```

Each frame, we add the current pointer position:

```typescript
this.editor.scribbles.addPoint(this.scribbleId, x, y)
```

The scribble manager only adds points if they're at least 1 pixel apart from the previous point. This keeps the point count manageable. Once the scribble accumulates 8 points, it transitions from 'starting' to 'active' state. When you release, it enters 'stopping' and fades out.

## Brush comparison

Brush selection tests every shape every frame. It creates a rectangle from the drag origin to the current pointer position, then tests that rectangle against all shapes. If the rectangle completely contains a shape's bounding box, it's selected. Otherwise, if the boxes overlap, we test the shape's geometry against the brush's four edges.

This works because the brush always has four edges, so it's O(4 \* S) where S is the number of shapes. We optimize by only testing visible shapes when the brush is inside the viewport.

Scribble is O(F \* S) where F is the number of frames, but in practice it's much better because each shape is tested only once. The first time a segment crosses a shape, we select it and never test it again. The bounding box early-out eliminates most shapes without touching geometry.

The cost of incremental selection is that you can't deselect shapes by scribbling back over them. But that behavior would feel strange anyway—users expect lasso selection to grow as they add to the path.

## Implementation notes

Scribble selection lives in `packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts`. The scribble visual system is in `packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts`. Both selection modes test only shapes returned by `editor.getCurrentPageRenderingShapesSorted()`, which already excludes shapes outside the viewport.

The "test each shape once" approach scales well to large documents because the cost per frame is bounded by the number of newly-visible shapes, not the total number of shapes. Edge scrolling brings new shapes into view, but we still only test them once.
