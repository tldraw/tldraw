import {
	generateJitteredKeyBetween,
	generateNJitteredKeysBetween,
	generateNKeysBetween,
} from 'fractional-indexing-jittered'

const generateKeysFn =
	process.env.NODE_ENV === 'test' ? generateNKeysBetween : generateNJitteredKeysBetween

/**
 * A string made up of an integer part followed by a fraction part. The fraction point consists of
 * zero or more digits with no trailing zeros. Based on
 * {@link https://observablehq.com/@dgreensp/implementing-fractional-indexing}.
 *
 * @public
 */
export type IndexKey = string & { __brand: 'indexKey' }

/**
 * The index key for the first index - 'a0'.
 * @public
 */
export const ZERO_INDEX_KEY = 'a0' as IndexKey

/** @internal */
export function validateIndexKey(index: string): asserts index is IndexKey {
	try {
		generateJitteredKeyBetween(index, null)
	} catch (e) {
		throw new Error('invalid index: ' + index)
	}
}

/**
 * Get a number of indices between two indices.
 * @param below - The index below.
 * @param above - The index above.
 * @param n - The number of indices to get.
 * @public
 */
export function getIndicesBetween(
	below: IndexKey | null | undefined,
	above: IndexKey | null | undefined,
	n: number
) {
	return generateKeysFn(below ?? null, above ?? null, n) as IndexKey[]
}

/**
 * Get a number of indices above an index.
 * @param below - The index below.
 * @param n - The number of indices to get.
 * @public
 */
export function getIndicesAbove(below: IndexKey | null | undefined, n: number) {
	return generateKeysFn(below ?? null, null, n) as IndexKey[]
}

/**
 * Get a number of indices below an index.
 * @param above - The index above.
 * @param n - The number of indices to get.
 * @public
 */
export function getIndicesBelow(above: IndexKey | null | undefined, n: number) {
	return generateKeysFn(null, above ?? null, n) as IndexKey[]
}

/**
 * Get the index between two indices.
 * @param below - The index below.
 * @param above - The index above.
 * @public
 */
export function getIndexBetween(
	below: IndexKey | null | undefined,
	above: IndexKey | null | undefined
) {
	return generateKeysFn(below ?? null, above ?? null, 1)[0] as IndexKey
}

/**
 * Get the index above a given index.
 * @param below - The index below.
 * @public
 */
export function getIndexAbove(below: IndexKey | null | undefined = null) {
	return generateKeysFn(below, null, 1)[0] as IndexKey
}

/**
 * Get the index below a given index.
 * @param above - The index above.
 *  @public
 */
export function getIndexBelow(above: IndexKey | null | undefined = null) {
	return generateKeysFn(null, above, 1)[0] as IndexKey
}

/**
 * Get n number of indices, starting at an index.
 * @param n - The number of indices to get.
 * @param start -  The index to start at.
 * @public
 */
export function getIndices(n: number, start = 'a1' as IndexKey) {
	return [start, ...generateKeysFn(start, null, n)] as IndexKey[]
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
