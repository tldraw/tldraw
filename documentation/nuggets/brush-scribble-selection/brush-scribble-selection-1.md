---
title: Three-tier intersection test
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - selection
  - brush
  - scribble
---

# Brush vs scribble selection

When we built tldraw's selection tools, we wanted the standard rectangular brush selection to feel fast even on pages with thousands of shapes. We also wanted a scribble selection mode that lets you trace a freeform path to select irregular groups. Both modes needed to work smoothly across viewport changes, handle shape masking, and respond correctly to modifier keys.

The core challenge is deciding which shapes the selection intersects. A naive approach would transform every shape's geometry into page space and test it against the selection area. With 5000 shapes, that gets expensive fast.

## Brush selection algorithm

Brush selection creates a rectangle from the origin point to the current pointer position. The algorithm runs every frame during the drag, testing shapes for intersection and updating the selection set.

### Three-tier intersection test

We use a three-tier test that exits early whenever possible:

**Tier 1: Complete containment**

If the brush box completely contains a shape's bounding box, it's an instant hit. No need to test geometry:

```typescript
if (brush.contains(pageBounds)) {
	this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
	continue
}
```

The `Box.Contains()` method checks if one box completely wraps another:

```typescript
static Contains(A: Box, B: Box) {
  return A.minX < B.minX && A.minY < B.minY && A.maxY > B.maxY && A.maxX > B.maxX
}
```

This catches the common case where you're brushing over multiple shapes. Most shapes on the page fall into this category as the brush sweeps across.

**Tier 2: Wrap mode check**

Before doing expensive geometry tests, we check if wrap mode is active. In wrap mode, only complete containment counts—partial intersection doesn't select the shape:

```typescript
const isWrapping = isWrapMode ? !ctrlKey : ctrlKey

if (isWrapping || editor.isShapeOfType(shape, 'frame')) {
	continue
}
```

Frames always require wrap mode regardless of the setting. This prevents accidentally selecting a frame when you meant to select its children.

**Tier 3: Edge intersection test**

If the shape isn't completely contained and wrap mode isn't active, we test whether any brush edge crosses the shape's geometry. First, a quick bounding box collision check culls shapes that don't overlap at all:

```typescript
if (brush.collides(pageBounds)) {
	const pageTransform = editor.getShapePageTransform(shape)
	const localCorners = pageTransform.clone().invert().applyToPoints(corners)
	const geometry = editor.getShapeGeometry(shape)

	for (let i = 0; i < 4; i++) {
		const A = localCorners[i]
		const B = localCorners[(i + 1) % 4]
		if (geometry.hitTestLineSegment(A, B, 0)) {
			this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
			break
		}
	}
}
```

The `Box.Collides()` method tests for any overlap between two axis-aligned boxes:

```typescript
static Collides(A: Box, B: Box) {
  return !(A.maxX < B.minX || A.minX > B.maxX || A.maxY < B.minY || A.minY > B.maxY)
}
```

### Coordinate transformation insight

The key optimization here is **where** we do the coordinate transformation. We could transform the shape's complex geometry into page space, but that's expensive for shapes with many vertices. Instead, we transform the four brush corners from page space into the shape's local space:

```typescript
const localCorners = pageTransform.clone().invert().applyToPoints(corners)
```

This is much cheaper. We transform four points once, then test each brush edge against the shape's geometry in its local coordinate system. The shape geometry stays in its native space where calculations are simpler and faster.

### Viewport optimization

On a page with 5000 shapes, testing all shapes every frame is slow. We optimize by only testing shapes that are currently rendered:

```typescript
const brushBoxIsInsideViewport = editor.getViewportPageBounds().contains(brush)
const shapesToHitTest =
	brushBoxIsInsideViewport && !this.viewportDidChange
		? editor.getCurrentPageRenderingShapesSorted()
		: editor.getCurrentPageShapesSorted()
```

If the brush is entirely inside the viewport and the viewport hasn't moved during this drag, we only test visible shapes. As soon as the user pans or zooms during brushing, we switch to testing all shapes since some previously off-screen shapes might now be relevant.

A reactive observer tracks viewport changes:

```typescript
this.cleanupViewportChangeReactor = react('viewport change while brushing', () => {
	editor.getViewportPageBounds()
	if (!isInitialCheck && !this.viewportDidChange) {
		this.viewportDidChange = true
	}
})
```

In our tests, viewport culling makes brush selection about 2x faster on pages with 5000 shapes.

## Scribble selection algorithm

