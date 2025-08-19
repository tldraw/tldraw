import { ImmutableSet } from '../ImmutableSet'

describe('ImmutableSet mutable operations', () => {
	test('add() and delete() on mutable sets modify in place', () => {
		const original = new ImmutableSet(['a', 'b', 'c'])
		const mutable = original.asMutable()

		// Add to mutable should return same instance
		const afterAdd = mutable.add('d')
		expect(afterAdd).toBe(mutable)
		expect([...mutable].sort()).toEqual(['a', 'b', 'c', 'd'])

		// Delete from mutable should return same instance
		const afterDelete = mutable.delete('a')
		expect(afterDelete).toBe(mutable)
		expect([...mutable].sort()).toEqual(['b', 'c', 'd'])

		// Original should be unchanged
		expect([...original].sort()).toEqual(['a', 'b', 'c'])
	})

	test('add() and delete() on immutable sets create new instances', () => {
		const original = new ImmutableSet(['a', 'b', 'c'])

		// Add to immutable should return new instance
		const afterAdd = original.add('d')
		expect(afterAdd).not.toBe(original)
		expect([...afterAdd].sort()).toEqual(['a', 'b', 'c', 'd'])
		expect([...original].sort()).toEqual(['a', 'b', 'c'])

		// Delete from immutable should return new instance
		const afterDelete = original.delete('a')
		expect(afterDelete).not.toBe(original)
		expect([...afterDelete].sort()).toEqual(['b', 'c'])
		expect([...original].sort()).toEqual(['a', 'b', 'c'])
	})

	test('no-op operations return same instance', () => {
		const original = new ImmutableSet(['a', 'b', 'c'])
		const mutable = original.asMutable()

		// Adding existing value should return same instance
		expect(original.add('a')).toBe(original)
		expect(mutable.add('a')).toBe(mutable)

		// Deleting non-existing value should return same instance
		expect(original.delete('z')).toBe(original)
		expect(mutable.delete('z')).toBe(mutable)
	})

	test('recreate set from diffs pattern works correctly', () => {
		// This simulates the pattern used in the fuzzing test
		let result = new ImmutableSet<string>()

		// Add some items
		result = result.add('a')
		result = result.add('b')
		result = result.add('c')

		// Delete some items
		result = result.delete('a')

		expect([...result].sort()).toEqual(['b', 'c'])

		// Test with mutable pattern (more efficient)
		let mutableResult = new ImmutableSet<string>().asMutable()
		mutableResult = mutableResult.add('a')
		mutableResult = mutableResult.add('b')
		mutableResult = mutableResult.add('c')
		mutableResult = mutableResult.delete('a')
		const finalResult = mutableResult.asImmutable()

		expect([...finalResult].sort()).toEqual(['b', 'c'])
	})
})
