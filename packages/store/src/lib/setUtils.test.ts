import { describe, expect, it } from 'vitest'
import { diffSets, intersectSets } from './setUtils'

describe('intersectSets', () => {
	describe('with valid inputs', () => {
		it('should return intersection of multiple sets with common elements', () => {
			const set1 = new Set([1, 2, 3, 4])
			const set2 = new Set([2, 3, 4, 5])
			const set3 = new Set([3, 4, 5, 6])

			const result = intersectSets([set1, set2, set3])

			expect(result).toBeInstanceOf(Set)
			expect(result.size).toBe(2)
			expect(result.has(3)).toBe(true)
			expect(result.has(4)).toBe(true)
			expect(result.has(1)).toBe(false)
			expect(result.has(5)).toBe(false)
		})

		it('should return intersection with string elements', () => {
			const set1 = new Set(['a', 'b', 'c'])
			const set2 = new Set(['b', 'c', 'd'])
			const set3 = new Set(['c', 'd', 'e'])

			const result = intersectSets([set1, set2, set3])

			expect(result.size).toBe(1)
			expect(result.has('c')).toBe(true)
		})

		it('should return intersection with object elements', () => {
			const obj1 = { id: 1 }
			const obj2 = { id: 2 }
			const obj3 = { id: 3 }

			const set1 = new Set([obj1, obj2, obj3])
			const set2 = new Set([obj2, obj3])
			const set3 = new Set([obj2])

			const result = intersectSets([set1, set2, set3])

			expect(result.size).toBe(1)
			expect(result.has(obj2)).toBe(true)
			expect(result.has(obj1)).toBe(false)
			expect(result.has(obj3)).toBe(false)
		})

		it('should handle mixed type elements', () => {
			const set1 = new Set([1, 'a', true])
			const set2 = new Set(['a', true, null])
			const set3 = new Set([true, null, undefined])

			const result = intersectSets([set1, set2, set3])

			expect(result.size).toBe(1)
			expect(result.has(true)).toBe(true)
		})

		it('should return single set when only one set provided', () => {
			const set1 = new Set([1, 2, 3])
			const result = intersectSets([set1])

			expect(result).not.toBe(set1) // Should be a new set
			expect(result.size).toBe(3)
			expect(result.has(1)).toBe(true)
			expect(result.has(2)).toBe(true)
			expect(result.has(3)).toBe(true)
		})

		it('should handle duplicate sets correctly', () => {
			const set1 = new Set([1, 2, 3])
			const result = intersectSets([set1, set1, set1])

			expect(result.size).toBe(3)
			expect(result.has(1)).toBe(true)
			expect(result.has(2)).toBe(true)
			expect(result.has(3)).toBe(true)
		})
	})

	describe('with edge cases', () => {
		it('should return empty set when no sets provided', () => {
			const result = intersectSets([])

			expect(result).toBeInstanceOf(Set)
			expect(result.size).toBe(0)
		})

		it('should return empty set when no common elements exist', () => {
			const set1 = new Set([1, 2, 3])
			const set2 = new Set([4, 5, 6])
			const set3 = new Set([7, 8, 9])

			const result = intersectSets([set1, set2, set3])

			expect(result.size).toBe(0)
		})

		it('should return empty set when any set is empty', () => {
			const set1 = new Set([1, 2, 3])
			const set2 = new Set<number>()
			const set3 = new Set([2, 3, 4])

			const result = intersectSets([set1, set2, set3])

			expect(result.size).toBe(0)
		})

		it('should handle all empty sets', () => {
			const set1 = new Set<number>()
			const set2 = new Set<number>()
			const set3 = new Set<number>()

			const result = intersectSets([set1, set2, set3])

			expect(result.size).toBe(0)
		})

		it('should handle sets with special values', () => {
			const set1 = new Set<any>([null, undefined, 0, false, ''])
			const set2 = new Set<any>([null, 0, ''])
			const set3 = new Set<any>([null, ''])

			const result = intersectSets([set1, set2, set3])

			expect(result.size).toBe(2)
			expect(result.has(null)).toBe(true)
			expect(result.has('')).toBe(true)
			expect(result.has(0)).toBe(false)
			expect(result.has(false)).toBe(false)
			expect(result.has(undefined)).toBe(false)
		})
	})

	describe('with large datasets', () => {
		it('should handle large sets efficiently', () => {
			const size = 10000
			const set1 = new Set(Array.from({ length: size }, (_, i) => i))
			const set2 = new Set(Array.from({ length: size }, (_, i) => i + 5000))
			const set3 = new Set(Array.from({ length: size }, (_, i) => i + 7500))

			const result = intersectSets([set1, set2, set3])

			expect(result.size).toBe(2500) // 7500 to 9999
			expect(result.has(7500)).toBe(true)
			expect(result.has(9999)).toBe(true)
			expect(result.has(7499)).toBe(false)
			expect(result.has(10000)).toBe(false)
		})
	})

	describe('type safety', () => {
		it('should maintain type safety with generics', () => {
			const stringSet1 = new Set(['a', 'b', 'c'])
			const stringSet2 = new Set(['b', 'c', 'd'])

			const result = intersectSets([stringSet1, stringSet2])

			// TypeScript should infer Set<string>
			expect(result).toBeInstanceOf(Set)
			expect(typeof result.values().next().value).toBe('string')
		})
	})
})

