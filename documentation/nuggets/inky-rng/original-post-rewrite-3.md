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

Questions:
  - do we need to go through PathBuilder/how we draw shapes? the AI generated this, and i think it's quite a bit smoother and sharper, without the initial burden of info/potentially uninteresting exposition
---

In tldraw, we give our geometric shapes a hand-drawn style through intentionally designed imperfections. We find that subtle variations between generated shapes adds character, loosens up wireframes, and looks better alongside freehand sketches.

Engineering imperfection in this way makes use of an interesting mechanism under the hood. Our space for variety needed to be narrow enough so each geometric shape was easily recognizable, but broad enough such that no two shapes looked exactly alike. Crucially, each shape's imperfections needed to be _stable_ and persist through resizing and transformation on the canvas.

In this article, we'll explore how tldraw uses (pseudo)randomness to achieve the hand-drawn look, and how we make the resulting variations stable across renders.

## Dancing shapes

A first attempt at adding imperfection might just call `Math.random()` when rendering:

```tsx
// Don't do this
const offset = { x: Math.random() * 3.14, y: Math.random() * 3.14 }
```

The problem is that this creates shapes that jitter on every render.

[gif]

React re-renders whenever the shape's state changes. Each re-render produces new random numbers, which means the subtle variations keep changing.

Our solution is to use seeded pseudorandom number generation. When you give a seeded generator some particular seed, it will always produce the same sequence of numbers. We use a lightweight [xorshift](https://en.wikipedia.org/wiki/Xorshift) implementation that returns values between -1 and 1.

But where should we get seeds?

## Stable variation

In tldraw, each geometric shape is assigned a unique ID upon creation. This ID is immutable. It stays the same even when the shape is modified, moved, copied between documents, or synced across collaborators. This makes shape IDs a suitable seed for our random number generator; using shape IDs makes sure that they look the same regardless of when or where they render. This is how we make the imperfections stable. The shape you create on your laptop will look the same when your collaborator sees it, or when it gets exported, or if it's restored from a backup six months later.

Since every shape has a unique ID, they each get a different sequence of random numbers. This is how we create variation between shapes - and there’s a way to test this on [tldraw.com](http://tldraw.com/). You can make a clone of a shape using alt-drag. If you let go of alt during the drag, you keep the new shape but remove the old one. You can then re-press alt to bring back the old shape. What’s going on here? The old shape’s unique ID is stored, and that’s how you get back the same shape border (since the ID is used to create it). However, the new shape hasn’t been stored yet. So you can cycle through and see unique, temporary IDs being created in real-time.

[gif]

## Stroke texture

When you draw a shape by hand, you might draw the stroke more than once. The pen doesn't trace exactly the same path each time, which creates a thicker, more textured stroke. We wanted to capture that effect.

Our solution is to render each path multiple times, with each pass using slightly different random offsets. The trick is to modify the seed for each pass:

```tsx
for (let pass = 0; pass < passes; pass++) {
	const random = rng(randomSeed + pass)
	// draw the path with this pass's random offsets
}
```

Varying the seed produces different random sequences, which leads to different offsets. By default we render two passes. The result is a stroke that looks more like real ink; thicker and more textured than a single wobbly line.

[gif]

## Softening corners

Sharp corners are another giveaway that something was drawn by a computer. We soften them using quadratic bezier curves, and apply different rounding depending on the angle of the corner. A sharp 90° corner needs significant rounding to look hand-drawn, and a corner closer to 180° needs far less - this is to preserve the overall geometry of the shape.

```tsx
const roundnessClampedForAngle = modulate(
	Math.abs(Vec.AngleBetween(tangentToPrev, tangentToNext)),
	[Math.PI / 2, Math.PI], // 90° to 180°
	[roundness, 0], // full roundness at 90°, none at 180°
	true
)
```

[gif]

# Tiny shapes

Furthermore, if a shape is resized and the width or height segments become very small, we don’t want the rounding to overlap or consume the entire segment. To prevent this, we clamp the rounding such that long segments aren’t affected but short segments get reduced rounding.

```tsx
const roundnessBeforeClampedForLength = Math.min(
	roundnessClampedForAngle,
	(currentInfo?.length ?? Infinity) / 4
)
const roundnessAfterClampedForLength = Math.min(
	roundnessClampedForAngle,
	(nextInfo?.length ?? Infinity) / 4
)
```

This way, the rounded corners don’t eat up the entire shape:

[gif]

# Closing ends

Finally, we need to ensure seamless closure where the path returns to its starting point. We handle this by reusing the same random offset for the opening and closing segments of the shape, ensuring the first and final edges are shifted by identical amounts.

We also calculate the appropriate corner roundness at the closing corner and apply that same value to both ends of the path—so all corners appear consistent, and it's not obvious which one is the "seam."

[gif]

### Clouds

As a final aside - we actually use this same technique to generate cloud shapes. Clouds are built from overlapping circular arcs, with each "bump" positioned along the shape's perimeter. To make each cloud unique, we add small random offsets to the bump positions:

```tsx
function getCloudPath(width: number, height: number, seed: string, ...) {
	const getRandom = rng(seed)
	// ... calculate bump positions along perimeter ...

	for (let i = 0; i < Math.floor(numBumps / 2); i++) {
		wiggledPoints[i] = Vec.AddXY(
			wiggledPoints[i],
			getRandom() * maxWiggleX,
			getRandom() * maxWiggleY
		)
	}
}
```

Because the seed is the shape's ID, the bumps redistribute deterministically when you resize the cloud - the same resize always produces the same arrangement. Seeded pseudorandomness works wherever we need stable variety!
