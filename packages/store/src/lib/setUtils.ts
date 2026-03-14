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
	if (sets.length === 1) return new Set<T>(sets[0])

	// Start with the smallest set to minimize iterations
	let smallestIdx = 0
	let smallestSize = sets[0].size
	for (let i = 1; i < sets.length; i++) {
		if (sets[i].size < smallestSize) {
			smallestSize = sets[i].size
			smallestIdx = i
		}
	}

	// If the smallest set is empty, intersection is empty
	if (smallestSize === 0) return new Set<T>()

	const smallest = sets[smallestIdx]
	const result = new Set<T>()

	outer: for (const val of smallest) {
		for (let i = 0; i < sets.length; i++) {
			if (i === smallestIdx) continue
			if (!sets[i].has(val)) continue outer
		}
		result.add(val)
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
	// Fast path: same instance means no change
	if (prev === next) return undefined
	// Fast paths for empty sets
	const prevSize = prev.size
	const nextSize = next.size
	if (prevSize === 0) {
		if (nextSize === 0) return undefined
		return { added: new Set(next) }
	}
	if (nextSize === 0) {
		return { removed: new Set(prev) }
	}
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
