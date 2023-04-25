import { generateKeyBetween, generateNKeysBetween } from './dgreensp'

/** @public */
export function getIndicesBetween(below: string | undefined, above: string | undefined, n: number) {
	return generateNKeysBetween(below, above, n)
}

/** @public */
export function getIndicesAbove(below: string, n: number) {
	return generateNKeysBetween(below, undefined, n)
}

/** @public */
export function getIndicesBelow(above: string, n: number) {
	return generateNKeysBetween(undefined, above, n)
}

/** @public */
export function getIndexBetween(below: string, above?: string) {
	return generateNKeysBetween(below, above, 1)[0]
}

/** @public */
export function getIndexAbove(below: string) {
	return generateNKeysBetween(below, undefined, 1)[0]
}

/** @public */
export function getIndexBelow(above: string) {
	return generateNKeysBetween(undefined, above, 1)[0]
}

/** @public */
export function getIndices(n: number) {
	return ['a1', ...generateNKeysBetween('a1', undefined, n)]
}

/** @public */
export function getIndexGenerator() {
	let order = 'a1'
	return () => {
		order = generateKeyBetween(order, undefined)
		return order
	}
}

/** @public */
export function* indexGenerator(n = 1) {
	let order = 'a1'
	let i = 0
	while (i < n) {
		i++
		order = generateKeyBetween(order, undefined)
		yield order
	}
}

/** @public */
export function sortByIndex<T extends { index: string }>(a: T, b: T) {
	if (a.index < b.index) {
		return -1
	} else if (a.index > b.index) {
		return 1
	}
	return 0
}

/** @public */
export function sortById<T extends { id: string }>(a: T, b: T) {
	if (a.id < b.id) {
		return -1
	} else if (a.id > b.id) {
		return 1
	}
	return 0
}

/** @public */
export function getMaxIndex(...indices: (string | undefined)[]): string {
	return indices.reduce((acc, curr) => (!curr ? acc : acc! < curr ? curr : acc), 'a1')!
}
