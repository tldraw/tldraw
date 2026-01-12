---
title: Hit testing - code history
created_at: 2026-01-12
updated_at: 2026-01-12
keywords:
  - history
  - hit testing
  - geometry
  - selection
  - signed distance
status: reference
---

# Hit testing - code history

This document traces the evolution of tldraw's hit testing implementation through its git history. The system has undergone significant changes from DOM-based pointer events to a purely geometric approach.

## Timeline

### 2023-07-25 - The geometry rewrite
Commit: d750da8f4 (`ShapeUtil.getGeometry`, selection rewrite #1751)

**This was the foundational change.** Steve rewrote the entire selection and hit testing system, moving from DOM-based pointer events to pure JavaScript geometry calculations.

**What changed:**
- Replaced `getBounds`, `getOutline`, `hitTestPoint`, `hitTestLineSegment` with a unified `getGeometry` API
- Moved all hit testing from DOM events to geometric calculations
- Introduced the `Geometry2d` class hierarchy: `Arc2d`, `Circle2d`, `CubicBezier2d`, `Edge2d`, `Ellipse2d`, `Group2d`, `Polygon2d`, `Rectangle2d`, `Stadium2d`
- Added support for selecting "hollow" shapes by clicking inside them
- Removed hit-testing DOM elements from ShapeFill components
- Added 100+ new selection tests

**The key insight from the commit message:**
> "We now support selecting 'hollow' shapes by clicking inside of them. This involves a lot of new logic but it should work intuitively. See `Editor.getShapeAtPoint` for the (thoroughly commented) implementation."

**Why this mattered:**
The DOM-based approach had z-index traversal bugs. When a child shape had a lower z-index than its parent, arrows couldn't bind to it because the parent's DOM element intercepted the pointer event first. With hollow shapes, there's no visual difference between these cases—they shouldn't behave differently.

**New geometry pattern:**
```typescript
class BoxyShapeUtil {
  getGeometry(shape: BoxyShape) {
    return new Rectangle2d({
      width: shape.props.width,
      height: shape.props.height,
      isFilled: true,
      margin: shape.props.strokeWidth
    })
  }
}
```

---

### 2023-08-13 - Selection logic refinements
Commit: 22329c51f ([improvement] More selection logic #1806)

**Refined hollow shape behavior:**
- Clicking inside a hollow shape no longer selects on pointer up—only edge clicks select
- Clicking a shape's filled label selects on pointer down
- Clicking an empty label selects on pointer up
- Arrows still hit inside hollow shapes using "smallest hovered" logic

**Why this changed:**
> "Previously, shapes with `fill: none` were also being selected on pointer up. I've removed that logic because it was producing wrong-feeling selections too often."

**Labels got special handling:**
> "Previously, we had listeners set on the text label elements; I've removed these and we now check the actual label bounds geometry for a hit."

---

### 2023-10-10 - Zero width/height line fix
Commit: e77005e50 ([fix] Hit testing against zero width/height lines #2060)

**Fixed a bug where straight lines couldn't be hit.**

A horizontal line has nearly zero height in its bounding box. The broad phase rejection was failing valid hits because `bounds.containsPoint` would return false even when clicking directly on the line.

**The fix:** Skip broad phase for shapes with width or height < 1 pixel.

```typescript
if (outerMargin === 0 && (geometry.bounds.w < 1 || geometry.bounds.h < 1)) {
  // Skip broad phase for thin shapes—always compute distance
  distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
}
```

---

### 2024-04-13 - Performance optimization
Commit: 3ceebc82f (Faster selection/erasing #3454)

**Optimized distance comparisons by avoiding square roots.**

Distances are measured multiple times per frame per shape. When comparing minimum distances, you don't need the actual distance—comparing squared distances works the same. This eliminated unnecessary `Math.sqrt` calls in hot paths.

---

### 2024-05-28 - Configurable hit test margin
Commit: a457a3908 (Move constants to options prop #3799)

**Made `hitTestMargin` configurable** via `editor.options`.

Previously hardcoded to 8 pixels, now can be overridden:
```typescript
const hitTestMargin = editor.options.hitTestMargin // default: 8
const adjustedMargin = hitTestMargin / zoomLevel
```

The margin shrinks with zoom: at 100% you get 8px forgiveness, at 400% you get 2px.

---

### 2025-04-03 - Geometry2d improvements
Commit: 3e2ed74b5 (Geometry2d Improvements #5754)

**Major API expansion** back-ported from elbow arrows work:

1. **Intersection helpers**: Added `Geometry2d.intersectLineSegment` and `Geometry2d.intersectCircle`
2. **Transformation**: `Geometry2d.transform` for efficient matrix transforms without transforming every point
3. **Filters**: Unified filtering system for ignoring labels, internal geometry, etc.

**New "internal" geometry concept:**
> "New here (& motivating this change) is a new way of designating parts of a group as 'internal' geometry—e.g. the lines within a geo shape that we might not want to partake in arrow binding."

---

### 2025-05-07 - Elbow arrows
Commit: 2c1fb1ac1 (Elbow arrows #5572)

**Added right-angled elbow arrows**, which required hit testing against more complex arrow geometries with multiple segments.

---

### 2025-06-24 - Frame handling overhaul
Commit: 6fbbca54f (Fix bug when a shape inside a frame is bigger than the frame #6139)

**Improved frame-related hit testing:**
- Hollow shapes with labels can be dropped into frames even if geometry is outside
- Shapes with fills can be dropped into frames even if geometry is outside
- Hollow frames without labels "fall out" if geometry is outside the parent frame
- Shapes kicked out of frames fall into other frames automatically

**Added `isEmptyLabel` property** to Geometry2d for better label handling.

---

### 2025-06-30 - Checkbox internal geometry fix
Commit: 5636c3b31 (Fix hit testing for checkbox geo shapes with internal geometries)

**Fixed hit testing for geo shapes with internal check marks.**

The checkbox's internal lines were being included in hit tests, causing unexpected behavior.

---

### 2025-08-06 - Inner/outer margin separation
Commit: f60032f16 (Fix edge hitting on arrows #6525)

**Fixed a long-standing bug** where hollow shapes couldn't be bound-to by arrows when overlapping solid filled shapes.

**The solution:** Separate inner and outer margins.

```typescript
// margin can now be [innerMargin, outerMargin]
const [innerMargin, outerMargin] = Array.isArray(margin) ? margin : [margin, margin]
```

**Why this was needed:**
When a hollow rectangle sits on top of a filled rectangle, clicking inside the hollow shape would hit the filled shape underneath because the point was technically "inside" both. With separate margins, the system can prioritize the hollow shape's interior.

---

## Key architectural decisions

### Signed distance as the core abstraction

The geometry rewrite introduced signed distance as the fundamental primitive:
- **Negative**: Point is inside the shape
- **Positive**: Point is outside the shape
- **Zero**: Point is exactly on the edge

This single number encodes both containment and proximity, enabling:
- Filled shapes: hit if `distance <= margin`
- Hollow shapes: hit if `Math.abs(distance) <= margin`
- Same algorithm, different thresholds

### Winding number over ray casting

The `pointInPolygon` function uses winding number instead of ray casting:
```typescript
if (a.y <= A.y) {
  if (b.y > A.y && cross(a, b, A) > 0) {
    windingNumber += 1
  }
} else if (b.y <= A.y && cross(a, b, A) < 0) {
  windingNumber -= 1
}
return windingNumber !== 0
```

**Why:** Winding number handles self-intersecting polygons (like figure-8 drawings) more robustly than ray casting.

### Broad phase / narrow phase separation

Every hit test does a cheap bounding box check before expensive distance calculation:
```typescript
if (geometry.bounds.containsPoint(pointInShapeSpace, margin)) {
  distance = geometry.distanceToPoint(pointInShapeSpace, hitInside)
} else {
  distance = Infinity
}
```

On a canvas with 10,000 shapes, most fail broad phase instantly—only shapes near the pointer do distance math.

### Hollow shape tiebreaking

When multiple hollow shapes contain the same point:
1. First priority: shape with closest edge within margin
2. Fallback: hollow shape with smallest area (assumes user wants inner shape)

Tracked via:
```typescript
let inMarginClosestToEdgeHit: TLShape | null = null
let inHollowSmallestAreaHit: TLShape | null = null
```

---

## Problems solved along the way

| Date | Problem | Solution |
|------|---------|----------|
| 2023-07 | Arrows couldn't bind to hollow shapes with lower z-index | Moved from DOM events to geometric hit testing |
| 2023-08 | Hollow shapes selecting too eagerly on pointer up | Only select on edge click, not interior |
| 2023-10 | Couldn't hit straight horizontal/vertical lines | Skip broad phase for thin shapes |
| 2024-04 | Hit testing too slow on large canvases | Avoid sqrt in distance comparisons |
| 2025-06 | Checkbox internal lines interfering with selection | Filter out "internal" geometries |
| 2025-08 | Hollow shapes under filled shapes couldn't be arrow-bound | Separate inner/outer margins |

---

## Source files

- Hit testing entry point: `packages/editor/src/lib/editor/Editor.ts` (`getShapeAtPoint`)
- Geometry base class: `packages/editor/src/lib/primitives/geometry/Geometry2d.ts`
- Point in polygon: `packages/editor/src/lib/primitives/utils.ts` (`pointInPolygon`)
- Specific geometries: `packages/editor/src/lib/primitives/geometry/*.ts`