Scribble selection activates when you hold Alt during a drag. Instead of creating a rectangle, it traces a freeform path following your pointer.

The algorithm is simpler than brush selection in one key way: each shape is tested only once. As the pointer moves, we create a line segment from the previous position to the current position and test it against all visible shapes:

```typescript
for (const shape of editor.getCurrentPageRenderingShapesSorted()) {
	if (newlySelectedShapeIds.has(shape.id)) continue

	// Transform segment into shape space
	const pageTransform = editor.getShapePageTransform(shape)
	const pt = pageTransform.clone().invert()
	const A = pt.applyToPoint(previousPagePoint)
	const B = pt.applyToPoint(currentPagePoint)

	if (geometry.hitTestLineSegment(A, B, 0)) {
		newlySelectedShapeIds.add(shape.id)
	}
}
```

Once a shape is added to `newlySelectedShapeIds`, we skip it on future frames. Selection only grows, never shrinks. This makes scribble selection feel responsive—you're painting shapes into the selection set as you move.

### Bounding box early-out

Before testing geometry, we do a quick bounding box check to skip shapes that the segment can't possibly intersect:

```typescript
const { bounds } = geometry

if (
	bounds.minX > Math.max(A.x, B.x) ||
	bounds.minY > Math.max(A.y, B.y) ||
	bounds.maxX < Math.min(A.x, B.x) ||
	bounds.maxY < Math.min(A.y, B.y)
) {
	continue
}
```

This culls most shapes on every frame. The line segment from the previous pointer position to the current one is typically short (a few pixels), so its bounding box excludes the vast majority of shapes on the page.

### Frame special handling

Frames get special treatment in scribble mode. If you start scribbling inside a frame, we don't want to accidentally select the frame itself:

```typescript
if (
	editor.isShapeOfType(shape, 'frame') &&
	geometry.bounds.containsPoint(editor.getPointInShapeSpace(shape, originPagePoint))
) {
	continue
}
```

This lets you scribble through a frame's children without selecting the parent.

## Switching between modes

You can switch between brush and scribble mid-drag by pressing or releasing Alt. The transition is immediate:

```typescript
// In Brushing state
if (altKey) {
	this.parent.transition('scribble_brushing', info)
	return
}

// In ScribbleBrushing state
if (!this.editor.inputs.getAltKey()) {
	this.parent.transition('brushing')
}
```

Both modes are child states of the SelectTool state machine. They share the same initial selection tracking for Shift-key additive selection, and both support edge scrolling when you drag near the viewport edge.

## Shape masking and frames

When shapes are inside frames, they can be clipped by the frame's bounds. We don't want users to be able to select a shape by brushing over its invisible (clipped) portions.

For brush selection, we test whether the brush corners intersect the shape's visible mask:

```typescript
const pageMask = this.editor.getShapeMask(selectedShape.id)
if (
	pageMask &&
	!polygonsIntersect(pageMask, corners) &&
	!pointInPolygon(currentPagePoint, pageMask)
) {
	return
}
```

Only select if the mask intersects the brush corners OR the pointer is inside the mask.

For scribble selection, the test is more precise. We check if the line segment intersects the mask polygon:

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

If the segment intersects the mask boundary, we also verify that the current point is actually inside. This ensures you can't select clipped shapes by scribbling through their hidden areas.

## Performance characteristics

Brush selection complexity is O(4 × S) in the worst case, where S is the number of shapes tested. We test four brush edges against each shape's geometry. In practice, early exits reduce the work substantially:

- Complete containment: Skip geometry test
- No collision: Skip geometry test
- Viewport culling: Test only visible shapes (typically 10-20% of total on large documents)

Scribble selection is O(F × S), where F is the number of frames during the drag. Each frame tests one line segment against all shapes that haven't been selected yet. The bounding box early-out typically culls 99%+ of shapes per frame since most segments are small.

Both modes benefit from the fact that `getCurrentPageRenderingShapesSorted()` returns only shapes that passed the viewport culling system. On a page with 5000 shapes, you might only test 200-300 shapes that are currently visible.

The coordinate transformation insight—transforming selection geometry into shape space rather than shape geometry into page space—is critical for both modes. It keeps the hot path simple and avoids recomputing transformed vertices for complex shapes every frame.

---

**Source files:**

- `packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts`
- `packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts`
- `packages/editor/src/lib/primitives/geometry/Geometry2d.ts`
- `packages/editor/src/lib/primitives/Box.ts`
- `packages/editor/src/lib/primitives/intersect.ts`
