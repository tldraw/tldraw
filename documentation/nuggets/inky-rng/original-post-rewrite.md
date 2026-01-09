---
title: Seeded randomness for hand-drawn shapes
created_at: 01/08/2026
updated_at: 01/08/2026
keywords:
  - draw style
  - randomness
  - seeded RNG
  - xorshift
  - organic shapes
  - hand-drawn
---

# Engineering imperfection in tldraw

In tldraw, we give our geometric shapes a hand-drawn style through carefully designed imperfections. These subtle variations add character to diagrams, loosen up wireframes, and look right next to shapes that are actually drawn by hand. The results look casual, but it's a real challenge to engineer the hand-drawn style. We needed a way to draw our geometric shapes that could incorporate imperfections. Our space for variety needed to be narrow enough that each geometric shape was easily recognizable, but broad enough such that no two shapes looked exactly alike. Crucially, each shape’s imperfections needed to be _stable_ for that shape as it resized or transformed on the canvas.

In this article, we'll explore how tldraw draws geometric shapes, how we use randomness to achieve the hand-drawn look, and how we make that randomness _stable_.

## Dancing shapes

A first attempt might just call `Math.random()` when rendering:

```typescript
// Don't do this
const offset = { x: Math.random() * 5, y: Math.random() * 5 }
```

But this creates shapes that jitter on every render.

[gif]

React re-renders when state changes—selecting a different shape, opening a menu, typing in a text box. Each render produces new random numbers, so the rectangle's wobble shifts slightly. The effect is subtle but unsettling, like the shape is alive.

The fix is seeded pseudorandom number generation. Given the same seed, the generator always produces the same sequence. We use a lightweight [xorshift](https://en.wikipedia.org/wiki/Xorshift) implementation that returns values between -1 and 1.

## Shape identity as randomness seed

Every tldraw shape has a unique, immutable ID assigned at creation. This ID never changes, even when the shape is modified, moved, copied between documents, or synced across collaborators. It's the one stable anchor we have.

```typescript
// packages/tldraw/src/lib/shapes/geo/components/GeoShapeBody.tsx
const fillPath =
	dash === 'draw'
		? path.toDrawD({ strokeWidth, randomSeed: shape.id, passes: 1, offset: 0, onlyFilled: true })
		: path.toD({ onlyFilled: true })
```

Same ID, same random sequence, same appearance—regardless of when or where it renders. A shape created on your laptop looks identical when your collaborator sees it, when it's exported to SVG, when it's restored from a backup six months later.

Different shapes get different sequences from their different IDs, so each has its own organic character. Two rectangles drawn with the same dimensions will have different wobbles.

## Layered passes for texture

Hand-drawn lines often have texture from the pen going over the same stroke more than once. We simulate this by rendering the path multiple times, each with slightly different jitter.

The trick is modifying the seed for each pass:

```typescript
for (let pass = 0; pass < passes; pass++) {
	const random = rng(randomSeed + pass)
	// draw the path with this pass's random offsets
}
```

Pass 0 uses seed `"shape:abc123"`, pass 1 uses `"shape:abc1231"`. The string concatenation produces a different seed, so a different random sequence, so different offsets. The paths don't align perfectly—like a pen that doesn't trace its own line exactly.

By default we use two passes. The result is a thicker, more textured stroke that looks more like real ink than a single wobbly line would.

## Corner softening that adapts to angle

Sharp corners look mechanical. We round them using quadratic bezier curves, but the amount of rounding depends on the angle:

```typescript
const roundnessClampedForAngle = modulate(
	Math.abs(Vec.AngleBetween(tangentToPrev, tangentToNext)),
	[Math.PI / 2, Math.PI], // 90° to 180°
	[roundness, 0], // full roundness at 90°, none at 180°
	true
)
```

A right angle gets full rounding. A near-straight angle (close to 180°) gets almost none—there's no corner to soften. This prevents sharp corners while preserving the overall shape's geometry.

## Clouds: randomness at a different level

Cloud shapes demonstrate seeded randomness applied to geometry, not just rendering. Instead of adding wobble to existing points, the cloud generator creates the points themselves using random offsets:

```typescript
function getCloudPath(width, height, seed, size, scale, isFilled) {
	const getRandom = rng(seed)
	// ... calculate bump positions around the perimeter

	for (let i = 0; i < Math.floor(numBumps / 2); i++) {
		wiggledPoints[i] = Vec.AddXY(
			wiggledPoints[i],
			getRandom() * maxWiggleX * scale,
			getRandom() * maxWiggleY * scale
		)
	}
}
```

Each cloud's bumps are positioned based on its ID. Resize the cloud and the bumps redistribute—but they redistribute the same way every time because the seed hasn't changed. Different clouds have differently-shaped bumps because they have different IDs.

## The seed is the identity

The deeper pattern here is treating the shape's identity as the source of its visual character. Not just "this shape is a rectangle with these dimensions" but "this shape is _this particular_ rectangle, with its own handwriting."

That identity travels with the shape. Duplicate it and the copy gets a new ID, so new randomness, so its own distinct wobble. The original stays unchanged. Both look hand-drawn, but they're clearly two different drawings of the same thing.

It's a small detail, but it's the kind of thing that makes a digital canvas feel less like software and more like a sketchbook.

## Key files

- `packages/utils/src/lib/number.ts` — The `rng` function (xorshift implementation)
- `packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx` — The `toDrawD` method that applies random offsets
- `packages/tldraw/src/lib/shapes/geo/getGeoShapePath.ts` — Cloud path generation with seeded randomness
