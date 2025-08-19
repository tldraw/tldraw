import { ImmutableSet } from '../ImmutableSet'

describe('ImmutableSet mutation isolation', () => {
	describe('withMutations pattern', () => {
		test('mutations inside withMutations do not affect original set', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])

			const result = original.withMutations((mutable) => {
				mutable.add('d')
				mutable.delete('a')

				// Original should be unchanged during mutation
				expect([...original].sort()).toEqual(['a', 'b', 'c'])
				expect([...mutable].sort()).toEqual(['b', 'c', 'd'])
			})

			// Original should still be unchanged after mutation
			expect([...original].sort()).toEqual(['a', 'b', 'c'])
			expect([...result].sort()).toEqual(['b', 'c', 'd'])
			expect(result).not.toBe(original)
		})

		test('withMutations returns original if no changes made', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])

			const result = original.withMutations((mutable) => {
				// Make no changes
			})

			expect(result).toBe(original) // Should return same reference
		})

		test('withMutations returns new set if changes made', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])

			const result = original.withMutations((mutable) => {
				mutable.add('d')
			})

			expect(result).not.toBe(original) // Should return new reference
			expect([...result].sort()).toEqual(['a', 'b', 'c', 'd'])
		})
	})

	describe('asMutable/asImmutable pattern', () => {
		test('mutations on mutable do not affect original immutable', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])
			const mutable = original.asMutable()

			// Mutate the mutable version
			mutable.add('d')
			mutable.delete('a')

			// Original should be unchanged
			expect([...original].sort()).toEqual(['a', 'b', 'c'])
			expect([...mutable].sort()).toEqual(['b', 'c', 'd'])
			expect(mutable).not.toBe(original)
		})

		test('converting mutable back to immutable preserves isolation', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])
			const mutable = original.asMutable()

			mutable.add('d')
			mutable.delete('a')

			const immutable = mutable.asImmutable()

			// Original should be unchanged, and immutable should have the mutations
			expect([...original].sort()).toEqual(['a', 'b', 'c'])
			expect([...immutable].sort()).toEqual(['b', 'c', 'd'])

			expect(original).not.toBe(mutable)
			expect(original).not.toBe(immutable)
			// Following Immutable.js semantics: asImmutable returns the same instance
			expect(mutable).toBe(immutable)
		})

		test('further mutations after asImmutable should create new instances', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])
			const mutable = original.asMutable()

			mutable.add('d')
			const immutable = mutable.asImmutable()

			// At this point, mutable === immutable and both are immutable (__ownerID = null)
			expect(mutable).toBe(immutable)

			// Further mutations on the now-immutable reference should create new instances
			// (This is the expected Immutable.js behavior)
			const newMutable1 = immutable.add('e')
			const newMutable2 = immutable.delete('b')

			// Original immutable should be unchanged
			expect([...original].sort()).toEqual(['a', 'b', 'c'])
			expect([...immutable].sort()).toEqual(['a', 'b', 'c', 'd'])

			// New instances should have the mutations
			expect([...newMutable1].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
			expect([...newMutable2].sort()).toEqual(['a', 'c', 'd'])

			// All should be different instances
			expect(newMutable1).not.toBe(immutable)
			expect(newMutable2).not.toBe(immutable)
			expect(newMutable1).not.toBe(newMutable2)
		})

		test('multiple asMutable calls create independent mutable copies', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])
			const mutable1 = original.asMutable()
			const mutable2 = original.asMutable()

			mutable1.add('d')
			mutable2.add('e')

			expect([...original].sort()).toEqual(['a', 'b', 'c'])
			expect([...mutable1].sort()).toEqual(['a', 'b', 'c', 'd'])
			expect([...mutable2].sort()).toEqual(['a', 'b', 'c', 'e'])

			expect(mutable1).not.toBe(mutable2)
		})
	})

	describe('wasAltered tracking', () => {
		test('wasAltered returns false for unmodified mutable', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])
			const mutable = original.asMutable()

			expect(mutable.wasAltered()).toBe(false)
		})

		test('wasAltered returns true after modifications', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])
			const mutable = original.asMutable()

			mutable.add('d')
			expect(mutable.wasAltered()).toBe(true)
		})

		test('wasAltered works with delete operations', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])
			const mutable = original.asMutable()

			mutable.delete('a')
			expect(mutable.wasAltered()).toBe(true)
		})

		test('wasAltered tracks no-op operations correctly', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])
			const mutable = original.asMutable()

			// Try to add something that already exists
			mutable.add('a')
			expect(mutable.wasAltered()).toBe(false)

			// Try to delete something that doesn't exist
			mutable.delete('z')
			expect(mutable.wasAltered()).toBe(false)
		})
	})

	describe('structural sharing preservation', () => {
		test('mutable operations preserve structural sharing when possible', () => {
			const original = new ImmutableSet(['a', 'b', 'c'])
			const mutable = original.asMutable()

			// Add and then remove the same item - should result in original structure
			mutable.add('d')
			mutable.delete('d')

			const result = mutable.asImmutable()

			// The result should be equal to original but not necessarily the same reference
			// (depending on implementation details of structural sharing)
			expect([...result].sort()).toEqual(['a', 'b', 'c'])
		})
	})

	describe('intersect with mutable sets', () => {
		test('intersect works correctly with mutable sets', () => {
			const set1 = new ImmutableSet(['a', 'b', 'c'])
			const set2 = new ImmutableSet(['b', 'c', 'd']).asMutable()

			set2.add('e') // Modify set2

			const result = set1.intersect(set2.asImmutable())
			expect([...result].sort()).toEqual(['b', 'c'])
		})
	})
})
