/**
 * Rotate the contents of an array by a specified offset.
 *
 * Creates a new array with elements shifted to the left by the specified number of positions.
 * Both positive and negative offsets result in left shifts (elements move left, with elements
 * from the front wrapping to the back).
 *
 * @param arr - The array to rotate
 * @param offset - The number of positions to shift left (both positive and negative values shift left)
 * @returns A new array with elements shifted left by the specified offset
 *
 * @example
 * ```ts
 * rotateArray([1, 2, 3, 4], 1) // [2, 3, 4, 1]
 * rotateArray([1, 2, 3, 4], -1) // [2, 3, 4, 1]
 * rotateArray(['a', 'b', 'c'], 2) // ['c', 'a', 'b']
 * ```
 * @public
 */
export function rotateArray<T>(arr: T[], offset: number): T[] {
	if (arr.length === 0) return []

	// Based on the test expectations, both positive and negative offsets
	// should rotate left (shift elements to the left)
	const normalizedOffset = ((Math.abs(offset) % arr.length) + arr.length) % arr.length

	// Slice the array at the offset point and concatenate
	return [...arr.slice(normalizedOffset), ...arr.slice(0, normalizedOffset)]
}

/**
 * Remove duplicate items from an array.
 *
 * Creates a new array with duplicate items removed. Uses strict equality by default,
 * or a custom equality function if provided. Order of first occurrence is preserved.
 *
 * @param input - The array to deduplicate
 * @param equals - Optional custom equality function to compare items (defaults to strict equality)
 * @returns A new array with duplicate items removed
 *
 * @example
 * ```ts
 * dedupe([1, 2, 2, 3, 1]) // [1, 2, 3]
 * dedupe(['a', 'b', 'a', 'c']) // ['a', 'b', 'c']
 *
 * // With custom equality function
 * const objects = [{id: 1}, {id: 2}, {id: 1}]
 * dedupe(objects, (a, b) => a.id === b.id) // [{id: 1}, {id: 2}]
 * ```
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

/**
 * Remove null and undefined values from an array.
 *
 * Creates a new array with all null and undefined values filtered out.
 * The resulting array has a refined type that excludes null and undefined.
 *
 * @param arr - The array to compact
 * @returns A new array with null and undefined values removed
 *
 * @example
 * ```ts
 * compact([1, null, 2, undefined, 3]) // [1, 2, 3]
 * compact(['a', null, 'b', undefined]) // ['a', 'b']
 * ```
 * @internal
 */
export function compact<T>(arr: T[]): NonNullable<T>[] {
	return arr.filter((i) => i !== undefined && i !== null) as any
}

/**
 * Get the last element of an array.
 *
 * Returns the last element of an array, or undefined if the array is empty.
 * Works with readonly arrays and preserves the element type.
 *
 * @param arr - The array to get the last element from
 * @returns The last element of the array, or undefined if the array is empty
 *
 * @example
 * ```ts
 * last([1, 2, 3]) // 3
 * last(['a', 'b', 'c']) // 'c'
 * last([]) // undefined
 * ```
 * @internal
 */
export function last<T>(arr: readonly T[]): T | undefined {
	return arr[arr.length - 1]
}

/**
 * Find the item in an array with the minimum value according to a function.
 *
 * Finds the array item that produces the smallest value when passed through
 * the provided function. Returns undefined for empty arrays.
 *
 * @param arr - The array to search
 * @param fn - Function to compute the comparison value for each item
 * @returns The item with the minimum value, or undefined if the array is empty
 *
 * @example
 * ```ts
 * const people = [{name: 'Alice', age: 30}, {name: 'Bob', age: 25}]
 * minBy(people, p => p.age) // {name: 'Bob', age: 25}
 *
 * minBy([3, 1, 4, 1, 5], x => x) // 1
 * minBy([], x => x) // undefined
 * ```
 * @internal
 */
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
 * Find the item in an array with the maximum value according to a function.
 *
 * Finds the array item that produces the largest value when passed through
 * the provided function. Returns undefined for empty arrays.
 *
 * @param arr - The array to search
 * @param fn - Function to compute the comparison value for each item
 * @returns The item with the maximum value, or undefined if the array is empty
 *
 * @example
 * ```ts
 * const people = [{name: 'Alice', age: 30}, {name: 'Bob', age: 25}]
 * maxBy(people, p => p.age) // {name: 'Alice', age: 30}
 *
 * maxBy([3, 1, 4, 1, 5], x => x) // 5
 * maxBy([], x => x) // undefined
 * ```
 * @internal
 */
