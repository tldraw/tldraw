import { react } from '@tldraw/state'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AtomSet } from './AtomSet'

// Tests for SPEC.md §23 (AtomSet).
// Rule IDs like [AS1] in test names refer to that document.

describe('AtomSet', () => {
	let cleanupFns: (() => void)[] = []
	afterEach(() => {
		for (const fn of cleanupFns) {
			fn()
		}
		cleanupFns = []
	})

	function testReactor(name: string, fn: () => any) {
		const cb = vi.fn(fn)
		const cleanup = react(name, cb)
		cleanupFns.push(() => cleanup())
		return cb
	}

	it('[AS1] add returns the set; has reports membership', () => {
		const set = new AtomSet<string>('test')
		expect(set.has('a')).toBe(false)

		expect(set.add('a')).toBe(set)
		expect(set.has('a')).toBe(true)

		// adding again is a no-op
		set.add('a')
		expect(set.size).toBe(1)
	})

	it('[AS1] delete returns whether the value was present', () => {
		const set = new AtomSet('test', ['a', 'b'])
		expect(set.delete('a')).toBe(true)
		expect(set.delete('a')).toBe(false)
		expect(set.delete('missing')).toBe(false)
		expect(set.has('a')).toBe(false)
		expect(set.has('b')).toBe(true)
	})

	it('[AS1] clear empties the set', () => {
		const set = new AtomSet('test', ['a', 'b'])
		set.clear()
		expect(set.size).toBe(0)
		expect(set.has('a')).toBe(false)
	})

	it('[AS1] size counts the elements', () => {
		const set = new AtomSet('test', ['a', 'b'])
		expect(set.size).toBe(2)
		set.add('c')
		expect(set.size).toBe(3)
		set.delete('a')
		expect(set.size).toBe(2)
	})

	it('[AS1] keys, values, and iteration yield the elements; entries yields [value, value] pairs', () => {
		const set = new AtomSet('test', ['a', 'b'])

		expect(Array.from(set.keys())).toEqual(['a', 'b'])
		expect(Array.from(set.values())).toEqual(['a', 'b'])
		expect(Array.from(set)).toEqual(['a', 'b'])
		expect(Array.from(set.entries())).toEqual([
			['a', 'a'],
			['b', 'b'],
		])
	})

	it('[AS1] forEach passes the value twice and the set, and honors thisArg', () => {
		const set = new AtomSet('test', ['a', 'b'])
		const seen: Array<[string, string]> = []
		const thisArg = { marker: true }

		set.forEach(function (this: any, value, value2, theSet) {
			expect(this).toBe(thisArg)
			expect(theSet).toBe(set)
			seen.push([value, value2])
		}, thisArg)

		expect(seen).toEqual([
			['a', 'a'],
			['b', 'b'],
		])
	})

	it('[AS2] membership reads are reactive', () => {
		const set = new AtomSet<string>('test', ['a'])
		const reactor = testReactor('has-a', () => set.has('a'))
		expect(reactor).toHaveBeenCalledTimes(1)
		expect(reactor).toHaveLastReturnedWith(true)

		set.delete('a')
		expect(reactor).toHaveBeenCalledTimes(2)
		expect(reactor).toHaveLastReturnedWith(false)

		set.add('a')
		expect(reactor).toHaveBeenCalledTimes(3)
		expect(reactor).toHaveLastReturnedWith(true)
	})

	it('[AS2] iteration is reactive', () => {
		const set = new AtomSet<string>('test', ['a'])
		const reactor = testReactor('all', () => Array.from(set))
		expect(reactor).toHaveLastReturnedWith(['a'])

		set.add('b')
		expect(reactor).toHaveLastReturnedWith(['a', 'b'])

		set.delete('a')
		expect(reactor).toHaveLastReturnedWith(['b'])
	})
})
