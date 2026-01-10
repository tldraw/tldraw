---
title: Back to content
created_at: 01/07/2025
updated_at: 01/08/2025
draft-notes: 'More matter-of-fact tone. Removed self-congratulatory language. Compressed.'
keywords:
  - navigation
  - culling
  - viewport
  - UX
---

It can be easy to get lost on an infinite canvas. Once a user pans away from their content to an empty part of the canvas, there's no indication of how to find their way back.

In tldraw, we show a "Back to content" button when a user's is looking at an empty part of the canvas. When clicked, we camera animates to bring the content back on screen.

To implement our "Back to content" feature, we needed to answer two questions:

1. How do we recognize an empty viewport?
2. Where exactly should Back to content go?

In short, the canvas is empty when the user's viewport is empty; and we take the user to their selection shapes if they have any selected, otherwise we try to zoom to fit all of the shapes on the page.

The rest of this article will explore how we designed our solutions.

## Detecting an empty viewport

The first question was how to recognize an empty viewport. To answer this, we knew we would have to check for an intersection between the user's viewport and the bounding boxes of all the shapes on their current page.

### Coordinate spaces

Like a 2D game engine, tldraw works with two coordinate spaces: the actual pixels on the user's screen, called "screen space", and the positions and dimensions within the camera, called "world space"—or, in our case, called "page" space.

The "camera" is a 3D coordinate that we use for conversion:

```js
function screenToPage(point, camera) {
	return Vec.From({
		x: point.x / camera.z - camera.x,
		y: point.y / camera.z - camera.y,
	})
}

function pageToScreen(point, camera) {
	return Vec.From({
		x: (point.x + camera.x) * camera.z,
		y: (point.y + camera.y) * camera.z,
	})
}
```

And since we do this often, we have a cached helper on the `Editor`:

```ts
editor.screenToPage(myScreenPoint)
editor.pageToScreen(myPagePoint)
```

### Viewport page bounds

The "viewport" is the part of the canvas that is visible on the user's screen, based on the size (in screen pixels) of the user's canvas, and the position of the camera.

```js
function getViewportPageBounds(camera, elm) {
	const rect = elm.getBoundingPageRects()
	return Box.From({
		x: camera.x,
		y: camera.y,
		w: rect.width / camera.z,
		h: rect.height / camera.z,
	})
}
```

And since we do this often, we have a cached helper on the `Editor`:

```ts
editor.getViewportPageBounds()
```

We'll have another article exploring this system in depth, including its browser-ish quirks (top left origin, flipped `y` axis, etc.) however for now it's enough to know that the viewport is the part of the infinite canvas that is visible on the user's screen and moving the camera moves the viewport.

### Shape page bounds

Similarly, bounding boxes are the axis-aligned box that encompasses a shape in page space.

We compute a shape's bounding box from its geometry, which is in turn computed by that shape type based on its properties. In order to help with caching, the shape's geometry is computed in its own "local" space and only busts when its dependent properties change.

However, because page space is our "working space" for intersections or comparisons, we also cache these geometries in page space. To calculate a shape's page space bounding box, we take the vertices of its local geometry, compose a transform matrix from the shape's position and the position of its ancestors, and use this matrix to convert the vertices into page space, and finally derive the bounding box from the vertices.

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

Since this also involves some work, we cache these page bounds too and only bust when the shape's geometry changes, or its position changes, or any of its ancestors positions change.

```ts
editor.getShapePageBounds(myShape)
```

## Finding the Empty shapes

Now what we have the viewport and the bounding boxes (both in page space) we can compare them to discover overlaps.

In our first designs, we recognized an empty viewport by separately checking for an overlap between the viewport and the bounds of every shape.

```js
function isEmptyViewport(viewport, boxes) {
	for (const box of boxes) {
		if (
			box.maxX >= viewMinX &&
			box.minX <= viewMaxX &&
			box.maxY >= viewMinY &&
			box.minY <= viewMaxY
		) {
			return true
		}
	}

	return false
}
```

If we made it to the end of the list of shapes without finding any on screen, that meant the user's viewport was empty and so we should show the button.

## Tracking visibility

Perhaps unintuitively, we ended up using a less efficient solution for increased efficiency.

During later development, while working on off-screen shape culling, we developed a system for tracking which shapes are off-screen. While this system was more complex and didn't benefit from an early return, we were going to be running it anyway; and so it was cheaper to piggy back off of its results rather than using a separate loop which, however more efficient, would have been more work overall.

This switch introduced a bug that we only recently discovered. Not every off-screen shape gets culled. We don't cull off-screen shapes if they're selected, if the user is editing the shape, or if they've self-identified as "please don't cull me" using the `ShapeUtil.canCull()` flag.

As a result, by relying on `getCulledShapes()` to know whether or not the viewport was empty, we guaranteed that the Back to Content button would never appear if the user had any selected shapes. The bug was hard to catch in part because the it was easy to fix. Whenever a user enters a panic scenario, such as being on an empty part of the canvas, their first action is to click on the canvas. Clicking the canvas will clear your selected / editing shape(s), thereby removing the culling exception for those shapes and fixing the bug.

The actual fix was to switch to `Editor.getNotVisibleShapes()` instead, which is calculated earlier and which does not include those exceptions.

This fix also re-enabled a feature that had essentially been disabled by the bug: when you have selected shapes and are on an empty part of the canvas, the "Back to content" button will bring you back to your selected shapes. If you don't have shapes selectd, then we run `zoomToFit()` instead, attempting to fit all of the shapes into the viewport.