describe('diffSets', () => {
	describe('with changes present', () => {
		it('should detect added elements', () => {
			const prev = new Set(['a', 'b'])
			const next = new Set(['a', 'b', 'c', 'd'])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.added).toBeDefined()
			expect(result!.added!.size).toBe(2)
			expect(result!.added!.has('c')).toBe(true)
			expect(result!.added!.has('d')).toBe(true)
			expect(result!.removed).toBeUndefined()
		})

		it('should detect removed elements', () => {
			const prev = new Set(['a', 'b', 'c', 'd'])
			const next = new Set(['a', 'b'])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.removed).toBeDefined()
			expect(result!.removed!.size).toBe(2)
			expect(result!.removed!.has('c')).toBe(true)
			expect(result!.removed!.has('d')).toBe(true)
			expect(result!.added).toBeUndefined()
		})

		it('should detect both added and removed elements', () => {
			const prev = new Set(['a', 'b', 'c'])
			const next = new Set(['b', 'c', 'd'])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.added).toBeDefined()
			expect(result!.removed).toBeDefined()
			expect(result!.added!.size).toBe(1)
			expect(result!.removed!.size).toBe(1)
			expect(result!.added!.has('d')).toBe(true)
			expect(result!.removed!.has('a')).toBe(true)
		})

		it('should handle complete replacement', () => {
			const prev = new Set([1, 2, 3])
			const next = new Set([4, 5, 6])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.added!.size).toBe(3)
			expect(result!.removed!.size).toBe(3)
			expect(result!.added!.has(4)).toBe(true)
			expect(result!.added!.has(5)).toBe(true)
			expect(result!.added!.has(6)).toBe(true)
			expect(result!.removed!.has(1)).toBe(true)
			expect(result!.removed!.has(2)).toBe(true)
			expect(result!.removed!.has(3)).toBe(true)
		})

		it('should handle adding to empty set', () => {
			const prev = new Set<string>()
			const next = new Set(['a', 'b'])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.added!.size).toBe(2)
			expect(result!.added!.has('a')).toBe(true)
			expect(result!.added!.has('b')).toBe(true)
			expect(result!.removed).toBeUndefined()
		})

		it('should handle removing all elements', () => {
			const prev = new Set(['a', 'b'])
			const next = new Set<string>()

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.removed!.size).toBe(2)
			expect(result!.removed!.has('a')).toBe(true)
			expect(result!.removed!.has('b')).toBe(true)
			expect(result!.added).toBeUndefined()
		})
	})

	describe('with no changes', () => {
		it('should return undefined when sets are identical', () => {
			const prev = new Set(['a', 'b', 'c'])
			const next = new Set(['a', 'b', 'c'])

			const result = diffSets(prev, next)

			expect(result).toBeUndefined()
		})

		it('should return undefined when both sets are empty', () => {
			const prev = new Set<string>()
			const next = new Set<string>()

			const result = diffSets(prev, next)

			expect(result).toBeUndefined()
		})

		it('should return undefined when comparing same set instance', () => {
			const set = new Set(['a', 'b', 'c'])

			const result = diffSets(set, set)

			expect(result).toBeUndefined()
		})
	})

	describe('with special values', () => {
		it('should handle null and undefined correctly', () => {
			const prev = new Set<string | number | boolean | null | undefined>([null, undefined, 0])
			const next = new Set<string | number | boolean | null | undefined>([null, false, ''])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.added!.size).toBe(2)
			expect(result!.removed!.size).toBe(2)
			expect(result!.added!.has(false)).toBe(true)
			expect(result!.added!.has('')).toBe(true)
			expect(result!.removed!.has(undefined)).toBe(true)
			expect(result!.removed!.has(0)).toBe(true)
			// null should remain unchanged
		})

		it('should handle object references correctly', () => {
			const obj1 = { id: 1 }
			const obj2 = { id: 2 }
			const obj3 = { id: 3 }

			const prev = new Set([obj1, obj2])
			const next = new Set([obj2, obj3])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.added!.has(obj3)).toBe(true)
			expect(result!.removed!.has(obj1)).toBe(true)
			expect(result!.added!.size).toBe(1)
			expect(result!.removed!.size).toBe(1)
		})

		it('should distinguish between different object instances with same content', () => {
			const obj1 = { id: 1, name: 'test' }
			const obj2 = { id: 1, name: 'test' } // Different instance, same content

			const prev = new Set([obj1])
			const next = new Set([obj2])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.added!.has(obj2)).toBe(true)
			expect(result!.removed!.has(obj1)).toBe(true)
		})
	})

	describe('with large datasets', () => {
		it('should handle large sets efficiently', () => {
			const size = 10000
			const prev = new Set(Array.from({ length: size }, (_, i) => i))
			const next = new Set(Array.from({ length: size }, (_, i) => i + 1000))

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.added!.size).toBe(1000) // 10000 to 10999
			expect(result!.removed!.size).toBe(1000) // 0 to 999

			// Check a few specific values
			expect(result!.removed!.has(0)).toBe(true)
			expect(result!.removed!.has(999)).toBe(true)
			expect(result!.added!.has(10000)).toBe(true)
			expect(result!.added!.has(10999)).toBe(true)
		})

		it('should handle minimal changes in large sets', () => {
			const size = 10000
			const baseArray = Array.from({ length: size }, (_, i) => i)

			const prev = new Set(baseArray)
			const next = new Set([...baseArray.slice(1), size]) // Remove 0, add size

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.added!.size).toBe(1)
			expect(result!.removed!.size).toBe(1)
			expect(result!.added!.has(size)).toBe(true)
			expect(result!.removed!.has(0)).toBe(true)
		})
	})

	describe('type safety and generics', () => {
		it('should maintain type safety with string sets', () => {
			const prev = new Set(['a', 'b'])
			const next = new Set(['b', 'c'])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			if (result!.added) {
				// TypeScript should infer Set<string> for added
				for (const item of result!.added) {
					expect(typeof item).toBe('string')
				}
			}
		})

		it('should maintain type safety with number sets', () => {
			const prev = new Set([1, 2])
			const next = new Set([2, 3])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			if (result!.added) {
				for (const item of result!.added) {
					expect(typeof item).toBe('number')
				}
			}
		})
	})

	describe('CollectionDiff interface compliance', () => {
		it('should return proper CollectionDiff structure', () => {
			const prev = new Set(['a', 'b'])
			const next = new Set(['b', 'c'])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(typeof result).toBe('object')

			// Check that added property is a Set when present
			if (result!.added) {
				expect(result!.added).toBeInstanceOf(Set)
			}

			// Check that removed property is a Set when present
			if (result!.removed) {
				expect(result!.removed).toBeInstanceOf(Set)
			}
		})

		it('should use nullish coalescing assignment correctly', () => {
			const prev = new Set(['a'])
			const next = new Set(['b'])

			const result = diffSets(prev, next)

			expect(result).toBeDefined()
			expect(result!.added).toBeInstanceOf(Set)
			expect(result!.removed).toBeInstanceOf(Set)
			expect(result!.added!.size).toBe(1)
			expect(result!.removed!.size).toBe(1)
		})
	})
})
