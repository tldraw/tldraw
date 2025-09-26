import { react, transaction } from '@tldraw/state'
import { vi } from 'vitest'
import { AtomMap } from '../AtomMap'

describe('AtomMap', () => {
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

	describe('basic operations', () => {
		it('should get, set, has, delete values correctly', () => {
			const map = new AtomMap('test')
			expect(map.get('a')).toBe(undefined)
			expect(map.has('a')).toBe(false)
			expect(map.delete('a')).toBe(false)

			map.set('a', 1)
			expect(map.get('a')).toBe(1)
			expect(map.has('a')).toBe(true)

			map.set('a', 2)
			expect(map.get('a')).toBe(2)

			expect(map.delete('a')).toBe(true)
			expect(map.get('a')).toBe(undefined)
			expect(map.has('a')).toBe(false)
			expect(map.delete('a')).toBe(false)
		})

		it('should support method chaining with set', () => {
			const map = new AtomMap('test')
			const result = map.set('a', 1).set('b', 2)
			expect(result).toBe(map)
			expect(map.get('a')).toBe(1)
			expect(map.get('b')).toBe(2)
		})
	})

	describe('reactivity', () => {
		it('should react to changes in watched keys only', () => {
			const map = new AtomMap('test', [['a', 1]])
			const reactor = testReactor('test', () => map.get('a'))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(1)

			// Changes to other keys should not trigger reactions
			map.set('b', 2)
			expect(reactor).toHaveBeenCalledTimes(1)

			// Changes to watched key should trigger reactions
			map.set('a', 10)
			expect(reactor).toHaveBeenCalledTimes(2)
			expect(reactor).toHaveLastReturnedWith(10)

			map.delete('a')
			expect(reactor).toHaveBeenCalledTimes(3)
			expect(reactor).toHaveLastReturnedWith(undefined)
		})
	})

	describe('batch operations', () => {
		it('should delete multiple values with deleteMany', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
				['c', 3],
			])

			const deleted = map.deleteMany(['a', 'c', 'nonexistent'])
			expect(deleted).toEqual([
				['a', 1],
				['c', 3],
			])
			expect(map.size).toBe(1)
			expect(map.has('b')).toBe(true)

			// Should handle empty array
			expect(map.deleteMany([])).toEqual([])
		})

		it('should clear all values', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			expect(map.size).toBe(2)
			map.clear()
			expect(map.size).toBe(0)
			expect(map.has('a')).toBe(false)
		})
	})

	describe('iteration and size', () => {
		it('should provide working entries, keys, values, and size', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])

			expect(Array.from(map.entries())).toEqual([
				['a', 1],
				['b', 2],
			])
			expect(Array.from(map.keys())).toEqual(['a', 'b'])
			expect(Array.from(map.values())).toEqual([1, 2])
			expect(map.size).toBe(2)

			// Should work with for...of
			const entries: [string, number][] = []
			for (const [key, value] of map) {
				entries.push([key, value])
			}
			expect(entries).toEqual([
				['a', 1],
				['b', 2],
			])

			// Should skip deleted values
			map.delete('a')
			expect(Array.from(map.entries())).toEqual([['b', 2]])
			expect(map.size).toBe(1)
		})

		it('should support forEach with thisArg', () => {
			const map = new AtomMap('test', [['a', 1]])
			const results: Array<[string, number]> = []
			const thisArg = { test: true }

			map.forEach(function (this: any, value, key) {
				expect(this).toBe(thisArg)
				results.push([key, value])
			}, thisArg)

			expect(results).toEqual([['a', 1]])
		})
	})

	describe('transaction support', () => {
		it('should support transaction rollbacks', () => {
			const map = new AtomMap('test', [['a', 1]])

			// Test rollback of additions
			transaction((rollback) => {
				map.set('b', 2)
				rollback()
			})
			expect(map.has('b')).toBe(false)

			// Test rollback of updates
			transaction((rollback) => {
				map.set('a', 10)
				rollback()
			})
			expect(map.get('a')).toBe(1)

			// Test rollback of deletions
			transaction((rollback) => {
				map.delete('a')
				rollback()
			})
			expect(map.has('a')).toBe(true)
		})
	})

	describe('advanced methods', () => {
		it('should provide getAtom for direct atom access', () => {
			const map = new AtomMap('test')
			expect(map.getAtom('nonexistent')).toBeUndefined()

			map.set('key', 'value')
			const atom = map.getAtom('key')
			expect(atom).toBeDefined()
			expect(atom!.get()).toBe('value')
		})

		it('should provide update method for existing keys', () => {
			const map = new AtomMap<string, number>('test')
			map.set('count', 5)
			map.update('count', (count) => count + 1)
			expect(map.get('count')).toBe(6)

			expect(() => map.update('nonexistent', (x) => x)).toThrow(
				'AtomMap: key nonexistent not found'
			)
		})
	})

	describe('non-reactive access methods', () => {
		it('should provide __unsafe__getWithoutCapture for non-reactive access', () => {
			const map = new AtomMap('test')
			map.set('key', 'value')

			const reactor = testReactor('test', () => map.__unsafe__getWithoutCapture('key'))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith('value')

			// Should NOT trigger reaction when value changes
			map.set('key', 'updated')
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(map.__unsafe__getWithoutCapture('key')).toBe('updated')
		})

		it('should provide __unsafe__hasWithoutCapture for non-reactive has check', () => {
			const map = new AtomMap('test')
			map.set('key', 'value')

			const reactor = testReactor('test', () => map.__unsafe__hasWithoutCapture('key'))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(true)

			// Should NOT trigger reaction when key is deleted
			map.delete('key')
			expect(reactor).toHaveBeenCalledTimes(1)
		})
	})

	describe('constructor variants', () => {
		it('should work with different key and value types', () => {
			const numberMap = new AtomMap<number, string>('numbers', [
				[1, 'one'],
				[2, 'two'],
			])
			expect(numberMap.get(1)).toBe('one')

			const objectKeys = new AtomMap('objects', [[{ id: 1 }, 'first']])
			expect(objectKeys.size).toBe(1)

			// Should accept any iterable
			const fromSet = new AtomMap('set', new Set([['a', 1]]))
			expect(fromSet.get('a')).toBe(1)
		})
	})

	describe('Symbol support', () => {
		it('should have correct Symbol.toStringTag', () => {
			const map = new AtomMap('test')
			expect(Object.prototype.toString.call(map)).toBe('[object AtomMap]')
			expect(map[Symbol.toStringTag]).toBe('AtomMap')
		})
	})
})
