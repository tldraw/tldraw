# Seeded randomness for hand-drawn shapes

When shapes use the "draw" style, they look hand-drawn—imperfect lines with subtle wobbles and rounded corners. But the randomness can't actually be random. If it were, shapes would flicker and change appearance every time they rendered. Here's how we create organic-looking shapes that stay stable.

## The stability problem

A naive approach might generate random offsets each time a shape draws:

```typescript
// Don't do this
const offset = { x: Math.random() * 5, y: Math.random() * 5 }
```

This creates shapes that look different on every render. Panning the canvas, zooming, or any state change causes shapes to jitter and dance. Users would see their carefully drawn rectangle subtly shift each time they click elsewhere.

## Seeded randomness

The solution is pseudorandom number generation with a deterministic seed. Given the same seed, the generator always produces the same sequence of numbers. Different seeds produce different sequences.

We use a [xorshift](https://en.wikipedia.org/wiki/Xorshift) algorithm:

```typescript
// packages/utils/src/lib/number.ts
export function rng(seed = '') {
	let x = 0,
		y = 0,
		z = 0,
		w = 0

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

The seed string initializes the internal state by mixing its character codes into the generator. After that, each call to `next()` returns a value between -1 and 1. The sequence looks random but is completely reproducible.

## The shape ID as seed

Every shape in tldraw has a unique, immutable ID. This makes it the perfect seed:

```typescript
// packages/tldraw/src/lib/shapes/geo/components/GeoShapeBody.tsx
const fillPath =
	dash === 'draw'
		? path.toDrawD({ strokeWidth, randomSeed: shape.id, passes: 1, offset: 0, onlyFilled: true })
		: path.toD({ onlyFilled: true })
```

Same shape, same ID, same random sequence, same appearance. Different shapes get different sequences, so each one has its own organic character.

## Applying the randomness

The `toDrawD` method in `PathBuilder` applies the random offsets in two ways:

**Per-point jitter**: Each point along the path gets a random offset proportional to the stroke width:

```typescript
// packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx
const offset = { x: random() * offsetAmount, y: random() * offsetAmount }
const offsetPoint = Vec.Add(command, offset)
```

**Multiple passes**: By default, the path renders twice with different offsets. Each pass uses a modified seed (`randomSeed + pass`), creating slightly different jitter:

```typescript
for (let pass = 0; pass < passes; pass++) {
	const random = rng(randomSeed + pass)
	// ... draw the path with this pass's random offsets
}
```

The layered passes create a thicker, more textured line—like a pen going over the same stroke multiple times without perfect precision.

## Rounded corners

Sharp corners look mechanical. The draw style rounds them using quadratic bezier curves, with the roundness scaled based on the angle:

```typescript
const roundnessClampedForAngle = modulate(
	Math.abs(Vec.AngleBetween(tangentToPrev, tangentToNext)),
	[Math.PI / 2, Math.PI], // 90° to 180°
	[roundness, 0], // Full roundness at 90°, none at 180°
	true
)
```

A right angle gets full rounding. A straight line (180°) gets none. This prevents sharp corners while preserving the overall shape.

## Cloud shapes

Clouds demonstrate seeded randomness at a different level. Instead of just offsetting existing points, the cloud generator creates organic bulges:

```typescript
// packages/tldraw/src/lib/shapes/geo/getGeoShapePath.ts
function getCloudPath(width, height, seed, size, scale, isFilled) {
	const getRandom = rng(seed)
	// ... calculate bump positions around the perimeter

	// Wiggle each point
	for (let i = 0; i < Math.floor(numBumps / 2); i++) {
		wiggledPoints[i] = Vec.AddXY(
			wiggledPoints[i],
			getRandom() * maxWiggleX * scale,
			getRandom() * maxWiggleY * scale
		)
	}
}
```

Each cloud with a different ID has differently-shaped bumps, but the same cloud always looks the same.

## Why xorshift?

The xorshift algorithm is lightweight—just a few bitwise operations per call. For draw-style shapes, we might call `random()` hundreds of times per shape during rendering. A heavyweight PRNG like Mersenne Twister would be overkill. Xorshift gives us "good enough" randomness at minimal cost, and the bit patterns pass basic statistical tests for visual applications.

The tradeoff is that xorshift isn't cryptographically secure, but we don't need that. We just need shapes that look hand-drawn and stay stable. The visual quality matters more than the mathematical properties.

## Key files

- `packages/utils/src/lib/number.ts` — The `rng()` function with xorshift implementation
- `packages/tldraw/src/lib/shapes/shared/PathBuilder.tsx` — `toDrawD()` method applying random offsets
- `packages/tldraw/src/lib/shapes/geo/components/GeoShapeBody.tsx` — Connecting shape IDs to random seeds
- `packages/tldraw/src/lib/shapes/geo/getGeoShapePath.ts` — Cloud shape generation with seeded wiggling
