import type { ApdexThresholds, RumOperationType } from './types'

/** Default Apdex thresholds targeting 60fps / 30fps. */
const DEFAULT_THRESHOLDS: ApdexThresholds = {
	satisfied: 1000 / 60, // ~16.67ms
	tolerating: 1000 / 30, // ~33.33ms
}

/**
 * Compute the Apdex score for a set of frame times.
 *
 * @param frameTimes - Array of per-frame durations in ms.
 * @param operation - The operation type (used to look up custom thresholds).
 * @param overrides - Optional per-operation threshold overrides.
 * @returns Apdex score between 0 and 1.
 * @public
 */
export function computeApdex(
	frameTimes: number[],
	operation: RumOperationType,
	overrides?: Partial<Record<RumOperationType, ApdexThresholds>>
): number {
	if (frameTimes.length === 0) return 1

	const thresholds = overrides?.[operation] ?? DEFAULT_THRESHOLDS

	let satisfied = 0
	let tolerating = 0

	for (const t of frameTimes) {
		if (t <= thresholds.satisfied) {
			satisfied++
		} else if (t <= thresholds.tolerating) {
			tolerating++
		}
	}

	return (satisfied + tolerating * 0.5) / frameTimes.length
}

/**
 * Compute the 95th percentile value from an array of numbers.
 * Returns 0 for empty arrays.
 * @public
 */
export function p95(values: number[]): number {
	if (values.length === 0) return 0
	const sorted = values.slice().sort((a, b) => a - b)
	const idx = Math.ceil(sorted.length * 0.95) - 1
	return sorted[Math.max(0, idx)]
}
