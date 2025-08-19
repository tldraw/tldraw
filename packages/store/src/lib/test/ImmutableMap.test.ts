import { ImmutableMap } from '../ImmutableMap'

describe('ImmutableMap mutation isolation', () => {
	describe('withMutations pattern', () => {
		test('mutations inside withMutations do not affect original map', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])

			const result = original.withMutations((mutable) => {
				mutable.set('d', 4)
				mutable.delete('a')

				// Original should be unchanged during mutation
				expect([...original.entries()].sort()).toEqual([
					['a', 1],
					['b', 2],
					['c', 3],
				])
				expect([...mutable.entries()].sort()).toEqual([
					['b', 2],
					['c', 3],
					['d', 4],
				])
			})

			// Original should still be unchanged after mutation
			expect([...original.entries()].sort()).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			expect([...result.entries()].sort()).toEqual([
				['b', 2],
				['c', 3],
				['d', 4],
			])
			expect(result).not.toBe(original)
		})

		test('withMutations returns original if no changes made', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])

			const result = original.withMutations((mutable) => {
				// Make no changes
			})

			expect(result).toBe(original) // Should return same reference
		})

		test('withMutations returns new map if changes made', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])

			const result = original.withMutations((mutable) => {
				mutable.set('d', 4)
			})

			expect(result).not.toBe(original) // Should return new reference
			expect([...result.entries()].sort()).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
				['d', 4],
			])
		})
	})

	describe('asMutable/asImmutable pattern', () => {
		test('mutations on mutable do not affect original immutable', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const mutable = original.asMutable()

			// Mutate the mutable version
			mutable.set('d', 4)
			mutable.delete('a')

			// Original should be unchanged
			expect([...original.entries()].sort()).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			expect([...mutable.entries()].sort()).toEqual([
				['b', 2],
				['c', 3],
				['d', 4],
			])
			expect(mutable).not.toBe(original)
		})

		test('converting mutable back to immutable preserves isolation', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const mutable = original.asMutable()

			mutable.set('d', 4)
			mutable.delete('a')

			const immutable = mutable.asImmutable()

			// All three should be different and isolated
			expect([...original.entries()].sort()).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			expect([...mutable.entries()].sort()).toEqual([
				['b', 2],
				['c', 3],
				['d', 4],
			])
			expect([...immutable.entries()].sort()).toEqual([
				['b', 2],
				['c', 3],
				['d', 4],
			])

			expect(original).not.toBe(mutable)
			expect(original).not.toBe(immutable)
			// Following Immutable.js semantics: asImmutable returns the same instance
			expect(mutable).toBe(immutable)
		})

		test('further mutations after asImmutable should create new instances', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const mutable = original.asMutable()

			mutable.set('d', 4)
			const immutable = mutable.asImmutable()

			// At this point, mutable === immutable and both are immutable (__ownerID = null)
			expect(mutable).toBe(immutable)

			// Further mutations on the now-immutable reference should create new instances
			const newMutable1 = immutable.set('e', 5)
			const newMutable2 = immutable.delete('b')

			// Original immutable should be unchanged
			expect([...original.entries()].sort()).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			expect([...immutable.entries()].sort()).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
				['d', 4],
			])

			// New instances should have the mutations
			expect([...newMutable1.entries()].sort()).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
				['d', 4],
				['e', 5],
			])
			expect([...newMutable2.entries()].sort()).toEqual([
				['a', 1],
				['c', 3],
				['d', 4],
			])

			// All should be different instances
			expect(newMutable1).not.toBe(immutable)
			expect(newMutable2).not.toBe(immutable)
			expect(newMutable1).not.toBe(newMutable2)
		})

		test('multiple asMutable calls create independent mutable copies', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const mutable1 = original.asMutable()
			const mutable2 = original.asMutable()

			mutable1.set('d', 4)
			mutable2.set('e', 5)

			expect([...original.entries()].sort()).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			expect([...mutable1.entries()].sort()).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
				['d', 4],
			])
			expect([...mutable2.entries()].sort()).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
				['e', 5],
			])

			expect(mutable1).not.toBe(mutable2)
		})
	})

	describe('wasAltered tracking', () => {
		test('wasAltered returns false for unmodified mutable', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const mutable = original.asMutable()

			expect(mutable.wasAltered()).toBe(false)
		})

		test('wasAltered returns true after modifications', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const mutable = original.asMutable()

			mutable.set('d', 4)
			expect(mutable.wasAltered()).toBe(true)
		})

		test('wasAltered works with delete operations', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const mutable = original.asMutable()

			mutable.delete('a')
			expect(mutable.wasAltered()).toBe(true)
		})

		test('wasAltered tracks no-op operations correctly', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const mutable = original.asMutable()

			// Try to set something to the same value
			mutable.set('a', 1)
			expect(mutable.wasAltered()).toBe(false)

			// Try to delete something that doesn't exist
			mutable.delete('z')
			expect(mutable.wasAltered()).toBe(false)
		})
	})
})
