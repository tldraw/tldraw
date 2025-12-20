# Hit testing: what's under the pointer?

When you click on a canvas with thousands of overlapping shapes, tldraw needs to figure out which one you meant to click. This sounds simple—just check if the point is inside each shape—but the real implementation handles filled vs hollow shapes, nested frames with clipping, grouped shapes, and performance at scale. Here's how it works.

## The basic problem

Given a point (where you clicked) and a list of shapes, return the shape you probably wanted to select. The naive approach: iterate through all shapes, check if the point is inside each one, return the topmost hit. This breaks down quickly:

- **Hollow shapes**: A rectangle with no fill shouldn't block clicks to shapes behind it—unless you click on its edge
- **Overlapping hollow shapes**: If two hollow rectangles overlap, clicking inside both should select the smaller one
- **Frames**: Shapes inside frames should only be clickable within the frame's bounds
- **Groups**: Clicking a grouped shape should select the group, but you still need to know which child was hit
- **Touch input**: Fingers are imprecise; you need some margin of error

## Z-order iteration

The algorithm starts by getting all shapes sorted by z-index, then iterates in reverse order (topmost first). The first shape that passes all hit tests wins.

```typescript
// packages/editor/src/lib/editor/Editor.ts
const sortedShapes = this.getCurrentPageShapesSorted()

for (let i = sortedShapes.length - 1; i >= 0; i--) {
	const shape = sortedShapes[i]
	// ... hit test logic
}
```

This ensures that when shapes overlap, the one visually "on top" gets selected. The sorting respects parent-child hierarchy—children always appear after their parents in the sorted array, so a shape inside a group is tested before the group itself.

## Distance, not boolean

The key insight: hit testing returns a *distance*, not just true/false. Each shape's geometry can compute the distance from any point to its nearest edge:

```typescript
const geometry = editor.getShapeGeometry(shape)
const pointInShapeSpace = editor.getPointInShapeSpace(shape, point)
const distance = geometry.distanceToPoint(pointInShapeSpace)
```

The distance uses a sign convention:
- **Negative**: Point is inside the shape (distance to nearest edge, negated)
- **Positive**: Point is outside (distance to nearest edge)
- **Zero**: Point is exactly on the edge

This lets us handle filled and hollow shapes with the same code path. A filled shape hits when `distance <= margin`. A hollow shape hits when `Math.abs(distance) <= margin`—the point must be near the edge, whether inside or outside.

## Filled vs hollow shapes

Filled shapes are simple: if the point is inside (negative distance), it's a hit. But hollow shapes create an interesting problem. Consider two unfilled rectangles, one inside the other:

```
┌─────────────────────┐
│                     │
│    ┌─────────┐      │
│    │         │      │
│    │    •    │      │
│    │         │      │
│    └─────────┘      │
│                     │
└─────────────────────┘
```

Clicking at the dot is "inside" both rectangles. Which one should be selected?

The answer: the smaller one. When multiple hollow shapes overlap, tldraw tracks the one with the smallest area and returns that as a fallback. This matches user intuition—you're more likely trying to select the inner shape than the outer one.

```typescript
// Track hollow shape with smallest area as fallback
if (hollowHit && geometry.area < smallestHollowArea) {
	smallestHollowArea = geometry.area
	smallestHollowHit = shape
}
```

## Frame clipping

Shapes inside frames should only be clickable within the frame's bounds. This is handled through clip paths—polygons that define the visible region for each shape.

```typescript
const pageMask = editor.getShapeMask(shape.id)
if (pageMask && !pointInPolygon(point, pageMask)) {
	continue // Point outside mask, skip this shape
}
```

For nested frames, clip paths are intersected. A shape three frames deep has a mask that's the intersection of all three frame boundaries. The mask is computed once and cached, so hit testing doesn't pay the cost of recalculating it.

## Broad phase, narrow phase

Computing distance to a complex polygon is expensive. Before doing that work, tldraw checks if the point is even close to the shape's bounding box:

```typescript
// Broad phase: cheap bounding box check
const bounds = geometry.bounds
if (!bounds.containsPoint(pointInShapeSpace, margin)) {
	continue // Not even close, skip expensive calculation
}

// Narrow phase: actual distance computation
const distance = geometry.distanceToPoint(pointInShapeSpace)
```

For a canvas with 10,000 shapes, most will fail the broad phase instantly. Only shapes whose bounding boxes contain the point proceed to the expensive geometry calculation.

There's one exception: very thin shapes (width or height less than 1 pixel) skip the broad phase entirely. A horizontal line has almost no bounding box height, so the broad phase would reject valid hits.

## Geometry types

Different shapes implement distance calculation differently. The `Geometry2d` base class defines the interface; subclasses provide the math.

**Polyline2d** (open paths like draw strokes): Find the nearest point on any segment, return distance to that point.

**Polygon2d** (closed shapes): Same as polyline, but also check if point is inside using ray casting. If inside and the shape is filled, return negative distance.

**Group2d** (compound shapes): Container for multiple child geometries. Distance is the minimum distance to any child. This handles shapes with labels—the label is a child geometry that can be hit independently.

**Rectangle2d**, **Circle2d**, **Stadium2d**: Optimized implementations for common shapes that avoid the general polygon math where possible.

## Hit test margin

Clicking exactly on a 1-pixel line is nearly impossible, especially on touch devices. The hit test margin provides forgiveness:

```typescript
const hitTestMargin = editor.options.hitTestMargin // default: 8
const adjustedMargin = hitTestMargin / zoomLevel
```

The margin shrinks as you zoom in. At 100% zoom, you have 8 pixels of forgiveness. At 400% zoom, you have 2 pixels. This feels natural—when zoomed in, you have more precision, so less forgiveness is needed.

The margin can also be asymmetric. The `margin` option accepts `[innerMargin, outerMargin]` for shapes where you want different behavior inside vs outside the boundary.

## Labels and special cases

Some shapes have text labels that should be independently clickable. Arrows, frames, notes, and unfilled geo shapes all support labels. When hit testing these shapes, the label geometry is checked first:

```typescript
if (shape.props.text && geometry instanceof Group2d) {
	const labelGeometry = geometry.children.find(c => c.isLabel)
	if (labelGeometry) {
		const labelDistance = labelGeometry.distanceToPoint(point)
		if (labelDistance <= margin) return shape
	}
}
```

This ensures clicking on an arrow's label selects the arrow, even if the label is positioned over another shape.

## Performance at scale

Several caching layers keep hit testing fast:

- **Geometry cache**: Shape geometry is computed once and cached until the shape changes
- **Transform cache**: Page transforms are cached per shape
- **Mask cache**: Clip path intersections are cached per shape
- **Culling**: Shapes outside the viewport aren't rendered and can optionally be excluded from hit testing

The algorithm is O(n) in the worst case—you might need to check every shape. But in practice, the broad phase rejects most shapes immediately, and caching ensures repeat calculations are cheap.

## Key files

- `packages/editor/src/lib/editor/Editor.ts:5198` — `getShapeAtPoint()` main entry point
- `packages/editor/src/lib/primitives/geometry/Geometry2d.ts` — Base geometry class with `distanceToPoint()`
- `packages/editor/src/lib/primitives/geometry/Polyline2d.ts` — Open path geometry
- `packages/editor/src/lib/primitives/geometry/Polygon2d.ts` — Closed shape geometry
- `packages/editor/src/lib/primitives/geometry/Group2d.ts` — Compound geometry for shapes with labels
- `packages/editor/src/lib/primitives/utils.ts:319` — `pointInPolygon()` ray casting implementation
