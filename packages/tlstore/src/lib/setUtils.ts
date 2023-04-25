import { CollectionDiff } from './Store'

/**
 * Combine multiple sets into a single set containing only the common elements of all sets.
 *
 * @param sets - The sets to combine.
 */
export function intersectSets<T>(sets: Set<T>[]) {
	if (sets.length === 0) return new Set<T>()
	const first = sets[0]
	const rest = sets.slice(1)
	const result = new Set<T>()

	for (const val of first) {
		if (rest.every((set) => set.has(val))) {
			result.add(val)
		}
	}

	return result
}

/**
 * Calculates a diff between two sets.
 *
 * @param prev - The previous set
 * @param next - The next set
 */
export function diffSets<T>(prev: Set<T>, next: Set<T>): CollectionDiff<T> | undefined {
	const result: CollectionDiff<T> = {}

	for (const val of next) {
		if (!prev.has(val)) {
			result.added ??= new Set()
			result.added.add(val)
		}
	}

	for (const val of prev) {
		if (!next.has(val)) {
			result.removed ??= new Set()
			result.removed.add(val)
		}
	}

	return result.added || result.removed ? result : undefined
}
