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
order: 1
---

# Seeded randomness for hand-drawn shapes

When we added the hand-drawn "draw" style to tldraw, we wanted shapes to look organic—slightly wobbly lines like you'd draw with a pen. The challenge: shapes render constantly as you pan, zoom, and interact with them. If we used random offsets for the wobbles, shapes would jitter and shift on every render.

The solution is seeded randomness. Every shape gets a stable random sequence based on its ID, so the wobbles stay consistent across renders.

Here's how the multi-pass rendering works.

## Drawing paths multiple times

The `PathBuilder.toDrawD()` method draws each path multiple times—typically two passes. Each pass uses a slightly different random sequence to create a layered, pen-over-pen effect.

```typescript
for (let pass = 0; pass < passes; pass++) {
	const random = rng(randomSeed + pass)
	// ... draw with this pass's random sequence
}
```

Each pass gets its own seed by appending the pass number to the shape ID:

- Pass 0: `rng("shape:abc1230")`
- Pass 1: `rng("shape:abc1231")`

String concatenation produces different seeds, which generate different random sequences. The paths don't align perfectly—they're offset from each other slightly, like making multiple pen strokes that don't land in exactly the same place. This creates thickness and texture.

Geo shapes with draw style typically use `passes: 1` for fills (cleaner appearance) and `passes: 2` for strokes (richer texture).

## Random offsets on every point

For each point in the path, we apply a random offset:

```typescript
const offset = command.isClose
	? lastMoveToOffset
	: { x: random() * offsetAmount, y: random() * offsetAmount }
```

The `offsetAmount` defaults to `strokeWidth / 3`, so a 3.5px stroke gets offsets up to about 1.2px in either direction. The `random()` function returns values between -1 and 1, so `random() * offsetAmount` produces offsets in the range `[-offsetAmount, offsetAmount]`.

Each command gets two random values—one for x, one for y:

```typescript
const offsetPoint = Vec.Add(command, offset)
```

The result is a point that's been nudged slightly in a random direction, but always the same direction for that shape because the random sequence is seeded.

## Closing paths cleanly

Close commands reuse the offset from the original `moveTo` command:

```typescript
const offset = command.isClose
	? lastMoveToOffset
	: { x: random() * offsetAmount, y: random() * offsetAmount }
```

If close commands generated new random offsets, paths wouldn't close cleanly—you'd see tiny gaps between the end of the path and the start. By reusing the `moveTo` offset, the close command lands exactly where the path began.

## Preventing overlaps

When segments are very short or corners are sharp, random offsets can cause segments to overlap or cross each other. We clamp the offset based on segment length:

```typescript
const offsetLimit = shortestDistance - roundnessClampedForAngle * 2
const offsetAmount = clamp(offset, 0, offsetLimit / 4)
```

This ensures offsets never exceed a quarter of the shortest adjacent segment (accounting for corner rounding). The visual wobbles stay organic without creating visual artifacts.

## The visual effect

Multiple passes with per-point random offsets create the hand-drawn appearance. The paths are:

- Stable across renders (same seed → same wobbles)
- Unique per shape (different IDs → different wobbles)
- Layered with slight misalignment (multiple passes → texture)
- Organic but controlled (clamped offsets → no overlaps)

The result looks like someone drew the shape with a pen, making multiple strokes that don't perfectly align—which is exactly what happens when you draw by hand.

## Implementation details

The random number generator is a simple xorshift PRNG that takes a string seed and produces a deterministic sequence. It's fast (5-10 nanoseconds per call) and good enough for visual randomness, though not cryptographically secure.

For geo shapes, the shape ID serves as the seed:

```typescript
const fillPath = path.toDrawD({
	strokeWidth,
	randomSeed: shape.id,
	passes: 1,
	offset: 0,
	onlyFilled: true,
})
```

The same pattern appears in line shapes and arrow shapes—anything that supports the draw style uses `shape.id` as the random seed.

This lives in `/packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx` (the `toDrawD()` method) and `/packages/utils/src/lib/number.ts` (the `rng()` function). The stroke width constants that determine default offset amounts are in `/packages/tldraw/src/lib/shapes/shared/default-shape-constants.ts`.
