---
title: Safari's impossible dimensions
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - browser
  - canvas
  - size
---

# Safari's impossible dimensions

Safari lets you create a canvas 4 million pixels wide. Seriously—4,194,303 pixels. You could render a panorama of the entire Pacific coastline at 1 pixel per inch.

But try to create a 20,000×20,000 canvas—only 400 million pixels, less than half of what a 4M×1 canvas would need—and it fails silently.

This is the asymmetry that makes browser canvas limits strange: dimension limits and area limits are independent, and Safari's numbers are especially counterintuitive.

## Three independent constraints

Browsers constrain canvases along three axes:

- **Maximum width**: how wide a canvas can be, regardless of height
- **Maximum height**: how tall a canvas can be, regardless of width
- **Maximum area**: total pixels, regardless of aspect ratio

A canvas must satisfy all three. Exceeding any one causes silent failure.

Safari's limits (desktop, versions 7-12):
- Max width: 4,194,303 pixels
- Max height: 8,388,607 pixels
- Max area: 268,435,456 pixels (16,384 × 16,384)

So a 4,000,000×1 canvas works (area = 4M pixels, well under 268M). But a 20,000×20,000 canvas fails (area = 400M pixels, exceeds the limit).

## Why the asymmetry?

We don't have visibility into Safari's implementation, but the constraint pattern suggests different bottlenecks.

The dimension limits (4M and 8M) are probably coordinate-space limits—how the browser tracks pixel positions internally. JavaScript numbers can represent these fine, but the browser's rendering pipeline might use 22-bit or 23-bit coordinates.

The area limit (268M pixels) is probably a memory limit. At 4 bytes per pixel (RGBA), 268M pixels is about 1GB. Safari likely reserves a contiguous memory block for canvas data, and even on modern machines, allocating more than 1GB contiguously is risky.

The result is that Safari handles tall, thin canvases much better than square ones. A 1×8,000,000 canvas uses only 32MB of memory despite spanning the full height limit.

## The lowest common denominator

iOS Safari is worse. Versions 9-12 have an area limit of 16,777,216 pixels—that's a 4096×4096 square. This is why our "safe" limits are so conservative:

```typescript
const MAX_SAFE_CANVAS_DIMENSION = 8192
const MAX_SAFE_CANVAS_AREA = 4096 * 4096  // 16,777,216 pixels
```

These values work on every browser we've tested, including old iOS devices. We only probe for actual limits when someone tries to export something larger.

Desktop Safari could handle 16,384×16,384. Chrome allows 32,767×32,767 or larger. But we can't assume the user is on those browsers—a shared link might be opened on someone's iPhone 6.

## Clamping with aspect ratio preservation

When dimensions exceed limits, we clamp—but we preserve aspect ratio. The math for area clamping is less obvious than for dimension clamping.

For width: if width exceeds the limit, set width to the limit and scale height proportionally.
For height: same idea.
For area: scale both dimensions by the same factor.

```typescript
if (width * height > maxArea) {
  const ratio = Math.sqrt(maxArea / (width * height))
  width *= ratio
  height *= ratio
}
```

Why square root? If current area is 4× too large, we need to shrink area to 1/4. Scaling each dimension by 1/2 gives area × (1/2) × (1/2) = area/4. The factor 1/2 is sqrt(1/4).

More generally, if we need to reduce area by factor `f`, we scale each dimension by `sqrt(f)`.

## The order matters

We apply constraints in a specific order: width, then height, then area. This matters when multiple constraints are violated.

Consider a 50,000×50,000 canvas with limits of 32,000 width, 32,000 height, and 500M area:

1. **Clamp width**: 50,000 → 32,000, height scales to 32,000 (preserving 1:1 ratio)
2. **Clamp height**: Already at 32,000, no change
3. **Clamp area**: 32,000 × 32,000 = 1024M > 500M. Scale by sqrt(500/1024) ≈ 0.7. Result: 22,360×22,360

If we clamped area first, we'd get 22,360×22,360, then neither dimension would need further clamping. Same result, but only by luck.

Now consider a 50,000×10,000 canvas (5:1 aspect ratio) with the same limits:

**Width-first approach:**
1. Clamp width: 50,000 → 32,000, height scales to 6,400
2. Clamp height: 6,400 < 32,000, no change
3. Clamp area: 32,000 × 6,400 = 204M < 500M, no change
4. Result: 32,000×6,400

**Area-first approach:**
1. Clamp area: 500M pixels, scale factor = sqrt(500M / 500M) = 1, no change (area is exactly 500M)
2. Clamp width: 50,000 → 32,000, height scales to 6,400
3. Clamp height: no change
4. Result: 32,000×6,400

Same result again. The order handles the interactions correctly because each step preserves aspect ratio, and we apply the most specific constraints (dimension) before the most general (area).

## Silent failure, visible workaround

The frustrating part of Safari's limits isn't the limits themselves—it's the silent failure. If Safari threw an error ("Canvas area exceeds maximum"), debugging would be straightforward. Instead, you create a canvas, draw to it, export it, and get a blank image.

Our probing and clamping turns an invisible failure into a predictable, controllable degradation. Users get a slightly smaller export instead of nothing. They might not even notice.

## Key files

- `/packages/editor/src/lib/utils/browserCanvasMaxSize.ts` - Test sizes at lines 31-88, clamping at lines 147-166
