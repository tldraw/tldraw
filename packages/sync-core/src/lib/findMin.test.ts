import { describe, expect, it } from 'vitest'
import { findMin } from './findMin'

describe('findMin', () => {
	describe('basic array operations', () => {
		it('should return the minimum value from an array of positive numbers', () => {
			expect(findMin([3, 1, 4, 1, 5])).toBe(1)
			expect(findMin([10, 5, 8])).toBe(5)
			expect(findMin([42])).toBe(42)
		})

		it('should return the minimum value from an array of negative numbers', () => {
			expect(findMin([-3, -1, -4, -1, -5])).toBe(-5)
			expect(findMin([-10, -5, -8])).toBe(-10)
			expect(findMin([-42])).toBe(-42)
		})

		it('should return the minimum value from an array of mixed positive and negative numbers', () => {
			expect(findMin([-3, 1, -4, 5])).toBe(-4)
			expect(findMin([10, -5, 8, -2])).toBe(-5)
			expect(findMin([0, -1, 1])).toBe(-1)
		})

		it('should handle arrays with zero', () => {
			expect(findMin([0, 1, 2])).toBe(0)
			expect(findMin([1, 0, 2])).toBe(0)
			expect(findMin([0, 0, 0])).toBe(0)
			expect(findMin([0])).toBe(0)
		})

		it('should handle arrays with floating point numbers', () => {
			expect(findMin([3.14, 2.71, 1.41])).toBe(1.41)
			expect(findMin([0.1, 0.01, 0.001])).toBe(0.001)
			expect(findMin([-1.5, -2.7, -0.3])).toBe(-2.7)
		})

		it('should handle arrays with duplicate minimum values', () => {
			expect(findMin([1, 1, 1])).toBe(1)
			expect(findMin([5, 1, 3, 1, 4])).toBe(1)
			expect(findMin([-2, -2, -2])).toBe(-2)
		})

		it('should return null for empty arrays', () => {
			expect(findMin([])).toBe(null)
		})
	})

	describe('special number values', () => {
		it('should handle Infinity and -Infinity', () => {
			expect(findMin([Infinity, 1, 2])).toBe(1)
			expect(findMin([1, 2, Infinity])).toBe(1)
			expect(findMin([Infinity, -Infinity])).toBe(-Infinity)
			expect(findMin([-Infinity, 1, 2])).toBe(-Infinity)
		})

		it('should handle NaN values', () => {
			// When NaN is first, it becomes initial min and no subsequent value can replace it
			// since NaN < anything and anything < NaN are both false
			expect(findMin([NaN, 1, 2])).toBeNaN()
			expect(findMin([NaN, 3])).toBeNaN()

			// When NaN appears after other numbers, the non-NaN minimum is preserved
			expect(findMin([1, NaN, 2])).toBe(1)
			expect(findMin([1, 2, NaN])).toBe(1)
			expect(findMin([3, 1, NaN, 2])).toBe(1)

			// Array of only NaN values should return NaN
			expect(findMin([NaN])).toBeNaN()
			expect(findMin([NaN, NaN, NaN])).toBeNaN()
		})

		it('should handle very large and very small numbers', () => {
			expect(findMin([Number.MAX_VALUE, 1, Number.MIN_VALUE])).toBe(Number.MIN_VALUE)
			expect(findMin([Number.MAX_SAFE_INTEGER, 1, Number.MIN_SAFE_INTEGER])).toBe(
				Number.MIN_SAFE_INTEGER
			)
		})
	})

	describe('different iterable types', () => {
		it('should work with Set', () => {
			expect(findMin(new Set([3, 1, 4, 1, 5]))).toBe(1)
			expect(findMin(new Set([10, 5, 8]))).toBe(5)
			expect(findMin(new Set())).toBe(null)
		})

		it('should work with Map values', () => {
			const map = new Map([
				['a', 3],
				['b', 1],
				['c', 4],
			])
			expect(findMin(map.values())).toBe(1)

			const emptyMap = new Map<string, number>()
			expect(findMin(emptyMap.values())).toBe(null)
		})

		it('should work with generator functions', () => {
			function* numberGenerator() {
				yield 3
				yield 1
				yield 4
				yield 1
				yield 5
			}

			expect(findMin(numberGenerator())).toBe(1)
		})

		it('should work with array-like objects', () => {
			const arrayLike = {
				0: 3,
				1: 1,
				2: 4,
				length: 3,
				[Symbol.iterator]: function* (): Generator<number> {
					for (let i = 0; i < this.length; i++) {
						yield (this as any)[i]
					}
				},
			}

			expect(findMin(arrayLike)).toBe(1)
		})

		it('should work with typed arrays', () => {
			expect(findMin(new Int32Array([3, 1, 4, 1, 5]))).toBe(1)
			expect(findMin(new Float64Array([3.14, 2.71, 1.41]))).toBe(1.41)
			expect(findMin(new Int32Array())).toBe(null)
		})

		it('should work with strings as character codes', () => {
			// Note: This tests the iterable nature, though in practice
			// string iteration yields strings, not numbers
			// This would only work if the string contained single digit numbers
			const stringIterable = {
				[Symbol.iterator]: function* () {
					yield 3
					yield 1
					yield 4
				},
			}

			expect(findMin(stringIterable)).toBe(1)
		})
	})

	describe('edge cases and performance', () => {
		it('should handle large arrays efficiently', () => {
			const largeArray = Array.from({ length: 10000 }, (_, i) => Math.random() * 1000)
			const expected = Math.min(...largeArray)
			expect(findMin(largeArray)).toBe(expected)
		})

		it('should stop early when minimum is found at the beginning', () => {
			// This is more of a behavioral test - the function should still work correctly
			expect(findMin([1, 100, 200, 300])).toBe(1)
		})

		it('should handle minimum at the end', () => {
			expect(findMin([100, 200, 300, 1])).toBe(1)
		})

		it('should be consistent with multiple calls', () => {
			const values = [3, 1, 4, 1, 5]
			const result1 = findMin(values)
			const result2 = findMin(values)
			expect(result1).toBe(result2)
			expect(result1).toBe(1)
		})
	})

	describe('comparison with Math.min', () => {
		it('should match Math.min for arrays', () => {
			const testCases = [
				[3, 1, 4, 1, 5],
				[10, 5, 8],
				[42],
				[-3, -1, -4, -1, -5],
				[0, 1, 2],
				[3.14, 2.71, 1.41],
			]

			testCases.forEach((values) => {
				expect(findMin(values)).toBe(Math.min(...values))
			})
		})

		it('should handle cases where Math.min returns different results', () => {
			// Empty array: Math.min() returns Infinity, findMin returns null
			expect(Math.min()).toBe(Infinity)
			expect(findMin([])).toBe(null)
		})
	})
})
