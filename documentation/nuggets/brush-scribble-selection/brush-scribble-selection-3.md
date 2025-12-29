---
title: Wrap mode vs intersection mode
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - selection
  - brush
  - scribble
status: published
date: 12/21/2025
order: 2
---

# Brush vs scribble selection

When we built selection in tldraw, we wanted two modes: a rectangular brush for clean selection areas, and a freeform scribble for lasso-style selection. Holding Alt switches between them. But the interesting part isn't the different shapes—it's how the modes decide which shapes to select, and how frames create an extra layer of complexity.

## Wrap mode vs intersection mode

The brush supports two selection modes: **intersection mode** (shapes selected if they touch the selection area) and **wrap mode** (shapes must be fully enclosed). By default, tldraw uses intersection mode. Holding Ctrl toggles to wrap mode:

```typescript
const isWrapping = isWrapMode ? !ctrlKey : ctrlKey
```

When `isWrapMode = false` (default), `isWrapping` is `true` only if Ctrl is held. When `isWrapMode = true` (user preference), `isWrapping` is `true` unless Ctrl is held.

The brush first checks if a shape is completely contained by the selection box:

```typescript
if (brush.contains(pageBounds)) {
	this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
	continue testAllShapes
}
```

If not completely contained, the mode matters:

```typescript
if (isWrapping || editor.isShapeOfType(shape, 'frame')) {
	continue testAllShapes
}
```

In wrap mode, we skip the shape—it didn't pass the containment test, so it's not selected. In intersection mode, we continue to test if the brush edges cross the shape's geometry.

Frames always require wrap mode, regardless of the Ctrl key state. This prevents accidentally selecting a frame when you're trying to select its children.

## Edge intersection test

For shapes not fully contained and not excluded by wrap mode, we test if any of the four brush edges intersect the shape's geometry:

```typescript
if (brush.collides(pageBounds)) {
	pageTransform = editor.getShapePageTransform(shape)
	if (!pageTransform) continue testAllShapes
	localCorners = pageTransform.clone().invert().applyToPoints(corners)
	const geometry = editor.getShapeGeometry(shape)
	hitTestBrushEdges: for (let i = 0; i < 4; i++) {
		A = localCorners[i]
		B = localCorners[(i + 1) % 4]
		if (geometry.hitTestLineSegment(A, B, 0)) {
			this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
			break hitTestBrushEdges
		}
	}
}
```

We transform the brush corners into the shape's local coordinate space rather than transforming the shape's geometry into page space. This is cheaper—four points vs potentially hundreds of vertices.

Filled shapes behave differently from hollow ones. For filled shapes, the `hitTestLineSegment` method returns success if the line segment passes through the interior, not just if it crosses an edge:

```typescript
return this.isClosed && this.isFilled && pointInPolygon(nearest, this.vertices) ? -dist : dist
```

A negative distance means "inside the polygon," which counts as a hit. Hollow shapes only select if the brush edge crosses their outline.

## Scribble selection differences

Scribble selection uses freeform paths instead of rectangles. Hold Alt while dragging to activate it. Each frame of pointer movement creates a line segment that's tested against visible shapes:

```typescript
const pageTransform = editor.getShapePageTransform(shape)
if (!geometry || !pageTransform) continue
const pt = pageTransform.clone().invert()
A = pt.applyToPoint(previousPagePoint)
B = pt.applyToPoint(currentPagePoint)

if (geometry.hitTestLineSegment(A, B, minDist)) {
	const outermostShape = this.editor.getOutermostSelectableShape(shape)
	newlySelectedShapeIds.add(outermostShape.id)
}
```

Scribble doesn't support wrap mode—all selections are intersection-based. It's also incremental: once a shape is added to `newlySelectedShapeIds`, it's never tested again. Selection only grows, never shrinks.

Frames get special treatment in scribble. If the scribble origin is inside a frame's bounds, we skip the frame entirely:

```typescript
if (
	editor.isShapeOfType(shape, 'frame') &&
	geometry.bounds.containsPoint(editor.getPointInShapeSpace(shape, originPagePoint))
) {
	continue
}
```

This prevents accidentally selecting a frame when scribbling inside it to select its children.

## Frame masking

Shapes inside frames can be clipped—the visible portion is smaller than the shape's actual bounds. We don't want to select shapes by brushing through their invisible parts. This is where masking comes in.

When a shape is selected, we check if it has a mask (a polygon representing the visible region after clipping):

```typescript
if (shape.parentId === currentPageId) {
	results.add(shape.id)
	return
}

const selectedShape = this.editor.getOutermostSelectableShape(shape)
const pageMask = this.editor.getShapeMask(selectedShape.id)
if (
	pageMask &&
	!polygonsIntersect(pageMask, corners) &&
	!pointInPolygon(currentPagePoint, pageMask)
) {
	return
}
results.add(selectedShape.id)
```

If the shape is a direct child of the page, it has no mask. Otherwise, we get its mask and check two conditions:

1. Does the brush intersect the mask polygon?
2. Is the current pointer position inside the mask?

If the mask exists but neither condition is met, we don't select the shape. This ensures you can't select clipped shapes by brushing over their hidden portions.

Scribble has a similar but slightly different check:

```typescript
const pageMask = this.editor.getShapeMask(outermostShape.id)
if (pageMask) {
	const intersection = intersectLineSegmentPolygon(previousPagePoint, currentPagePoint, pageMask)
	if (intersection !== null) {
		const isInMask = pointInPolygon(currentPagePoint, pageMask)
		if (!isInMask) continue
	}
}
```

If the scribble line intersects the mask but the current point isn't inside it, we skip the shape. The check is stricter than brush because scribble is a moving line segment—we need to ensure the pointer ends up in the visible region, not just that it passed through at some point.

## Source files

The brush and scribble implementations live in:

- `/packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts` — Rectangular brush selection
- `/packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts` — Freeform scribble selection
- `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts` — Line segment hit testing
- `/packages/editor/src/lib/primitives/intersect.ts` — Polygon and line intersection functions
