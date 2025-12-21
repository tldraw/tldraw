---
title: The three-tier cascade in brush selection
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - brush
  - scribble
  - selection
---

# The three-tier cascade in brush selection

On a page with 5,000 shapes, brush selection needs to stay responsive. Every pointer move recomputes which shapes are selected. The naive approach—test every shape's full geometry against the brush rectangle—would be unusable at scale.

We use a three-tier cascade that eliminates most shapes before doing any real geometry work.

## Tier 1: Complete containment

If the brush completely contains a shape's bounding box, the shape is definitely selected. No geometry test needed—a box inside a box is trivially intersecting.

```typescript
// packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts
if (brush.contains(pageBounds)) {
    this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
    continue testAllShapes
}
```

The `Box.Contains` check is four comparisons:

```typescript
// packages/editor/src/lib/primitives/Box.ts
static Contains(A: Box, B: Box) {
    return A.minX < B.minX && A.minY < B.minY && A.maxY > B.maxY && A.maxX > B.maxX
}
```

When you're drawing a large selection rectangle, this catches most shapes immediately. They're fully inside, so we add them and move on.

## Tier 2: Wrap mode check

If we're in wrap mode (shapes must be completely enclosed to select), and tier 1 didn't pass, the shape isn't selected. Skip it.

```typescript
if (isWrapping || editor.isShapeOfType(shape, 'frame')) {
    continue testAllShapes
}
```

Wrap mode is toggled by holding Ctrl. Frames always require wrap mode regardless of the setting—you can't accidentally select a frame by brushing across its edge.

This tier costs nothing. If the shape didn't pass containment and we need containment, there's no point testing further.

## Tier 3: Edge intersection

If the shape's bounds collide with the brush but aren't fully contained, we need to test actual geometry. The brush might overlap the bounding box but not touch the shape itself (imagine a small circle in a corner of its bounds).

But we don't test the full shape. We test whether any of the brush's four edges intersect the shape's geometry:

```typescript
if (brush.collides(pageBounds)) {
    pageTransform = editor.getShapePageTransform(shape)
    localCorners = pageTransform.clone().invert().applyToPoints(corners)
    const geometry = editor.getShapeGeometry(shape)

    for (let i = 0; i < 4; i++) {
        A = localCorners[i]
        B = localCorners[(i + 1) % 4]
        if (geometry.hitTestLineSegment(A, B, 0)) {
            this.handleHit(shape, currentPagePoint, currentPageId, results, corners)
            break
        }
    }
}
```

Four line segment tests against the shape's geometry. If any edge of the brush crosses any edge of the shape, it's a hit.

## The viewport optimization

Before any of this, we filter which shapes to even consider:

```typescript
// On a page with ~5000 shapes, on-screen hit tests are about 2x faster than
// testing all shapes.

const brushBoxIsInsideViewport = editor.getViewportPageBounds().contains(brush)
const shapesToHitTest =
    brushBoxIsInsideViewport && !this.viewportDidChange
        ? editor.getCurrentPageRenderingShapesSorted()
        : editor.getCurrentPageShapesSorted()
```

If the brush is entirely within the viewport and the viewport hasn't scrolled during this drag, we only test shapes currently being rendered. Shapes outside the viewport are culled by the rendering system anyway—no need to test them.

This is a 2x speedup on dense pages. But it comes with a condition: if you scroll while brushing, we have to test all shapes. The viewport change detection tracks this:

```typescript
this.cleanupViewportChangeReactor = react('viewport change while brushing', () => {
    editor.getViewportPageBounds()
    if (!isInitialCheck && !this.viewportDidChange) {
        this.viewportDidChange = true
    }
})
```

Once the viewport moves, `viewportDidChange` becomes true and stays true for the rest of the interaction. This prevents shapes from being missed during edge scrolling.

## Early exclusion

Before the cascade even runs, we build an exclusion set of shapes that can never be selected:

```typescript
this.excludedShapeIds = new Set(
    editor
        .getCurrentPageShapes()
        .filter(
            (shape) => editor.isShapeOfType(shape, 'group') || editor.isShapeOrAncestorLocked(shape)
        )
        .map((shape) => shape.id)
)
```

Groups and locked shapes are excluded upfront. We pay this cost once at the start, not on every frame.

## Why this matters

On a page with thousands of shapes, the cascade eliminates almost all work:

- Most shapes aren't in the viewport (viewport culling)
- Most shapes in the viewport aren't near the brush (bounds collision fails)
- Of shapes near the brush, many are fully contained (tier 1)
- Of the remainder, many are filtered by wrap mode (tier 2)
- Only a handful need actual geometry tests (tier 3)

The geometry test—`hitTestLineSegment`—is the expensive part. The cascade ensures we rarely reach it. A large brush that contains hundreds of shapes might never do a single geometry test; containment catches everything.

## Key files

- `packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts` — The full cascade implementation
- `packages/editor/src/lib/primitives/Box.ts:416` — `Contains` and `Collides` methods
- `packages/editor/src/lib/primitives/geometry/Geometry2d.ts:146` — `hitTestLineSegment`
