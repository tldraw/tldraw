import { describe, expect, it } from 'vitest'
import { ImmutableMap, emptyMap } from './ImmutableMap'

// Tests for SPEC.md §27 (ImmutableMap, internal).
// Rule IDs like [IM1] in test names refer to that document.

describe('ImmutableMap (IM)', () => {
	it('[IM1] set returns a new map and leaves the original unchanged', () => {
		const map = new ImmutableMap([['key', 'value']])
		const newMap = map.set('key', 'newValue')

		expect(newMap.get('key')).toBe('newValue')
		expect(map.get('key')).toBe('value')

		const withExtra = map.set('other', 'x')
		expect(withExtra.size).toBe(2)
		expect(map.size).toBe(1)
	})

	it('[IM1] delete returns a new map without the key, leaving the original unchanged', () => {
		const map = new ImmutableMap([
			['a', 1],
			['b', 2],
		])
		const newMap = map.delete('a')

		expect(newMap.size).toBe(1)
		expect(newMap.get('a')).toBeUndefined()
		expect(newMap.get('b')).toBe(2)

		expect(map.size).toBe(2)
		expect(map.get('a')).toBe(1)
	})

	it('[IM2] get returns the value, undefined for missing keys, or the given notSetValue', () => {
		const map = new ImmutableMap([['a', 1]])

		expect(map.get('a')).toBe(1)
		expect(map.get('missing')).toBeUndefined()
		// notSetValue is not part of the declared overloads, but is honored at runtime
		expect((map.get as any)('missing', 42)).toBe(42)
		expect((map.get as any)('a', 42)).toBe(1)
	})

	it('[IM3] object keys are hashed by identity', () => {
		const obj1 = { id: 1 }
		const obj2 = { id: 2 }

		let map = new ImmutableMap<{ id: number }, string>()
		map = map.set(obj1, 'first')
		map = map.set(obj2, 'second')

		expect(map.size).toBe(2)
		expect(map.get(obj1)).toBe('first')
		expect(map.get(obj2)).toBe('second')
		expect(map.get({ id: 1 })).toBeUndefined() // structurally equal, but a different key
	})

	it('[IM3] a constructor given duplicate keys keeps the last value', () => {
		const map = new ImmutableMap([
			['a', 1],
			['a', 2],
			['a', 3],
		])
		expect(map.size).toBe(1)
		expect(map.get('a')).toBe(3)
	})

	it('[IM4] withMutations batches changes into one new map', () => {
		const map = new ImmutableMap([['a', 1]])
		const newMap = map.withMutations((mutable) => {
			mutable.set('b', 2)
			mutable.set('c', 3)
			mutable.delete('a')
		})

		expect(newMap.size).toBe(2)
		expect(newMap.get('a')).toBeUndefined()
		expect(newMap.get('b')).toBe(2)
		expect(newMap.get('c')).toBe(3)

		expect(map.size).toBe(1)
		expect(map.get('a')).toBe(1)
	})

	it('[IM4] withMutations that changes nothing returns the same instance', () => {
		const map = new ImmutableMap([['a', 1]])
		const same = map.withMutations(() => {})
		expect(same).toBe(map)
	})

	it('[IM5] deleteAll removes all the given keys', () => {
		const map = new ImmutableMap([
			['a', 1],
			['b', 2],
			['c', 3],
		])
		const newMap = map.deleteAll(['a', 'c', 'missing'])

		expect(newMap.size).toBe(1)
		expect(newMap.get('a')).toBeUndefined()
		expect(newMap.get('b')).toBe(2)
		expect(newMap.get('c')).toBeUndefined()
	})

	it('[IM6] entries, keys, values, and iteration yield every entry exactly once', () => {
		const map = new ImmutableMap([
			['a', 1],
			['b', 2],
			['c', 3],
		])

		const entries = Array.from(map.entries())
		expect(entries.length).toBe(map.size)
		expect(new Map(entries)).toEqual(
			new Map([
				['a', 1],
				['b', 2],
				['c', 3],
			])
		)

		expect(new Set(map.keys())).toEqual(new Set(['a', 'b', 'c']))
		expect([...map.values()].sort()).toEqual([1, 2, 3])
		expect(Array.from(map)).toEqual(entries)
	})

	it('[IM6] handles many entries consistently (trie depth)', () => {
		let map = new ImmutableMap<number, number>()
		for (let i = 0; i < 200; i++) {
			map = map.set(i, i * 2)
		}
		expect(map.size).toBe(200)
		for (let i = 0; i < 200; i++) {
			expect(map.get(i)).toBe(i * 2)
		}
		expect(Array.from(map.entries()).length).toBe(200)
	})
})

describe('emptyMap (IM)', () => {
	it('[IM2] emptyMap has zero size and returns undefined for any key', () => {
		const empty = emptyMap()
		expect(empty.size).toBe(0)
		expect(empty.get('anything')).toBeUndefined()
	})
})
