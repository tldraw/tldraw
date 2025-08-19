import { ImmutableSet } from '../ImmutableSet'
import { CollectionDiff } from '../Store'

// This is copied from the fuzzing test to replicate the exact same pattern
function reacreateSetFromDiffs<T>(diffs: CollectionDiff<T>[]) {
	let result = new ImmutableSet<T>()
	for (const diff of diffs) {
		if (diff.added) {
			for (const item of diff.added) {
				result = result.add(item)
			}
		}
		if (diff.removed) {
			for (const item of diff.removed) {
				result = result.delete(item)
			}
		}
	}
	return result
}

describe('ImmutableSet recreate from diffs', () => {
	test('recreate from diffs basic functionality', () => {
		// Simple case
		const diffs: CollectionDiff<string>[] = [
			{ added: new Set(['a', 'b', 'c']) },
			{ removed: new Set(['a']) },
			{ added: new Set(['d']) },
		]

		const result = reacreateSetFromDiffs(diffs)
		expect([...result].sort()).toEqual(['b', 'c', 'd'])
	})

	test('recreate from empty diffs', () => {
		const diffs: CollectionDiff<string>[] = []
		const result = reacreateSetFromDiffs(diffs)
		expect([...result]).toEqual([])
	})

	test('recreate with only additions', () => {
		const diffs: CollectionDiff<string>[] = [{ added: new Set(['a']) }]
		const result = reacreateSetFromDiffs(diffs)
		expect([...result]).toEqual(['a'])
	})

	test('recreate with only removals', () => {
		const diffs: CollectionDiff<string>[] = [{ removed: new Set(['a']) }]
		const result = reacreateSetFromDiffs(diffs)
		expect([...result]).toEqual([])
	})

	test('recreate with add then remove same item', () => {
		const diffs: CollectionDiff<string>[] = [{ added: new Set(['a']) }, { removed: new Set(['a']) }]
		const result = reacreateSetFromDiffs(diffs)
		expect([...result]).toEqual([])
	})

	test('complex recreate scenario matching fuzzing test pattern', () => {
		// Start empty
		const expected = new Set<string>()
		const diffs: CollectionDiff<string>[] = []

		// Add 'author1'
		expected.add('author1')
		diffs.push({ added: new Set(['author1']) })

		// Add 'author2'
		expected.add('author2')
		diffs.push({ added: new Set(['author2']) })

		// Remove 'author1'
		expected.delete('author1')
		diffs.push({ removed: new Set(['author1']) })

		const result = reacreateSetFromDiffs(diffs)
		expect([...result].sort()).toEqual([...expected].sort())
	})

	test('verify mutable operations work with the recreate pattern', () => {
		// Test the more efficient mutable approach
		const diffs: CollectionDiff<string>[] = [
			{ added: new Set(['a', 'b', 'c']) },
			{ removed: new Set(['a']) },
			{ added: new Set(['d']) },
		]

		// Using mutable operations
		let result = new ImmutableSet<string>().asMutable()
		for (const diff of diffs) {
			if (diff.added) {
				for (const item of diff.added) {
					result = result.add(item)
				}
			}
			if (diff.removed) {
				for (const item of diff.removed) {
					result = result.delete(item)
				}
			}
		}
		const final = result.asImmutable()

		expect([...final].sort()).toEqual(['b', 'c', 'd'])
	})
})
