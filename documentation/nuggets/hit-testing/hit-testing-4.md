---
title: Hit testing
created_at: 12/21/2025
updated_at: 01/07/2026
keywords:
  - hit testing
  - geometry
  - selection
  - hollow shapes
  - winding number
readability: 8
voice: 8
potential: 8
accuracy: 9
notes: "Good v1→v2 narrative arc. Uses 'we' consistently, honest about tradeoffs. The signed distance insight and hollow shape problems are genuinely interesting. Minor: two bullet points with em-dashes approach the bolded-header pattern."
---

# Hit testing

When you click on the canvas, tldraw needs to figure out which shape is under your pointer. This sounds simple: loop through shapes, check if the point is inside each one, return the topmost hit. But hollow rectangles should be selectable by clicking inside them, not just on their edges. Nested hollow shapes need a way to pick the inner one. And checking every shape on every pointer move gets slow fast.

We've iterated on hit testing quite a bit. The first version of tldraw leaned heavily on DOM-based pointer events. The current version uses a purely geometric system. The journey between them taught us a lot about what makes hit testing feel right.

## How tldraw v1 did it

In the first version, shapes were simple data objects rendered directly to SVG:

```typescript
export const BoxComponent = TLShapeUtil.Component<BoxShape, SVGSVGElement>(
  ({ shape, events, isGhost, meta }, ref) => {
    return (
      <SVGContainer ref={ref} {...events}>
        <rect
          ...
          pointerEvents="all"
        />
      </SVGContainer>
    )
  }
)
```

Each geometric shape was rendered with three SVG layers. The topmost layer was an invisible hit path with pointer events enabled—its stroke-width was larger than the visible stroke so users could grab shapes easily. The second layer was an optional fill. The third was the visible stroke.

Hit testing happened through the DOM. Pointer events targeted the topmost element under the cursor by working backwards through the rendering layers. For the narrow phase, we had shape-specific methods:

```typescript
hitTestPoint = (shape: T, point: number[]): boolean => {
	return (
		Utils.pointInBounds(point, this.getRotatedBounds(shape)) &&
		Utils.pointInEllipse(
			point,
			this.getCenter(shape),
			shape.radius[0],
			shape.radius[1],
			shape.rotation || 0
		)
	)
}
```

This worked well enough for simple cases. But z-index traversal on multiple DOM elements led to some frustrating interaction bugs.

## The hollow shape problem

The most noticeable issue was with arrow bindings to hollow shapes. When a child shape had a higher z-index than its parent, arrows could find and bind to it normally. But when the child had a lower z-index, the arrow couldn't find it—the parent's DOM element intercepted the pointer event first.

Since both shapes are hollow, there's no visual difference between these cases. They shouldn't behave differently, but they did.

A similar problem appeared with groups. When a child shape inside a group had a lower z-index than the group itself, you couldn't select it by clicking within its bounds. The group's bounds captured the event.

There were also cases where the DOM model just fought against what we wanted. Hover over blank space inside a group, and the whole group lights up. Separating that behavior would mean fighting against the pointer-events model—adding events selectively, handling transform and zoom implications, managing event delegation to children. It got messy.

## Moving to pure geometry

In the current version, bounds and hit detection happen in a purely geometric system. We don't use pointer events on shape elements at all. Instead, geometric calculations happen at hit-test time.

This separation gives us more control. Shape calculations remain standard, but we can handle complex interaction cases without wrestling with the DOM. It also avoids rendering the extra invisible DOM elements we used for hit testing—less DOM pollution means fewer bugs and less memory overhead.

The core of the new approach is a single function: `getShapeAtPoint`. It determines what shape, if any, is under a given point.

## The algorithm

The function starts by ordering shapes on the page. We want to hit topmost shapes first, so we iterate backwards through the z-index-sorted list:

```typescript
const shapesToCheck = (
  opts.renderingOnly
    ? this.getCurrentPageRenderingShapesSorted()
    : this.getCurrentPageShapesSorted()
).filter((shape) => {
  if (
    (shape.isLocked && !hitLocked) ||
    this.isShapeHidden(shape) ||
    this.isShapeOfType(shape, 'group')
  )
    return false
  const pageMask = this.getShapeMask(shape)
  if (pageMask && !pointInPolygon(point, pageMask)) return false
  if (filter && !filter(shape)) return false
  return true
})

for (let i = shapesToCheck.length - 1; i >= 0; i--) {
  const shape = shapesToCheck[i]
  // ...
```

The filter rules out obvious non-contenders: locked shapes, hidden shapes, groups (which are never directly selectable), and shapes outside their clip mask.

That `pointInPolygon` check uses the winding number algorithm. It counts how many times the polygon winds around the test point—a non-zero winding number means the point is inside. We use winding number instead of ray casting because it handles self-intersecting polygons correctly. When someone draws a figure-8 freehand, the algorithm still works.

## Labels get priority

Labels need special handling. Users can add labels to arrows, sticky notes, and geometric shapes. When you click on a label, you should hit that shape immediately—it's the most concrete part of an otherwise empty hollow shape.

```typescript
if (
	this.isShapeOfType(shape, 'frame') ||
	((this.isShapeOfType(shape, 'note') ||
		this.isShapeOfType(shape, 'arrow') ||
		(this.isShapeOfType(shape, 'geo') && shape.props.fill === 'none')) &&
		this.getShapeUtil(shape).getText(shape)?.trim())
) {
	for (const childGeometry of (geometry as Group2d).children) {
		if (childGeometry.isLabel && childGeometry.isPointInBounds(pointInShapeSpace)) {
			return shape
		}
	}
}
```

