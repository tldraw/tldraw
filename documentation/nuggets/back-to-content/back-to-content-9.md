---
title: Back to content
created_at: 01/07/2025
updated_at: 01/10/2025
draft-notes: 'Restructured to lead with the bug story. Bug as entry point to visibility system.'
keywords:
  - navigation
  - culling
  - viewport
  - UX
readability: 9
voice: 9
potential: 8
accuracy: 8
notes: 'Strong bug-first opening. Good distinction between visibility concepts. Code examples are simplified - notVisibleShapes also checks canCull() which is omitted. Coordinate functions simplified from actual implementation.'
---

We recently fixed a bug in tldraw's "Back to content" button that had been hiding in plain sight for months. The button is supposed to appear when you've panned to an empty part of the canvas. Sometimes it did, sometimes it didn't.

We finally tracked it down to an [optimization we had made](https://github.com/tldraw/tldraw/pull/3532) while working on a different feature, off-screen shape culling, that was preventing the button from appearing if you had any shapes selected. The bug was hard to catch because the first thing a lost user does is click on the canvas, which clears their selection and makes the button appear.

The fix was a one-line change, but understanding why it worked requires understanding how we track what's visible on an infinite canvas.

## Two ways to be invisible

When you pan away from your shapes, those shapes are still there, just off-screen. We track this in two different ways, and confusing them caused the bug.

**Not visible shapes** are shapes whose bounding boxes don't intersect with the viewport. This is a pure geometric calculation: is this shape's box overlapping with what the user can see?

**Culled shapes** are shapes we don't bother rendering. This is almost the same list, but with a few exceptions. We don't cull selected shapes and we don't cull shapes you're editing, which might have internal state. And just to be sure, we let custom shapes opt out of culling entirely via `canCull()`.

```ts
getCulledShapes() {
    const notVisibleShapes = this.getNotVisibleShapes()
    const culledShapes = new Set(notVisibleShapes)

    // Don't cull selected or editing shapes
    if (editingId) culledShapes.delete(editingId)
    selectedShapeIds.forEach((id) => culledShapes.delete(id))

    return culledShapes
}
```

The bug came from using `getCulledShapes()` to detect an empty viewport. If every shape was culled, we'd show the button. However, since selected shapes are never culled, any selection meant that there was at least one "non-culled" shape, and so the button would never appear.

The fix was to use `getNotVisibleShapes()` instead, which doesn't care about selection state or other exceptions, just about what's off-screen.

## How we detect visibility

Detecting whether shapes are visible means comparing two things: the viewport (what the user can see) and the shapes' bounding boxes (where the shapes are). To make these comparisons, both boxes need to be in the same coordinate space.

### Coordinate spaces

Like a 2D game engine, tldraw works with two coordinate spaces. "Screen space" is actual pixels on the user's display. "Page space" is positions within the infinite canvas.

The camera converts between them:

```js
function screenToPage(point, camera) {
	return {
		x: point.x / camera.z - camera.x,
		y: point.y / camera.z - camera.y,
	}
}

function pageToScreen(point, camera) {
	return {
		x: (point.x + camera.x) * camera.z,
		y: (point.y + camera.y) * camera.z,
	}
}
```

The `camera.z` component is zoom level. A camera at `z: 0.5` means page coordinates map to half the size in screen coordinates.

### Viewport bounds

The viewport is the visible region in page space. We calculate it from the canvas element's screen size and the camera position:

```js
function getViewportPageBounds(camera, elm) {
	const rect = elm.getBoundingClientRect()
	return Box.From({
		x: -camera.x,
		y: -camera.y,
		w: rect.width / camera.z,
		h: rect.height / camera.z,
	})
}
```

### Shape bounds

To complete the picture, each shape has a bounding box in page space. We compute this by taking the shape's local geometry, building a transform matrix from its position and all ancestor positions (for nested shapes), and transforming the vertices into page space.

```js
function getPageBoundingBox(shape) {
	// Calculate transform matrix
	const matrix = Mat.Identity()
	let _shape = shape
	while (_shape) {
		matrix.rotate(-_shape.rotation).translate(-_shape.x, -_shape.y)
		_shape = editor.getShape(_shape.parentId)
	}
	matrix.invert()

	// Apply to local vertices
	const util = editor.getShapeUtil(shape)
	const geometry = util.getGeometry(shape)
	const localVertices = geometry.getVertices()
	const pageVertices = matrix.applyToPoints(localVertices)

	// Calculate outer bounds of page vertices
	return Box.FromPoints(pageVertices)
}
```

These calculations are cached and only recomputed when relevant properties change.

## The visibility check

Originally, we used the viewport and shape bounds directly to check for visibility.

```js
function isEmptyViewport(viewport, boxes) {
	for (const box of boxes) {
		if (
			box.maxX >= viewport.minX &&
			box.minX <= viewport.maxX &&
			box.maxY >= viewport.minY &&
			box.minY <= viewport.maxY
		) {
			return false
		}
	}

	return true
}
```

Later, during our work on off-screen culling, we developed a system for tracking which shapes are off-screen. This new system was more complex and didn't benefit from an early return after finding an on-screen shape. However, since we needed to run this code anyway for rendering performance, it was cheaper to piggy back off of its results. Any additional loop, however efficient, would have been more work overall.

Unfortunately that switch introduced the not-culled bug only recently discovered during our weekly bug hunt. Though we pride ourselves on attention to detail, the bug had survived more than 20 months without anyone noticing!

## What the fix restored

Beyond fixing the bug, switching to `getNotVisibleShapes()` re-enabled a feature that had been silently broken: when you have shapes selected and pan to an empty area, "Back to content" now takes you back to your selected shapes specifically, not just to any content. If nothing is selected, we zoom to fit all shapes on the page.

The distinction between "not visible" and "culled" exists for good reasons. Rendering optimization and selection UX are different concerns. The bug came from using the wrong concept for the job.
