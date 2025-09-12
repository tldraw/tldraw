import {
	areArraysShallowEqual,
	compact,
	dedupe,
	last,
	maxBy,
	mergeArraysAndReplaceDefaults,
	minBy,
	partition,
	rotateArray,
} from './array'

describe('rotateArray', () => {
	test('should rotate array to the left with positive offset', () => {
		// Based on JSDoc examples, this is the expected behavior
		expect(rotateArray([1, 2, 3, 4], 1)).toEqual([2, 3, 4, 1])
		expect(rotateArray([1, 2, 3, 4], 2)).toEqual([3, 4, 1, 2])
	})

	test('should rotate array to the left with negative offset', () => {
		// Based on JSDoc examples, this is the expected behavior
		expect(rotateArray([1, 2, 3, 4], -1)).toEqual([2, 3, 4, 1])
		expect(rotateArray([1, 2, 3, 4], -2)).toEqual([3, 4, 1, 2])
	})

	it('should handle zero offset', () => {
		expect(rotateArray([1, 2, 3, 4], 0)).toEqual([1, 2, 3, 4])
	})

	test('should handle offset larger than array length', () => {
		// Based on understanding of rotation: offset 5 on length 3 should be same as offset 2
		expect(rotateArray([1, 2, 3], 5)).toEqual([3, 1, 2])
		// offset -5 on length 3 should be same as offset -2 which should be same as offset 2
		expect(rotateArray([1, 2, 3], -5)).toEqual([3, 1, 2])
	})

	it('should handle empty array', () => {
		expect(rotateArray([], 1)).toEqual([])
	})

	test('should work with different types', () => {
		// Based on JSDoc examples, this is the expected behavior
		expect(rotateArray(['a', 'b', 'c'], 2)).toEqual(['c', 'a', 'b'])
	})
})

