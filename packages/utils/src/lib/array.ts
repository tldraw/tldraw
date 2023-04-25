/**
 * Rotate the contents of an array.
 *
 * @public
 */
export function rotateArray<T>(arr: T[], offset: number): T[] {
	return arr.map((_, i) => arr[(i + offset) % arr.length])
}

/**
 * Deduplicate the items in an array
 *
 * @public
 */
export function dedupe<T>(input: T[], equals?: (a: any, b: any) => boolean): T[] {
	const result: T[] = []
	mainLoop: for (const item of input) {
		for (const existing of result) {
			if (equals ? equals(item, existing) : item === existing) {
				continue mainLoop
			}
		}
		result.push(item)
	}
	return result
}

/** @internal */
export function compact<T>(arr: T[]): NonNullable<T>[] {
	return arr.filter((i) => i !== undefined && i !== null) as any
}

/** @internal */
export function last<T>(arr: readonly T[]): T | undefined {
	return arr[arr.length - 1]
}

/** @internal */
export function minBy<T>(arr: readonly T[], fn: (item: T) => number): T | undefined {
	let min: T | undefined
	let minVal = Infinity
	for (const item of arr) {
		const val = fn(item)
		if (val < minVal) {
			min = item
			minVal = val
		}
	}
	return min
}

/**
 * Partitions an array into two arrays, one with items that satisfy the predicate, and one with
 * items that do not.
 *
 * @param arr - The array to partition
 * @param predicate - The predicate to use to partition the array
 * @returns A tuple of two arrays, the first one with items that satisfy the predicate and the
 *   second one with the ones that dont
 * @internal
 */
export function partition<T>(arr: T[], predicate: (item: T) => boolean): [T[], T[]] {
	const satisfies: T[] = []
	const doesNotSatisfy: T[] = []
	for (const item of arr) {
		if (predicate(item)) {
			satisfies.push(item)
		} else {
			doesNotSatisfy.push(item)
		}
	}
	return [satisfies, doesNotSatisfy]
}
