import { IndexKey } from './IndexKey'
import { INTEGER_ZERO, generateNKeysBetween, validateOrder } from './dgreensp/dgreensp'

/**
 * The index key for the first index - 'a0'.
 * @public
 */
export const ZERO_INDEX_KEY = INTEGER_ZERO

/** @internal */
export function validateIndexKey(key: string): asserts key is IndexKey {
	validateOrder(key)
}

/**
 * Get a number of indices between two indices.
 * @param below - The index below.
 * @param above - The index above.
 * @param n - The number of indices to get.
 * @public
 */
export function getIndicesBetween(
	below: IndexKey | undefined,
	above: IndexKey | undefined,
	n: number
) {
	return generateNKeysBetween(below, above, n)
}

/**
 * Get a number of indices above an index.
 * @param below - The index below.
 * @param n - The number of indices to get.
 * @public
 */
export function getIndicesAbove(below: IndexKey | undefined, n: number) {
	return generateNKeysBetween(below, undefined, n)
}

/**
 * Get a number of indices below an index.
 * @param above - The index above.
 * @param n - The number of indices to get.
 * @public
 */
export function getIndicesBelow(above: IndexKey | undefined, n: number) {
	return generateNKeysBetween(undefined, above, n)
}

/**
 * Get the index between two indices.
 * @param below - The index below.
 * @param above - The index above.
 * @public
 */
export function getIndexBetween(below: IndexKey | undefined, above: IndexKey | undefined) {
	return generateNKeysBetween(below, above, 1)[0]
}

/**
 * Get the index above a given index.
 * @param below - The index below.
 * @public
 */
export function getIndexAbove(below?: IndexKey | undefined) {
	return generateNKeysBetween(below, undefined, 1)[0]
}

/**
 * Get the index below a given index.
 * @param above - The index above.
 *  @public
 */
export function getIndexBelow(above?: IndexKey | undefined) {
	return generateNKeysBetween(undefined, above, 1)[0]
}

/**
 * Get n number of indices, starting at an index.
 * @param n - The number of indices to get.
 * @param start -  The index to start at.
 * @public
 */
export function getIndices(n: number, start = 'a1' as IndexKey) {
	return [start, ...generateNKeysBetween(start, undefined, n)]
}

/**
 * Sort by index.
 * @param a - An object with an index property.
 * @param b - An object with an index property.
 * @public */
export function sortByIndex<T extends { index: IndexKey }>(a: T, b: T) {
	if (a.index < b.index) {
		return -1
	} else if (a.index > b.index) {
		return 1
	}
	return 0
}
