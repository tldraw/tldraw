import {
	areArraysShallowEqual,
	compact,
	dedupe,
	maxBy,
	mergeArraysAndReplaceDefaults,
	minBy,
	partition,
	rotateArray,
} from './array'

describe('rotateArray', () => {
	test('should rotate array with positive and negative offsets', () => {
		expect(rotateArray([1, 2, 3, 4], 1)).toEqual([2, 3, 4, 1])
		expect(rotateArray([1, 2, 3, 4], -1)).toEqual([2, 3, 4, 1])
	})

	test('should handle offset larger than array length', () => {
		expect(rotateArray([1, 2, 3], 5)).toEqual([3, 1, 2])
	})
})

describe('dedupe', () => {
	it('should remove duplicates and preserve order', () => {
		expect(dedupe([1, 2, 2, 3, 1])).toEqual([1, 2, 3])
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
})

describe('compact', () => {
	it('should remove null and undefined but preserve other falsy values', () => {
		expect(compact([0, false, '', null, undefined, 'hello'])).toEqual([0, false, '', 'hello'])
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

	it('should handle ties by returning first occurrence', () => {
		const items = [{ val: 5 }, { val: 3 }, { val: 3 }, { val: 7 }]
		expect(minBy(items, (x) => x.val)).toEqual({ val: 3 })
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
})

describe('partition', () => {
	it('should split array based on predicate and preserve order', () => {
		const [evens, odds] = partition([1, 2, 3, 4, 5], (x) => x % 2 === 0)
		expect(evens).toEqual([2, 4])
		expect(odds).toEqual([1, 3, 5])
	})
})

describe('areArraysShallowEqual', () => {
	it('should compare arrays using Object.is semantics', () => {
		expect(areArraysShallowEqual([1, 2, 3], [1, 2, 3])).toBe(true)
		expect(areArraysShallowEqual([1, 2, 3], [1, 2, 4])).toBe(false)
		expect(areArraysShallowEqual([NaN], [NaN])).toBe(true)
		expect(areArraysShallowEqual([0], [-0])).toBe(false)
	})
})

describe('mergeArraysAndReplaceDefaults', () => {
	it('should merge arrays with custom entries overriding defaults', () => {
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
})
