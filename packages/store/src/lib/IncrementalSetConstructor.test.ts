import { describe, expect, it } from 'vitest'
import { IncrementalSetConstructor } from './IncrementalSetConstructor'

// Tests for SPEC.md §26 (IncrementalSetConstructor, internal).
// Rule IDs like [ISC1] in test names refer to that document.

describe('IncrementalSetConstructor (ISC)', () => {
	it('[ISC1] get returns undefined when nothing was done', () => {
		const constructor = new IncrementalSetConstructor(new Set(['a', 'b', 'c']))
		expect(constructor.get()).toBeUndefined()
	})

	it('[ISC1] adding already-present items is a no-op', () => {
		const constructor = new IncrementalSetConstructor(new Set(['a', 'b', 'c']))
		constructor.add('a')
		constructor.add('b')
		expect(constructor.get()).toBeUndefined()
	})

	it('[ISC1] removing absent items is a no-op', () => {
		const constructor = new IncrementalSetConstructor(new Set(['a', 'b']))
		constructor.remove('c')
		constructor.remove('d')
		expect(constructor.get()).toBeUndefined()
	})

	it('[ISC1] add/remove round trips cancel out', () => {
		const constructor = new IncrementalSetConstructor(new Set(['a', 'b', 'c']))
		constructor.add('d')
		constructor.remove('d')
		expect(constructor.get()).toBeUndefined()

		const constructor2 = new IncrementalSetConstructor(new Set(['a', 'b', 'c']))
		constructor2.remove('a')
		constructor2.add('a')
		expect(constructor2.get()).toBeUndefined()
	})

	it('[ISC2] additions produce the new set and an added diff', () => {
		const original = new Set(['a', 'b'])
		const constructor = new IncrementalSetConstructor(original)

		constructor.add('c')
		constructor.add('d')

		expect(constructor.get()).toEqual({
			value: new Set(['a', 'b', 'c', 'd']),
			diff: { added: new Set(['c', 'd']) },
		})
		expect(original).toEqual(new Set(['a', 'b']))
	})

	it('[ISC2] removals produce the new set and a removed diff', () => {
		const original = new Set(['a', 'b', 'c', 'd'])
		const constructor = new IncrementalSetConstructor(original)

		constructor.remove('c')
		constructor.remove('d')

		expect(constructor.get()).toEqual({
			value: new Set(['a', 'b']),
			diff: { removed: new Set(['c', 'd']) },
		})
		expect(original).toEqual(new Set(['a', 'b', 'c', 'd']))
	})

	it('[ISC2] mixed adds and removes report both sides of the diff', () => {
		const constructor = new IncrementalSetConstructor(new Set(['a', 'b', 'c']))

		constructor.remove('a')
		constructor.add('d')
		constructor.add('e')

		expect(constructor.get()).toEqual({
			value: new Set(['b', 'c', 'd', 'e']),
			diff: { added: new Set(['d', 'e']), removed: new Set(['a']) },
		})
	})

	it('[ISC3] re-adding a removed item restores it', () => {
		const constructor = new IncrementalSetConstructor(new Set(['a', 'b', 'c']))

		constructor.remove('a')
		constructor.remove('b')
		constructor.add('d')
		constructor.add('a') // restore one removed item

		expect(constructor.get()).toEqual({
			value: new Set(['a', 'c', 'd']),
			diff: { added: new Set(['d']), removed: new Set(['b']) },
		})
	})

	it('[ISC3] removing an item added earlier cancels the add', () => {
		const constructor = new IncrementalSetConstructor(new Set(['a', 'b']))

		constructor.add('c')
		constructor.add('d')
		constructor.remove('c')

		expect(constructor.get()).toEqual({
			value: new Set(['a', 'b', 'd']),
			diff: { added: new Set(['d']) },
		})
	})
})
