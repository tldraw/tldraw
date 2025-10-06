import { describe, expect, it } from 'vitest'
import {
	type IndexKey,
	getIndexAbove,
	getIndexBelow,
	getIndexBetween,
	getIndices,
	getIndicesAbove,
	getIndicesBelow,
	getIndicesBetween,
	sortByIndex,
	validateIndexKey,
} from './reordering'

describe('reordering', () => {
	describe('validateIndexKey', () => {
		it('should accept valid index keys', () => {
			expect(() => validateIndexKey('a0')).not.toThrow()
			expect(() => validateIndexKey('a1')).not.toThrow()
			expect(() => validateIndexKey('a0V')).not.toThrow()
		})

		it('should throw for invalid index keys', () => {
			expect(() => validateIndexKey('')).toThrow('invalid index: ')
			expect(() => validateIndexKey('invalid')).toThrow('invalid index: invalid')
			expect(() => validateIndexKey('123')).toThrow('invalid index: 123')
		})
	})

	describe('getIndicesBetween', () => {
		it('should generate indices between two indices', () => {
			const indices = getIndicesBetween('a0' as IndexKey, 'a2' as IndexKey, 2)
			expect(indices).toHaveLength(2)
			expect(indices.every((index) => index > 'a0' && index < 'a2')).toBe(true)
		})

		it('should handle null/undefined parameters', () => {
			const indices1 = getIndicesBetween(null, 'a2' as IndexKey, 2)
			expect(indices1).toHaveLength(2)
			expect(indices1.every((index) => index < 'a2')).toBe(true)

			const indices2 = getIndicesBetween('a0' as IndexKey, null, 2)
			expect(indices2).toHaveLength(2)
			expect(indices2.every((index) => index > 'a0')).toBe(true)
		})
	})

	describe('getIndicesAbove', () => {
		it('should generate indices above a given index', () => {
			const indices = getIndicesAbove('a0' as IndexKey, 3)
			expect(indices).toHaveLength(3)
			expect(indices.every((index) => index > 'a0')).toBe(true)
		})

		it('should handle null/undefined parameters', () => {
			const indices = getIndicesAbove(null, 3)
			expect(indices).toHaveLength(3)
		})
	})

	describe('getIndicesBelow', () => {
		it('should generate indices below a given index', () => {
			const indices = getIndicesBelow('a5' as IndexKey, 3)
			expect(indices).toHaveLength(3)
			expect(indices.every((index) => index < 'a5')).toBe(true)
		})

		it('should handle null/undefined parameters', () => {
			const indices = getIndicesBelow(null, 3)
			expect(indices).toHaveLength(3)
		})
	})

	describe('getIndexBetween', () => {
		it('should generate single index between two indices', () => {
			const index = getIndexBetween('a0' as IndexKey, 'a2' as IndexKey)
			expect(index > 'a0' && index < 'a2').toBe(true)
		})

		it('should handle null/undefined parameters', () => {
			const index1 = getIndexBetween(null, 'a2' as IndexKey)
			expect(index1 < 'a2').toBe(true)

			const index2 = getIndexBetween('a0' as IndexKey, null)
			expect(index2 > 'a0').toBe(true)
		})
	})

	describe('getIndexAbove', () => {
		it('should generate index above given index', () => {
			const index = getIndexAbove('a0' as IndexKey)
			expect(index > 'a0').toBe(true)
		})

		it('should handle null/undefined/no parameters', () => {
			const index = getIndexAbove()
			expect(typeof index).toBe('string')
		})
	})

	describe('getIndexBelow', () => {
		it('should generate index below given index', () => {
			const index = getIndexBelow('a5' as IndexKey)
			expect(index < 'a5').toBe(true)
		})

		it('should handle null/undefined/no parameters', () => {
			const index = getIndexBelow()
			expect(typeof index).toBe('string')
		})
	})

	describe('getIndices', () => {
		it('should generate indices starting from given index', () => {
			const indices = getIndices(3, 'a1' as IndexKey)
			expect(indices).toHaveLength(4) // start + n additional
			expect(indices[0]).toBe('a1')
			expect(indices.every((index) => index >= 'a1')).toBe(true)
		})

		it('should use default start index when not provided', () => {
			const indices = getIndices(3)
			expect(indices).toHaveLength(4)
			expect(indices[0]).toBe('a1')
		})
	})

	describe('sortByIndex', () => {
		it('should sort objects by index property in ascending order', () => {
			const objects = [
				{ id: 'c', index: 'a3' as IndexKey },
				{ id: 'a', index: 'a1' as IndexKey },
				{ id: 'b', index: 'a2' as IndexKey },
			]

			const sorted = objects.sort(sortByIndex)
			expect(sorted.map((obj) => obj.id)).toEqual(['a', 'b', 'c'])
		})

		it('should handle fractional indices correctly', () => {
			const objects = [
				{ id: 'c', index: 'a1V' as IndexKey }, // Between a1 and a2
				{ id: 'a', index: 'a1' as IndexKey },
				{ id: 'b', index: 'a2' as IndexKey },
			]

			const sorted = objects.sort(sortByIndex)
			expect(sorted.map((obj) => obj.id)).toEqual(['a', 'c', 'b'])
		})
	})

	describe('integration tests', () => {
		it('should maintain order when inserting indices between existing ones', () => {
			const start = getIndexAbove()
			const end = getIndexAbove(start)
			const between = getIndexBetween(start, end)

			const objects = [
				{ id: 'first', index: start },
				{ id: 'last', index: end },
				{ id: 'middle', index: between },
			]

			const sorted = objects.sort(sortByIndex)
			expect(sorted.map((obj) => obj.id)).toEqual(['first', 'middle', 'last'])
		})
	})
})
