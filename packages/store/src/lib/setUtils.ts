import { ImmutableSet } from './ImmutableSet'
import { CollectionDiff } from './Store'

/**
 * Combine multiple sets into a single set containing only the common elements of all sets.
 *
 * @param sets - The sets to combine.
 */
export function intersectSets<T>(sets: ImmutableSet<T>[]) {
	if (sets.length === 0) return ImmutableSet.create<T>()
	const first = sets[0]
	const rest = sets.slice(1)
	let result = ImmutableSet.create<T>()

	for (const val of first) {
		if (rest.every((set) => set.has(val))) {
			result = result.add(val)
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
export function diffSets<T>(
	prev: ImmutableSet<T>,
	next: ImmutableSet<T>
): CollectionDiff<T> | undefined {
	const result: CollectionDiff<T> = {}

	for (const val of next) {
		if (!prev.has(val)) {
			result.added = result.added?.add(val) ?? ImmutableSet.create([val])
		}
	}

	for (const val of prev) {
		if (!next.has(val)) {
			result.removed = result.removed?.add(val) ?? ImmutableSet.create([val])
		}
	}

	return result.added || result.removed ? result : undefined
}
