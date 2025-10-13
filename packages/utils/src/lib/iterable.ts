/**
 * Get the first item from an iterable Set or Map.
 *
 * @param value - The iterable Set or Map to get the first item from
 * @returns The first value from the Set or Map
 * @example
 * ```ts
 * const A = getFirstFromIterable(new Set([1, 2, 3])) // 1
 * const B = getFirstFromIterable(
 * 	new Map([
 * 		['a', 1],
 * 		['b', 2],
 * 	])
 * ) // 1
 * ```
 * @public
 */
export function getFirstFromIterable<T = unknown>(set: Set<T> | Map<any, T>): T {
	return set.values().next().value!
}
