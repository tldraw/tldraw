import { PressureOptions } from './types'

/**
 * Generate a pressure value at a given position along the path.
 * Uses layered sine waves with seeded phase offsets for organic-feeling
 * pressure variation — similar to simplified Perlin noise.
 *
 * @param t - Position along the path (0 = start, increases with distance)
 * @param options - Pressure generation options
 * @returns Pressure value clamped to [0, 1]
 */
export function generatePressure(t: number, options: PressureOptions): number {
	const { basePressure, pressureVariation, pressureFrequency, seed } = options

	// Deterministic phase offsets from seed
	const phase1 = seededRandom(seed) * Math.PI * 2
	const phase2 = seededRandom(seed + 1) * Math.PI * 2
	const phase3 = seededRandom(seed + 2) * Math.PI * 2

	// Layered sine waves at different frequencies for organic feel
	const wave1 = Math.sin(t * pressureFrequency * 1.0 + phase1) * 0.5
	const wave2 = Math.sin(t * pressureFrequency * 2.3 + phase2) * 0.3
	const wave3 = Math.sin(t * pressureFrequency * 5.7 + phase3) * 0.2

	const noise = wave1 + wave2 + wave3 // Range roughly [-1, 1]
	const pressure = basePressure + pressureVariation * noise

	return Math.max(0, Math.min(1, pressure))
}

/**
 * Generate an array of pressure values for a path.
 * Convenience function for pre-computing pressure for all points.
 *
 * @param count - Number of pressure values to generate
 * @param cumulativeDistances - Cumulative distances along the path for each point
 * @param options - Pressure generation options
 * @returns Array of pressure values [0, 1]
 */
export function generatePressureArray(
	count: number,
	cumulativeDistances: number[],
	options: PressureOptions
): number[] {
	const pressures: number[] = []
	for (let i = 0; i < count; i++) {
		const dist = cumulativeDistances[i] ?? i
		pressures.push(generatePressure(dist, options))
	}
	return pressures
}

/** Simple seeded pseudo-random number generator (Mulberry32) */
function seededRandom(seed: number): number {
	let t = (seed + 0x6d2b79f5) | 0
	t = Math.imul(t ^ (t >>> 15), t | 1)
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
