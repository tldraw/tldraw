/**
 * Linear interpolate between two values.
 *
 * @example
 *
 * ```ts
 * const A = lerp(0, 1, 0.5)
 * ```
 *
 * @public
 */
export function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t
}

/**
 * Seeded random number generator, using [xorshift](https://en.wikipedia.org/wiki/Xorshift). The
 * result will always be betweeen -1 and 1.
 *
 * Adapted from [seedrandom](https://github.com/davidbau/seedrandom).
 *
 * @public
 */
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

/**
 * Modulate a value between two ranges.
 *
 * @example
 *
 * ```ts
 * const A = modulate(0, [0, 1], [0, 100])
 * ```
 *
 * @param value - The interpolation value.
 * @param rangeA - From [low, high]
 * @param rangeB - To [low, high]
 * @param clamp - Whether to clamp the the result to [low, high]
 * @public
 */
export function modulate(value: number, rangeA: number[], rangeB: number[], clamp = false): number {
	const [fromLow, fromHigh] = rangeA
	const [v0, v1] = rangeB
	const result = v0 + ((value - fromLow) / (fromHigh - fromLow)) * (v1 - v0)

	return clamp
		? v0 < v1
			? Math.max(Math.min(result, v1), v0)
			: Math.max(Math.min(result, v0), v1)
		: result
}
