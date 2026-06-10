# Eraser research notes

## Key files

- `packages/tldraw/src/lib/tools/EraserTool/EraserTool.ts` — tool StateNode, children: idle, pointing, erasing
- `packages/tldraw/src/lib/tools/EraserTool/childStates/Pointing.ts` — click erasing (single point test, top-down z-order walk, accel key = top shape only, frame-like stop rule)
- `packages/tldraw/src/lib/tools/EraserTool/childStates/Erasing.ts` — drag erasing, THE core of the post
- `packages/editor/src/lib/primitives/geometry/Geometry2d.ts` — base `hitTestLineSegment` / `distanceToLineSegment` (lines 120–149)
- `packages/editor/src/lib/primitives/geometry/Circle2d.ts` — analytic override via `intersectLineSegmentCircle`
- `packages/editor/src/lib/primitives/geometry/Arc2d.ts` — circle intersection + angular range check
- `packages/editor/src/lib/primitives/geometry/Polyline2d.ts`, `Stadium2d.ts`, `CubicSpline2d.ts`, `Group2d.ts` — delegate to component segments/children
- `packages/editor/src/lib/primitives/intersect.ts` — `intersectLineSegmentLineSegment`, `intersectLineSegmentCircle` (quadratic formula)
- `packages/editor/src/lib/editor/managers/ScribbleManager/ScribbleManager.ts` — eraser trail
- `packages/tldraw/src/test/EraserTool.test.ts` — behavior tests

## Erasing.ts update() flow (verified against source, lines 81–155)

1. `previousPagePoint = editor.inputs.getPreviousPagePoint()`, `currentPagePoint = editor.inputs.getCurrentPagePoint()`
2. `pushPointToScribble()` — visual trail
3. `minDist = editor.options.hitTestMargin / zoomLevel` — zoom-scaled margin
4. Broad phase: `Box.FromPoints([previousPagePoint, currentPagePoint]).expandBy(minDist)` → `editor.getShapeIdsInsideBounds(lineBounds)`; early return if empty (skips expensive `getCurrentPageRenderingShapesSorted()`)
5. Per candidate shape:
   - skip groups
   - skip masked shapes unless `pointInPolygon(currentPagePoint, pageMask)`
   - transform A (prev) and B (curr) into shape space: `pt = pageTransform.clone().invert()`
   - AABB rejection vs `geometry.bounds` expanded by `minDist`
   - `geometry.hitTestLineSegment(A, B, minDist)` → add `getOutermostSelectableShape(shape)` to erasing set (or, if outermost is excluded, outermost not in excluded set)
6. Erasing set only grows ("hit before plus any new shapes that are hit"); `setErasingShapes` filtered by excludedShapeIds

## onEnter (lines 14–53)

- `markHistoryStoppingPoint('erase scribble begin')` → cancel = `bailToMark`
- excludedShapeIds: locked shapes/ancestors; groups & frame-like shapes whose bounds contain the origin point (so you can erase children inside a frame/group without erasing the container)
- seeds erasing set with `getShapesAtPoint(originPagePoint)`
- adds scribble `{ color: 'muted-1', size: 12 }`

## complete/cancel

- complete: `editor.deleteShapes(editor.getCurrentPageState().erasingShapeIds)` → idle
- cancel: `editor.bailToMark(this.markId)`
- Marked shapes render semi-transparent via erasingShapeIds page state

## Geometry2d base (verified, lines 120–149)

```ts
distanceToLineSegment(A, B, filters?) {
  if (Vec.Equals(A, B)) return this.distanceToPoint(A, false, filters)
  const { vertices } = this
  // ...
  const nextLimit = this.isClosed ? vertices.length : vertices.length - 1
  for (let i = 0; i < vertices.length; i++) {
    p = vertices[i]
    if (i < nextLimit) {
      const next = vertices[(i + 1) % vertices.length]
      if (linesIntersect(A, B, p, next)) return 0   // early exit on edge crossing
    }
    q = Vec.NearestPointOnLineSegment(A, B, p, true)
    d = Vec.Dist2(p, q)
    if (d < dist) { dist = d; nearest = q }
  }
  dist = Math.sqrt(dist)
  return this.isClosed && this.isFilled && pointInPolygon(nearest, this.vertices) ? -dist : dist
}

hitTestLineSegment(A, B, distance = 0, filters?) {
  return this.distanceToLineSegment(A, B, filters) <= distance
}
```

- Negative distance when the nearest point lies inside a closed, filled geometry → hitTest passes for segments fully inside filled shapes.
- Hollow shapes: only the outline registers (matches hitTestPoint semantics).

## Overrides

- Circle2d: `intersectLineSegmentCircle(A, B, center, radius + distance) !== null`
- Arc2d: circle intersection then `getPointInArcT` range check
- Polyline2d/Stadium2d/CubicSpline2d/Ellipse2d: test component segments/edges/arcs
- Group2d: any non-filtered child
- TransformedGeometry2d: transforms A/B by inverse, scales distance by `1 / decomposed.scaleX`

## Interesting angles for the post

- Pointer events are discrete samples; fast flicks leave gaps of hundreds of px → point-based eraser would "tunnel" through shapes (same problem as bullet-through-paper / tunneling in game physics)
- The fix: erase along the segment between consecutive samples, so coverage is continuous
- Reuse: the geometry system already needed segment tests; eraser piggybacks on Geometry2d
- Performance layering: spatial index bounds query → per-shape AABB reject → exact geometry test
- Shape-space transform handles rotation/scale without special cases
- Zoom-scaled margin keeps eraser feel constant on screen
- Sticky set: once a shape is hit it stays marked even if the pointer moves away; commit on pointer up