This also handles frame headers, so users can click on a frame's title to select it.

## Frames

Frames weren't in tldraw v1, so this was a new case to handle. If you click close to a frame's edge, you select the frame. If you click inside the frame but on empty space, you shouldn't select the frame—you're probably trying to start a selection brush or interact with something behind it. But if you click inside the frame on a shape, that shape should be hit.

```typescript
if (this.isShapeOfType(shape, 'frame')) {
	const distance = geometry.distanceToPoint(pointInShapeSpace, hitFrameInside)
	if (
		hitFrameInside
			? (distance > 0 && distance <= outerMargin) || (distance <= 0 && distance > -innerMargin)
			: distance > 0 && distance <= outerMargin
	) {
		return inMarginClosestToEdgeHit || shape
	}

	if (geometry.hitTestPoint(pointInShapeSpace, 0, true)) {
		return (
			inMarginClosestToEdgeHit || inHollowSmallestAreaHit || (hitFrameInside ? shape : undefined)
		)
	}
	continue
}
```

One nice side effect of iterating in reverse z-order: when we hit a frame's empty space, we return and stop searching. This automatically occludes shapes behind the frame without needing a special case.

## Broad and narrow phase

For standalone shapes, we do a two-phase check. The broad phase is cheap—just check if the point is anywhere near the shape's bounding box:

```typescript
if (outerMargin === 0 && (geometry.bounds.w < 1 || geometry.bounds.h < 1)) {
	distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
} else {
	if (geometry.bounds.containsPoint(pointInShapeSpace, outerMargin)) {
		distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
	} else {
		distance = Infinity
	}
}
```

There's one edge case here. For very thin shapes—lines with width or height less than 1 pixel—the broad phase would fail because the bounding box is so small. For these, we skip straight to the distance calculation.

The narrow phase computes a signed distance: positive if the point is outside the shape, negative if inside. This turns out to be the key abstraction that makes everything else work.

## Filled shapes return immediately

For filled shapes, the logic is simple. If the point is within the shape (distance <= margin), return it. Since we're iterating from topmost to bottommost, this shape would occlude anything behind it anyway.

```typescript
if (geometry.isFilled || (isGroup && geometry.children[0].isFilled)) {
	return inMarginClosestToEdgeHit || shape
}
```

If we've already found a hollow shape close to the edge, we return that instead—more on this below.

## Dancing around margins for hollow shapes

The tricky part is hollow shapes. Two variables track candidates as we iterate:

- `inMarginClosestToEdgeHit` — the hollow shape whose edge is closest to the point
- `inHollowSmallestAreaHit` — the smallest hollow shape containing the point

When we had hollow shapes on top of filled shapes, arrows couldn't bind to the hollow shape. The filled shape would return immediately since the point was "inside" it. To fix this, we made arrow bindings sensitive to whether the point is inside or outside hollow shapes.

The margin can now be a tuple: `[innerMargin, outerMargin]`. This lets us detect when the pointer is inside a hollow shape's bounds and prioritize it over a filled shape underneath:

```typescript
if (
	hitInside
		? (distance > 0 && distance <= outerMargin) || (distance <= 0 && distance > -innerMargin)
		: Math.abs(distance) <= Math.max(innerMargin, outerMargin)
) {
	if (Math.abs(distance) < inMarginClosestToEdgeDistance) {
		inMarginClosestToEdgeDistance = Math.abs(distance)
		inMarginClosestToEdgeHit = shape
	}
}
```

When `hitInside` is true, we can tell whether the point is inside or outside the shape (the distance sign tells us). When it's false—like when hovering—we don't know, so we check against the larger of the two margins.

## Smallest area as tiebreaker

If the point isn't within margin distance of any edge but is inside multiple hollow shapes, we fall back to area. The assumption is that you're trying to select the innermost shape—the one with the smallest area.

```typescript
else if (!inMarginClosestToEdgeHit) {
  const { area } = geometry
  if (area < inHollowSmallestArea) {
    inHollowSmallestArea = area
    inHollowSmallestAreaHit = shape
  }
}
```

This also lets users select hollow shapes by clicking anywhere inside them, not just on the edge.

There's a known limitation here: self-intersecting hollow shapes, like a figure-8 drawing, can confuse this logic. The area calculation doesn't know which region you meant to click inside. We've accepted this tradeoff since self-intersecting hollow shapes are rare.

## Wrapping up

At the end of the loop, we return whatever we found:

```typescript
return inMarginClosestToEdgeHit || inHollowSmallestAreaHit || undefined
```

Priority goes to shapes with close edges, then to the smallest hollow shape, then nothing.

The geometric approach has been worth the complexity. We have precise control over hit detection, the DOM stays clean, and the interaction bugs from v1 are gone. The signed distance abstraction—knowing both containment and proximity in a single number—turns out to be powerful enough to handle filled shapes, hollow shapes, margins, and overlapping containers with the same basic algorithm.

---

**Source files:**

- Hit testing algorithm: `/packages/editor/src/lib/editor/Editor.ts` (`getShapeAtPoint`, line 5198)
- Point in polygon: `/packages/editor/src/lib/primitives/utils.ts` (`pointInPolygon`, line 319)
- Geometry base class: `/packages/editor/src/lib/primitives/geometry/Geometry2d.ts`