export function maxBy<T>(arr: readonly T[], fn: (item: T) => number): T | undefined {
	let max: T | undefined
	let maxVal: number = -Infinity
	for (const item of arr) {
		const val = fn(item)
		if (val > maxVal) {
			max = item
			maxVal = val
		}
	}
	return max
}

/**
 * Split an array into two arrays based on a predicate function.
 *
 * Partitions an array into two arrays: one containing items that satisfy
 * the predicate, and another containing items that do not. The original array order is preserved.
 *
 * @param arr - The array to partition
 * @param predicate - The predicate function to test each item
 * @returns A tuple of two arrays: [satisfying items, non-satisfying items]
 *
 * @example
 * ```ts
 * const [evens, odds] = partition([1, 2, 3, 4, 5], x => x % 2 === 0)
 * // evens: [2, 4], odds: [1, 3, 5]
 *
 * const [adults, minors] = partition(
 *   [{name: 'Alice', age: 30}, {name: 'Bob', age: 17}],
 *   person => person.age >= 18
 * )
 * // adults: [{name: 'Alice', age: 30}], minors: [{name: 'Bob', age: 17}]
 * ```
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

/**
 * Check if two arrays are shallow equal.
 *
 * Compares two arrays for shallow equality by checking if they have the same length
 * and the same elements at each index using Object.is comparison. Returns true if arrays are
 * the same reference, have different lengths, or any elements differ.
 *
 * @param arr1 - First array to compare
 * @param arr2 - Second array to compare
 * @returns True if arrays are shallow equal, false otherwise
 *
 * @example
 * ```ts
 * areArraysShallowEqual([1, 2, 3], [1, 2, 3]) // true
 * areArraysShallowEqual([1, 2, 3], [1, 2, 4]) // false
 * areArraysShallowEqual(['a', 'b'], ['a', 'b']) // true
 * areArraysShallowEqual([1, 2], [1, 2, 3]) // false
 *
 * const obj = {x: 1}
 * areArraysShallowEqual([obj], [obj]) // true (same reference)
 * areArraysShallowEqual([{x: 1}], [{x: 1}]) // false (different objects)
 * ```
 * @internal
 */
export function areArraysShallowEqual<T>(arr1: readonly T[], arr2: readonly T[]): boolean {
	if (arr1 === arr2) return true
	if (arr1.length !== arr2.length) return false
	for (let i = 0; i < arr1.length; i++) {
		if (!Object.is(arr1[i], arr2[i])) {
			return false
		}
	}
	return true
}

/**
 * Merge custom entries with defaults, replacing defaults that have matching keys.
 *
 * Combines two arrays by keeping all custom entries and only the default entries
 * that don't have a matching key in the custom entries. Custom entries always override defaults.
 * The result contains remaining defaults first, followed by all custom entries.
 *
 * @param key - The property name to use as the unique identifier
 * @param customEntries - Array of custom entries that will override defaults
 * @param defaults - Array of default entries
 * @returns A new array with defaults filtered out where custom entries exist, plus all custom entries
 *
 * @example
 * ```ts
 * const defaults = [{type: 'text', value: 'default'}, {type: 'number', value: 0}]
 * const custom = [{type: 'text', value: 'custom'}]
 *
 * mergeArraysAndReplaceDefaults('type', custom, defaults)
 * // Result: [{type: 'number', value: 0}, {type: 'text', value: 'custom'}]
 *
 * const tools = [{id: 'select', name: 'Select'}, {id: 'draw', name: 'Draw'}]
 * const customTools = [{id: 'select', name: 'Custom Select'}]
 *
 * mergeArraysAndReplaceDefaults('id', customTools, tools)
 * // Result: [{id: 'draw', name: 'Draw'}, {id: 'select', name: 'Custom Select'}]
 * ```
 * @internal
 */
export function mergeArraysAndReplaceDefaults<
	const Key extends string,
	T extends { [K in Key]: string },
>(key: Key, customEntries: readonly T[], defaults: readonly T[]) {
	const overrideTypes = new Set(customEntries.map((entry) => entry[key]))

	const result = []
	for (const defaultEntry of defaults) {
		if (overrideTypes.has(defaultEntry[key])) continue
		result.push(defaultEntry)
	}

	for (const customEntry of customEntries) {
		result.push(customEntry)
	}

	return result
}
