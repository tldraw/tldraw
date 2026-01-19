---
title: Seeded randomness for hand-drawn shapes
created_at: 12/21/2025
updated_at: 01/19/2026
keywords:
  - RNG
  - seeded
  - hand-drawn
  - xorshift
---

tldraw's geometric shapes can look hand-drawn: wobbly edges, rounded corners, lines that don't quite meet perfectly. The effect is subtle but it changes the character of a diagram. Wireframes feel looser. Flowcharts look friendlier.

The challenge is making these imperfections stable. When you pan the canvas or resize a shape, it re-renders. If the wobbles came from `Math.random()`, they'd be different every frame. The shape would jitter and shift, which looks broken.

[gif: jittering shape]

We need randomness that's deterministic—the same inputs always produce the same outputs. And we need a seed that's unique to each shape but never changes.

## Shape ID as seed

Every shape in tldraw has a unique ID, something like `shape:abc123XYZ`. It's generated when the shape is created and never changes. Different shapes have different IDs. The same shape always has the same ID.

This makes shape IDs perfect seeds for randomness:

```tsx
// packages/tldraw/src/lib/shapes/geo/components/GeoShapeBody.tsx:23-26
const fillPath =
  dash === 'draw' && !forceSolid
    ? path.toDrawD({ strokeWidth, randomSeed: shape.id, passes: 1, offset: 0, onlyFilled: true })
    : path.toD({ onlyFilled: true })
```

When we render a shape with draw style, we pass `shape.id` as the random seed. The `toDrawD()` method uses this seed to initialize a pseudorandom number generator. Same ID, same sequence of random values, same wobbles.

## The xorshift generator

We use a variant of the xorshift algorithm—fast, simple, and good enough for visual randomness:

```tsx
// packages/utils/src/lib/number.ts:58-79
export function rng(seed = '') {
  let x = 0
  let y = 0
  let z = 0
  let w = 0

  function next() {
    const t = x ^ (x << 11)
    x = y
    y = z
    z = w
    w ^= ((w >>> 19) ^ t ^ (t >>> 8)) >>> 0
    return (w / 0x100000000) * 2
  }

  for (let k = 0; k < seed.length + 64; k++) {
    x ^= seed.charCodeAt(k) | 0
    next()
  }

  return next
}
```

The function takes a string seed, mixes the characters into the internal state, then returns a generator function. Each call to that function produces the next value in the sequence—a number between -1 and 1.

Xorshift is much faster than alternatives like Mersenne Twister. We might call this generator hundreds of times per shape (multiple points, multiple passes), and we're rendering at 60fps. Speed matters.

## Applying the wobble

For each point in the path, we generate random x and y offsets:

```tsx
const offset = command.isClose
  ? lastMoveToOffset
  : { x: random() * offsetAmount, y: random() * offsetAmount }
```

The `offsetAmount` defaults to `strokeWidth / 3`. A thicker stroke gets more wobble; a thin stroke stays tighter. The randomness is subtle—you're not drawing a completely different shape, just shifting each point by a few pixels in each direction.

There's a special case for the close command. When a path loops back to its starting point, we reuse the offset from the original moveTo. Otherwise there'd be a visible gap or overlap where the path meets itself.

## Multiple passes

Draw-style shapes actually render the path twice:

```tsx
for (let pass = 0; pass < passes; pass++) {
  const random = rng(randomSeed + pass)
  // ... draw with this pass's random sequence
}
```

Each pass uses a different seed—`shape.id + 0` for the first pass, `shape.id + 1` for the second. String concatenation produces different seeds, so each pass gets different offsets. The lines don't perfectly align, which creates the effect of a pen going over the same stroke twice. The result looks thicker and more organic.

[img: 1 pass vs 2 passes comparison]

## Corner rounding

Sharp corners don't look hand-drawn. We round them using quadratic bezier curves, but the amount of rounding depends on the angle:

```tsx
const roundnessClampedForAngle = modulate(
  Math.abs(Vec.AngleBetween(tangentToPrev, tangentToNext)),
  [Math.PI / 2, Math.PI],
  [roundness, 0],
  true
)
```

A 90° corner gets full roundness. A 180° angle—basically a straight line—gets zero. Everything in between scales linearly. This prevents the algorithm from creating bumps on corners that aren't really corners.

The roundness is also clamped by segment length:

```tsx
const roundnessBeforeClampedForLength = Math.min(
  roundnessClampedForAngle,
  (currentInfo?.length ?? Infinity) / 4
)
```

Each corner can claim up to 1/4 of the segments on either side. This prevents tiny shapes from turning into blobs—the corners stay distinct even when the shape is small.

## Playing with it

There's a fun way to see this in action. In tldraw, alt-drag creates a clone of a shape. If you let go of alt during the drag, you keep the new shape and remove the old one. Press alt again and the old shape comes back.

What's happening: the original shape's ID is stored, and when you bring it back, it regenerates with the same seed—same wobbles. But the temporary clone gets a fresh ID each time, so you can watch different random variations cycle through as you toggle.

[gif: alt-drag demo]

The randomness looks casual, but it's completely deterministic. Same shape, same seed, same imperfections, every time.
