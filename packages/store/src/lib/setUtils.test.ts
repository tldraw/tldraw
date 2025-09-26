import { describe, expect, it } from 'vitest'
import { diffSets, intersectSets } from './setUtils'

describe('intersectSets', () => {
	it('should return intersection of multiple sets', () => {
		const set1 = new Set([1, 2, 3, 4])
		const set2 = new Set([2, 3, 4, 5])
		const set3 = new Set([3, 4, 5, 6])

		const result = intersectSets([set1, set2, set3])

		expect(Array.from(result).sort()).toEqual([3, 4])
	})

	it('should return empty set when no sets provided', () => {
		const result = intersectSets([])
		expect(result.size).toBe(0)
	})

	it('should return empty set when no common elements exist', () => {
		const set1 = new Set([1, 2, 3])
		const set2 = new Set([4, 5, 6])

		const result = intersectSets([set1, set2])

		expect(result.size).toBe(0)
	})

	it('should return empty set when any set is empty', () => {
		const set1 = new Set([1, 2, 3])
		const set2 = new Set<number>()
		const set3 = new Set([2, 3, 4])

		const result = intersectSets([set1, set2, set3])

		expect(result.size).toBe(0)
	})

	it('should return copy of single set', () => {
		const set1 = new Set([1, 2, 3])
		const result = intersectSets([set1])

		expect(result).not.toBe(set1)
		expect(Array.from(result).sort()).toEqual([1, 2, 3])
	})
})

describe('diffSets', () => {
	it('should detect added elements', () => {
		const prev = new Set(['a', 'b'])
		const next = new Set(['a', 'b', 'c'])

		const result = diffSets(prev, next)

		expect(result?.added).toBeDefined()
		expect(result?.removed).toBeUndefined()
		expect(Array.from(result!.added!)).toEqual(['c'])
	})

	it('should detect removed elements', () => {
		const prev = new Set(['a', 'b', 'c'])
		const next = new Set(['a', 'b'])

		const result = diffSets(prev, next)

		expect(result?.removed).toBeDefined()
		expect(result?.added).toBeUndefined()
		expect(Array.from(result!.removed!)).toEqual(['c'])
	})

	it('should detect both added and removed elements', () => {
		const prev = new Set(['a', 'b'])
		const next = new Set(['b', 'c'])

		const result = diffSets(prev, next)

		expect(result?.added).toBeDefined()
		expect(result?.removed).toBeDefined()
		expect(Array.from(result!.added!)).toEqual(['c'])
		expect(Array.from(result!.removed!)).toEqual(['a'])
	})

	it('should return undefined when sets are identical', () => {
		const prev = new Set(['a', 'b', 'c'])
		const next = new Set(['a', 'b', 'c'])

		const result = diffSets(prev, next)

		expect(result).toBeUndefined()
	})

	it('should handle object references correctly', () => {
		const obj1 = { id: 1 }
		const obj2 = { id: 2 }
		const obj3 = { id: 3 }

		const prev = new Set([obj1, obj2])
		const next = new Set([obj2, obj3])

		const result = diffSets(prev, next)

		expect(result?.added?.has(obj3)).toBe(true)
		expect(result?.removed?.has(obj1)).toBe(true)
	})
})
