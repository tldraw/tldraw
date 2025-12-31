import { CollectionDiff } from './Store'

/**
 * Combine multiple sets into a single set containing only the common elements of all sets.
 * Returns the intersection of all provided sets - elements that exist in every set.
 * If no sets are provided, returns an empty set.
 *
 * @param sets - The sets to intersect. Can be an empty array.
 * @returns A new set containing only elements that exist in all input sets
 *
 * @example
 * ```ts
 * const set1 = new Set([1, 2, 3])
 * const set2 = new Set([2, 3, 4])
 * const set3 = new Set([3, 4, 5])
 *
 * const intersection = intersectSets([set1, set2, set3])
 * console.log(intersection) // Set {3}
 *
 * // Empty array returns empty set
 * const empty = intersectSets([])
 * console.log(empty) // Set {}
 * ```
 *
 * @public
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
 * Calculates a diff between two sets, identifying which elements were added or removed.
 * Returns undefined if the sets are identical (no changes detected).
 *
 * @param prev - The previous set to compare from
 * @param next - The next set to compare to
 * @returns A CollectionDiff object with `added` and/or `removed` sets, or undefined if no changes
 *
 * @example
 * ```ts
 * const prev = new Set(['a', 'b', 'c'])
 * const next = new Set(['b', 'c', 'd'])
 *
 * const diff = diffSets(prev, next)
 * console.log(diff)
 * // {
 * //   added: Set {'d'},
 * //   removed: Set {'a'}
 * // }
 *
 * // No changes returns undefined
 * const same = diffSets(prev, prev)
 * console.log(same) // undefined
 * ```
 *
 * @public
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
