import { describe, expect, it } from 'vitest'
import { diffSets, intersectSets } from './setUtils'

// Tests for SPEC.md §25 (set utilities).
// Rule IDs like [SU1] in test names refer to that document.

describe('intersectSets (SU)', () => {
	it('[SU1] returns the elements present in every set', () => {
		expect(
			intersectSets([new Set([1, 2, 3, 4]), new Set([2, 3, 4, 5]), new Set([3, 4, 5, 6])])
		).toEqual(new Set([3, 4]))

		expect(intersectSets([new Set([1, 2, 3]), new Set([4, 5, 6])])).toEqual(new Set())
		expect(intersectSets([new Set([1, 2, 3]), new Set(), new Set([2, 3, 4])])).toEqual(new Set())
	})

	it('[SU1] no sets yields an empty set', () => {
		expect(intersectSets([])).toEqual(new Set())
	})

	it('[SU1] a single set yields a copy', () => {
		const set = new Set([1, 2, 3])
		const result = intersectSets([set])

		expect(result).not.toBe(set)
		expect(result).toEqual(set)
	})
})

describe('diffSets (SU)', () => {
	it('[SU2] reports added and removed elements, with only the populated keys', () => {
		expect(diffSets(new Set(['a', 'b']), new Set(['a', 'b', 'c']))).toEqual({
			added: new Set(['c']),
		})

		expect(diffSets(new Set(['a', 'b', 'c']), new Set(['a', 'b']))).toEqual({
			removed: new Set(['c']),
		})

		expect(diffSets(new Set(['a', 'b']), new Set(['b', 'c']))).toEqual({
			added: new Set(['c']),
			removed: new Set(['a']),
		})
	})

	it('[SU2] returns undefined when the sets have the same members', () => {
		expect(diffSets(new Set(['a', 'b', 'c']), new Set(['a', 'b', 'c']))).toBeUndefined()
		expect(diffSets(new Set(), new Set())).toBeUndefined()
	})

	it('[SU2] compares object members by reference', () => {
		const obj1 = { id: 1 }
		const obj2 = { id: 2 }
		const obj3 = { id: 3 }

		expect(diffSets(new Set([obj1, obj2]), new Set([obj2, obj3]))).toEqual({
			added: new Set([obj3]),
			removed: new Set([obj1]),
		})

		// structurally equal but distinct objects are different members
		expect(diffSets(new Set([{ id: 1 }]), new Set([{ id: 1 }]))).toBeDefined()
	})
})
