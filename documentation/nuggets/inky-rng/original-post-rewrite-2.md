---
title: Engineering imperfection in tldraw
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

In tldraw, we give our geometric shapes a hand-drawn style through carefully designed imperfections. These subtle variations add character to diagrams, loosen up wireframes, and look right next to shapes that are actually drawn by hand. The results look casual, but it's a real challenge to engineer the hand-drawn style. We needed a way to draw our geometric shapes that could incorporate imperfections. Our space for variety needed to be narrow enough that each geometric shape was easily recognizable, but broad enough such that no two shapes looked exactly alike. Crucially, each shape's imperfections needed to be _stable_ for that shape as it resized or transformed on the canvas.

In this article, we'll explore how tldraw uses (pseudo)randomness to achieve the hand-drawn look, and how we make the resulting variations stable across renders.

## Dancing shapes

A first attempt at adding imperfection might just call `Math.random()` when rendering:

```typescript
// Don't do this
const offset = { x: Math.random() * 3.14, y: Math.random() * 3.14 }
```

The problem is that this creates shapes that jitter on every render.

[gif]

React re-renders whenever the shape's state changes. Each re-render produces new random numbers, which means the rectangle's wobble shifts slightly each time. Our solution is to use seeded pseudorandom number generation. When you give a seeded generator the same seed, it always produces the same sequence of numbers. We use a lightweight [xorshift](https://en.wikipedia.org/wiki/Xorshift) implementation that returns values between -1 and 1.

But what do we use as the seed?

## Every shape is special

Each geometric shape has a unique ID that gets assigned when the shape is created. This ID is immutable. It stays the same even when modified, moved, copied between documents, or synced across collaborators - and is linked to a particular shape. This makes it a suitable seed for our random number generator; each shape will always look the same regardless of when or where it renders. This is how we make the randomness stable. The shape you create on your laptop will look identical when your collaborator sees it, or when it gets exported, or if it's restored from a backup six months later.

```typescript
// packages/tldraw/src/lib/shapes/geo/components/GeoShapeBody.tsx
const fillPath =
	dash === 'draw'
		? path.toDrawD({ strokeWidth, randomSeed: shape.id, passes: 1, offset: 0, onlyFilled: true })
		: path.toD({ onlyFilled: true })
```

Since every shape has a different ID, every shape gets its own unique sequence of random numbers. THis is how shapes look slightly different from each other. There’s an interesting thing you can do to play with this. We’ve added alt-drag in tldraw.com to make a clone of a shape. If you let go of alt during the drag, you keep the new shape but remove the old one. You can then re-press alt to bring back the old shape. What’s going on here? The old shape’s unique ID is stored, and that’s how you get back the same shape border (since the ID is used to create it). However, the new shape hasn’t been stored yet. So you can cycle through and see unique, temporary IDs being created in real-time.

[gif]

## Layered passes for texture

When you draw a shape by hand, you might draw the stroke more than once. The pen doesn't trace exactly the same path each time, which creates a thicker, more textured stroke. We wanted to capture that effect.

Our solution is to render each path multiple times, with each pass using slightly different random offsets. The trick is to modify the seed for each pass:

```typescript
for (let pass = 0; pass < passes; pass++) {
	const random = rng(randomSeed + pass)
	// draw the path with this pass's random offsets
}
```

So if pass 0 uses the seed `"shape:abc123"`, pass 1 will use `"shape:abc1231"`. The string concatenation produces a different seed, which means a different random sequence, which means different offsets. The paths don't line up perfectly, just like a pen that doesn't trace its own line exactly.

By default we render two passes. The result is a stroke that looks more like real ink—thicker and more textured than a single wobbly line.

## Corner softening

Sharp corners are another giveaway that something was drawn by a computer. We soften them using quadratic bezier curves, but we ran into an interesting question: how much rounding should we apply?

The answer depends on the angle. A sharp 90° corner needs significant rounding to look hand-drawn, but a near-straight angle (close to 180°) barely needs any—there's no real corner to soften.

```typescript
const roundnessClampedForAngle = modulate(
	Math.abs(Vec.AngleBetween(tangentToPrev, tangentToNext)),
	[Math.PI / 2, Math.PI], // 90° to 180°
	[roundness, 0], // full roundness at 90°, none at 180°
	true
)
```

This lets us apply just the right amount of rounding at each corner, softening sharp angles while preserving the overall geometry of the shape.

## Clouds

This same approach—using a shape's immutable ID to seed randomness—appears throughout the codebase. Cloud bumps, for instance, are positioned using the shape's ID as a seed. The bumps redistribute when you resize the cloud, but they redistribute the same way every time. It's a pattern that works wherever we need stable variety.

## Identity as visual character

There's something satisfying about the deeper pattern here. We're treating a shape's identity as the source of its visual character. A rectangle isn't just "a rectangle with these dimensions"—it's _this particular_ rectangle, with its own unique handwriting.

That identity travels with the shape. When you duplicate a shape, the copy gets a new ID, which means new randomness, which means its own distinct wobble. The original stays exactly as it was. Both shapes look hand-drawn, but they're clearly two different drawings of the same thing.

It's a small detail, but these small details are what make a digital canvas feel less like software and more like a sketchbook.

## Key files

- `packages/utils/src/lib/number.ts` — The `rng` function (xorshift implementation)
- `packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx` — The `toDrawD` method that applies random offsets
- `packages/tldraw/src/lib/shapes/geo/getGeoShapePath.ts` — Geometry generation for geo shapes
