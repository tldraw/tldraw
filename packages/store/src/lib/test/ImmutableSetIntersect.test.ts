import { ImmutableSet } from '../ImmutableSet'

describe('ImmutableSet intersectMany debug', () => {
	test('intersectMany with multiple sets', () => {
		const set1 = new ImmutableSet(['a', 'b', 'c'])
		const set2 = new ImmutableSet(['b', 'c', 'd'])
		const set3 = new ImmutableSet(['c', 'd', 'e'])

		const result = ImmutableSet.intersectMany([set1, set2, set3])
		expect([...result].sort()).toEqual(['c'])
	})

	test('intersectMany with empty result', () => {
		const set1 = new ImmutableSet(['a', 'b'])
		const set2 = new ImmutableSet(['c', 'd'])

		const result = ImmutableSet.intersectMany([set1, set2])
		expect([...result]).toEqual([])
	})

	test('intersectMany edge cases', () => {
		// Empty input
		expect([...ImmutableSet.intersectMany([])]).toEqual([])

		// Single set
		const single = new ImmutableSet(['a', 'b'])
		expect(ImmutableSet.intersectMany([single])).toBe(single)
	})

	test('intersectMany iteration while deleting bug', () => {
		// This test specifically checks for the iteration while deleting bug
		const set1 = new ImmutableSet(['a', 'b', 'c', 'd', 'e'])
		const set2 = new ImmutableSet(['a', 'c', 'e']) // Remove b and d
		const set3 = new ImmutableSet(['a', 'e']) // Remove c

		const result = ImmutableSet.intersectMany([set1, set2, set3])
		expect([...result].sort()).toEqual(['a', 'e'])
	})
})
