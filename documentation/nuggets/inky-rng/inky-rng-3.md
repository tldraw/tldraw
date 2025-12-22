---
title: Seeded randomness for hand-drawn shapes
created_at: 12/21/2025
updated_at: 12/21/2025
keywords:
  - RNG
  - seeded
  - hand-drawn
status: published
date: 12/21/2025
order: 2
---

# Seeded randomness for hand-drawn shapes

When we added the "draw" style to tldraw, we wanted shapes to look hand-drawn with natural wobbles—but not to jitter when you pan the canvas or change the zoom level. Every render has to produce the exact same path.

True randomness won't work. If you call `Math.random()` during rendering, the shape's path changes every frame. The solution is seeded randomness: pass the shape's ID to a pseudorandom number generator, and you get the same sequence of "random" values every time.

The interesting part is how we use those random values to round corners. Hand-drawn corners need to feel organic, not mechanical, but they also need to work correctly at sharp angles and on short segments.

## The corner rounding algorithm

When PathBuilder converts a path to draw style, it processes each corner by:

1. Calculating how much to round based on the angle
2. Clamping the roundness so it doesn't exceed segment length
3. Creating a quadratic bezier curve through the corner

The angle-based scaling is the key insight. A 90° corner gets full roundness. A 180° corner (a straight line) gets zero roundness. Everything in between scales linearly.

Here's the calculation:

```typescript
const roundnessClampedForAngle =
	currentSupportsRoundness &&
	nextSupportsRoundness &&
	tangentToPrev &&
	tangentToNext &&
	Vec.Len2(tangentToPrev) > 0.01 &&
	Vec.Len2(tangentToNext) > 0.01
		? modulate(
				Math.abs(Vec.AngleBetween(tangentToPrev, tangentToNext)),
				[Math.PI / 2, Math.PI],
				[roundness, 0],
				true
			)
		: 0
```

The `modulate()` function maps the angle from the range `[Math.PI / 2, Math.PI]` (90° to 180°) to the range `[roundness, 0]`. At 90°, you get the full roundness value—typically `strokeWidth * 2`. At 180°, you get zero. The `true` parameter clamps the result, so angles sharper than 90° still get full roundness.

This scaling prevents the algorithm from trying to round corners that aren't really corners. If two segments form a nearly straight line, rounding them would create a visible bump where there shouldn't be one.

## Length-based clamping

Angle-based roundness can still produce invalid results if the corner radius exceeds the segment length. Imagine a tiny triangle—the roundness might be larger than the sides themselves.

To prevent this, we clamp roundness to 1/4 of each adjacent segment:

```typescript
const roundnessBeforeClampedForLength = Math.min(
	roundnessClampedForAngle,
	(currentInfo?.length ?? Infinity) / 4
)
const roundnessAfterClampedForLength = Math.min(
	roundnessClampedForAngle,
	(nextInfo?.length ?? Infinity) / 4
)
```

The 1/4 factor ensures that even if two corners are adjacent, their rounding won't overlap. Each corner can claim up to 1/4 of the segment before it and 1/4 of the segment after it, leaving at least half the segment untouched.

This matters most for small shapes. Draw a tiny rectangle with draw style—you'll see properly rounded corners, not circles that extend past the shape's bounds.

## Why quadratic beziers

Once we know how much to round, we need to actually draw the curve. The implementation uses quadratic bezier curves with the original corner point as the control point:

```typescript
parts.push(
	'L',
	toDomPrecision(startPoint.x),
	toDomPrecision(startPoint.y),

	'Q',
	toDomPrecision(offsetPoint.x),
	toDomPrecision(offsetPoint.y),
	toDomPrecision(endPoint.x),
	toDomPrecision(endPoint.y)
)
```

The path draws a line to `startPoint` (shortened by the roundness amount along the first segment), then draws a quadratic curve (`Q`) using the original corner as the control point, ending at `endPoint` (shortened along the second segment).

Quadratic beziers work better than cubic beziers here because they're simpler and more predictable. A quadratic bezier has one control point that pulls the curve toward it. The curve naturally passes through a point between the start, control, and end—which is exactly what we want for a rounded corner.

Cubic beziers have two control points, giving more flexibility but also more complexity. For corner rounding, that extra control is unnecessary. The quadratic curve's inherent simplicity matches the problem: we want the corner to curve smoothly, not to create complex S-curves or inflection points.

## Offset limiting

The corner rounding algorithm also influences how much random offset can be applied to each point. If offsets are too large, they can cause segments to cross or create visual artifacts around rounded corners.

The offset is clamped based on the shortest adjacent segment and the roundness:

```typescript
const shortestDistance = Math.min(currentInfo?.length ?? Infinity, nextInfo?.length ?? Infinity)
const offsetLimit = shortestDistance - roundnessClampedForAngle * 2
const offsetAmount = clamp(offset, 0, offsetLimit / 4)
```

This ensures the random wobble stays within bounds. The algorithm reserves space for the corner rounding, then allows offsets in the remaining space. Without this, a large random offset on a short segment could push the point so far that it crosses the next segment or interferes with the rounded corner.

## In the codebase

The corner rounding implementation lives in `PathBuilder.toDrawD()` in `/packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx`. The `modulate()` function that maps angle ranges is in `/packages/utils/src/lib/number.ts`.

Geo shapes call `toDrawD()` when rendering with draw style, passing `shape.id` as the random seed. The same seed produces the same wobbles and the same corner rounding on every render.

The algorithm handles other edge cases—zero-length segments, collinear points, close commands—but the core insight is the angle-based roundness scaling. That's what makes hand-drawn corners look natural across different angles while staying mathematically sound.
