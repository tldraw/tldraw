/**
 * Linear interpolate between two values.
 *
 * @param a - The start value
 * @param b - The end value
 * @param t - The interpolation factor (0-1)
 * @returns The interpolated value
 * @example
 * ```ts
 * const halfway = lerp(0, 100, 0.5) // 50
 * const quarter = lerp(10, 20, 0.25) // 12.5
 * ```
 * @public
 */
export function lerp(a: number, b: number, t: number) {
	return a + (b - a) * t
}

/**
 * Inverse lerp between two values. Given a value `t` in the range [a, b], returns a number between
 * 0 and 1.
 *
 * @param a - The start value of the range
 * @param b - The end value of the range
 * @param t - The value within the range [a, b]
 * @returns The normalized position (0-1) of t within the range [a, b]
 * @example
 * ```ts
 * const position = invLerp(0, 100, 25) // 0.25
 * const normalized = invLerp(10, 20, 15) // 0.5
 * ```
 * @public
 */
export function invLerp(a: number, b: number, t: number) {
	return (t - a) / (b - a)
}

/**
 * Seeded random number generator, using [xorshift](https://en.wikipedia.org/wiki/Xorshift). The
 * result will always be between -1 and 1.
 *
 * Adapted from [seedrandom](https://github.com/davidbau/seedrandom).
 *
 * @param seed - The seed string for deterministic random generation (defaults to empty string)
 * @returns A function that will return a random number between -1 and 1 each time it is called
 * @example
 * ```ts
 * const random = rng('my-seed')
 * const num1 = random() // Always the same for this seed
 * const num2 = random() // Next number in sequence
 *
 * // Different seed produces different sequence
 * const otherRandom = rng('other-seed')
 * const different = otherRandom() // Different value
 * ```
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
