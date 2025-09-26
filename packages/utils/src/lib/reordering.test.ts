import { describe, expect, it } from 'vitest'
import {
	type IndexKey,
	ZERO_INDEX_KEY,
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
	describe('ZERO_INDEX_KEY', () => {
		it('should be "a0"', () => {
			expect(ZERO_INDEX_KEY).toBe('a0')
		})
	})

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

		it('should handle null below parameter', () => {
			const indices = getIndicesBetween(null, 'a2' as IndexKey, 2)
			expect(indices).toHaveLength(2)
			expect(indices.every((index) => index < 'a2')).toBe(true)
		})

		it('should handle null above parameter', () => {
			const indices = getIndicesBetween('a0' as IndexKey, null, 2)
			expect(indices).toHaveLength(2)
			expect(indices.every((index) => index > 'a0')).toBe(true)
		})

		it('should handle undefined parameters', () => {
			const indices = getIndicesBetween(undefined, undefined, 2)
			expect(indices).toHaveLength(2)
		})

		it('should generate correct number of indices', () => {
			const indices = getIndicesBetween('a0' as IndexKey, 'a3' as IndexKey, 5)
			expect(indices).toHaveLength(5)
		})

		it('should generate zero indices when n is 0', () => {
			const indices = getIndicesBetween('a0' as IndexKey, 'a2' as IndexKey, 0)
			expect(indices).toHaveLength(0)
		})

		it('should maintain lexicographic order', () => {
			const indices = getIndicesBetween('a0' as IndexKey, 'a3' as IndexKey, 3)
			const sorted = [...indices].sort()
			expect(indices).toEqual(sorted)
		})
	})

	describe('getIndicesAbove', () => {
		it('should generate indices above a given index', () => {
			const indices = getIndicesAbove('a0' as IndexKey, 3)
			expect(indices).toHaveLength(3)
			expect(indices.every((index) => index > 'a0')).toBe(true)
		})

		it('should handle null parameter', () => {
			const indices = getIndicesAbove(null, 3)
			expect(indices).toHaveLength(3)
		})

		it('should handle undefined parameter', () => {
			const indices = getIndicesAbove(undefined, 3)
			expect(indices).toHaveLength(3)
		})

		it('should generate zero indices when n is 0', () => {
			const indices = getIndicesAbove('a0' as IndexKey, 0)
			expect(indices).toHaveLength(0)
		})

		it('should maintain ascending order', () => {
			const indices = getIndicesAbove('a0' as IndexKey, 5)
			const sorted = [...indices].sort()
			expect(indices).toEqual(sorted)
		})
	})

	describe('getIndicesBelow', () => {
		it('should generate indices below a given index', () => {
			const indices = getIndicesBelow('a5' as IndexKey, 3)
			expect(indices).toHaveLength(3)
			expect(indices.every((index) => index < 'a5')).toBe(true)
		})

		it('should handle null parameter', () => {
			const indices = getIndicesBelow(null, 3)
			expect(indices).toHaveLength(3)
		})

		it('should handle undefined parameter', () => {
			const indices = getIndicesBelow(undefined, 3)
			expect(indices).toHaveLength(3)
		})

		it('should generate zero indices when n is 0', () => {
			const indices = getIndicesBelow('a5' as IndexKey, 0)
			expect(indices).toHaveLength(0)
		})

		it('should maintain ascending order', () => {
			const indices = getIndicesBelow('a5' as IndexKey, 5)
			const sorted = [...indices].sort()
			expect(indices).toEqual(sorted)
		})
	})

	describe('getIndexBetween', () => {
		it('should generate single index between two indices', () => {
			const index = getIndexBetween('a0' as IndexKey, 'a2' as IndexKey)
			expect(index > 'a0' && index < 'a2').toBe(true)
		})

		it('should handle null below parameter', () => {
			const index = getIndexBetween(null, 'a2' as IndexKey)
			expect(index < 'a2').toBe(true)
		})

		it('should handle null above parameter', () => {
			const index = getIndexBetween('a0' as IndexKey, null)
			expect(index > 'a0').toBe(true)
		})

		it('should handle both parameters as null', () => {
			const index = getIndexBetween(null, null)
			expect(typeof index).toBe('string')
		})

		it('should handle undefined parameters', () => {
			const index = getIndexBetween(undefined, undefined)
			expect(typeof index).toBe('string')
		})

		it('should generate different indices for different inputs', () => {
			const index1 = getIndexBetween('a0' as IndexKey, 'a1' as IndexKey)
			const index2 = getIndexBetween('a1' as IndexKey, 'a2' as IndexKey)
			expect(index1).not.toBe(index2)
		})
	})

	describe('getIndexAbove', () => {
		it('should generate index above given index', () => {
			const index = getIndexAbove('a0' as IndexKey)
			expect(index > 'a0').toBe(true)
		})

		it('should handle null parameter', () => {
			const index = getIndexAbove(null)
			expect(typeof index).toBe('string')
		})

		it('should handle undefined parameter', () => {
			const index = getIndexAbove(undefined)
			expect(typeof index).toBe('string')
		})

		it('should use default null parameter when no argument provided', () => {
			const index = getIndexAbove()
			expect(typeof index).toBe('string')
		})

		it('should generate consistent results for same input', () => {
			const index1 = getIndexAbove('a1' as IndexKey)
			const index2 = getIndexAbove('a1' as IndexKey)
			expect(index1).toBe(index2)
		})
	})

	describe('getIndexBelow', () => {
		it('should generate index below given index', () => {
			const index = getIndexBelow('a5' as IndexKey)
			expect(index < 'a5').toBe(true)
		})

		it('should handle null parameter', () => {
			const index = getIndexBelow(null)
			expect(typeof index).toBe('string')
		})

		it('should handle undefined parameter', () => {
			const index = getIndexBelow(undefined)
			expect(typeof index).toBe('string')
		})

		it('should use default null parameter when no argument provided', () => {
			const index = getIndexBelow()
			expect(typeof index).toBe('string')
		})

		it('should generate consistent results for same input', () => {
			const index1 = getIndexBelow('a5' as IndexKey)
			const index2 = getIndexBelow('a5' as IndexKey)
			expect(index1).toBe(index2)
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

		it('should generate zero additional indices when n is 0', () => {
			const indices = getIndices(0, 'a2' as IndexKey)
			expect(indices).toHaveLength(1) // just the start index
			expect(indices[0]).toBe('a2')
		})

		it('should maintain ascending order', () => {
			const indices = getIndices(5, 'a0' as IndexKey)
			const sorted = [...indices].sort()
			expect(indices).toEqual(sorted)
		})

		it('should include start index as first element', () => {
			const start = 'a3' as IndexKey
			const indices = getIndices(2, start)
			expect(indices[0]).toBe(start)
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

		it('should return -1 when a.index < b.index', () => {
			const a = { index: 'a1' as IndexKey }
			const b = { index: 'a2' as IndexKey }
			expect(sortByIndex(a, b)).toBe(-1)
		})

		it('should return 1 when a.index > b.index', () => {
			const a = { index: 'a2' as IndexKey }
			const b = { index: 'a1' as IndexKey }
			expect(sortByIndex(a, b)).toBe(1)
		})

		it('should return 0 when a.index === b.index', () => {
			const a = { index: 'a1' as IndexKey }
			const b = { index: 'a1' as IndexKey }
			expect(sortByIndex(a, b)).toBe(0)
		})

		it('should work with complex objects', () => {
			const shapes = [
				{ id: 'shape-3', type: 'rect', index: 'a3' as IndexKey },
				{ id: 'shape-1', type: 'circle', index: 'a1' as IndexKey },
				{ id: 'shape-2', type: 'arrow', index: 'a2' as IndexKey },
			]

			const sorted = shapes.sort(sortByIndex)
			expect(sorted.map((shape) => shape.id)).toEqual(['shape-1', 'shape-2', 'shape-3'])
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

		it('should handle complex reordering scenario', () => {
			// Create initial indices
			const indices = getIndices(3, ZERO_INDEX_KEY)

			// Insert indices between them
			const between01 = getIndexBetween(indices[0], indices[1])
			const between12 = getIndexBetween(indices[1], indices[2])

			const objects = [
				{ id: '0', index: indices[0] },
				{ id: '0.5', index: between01 },
				{ id: '1', index: indices[1] },
				{ id: '1.5', index: between12 },
				{ id: '2', index: indices[2] },
				{ id: '3', index: indices[3] },
			]

			const sorted = objects.sort(sortByIndex)
			expect(sorted.map((obj) => obj.id)).toEqual(['0', '0.5', '1', '1.5', '2', '3'])
		})

		it('should generate multiple indices that maintain order', () => {
			const below = 'a1' as IndexKey
			const above = 'a5' as IndexKey

			const between = getIndicesBetween(below, above, 3)
			const aboveIndices = getIndicesAbove(above, 2)
			const belowIndices = getIndicesBelow(below, 2)

			const allIndices = [...belowIndices, below, ...between, above, ...aboveIndices]
			const sorted = [...allIndices].sort()

			expect(allIndices).toEqual(sorted)
		})
	})
})
