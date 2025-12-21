---
title: Hit testing
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - hit testing
  - geometry
  - selection
---

# Hit testing hollow shapes

When you click inside a hollow rectangle in tldraw, you select the rectangle, not whatever's behind it. That makes sense—the point is inside the shape's bounds. But what happens when you nest multiple hollow shapes? If you draw a small hollow rectangle inside a larger hollow rectangle, both shapes contain the click point. Which one wins?

We faced this problem with any overlapping hollow shapes: frames, unfilled geo shapes, hollow arrows. The click point is technically inside all of them. We needed a tiebreaker that felt right.

## The edge distance check

The first check is straightforward: which shape's edge is closest to the click point? If you click near the border of the inner rectangle, you're probably trying to select it, even though the outer rectangle also contains that point.

```typescript
if (Math.abs(distance) < inMarginClosestToEdgeDistance) {
  inMarginClosestToEdgeDistance = Math.abs(distance)
  inMarginClosestToEdgeHit = shape
}
```

This works most of the time. Click near an edge, get that shape. But what if you click in the dead center of a nested configuration—equidistant from all edges? Or what if the margins overlap and multiple edges are equally close?

## The smallest area fallback

When edge distance doesn't resolve the ambiguity, we fall back to area. We assume you're trying to select the innermost shape, which has the smallest area.

```typescript
const { area } = geometry
if (area < inHollowSmallestArea) {
  inHollowSmallestArea = area
  inHollowSmallestAreaHit = shape
}
```

This is computed using the shoelace formula:

```typescript
getArea() {
  if (!this.isClosed) return 0
  const { vertices } = this
  let area = 0
  for (let i = 0, n = vertices.length; i < n; i++) {
    const curr = vertices[i]
    const next = vertices[(i + 1) % n]
    area += curr.x * next.y - next.x * curr.y
  }
  return area / 2
}
```

The formula sums cross products of consecutive vertices. It's fast and works for any polygon, regardless of whether it's convex or has rotations applied.

## Viewport-sized shapes get skipped

One edge case: we skip hollow shapes larger than the viewport entirely.

```typescript
// If the shape is bigger than the viewport, then skip it.
if (this.getShapePageBounds(shape)!.contains(viewportPageBounds)) continue
```

Without this check, a huge hollow frame in the background would win every single click inside it. You'd never be able to select anything nested inside. So we ignore shapes that are viewport-sized or larger—they're treated as pure containers, not selectable targets.

## Label regions override everything

Hollow shapes with text get special handling. The label is a separate child geometry in a Group2d, and we check it before any of the hollow shape logic runs.

```typescript
for (const childGeometry of (geometry as Group2d).children) {
  if (childGeometry.isLabel && childGeometry.isPointInBounds(pointInShapeSpace)) {
    return shape
  }
}
```

Click on the label region of a hollow frame or geo shape, and you select that shape immediately—no edge distance or area checks. This feels right because labels are the most concrete part of an otherwise empty shape.

## The final priority

The hit testing algorithm tracks these candidate values as it iterates through shapes in reverse z-order:

1. `inMarginClosestToEdgeHit` — Shape with closest edge within margin
2. `inHollowSmallestAreaHit` — Hollow shape with smallest area

At the end, the priority is:

```typescript
return inMarginClosestToEdgeHit || inHollowSmallestAreaHit || undefined
```

Edge distance beats area. Area is the fallback when no edge is close enough. If neither candidate exists, you clicked in empty space.

## Limitations

This approach works well for typical nested rectangles and frames, but it has blind spots. Self-intersecting hollow shapes—like a figure-8 drawn with the draw tool—can confuse the area calculation. The shoelace formula doesn't know which region you meant to click inside.

We've accepted this tradeoff. Self-intersecting hollow shapes are rare enough that the complexity of handling them correctly isn't worth the cost. For the common case—nested frames and geo shapes—edge distance and smallest area solve the problem cleanly.

---

**Source files**:
- Hit testing entry point: `/packages/editor/src/lib/editor/Editor.ts` (line 5198, `getShapeAtPoint` method)
- Area calculation: `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts` (line 362, `getArea` method)
