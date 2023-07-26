import { generateNKeysBetween } from './dgreensp'

/**
 * Get a number of indices between two indices.
 * @param below - (optional) The index below.
 * @param above - (optional) The index above.
 * @param n - The number of indices to get.
 * @public
 */
export function getIndicesBetween(below: string | undefined, above: string | undefined, n: number) {
	return generateNKeysBetween(below, above, n)
}

/**
 * Get a number of indices above an index.
 * @param below - The index below.
 * @param n - The number of indices to get.
 * @public
 */
export function getIndicesAbove(below: string, n: number) {
	return generateNKeysBetween(below, undefined, n)
}

/**
 * Get a number of indices below an index.
 * @param above - The index above.
 * @param n - The number of indices to get.
 * @public
 */
export function getIndicesBelow(above: string, n: number) {
	return generateNKeysBetween(undefined, above, n)
}

/**
 * Get the index between two indices.
 * @param below - The index below.
 * @param above - The index above.
 * @public
 */
export function getIndexBetween(below: string, above?: string) {
	return generateNKeysBetween(below, above, 1)[0]
}

/**
 * Get the index above a given index.
 * @param below - The index below.
 * @public
 */
export function getIndexAbove(below: string) {
	return generateNKeysBetween(below, undefined, 1)[0]
}

/**
 * Get the index below a given index.
 * @param above - The index above.
 *  @public
 */
export function getIndexBelow(above: string) {
	return generateNKeysBetween(undefined, above, 1)[0]
}

/**
 * Get n number of indices, starting at an index.
 * @param n - The number of indices to get.
 * @param start - (optional) The index to start at.
 * @public
 */
export function getIndices(n: number, start = 'a1') {
	return [start, ...generateNKeysBetween(start, undefined, n)]
}

/**
 * Sort by index.
 * @param a - An object with an index property.
 * @param b - An object with an index property.
 * @public */
export function sortByIndex<T extends { index: string }>(a: T, b: T) {
	if (a.index < b.index) {
		return -1
	} else if (a.index > b.index) {
		return 1
	}
	return 0
}