describe('dedupe', () => {
	it('should remove duplicate primitives', () => {
		expect(dedupe([1, 2, 2, 3, 1])).toEqual([1, 2, 3])
		expect(dedupe(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
	})

	it('should preserve order of first occurrence', () => {
		expect(dedupe([3, 1, 2, 1, 3])).toEqual([3, 1, 2])
	})

	it('should handle empty array', () => {
		expect(dedupe([])).toEqual([])
	})

	it('should handle array with no duplicates', () => {
		expect(dedupe([1, 2, 3])).toEqual([1, 2, 3])
	})

	it('should use custom equality function', () => {
		const objects = [
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
			{ id: 1, name: 'c' },
		]
		expect(dedupe(objects, (a, b) => a.id === b.id)).toEqual([
			{ id: 1, name: 'a' },
			{ id: 2, name: 'b' },
		])
	})

	it('should handle objects without custom equality', () => {
		const obj1 = { id: 1 }
		const obj2 = { id: 2 }
		expect(dedupe([obj1, obj2, obj1])).toEqual([obj1, obj2])
	})
})

describe('compact', () => {
	it('should remove null and undefined values', () => {
		expect(compact([1, null, 2, undefined, 3])).toEqual([1, 2, 3])
	})

	it('should preserve falsy values that are not null/undefined', () => {
		expect(compact([0, false, '', null, undefined, 'hello'])).toEqual([0, false, '', 'hello'])
	})

	it('should handle empty array', () => {
		expect(compact([])).toEqual([])
	})

	it('should handle array with only null/undefined', () => {
		expect(compact([null, undefined, null])).toEqual([])
	})

	it('should handle array with no null/undefined', () => {
		expect(compact([1, 2, 3])).toEqual([1, 2, 3])
	})
})

describe('last', () => {
	it('should return last element of array', () => {
		expect(last([1, 2, 3])).toBe(3)
		expect(last(['a', 'b', 'c'])).toBe('c')
	})

	it('should return undefined for empty array', () => {
		expect(last([])).toBeUndefined()
	})

	it('should work with single element array', () => {
		expect(last([42])).toBe(42)
	})

	it('should work with readonly arrays', () => {
		const readonlyArr: readonly number[] = [1, 2, 3]
		expect(last(readonlyArr)).toBe(3)
	})
})

describe('minBy', () => {
	it('should find item with minimum value', () => {
		const people = [
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: 25 },
			{ name: 'Charlie', age: 35 },
		]
		expect(minBy(people, (p) => p.age)).toEqual({ name: 'Bob', age: 25 })
	})

	it('should work with numbers', () => {
		expect(minBy([3, 1, 4, 1, 5], (x) => x)).toBe(1)
	})

	it('should return undefined for empty array', () => {
		expect(minBy([], (x) => x)).toBeUndefined()
	})

	it('should handle ties by returning first occurrence', () => {
		const items = [{ val: 5 }, { val: 3 }, { val: 3 }, { val: 7 }]
		expect(minBy(items, (x) => x.val)).toEqual({ val: 3 })
	})

	it('should work with negative values', () => {
		expect(minBy([-1, -5, -3], (x) => x)).toBe(-5)
	})
})

describe('maxBy', () => {
	it('should find item with maximum value', () => {
		const people = [
			{ name: 'Alice', age: 30 },
			{ name: 'Bob', age: 25 },
			{ name: 'Charlie', age: 35 },
		]
		expect(maxBy(people, (p) => p.age)).toEqual({ name: 'Charlie', age: 35 })
	})

	it('should work with numbers', () => {
		expect(maxBy([3, 1, 4, 1, 5], (x) => x)).toBe(5)
	})

	it('should return undefined for empty array', () => {
		expect(maxBy([], (x) => x)).toBeUndefined()
	})

	it('should handle ties by returning first occurrence', () => {
		const items = [{ val: 5 }, { val: 7 }, { val: 7 }, { val: 3 }]
		expect(maxBy(items, (x) => x.val)).toEqual({ val: 7 })
	})

	it('should work with negative values', () => {
		expect(maxBy([-1, -5, -3], (x) => x)).toBe(-1)
	})
})

describe('partition', () => {
	it('should split array based on predicate', () => {
		const [evens, odds] = partition([1, 2, 3, 4, 5], (x) => x % 2 === 0)
		expect(evens).toEqual([2, 4])
		expect(odds).toEqual([1, 3, 5])
	})

	it('should preserve order within partitions', () => {
		const [adults, minors] = partition(
			[
				{ name: 'Alice', age: 30 },
				{ name: 'Bob', age: 17 },
				{ name: 'Charlie', age: 25 },
			],
			(person) => person.age >= 18
		)
		expect(adults).toEqual([
			{ name: 'Alice', age: 30 },
			{ name: 'Charlie', age: 25 },
		])
		expect(minors).toEqual([{ name: 'Bob', age: 17 }])
	})

	it('should handle empty array', () => {
		const [satisfies, doesNotSatisfy] = partition([], (x) => x > 0)
		expect(satisfies).toEqual([])
		expect(doesNotSatisfy).toEqual([])
	})

	it('should handle all items satisfying predicate', () => {
		const [satisfies, doesNotSatisfy] = partition([2, 4, 6], (x) => x % 2 === 0)
		expect(satisfies).toEqual([2, 4, 6])
		expect(doesNotSatisfy).toEqual([])
	})

	it('should handle no items satisfying predicate', () => {
		const [satisfies, doesNotSatisfy] = partition([1, 3, 5], (x) => x % 2 === 0)
		expect(satisfies).toEqual([])
		expect(doesNotSatisfy).toEqual([1, 3, 5])
	})
})

describe('areArraysShallowEqual', () => {
	it('should return true for identical arrays', () => {
		expect(areArraysShallowEqual([1, 2, 3], [1, 2, 3])).toBe(true)
		expect(areArraysShallowEqual(['a', 'b'], ['a', 'b'])).toBe(true)
	})

	it('should return true for same reference', () => {
		const arr = [1, 2, 3]
		expect(areArraysShallowEqual(arr, arr)).toBe(true)
	})

	it('should return false for different lengths', () => {
		expect(areArraysShallowEqual([1, 2], [1, 2, 3])).toBe(false)
	})

	it('should return false for different elements', () => {
		expect(areArraysShallowEqual([1, 2, 3], [1, 2, 4])).toBe(false)
	})

	it('should return true for empty arrays', () => {
		expect(areArraysShallowEqual([], [])).toBe(true)
	})

	it('should use Object.is for comparison', () => {
		expect(areArraysShallowEqual([NaN], [NaN])).toBe(true)
		expect(areArraysShallowEqual([0], [-0])).toBe(false)
	})

	it('should work with object references', () => {
		const obj = { x: 1 }
		expect(areArraysShallowEqual([obj], [obj])).toBe(true)
		expect(areArraysShallowEqual([{ x: 1 }], [{ x: 1 }])).toBe(false)
	})

	it('should work with readonly arrays', () => {
		const arr1: readonly number[] = [1, 2, 3]
		const arr2: readonly number[] = [1, 2, 3]
		expect(areArraysShallowEqual(arr1, arr2)).toBe(true)
	})
})

describe('mergeArraysAndReplaceDefaults', () => {
	it('should merge custom entries with defaults, allowing custom entries to override defaults', () => {
		const defaults = [
			{ id: 'select', name: 'Default Select' },
			{ id: 'draw', name: 'Default Draw' },
			{ id: 'eraser', name: 'Default Eraser' },
		]

		const customEntries = [
			{ id: 'select', name: 'Custom Select' },
			{ id: 'custom-tool', name: 'Custom Tool' },
		]

		const result = mergeArraysAndReplaceDefaults('id', customEntries, defaults)

		expect(result).toEqual([
			{ id: 'draw', name: 'Default Draw' },
			{ id: 'eraser', name: 'Default Eraser' },
			{ id: 'select', name: 'Custom Select' },
			{ id: 'custom-tool', name: 'Custom Tool' },
		])
	})

	it('should handle empty custom entries', () => {
		const defaults = [
			{ id: 'select', name: 'Default Select' },
			{ id: 'draw', name: 'Default Draw' },
		]

		const customEntries: typeof defaults = []

		const result = mergeArraysAndReplaceDefaults('id', customEntries, defaults)

		expect(result).toEqual(defaults)
	})

	it('should handle empty defaults', () => {
		const defaults: Array<{ id: string; name: string }> = []

		const customEntries = [{ id: 'custom-tool', name: 'Custom Tool' }]

		const result = mergeArraysAndReplaceDefaults('id', customEntries, defaults)

		expect(result).toEqual(customEntries)
	})

	it('should handle both empty arrays', () => {
		const defaults: Array<{ id: string; name: string }> = []
		const customEntries: Array<{ id: string; name: string }> = []

		const result = mergeArraysAndReplaceDefaults('id', customEntries, defaults)

		expect(result).toEqual([])
	})

	it('should work with different key names', () => {
		const defaults = [
			{ type: 'text', name: 'Default Text' },
			{ type: 'geo', name: 'Default Geo' },
		]

		const customEntries = [
			{ type: 'text', name: 'Custom Text' },
			{ type: 'custom', name: 'Custom Shape' },
		]

		const result = mergeArraysAndReplaceDefaults('type', customEntries, defaults)

		expect(result).toEqual([
			{ type: 'geo', name: 'Default Geo' },
			{ type: 'text', name: 'Custom Text' },
			{ type: 'custom', name: 'Custom Shape' },
		])
	})
})
