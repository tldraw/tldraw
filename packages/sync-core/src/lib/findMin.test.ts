import { describe, expect, it } from 'vitest'
import { findMin } from './findMin'

describe('findMin', () => {
	it('should find minimum value from basic arrays', () => {
		expect(findMin([3, 1, 4, 1, 5])).toBe(1)
		expect(findMin([-3, -1, -4, -1, -5])).toBe(-5)
		expect(findMin([0, -1, 1])).toBe(-1)
	})

	it('should return null for empty arrays', () => {
		expect(findMin([])).toBe(null)
	})

	it('should handle NaN values correctly', () => {
		// When NaN is first, it becomes initial min and no subsequent value can replace it
		// since NaN < anything and anything < NaN are both false
		expect(findMin([NaN, 1, 2])).toBeNaN()
		// When NaN appears after other numbers, the non-NaN minimum is preserved
		expect(findMin([1, NaN, 2])).toBe(1)
	})

	it('should work with different iterable types', () => {
		// Test with Map values since this is used in the codebase with tombstones
		const map = new Map([
			['a', 3],
			['b', 1],
			['c', 4],
		])
		expect(findMin(map.values())).toBe(1)

		// Test with empty iterables
		const emptyMap = new Map<string, number>()
		expect(findMin(emptyMap.values())).toBe(null)
	})
})
