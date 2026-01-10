---
title: Back to content
created_at: 01/07/2025
updated_at: 01/10/2025
draft-notes: 'Improved accuracy of code examples to match actual implementation. Fixed canCull() omission in notVisibleShapes explanation. Corrected coordinate space formulas. Simplified shape bounds section since the real implementation is simpler than previous draft.'
keywords:
  - navigation
  - culling
  - viewport
  - UX
readability: 9
voice: 9
potential: 8
accuracy: 9
notes: 'Strong bug-first opening with natural flow. Voice is good with proper "we" usage. Code examples now match source accurately including canCull(), viewport bounds (-cx, -cy), and screenToPage formula. The notVisibleShapes visibility check code matches exactly.'
---

We recently fixed a bug in tldraw's "Back to content" button that had been hiding in plain sight for months. The button is supposed to appear when you've panned to an empty part of the canvas. Sometimes it did, sometimes it didn't.

We finally tracked it down to an optimization we'd made while working on a different feature, off-screen shape culling, that was preventing the button from appearing if you had any shapes selected. The bug was hard to catch because the first thing a lost user does is click on the canvas, which clears their selection and makes the button appear.

The fix was a one-line change, but understanding why it worked requires understanding how we track what's visible on an infinite canvas.

## Two ways to be invisible

When you pan away from your shapes, those shapes are still there, just off-screen. We track this in two different ways, and confusing them caused the bug.

**Not visible shapes** are shapes whose bounding boxes don't intersect with the viewport. But there's a twist: shapes can opt out of this list by returning `false` from their `canCull()` method. Custom shapes might need to stay "visible" for hit testing or other reasons even when off-screen.

**Culled shapes** are shapes we don't bother rendering. This starts with the not-visible shapes, but removes a few exceptions. We don't cull selected shapes (you might be dragging them back on screen). We don't cull shapes you're editing, which might have internal state.

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

The fix was to use `getNotVisibleShapes()` instead, which doesn't care about selection state, just about what's off-screen.

## How we detect visibility

Detecting whether shapes are visible means comparing two things: the viewport (what the user can see) and the shapes' bounding boxes (where the shapes are). To make these comparisons, both boxes need to be in the same coordinate space.

### Coordinate spaces

Like a 2D game engine, tldraw works with two coordinate spaces. "Screen space" is actual pixels on the user's display. "Page space" is positions within the infinite canvas.

The camera converts between them. To go from screen space to page space, we subtract the screen offset (where the canvas element sits in the browser window), divide by zoom, then subtract the camera position:

```ts
screenToPage(point) {
    const { x: cx, y: cy, z: cz } = this.getCamera()
    return new Vec(
        (point.x - screenBounds.x) / cz - cx,
        (point.y - screenBounds.y) / cz - cy
    )
}
```

The `screenBounds` accounts for where the canvas element is positioned on the page. The camera's `z` component is the zoom level.

### Viewport bounds

The viewport is the visible region expressed in page space. We calculate it from the canvas element's screen size and the camera:

```ts
getViewportPageBounds() {
    const { w, h } = this.getViewportScreenBounds()
    const { x: cx, y: cy, z: cz } = this.getCamera()
    return new Box(-cx, -cy, w / cz, h / cz)
}
```

The negative camera values might look surprising. The camera stores how far the canvas has been "pulled" - a camera at `(100, 50)` means the origin is 100 units left and 50 units up from the top-left corner of the viewport. The viewport's position in page space is the opposite: `(-100, -50)`.

### Shape bounds

Each shape has a bounding box in page space. We compute this by getting the shape's page transform (a matrix encoding its position, rotation, and any ancestor transforms for nested shapes) and applying that to the shape's local bounds:

```ts
getShapePageBounds(shape) {
    const pageTransform = this.getShapePageTransform(shape)
    return Box.FromPoints(
        pageTransform.applyToPoints(this.getShapeGeometry(shape).boundsVertices)
    )
}
```

These calculations are cached and only recomputed when relevant properties change.

## The visibility check

With viewport and shape bounds in the same space, detecting visibility is a box intersection test:

```ts
// From notVisibleShapes.ts - inlined for performance
if (
    pageBounds.maxX >= viewMinX &&
    pageBounds.minX <= viewMaxX &&
    pageBounds.maxY >= viewMinY &&
    pageBounds.minY <= viewMaxY
) {
    // Shape is visible
    continue
}
```

We run this for every shape on the page. If none are visible, we show "Back to content."

## What the fix restored

Beyond fixing the bug, switching to `getNotVisibleShapes()` re-enabled a feature that had been silently broken: when you have shapes selected and pan to an empty area, "Back to content" now takes you back to your selected shapes specifically, not just to any content. If nothing is selected, we zoom to fit all shapes on the page.

The distinction between "not visible" and "culled" exists for good reasons. Rendering optimization and selection UX are different concerns. The bug came from using the wrong concept for the job.
