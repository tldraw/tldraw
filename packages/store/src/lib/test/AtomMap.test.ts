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

	describe('get', () => {
		it('should return the value or undefined', () => {
			const map = new AtomMap('test')
			expect(map.get('a')).toBe(undefined)

			map.set('a', 1)
			expect(map.get('a')).toBe(1)

			map.delete('a')
			expect(map.get('a')).toBe(undefined)
		})

		it('should react to creating, updating, and deleting values', () => {
			const map = new AtomMap('test', [['a', 1]])
			const reactor = testReactor('test', () => map.get('b'))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(undefined)

			map.set('b', 2)
			expect(reactor).toHaveBeenCalledTimes(2)
			expect(reactor).toHaveLastReturnedWith(2)

			map.set('b', 3)
			expect(reactor).toHaveBeenCalledTimes(3)
			expect(reactor).toHaveLastReturnedWith(3)

			map.delete('b')
			expect(reactor).toHaveBeenCalledTimes(4)
			expect(reactor).toHaveLastReturnedWith(undefined)
		})

		it('should not react to changes in other keys', () => {
			const map = new AtomMap('test', [['a', 1]])
			const aReactor = testReactor('a-reactor', () => map.get('a'))
			expect(aReactor).toHaveBeenCalledTimes(1)

			// Setting other keys shouldn't trigger a reaction
			map.set('b', 1)
			map.set('c', 2)
			expect(aReactor).toHaveBeenCalledTimes(1)

			// Updating other keys shouldn't trigger a reaction
			map.set('b', 3)
			map.set('c', 4)
			expect(aReactor).toHaveBeenCalledTimes(1)

			// Deleting other keys shouldn't trigger a reaction
			map.delete('b')
			map.delete('c')
			expect(aReactor).toHaveBeenCalledTimes(1)

			// But setting the watched key should trigger a reaction
			map.set('a', 5)
			expect(aReactor).toHaveBeenCalledTimes(2)
		})
	})

	describe('has', () => {
		it('should return true if the key exists with a value', () => {
			const map = new AtomMap('test')
			expect(map.has('a')).toBe(false)

			map.set('a', 1)
			expect(map.has('a')).toBe(true)

			map.delete('a')
			expect(map.has('a')).toBe(false)
		})

		it('should react to creating, updating, and deleting values', () => {
			const map = new AtomMap('test')
			const reactor = testReactor('test', () => map.has('a'))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(false)

			map.set('a', 1)
			expect(reactor).toHaveBeenCalledTimes(2)
			expect(reactor).toHaveLastReturnedWith(true)

			map.set('a', 2)
			expect(reactor).toHaveBeenCalledTimes(3) // setting a value triggers a reaction
			expect(reactor).toHaveLastReturnedWith(true)

			map.delete('a')
			expect(reactor).toHaveBeenCalledTimes(4)
			expect(reactor).toHaveLastReturnedWith(false)

			map.set('a', 2)
			expect(reactor).toHaveBeenCalledTimes(5) // reinstating a previously deleted atom works
			expect(reactor).toHaveLastReturnedWith(true)
		})

		it('should not react to changes in other keys', () => {
			const map = new AtomMap('test', [['a', 1]])
			const aReactor = testReactor('a-reactor', () => map.has('a'))
			expect(aReactor).toHaveBeenCalledTimes(1)

			// Setting other keys shouldn't trigger a reaction
			map.set('b', 1)
			map.set('c', 2)
			expect(aReactor).toHaveBeenCalledTimes(1)

			// Updating other keys shouldn't trigger a reaction
			map.set('b', 3)
			map.set('c', 4)
			expect(aReactor).toHaveBeenCalledTimes(1)

			// Deleting other keys shouldn't trigger a reaction
			map.delete('b')
			map.delete('c')
			expect(aReactor).toHaveBeenCalledTimes(1)

			// But setting the watched key should trigger a reaction
			map.set('a', 5)
			expect(aReactor).toHaveBeenCalledTimes(2)
		})
	})

	describe('set', () => {
		it('should set values and return the map', () => {
			const map = new AtomMap('test')
			expect(map.set('a', 1)).toBe(map)
			expect(map.get('a')).toBe(1)
			map.set('a', 2)
			expect(map.get('a')).toBe(2)
		})
	})

	describe('delete', () => {
		it('should delete values and return true if value existed', () => {
			const map = new AtomMap('test')
			expect(map.delete('a')).toBe(false)

			map.set('a', 1)
			expect(map.delete('a')).toBe(true)
			expect(map.has('a')).toBe(false)
			expect(map.delete('a')).toBe(false)
		})
	})

	describe('deleteMany', () => {
		it('should delete multiple values at once', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
				['c', 3],
				['d', 4],
			])
			expect(map.size).toBe(4)

			const deleted = map.deleteMany(['a', 'c', 'nonexistent'])
			expect(deleted).toEqual([
				['a', 1],
				['c', 3],
			])
			expect(map.size).toBe(2)
			expect(map.has('a')).toBe(false)
			expect(map.has('b')).toBe(true)
			expect(map.has('c')).toBe(false)
			expect(map.has('d')).toBe(true)
			expect(Object.fromEntries(map.entries())).toEqual({
				b: 2,
				d: 4,
			})
		})

		it('should trigger a single reaction for multiple deletions', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
				['c', 3],
			])

			const sizeReactor = testReactor('size', () => map.size)
			const entriesReactor = testReactor('entries', () => Array.from(map.entries()))
			const aValueReactor = testReactor('a-value', () => map.get('a'))
			const bValueReactor = testReactor('b-value', () => map.get('b'))

			expect(sizeReactor).toHaveBeenCalledTimes(1)
			expect(entriesReactor).toHaveBeenCalledTimes(1)
			expect(aValueReactor).toHaveBeenCalledTimes(1)
			expect(bValueReactor).toHaveBeenCalledTimes(1)

			map.deleteMany(['a', 'b'])

			expect(sizeReactor).toHaveBeenCalledTimes(2)
			expect(sizeReactor).toHaveLastReturnedWith(1)

			expect(entriesReactor).toHaveBeenCalledTimes(2)
			expect(entriesReactor).toHaveLastReturnedWith([['c', 3]])

			expect(aValueReactor).toHaveBeenCalledTimes(2)
			expect(aValueReactor).toHaveLastReturnedWith(undefined)

			expect(bValueReactor).toHaveBeenCalledTimes(2)
			expect(bValueReactor).toHaveLastReturnedWith(undefined)
		})

		it('should do nothing if no keys are provided', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			const reactor = testReactor('test', () => map.size)
			expect(reactor).toHaveBeenCalledTimes(1)

			const deleted = map.deleteMany([])
			expect(deleted).toEqual([])
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(map.size).toBe(2)
		})

		it('should do nothing if none of the keys exist', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			const reactor = testReactor('test', () => map.size)
			expect(reactor).toHaveBeenCalledTimes(1)

			const deleted = map.deleteMany(['c', 'd'])
			expect(deleted).toEqual([])
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(map.size).toBe(2)
		})

		it('should return only the entries that were actually deleted', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
				['c', 3],
			])

			const deleted = map.deleteMany(['a', 'nonexistent1', 'b', 'nonexistent2'])
			expect(deleted).toEqual([
				['a', 1],
				['b', 2],
			])
			expect(map.size).toBe(1)
			expect(Array.from(map.entries())).toEqual([['c', 3]])
		})

		it('should not include entries that were already empty', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			map.delete('a')
			const deleted = map.deleteMany(['a', 'b'])
			expect(deleted).toEqual([['b', 2]])
		})

		it('should not trigger reactions for unaffected keys', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
				['c', 3],
				['d', 4],
			])

			const aReactor = testReactor('a-reactor', () => map.get('a'))
			const bReactor = testReactor('b-reactor', () => map.get('b'))
			const cReactor = testReactor('c-reactor', () => map.get('c'))
			const dReactor = testReactor('d-reactor', () => map.get('d'))

			expect(aReactor).toHaveBeenCalledTimes(1)
			expect(bReactor).toHaveBeenCalledTimes(1)
			expect(cReactor).toHaveBeenCalledTimes(1)
			expect(dReactor).toHaveBeenCalledTimes(1)

			map.deleteMany(['b', 'd'])

			// a and c should not react
			expect(aReactor).toHaveBeenCalledTimes(1)
			expect(cReactor).toHaveBeenCalledTimes(1)

			// b and d should react
			expect(bReactor).toHaveBeenCalledTimes(2)
			expect(bReactor).toHaveLastReturnedWith(undefined)
			expect(dReactor).toHaveBeenCalledTimes(2)
			expect(dReactor).toHaveLastReturnedWith(undefined)
		})
	})

	describe('clear', () => {
		it('should remove all values', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			expect(map.size).toBe(2)
			map.clear()
			expect(map.size).toBe(0)
			expect(map.has('a')).toBe(false)
			expect(map.has('b')).toBe(false)
		})

		it('should trigger reactions', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			const sizeReactor = testReactor('test', () => map.size)
			expect(sizeReactor).toHaveBeenCalledTimes(1)
			expect(sizeReactor).toHaveLastReturnedWith(2)

			map.clear()
			// clear triggers multiple reactions since it clears multiple values
			expect(sizeReactor).toHaveLastReturnedWith(0)
		})
	})

	describe('entries', () => {
		it('should iterate over key-value pairs', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			const entries = Array.from(map.entries())
			expect(entries).toEqual([
				['a', 1],
				['b', 2],
			])
		})

		it('should skip empty values', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			map.delete('a')
			const entries = Array.from(map.entries())
			expect(entries).toEqual([['b', 2]])
		})

		it('should react to changes', () => {
			const map = new AtomMap('test', [['a', 1]])
			const reactor = testReactor('test', () => Array.from(map.entries()))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith([['a', 1]])

			map.set('b', 2)
			expect(reactor).toHaveBeenCalledTimes(2)
			expect(reactor).toHaveLastReturnedWith([
				['a', 1],
				['b', 2],
			])

			map.delete('a')
			expect(reactor).toHaveBeenCalledTimes(3)
			expect(reactor).toHaveLastReturnedWith([['b', 2]])

			map.set('a', 3)
			expect(reactor).toHaveBeenCalledTimes(4)
			expect(reactor).toHaveLastReturnedWith([
				['b', 2],
				['a', 3],
			])
		})
	})

	describe('keys', () => {
		it('should iterate over keys', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			const keys = Array.from(map.keys())
			expect(keys).toEqual(['a', 'b'])
		})

		it('should skip keys with empty values', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			map.delete('a')
			const keys = Array.from(map.keys())
			expect(keys).toEqual(['b'])
		})

		it('should react to changes', () => {
			const map = new AtomMap('test', [['a', 1]])
			const reactor = testReactor('test', () => Array.from(map.keys()))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(['a'])

			map.set('b', 2)
			expect(reactor).toHaveBeenCalledTimes(2)
			expect(reactor).toHaveLastReturnedWith(['a', 'b'])

			map.delete('a')
			expect(reactor).toHaveBeenCalledTimes(3)
			expect(reactor).toHaveLastReturnedWith(['b'])

			map.set('a', 3)
			expect(reactor).toHaveBeenCalledTimes(4)
			expect(reactor).toHaveLastReturnedWith(['b', 'a'])
		})
	})

	describe('values', () => {
		it('should iterate over values', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			const values = Array.from(map.values())
			expect(values).toEqual([1, 2])
		})

		it('should skip empty values', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			map.delete('a')
			const values = Array.from(map.values())
			expect(values).toEqual([2])
		})

		it('should react to changes', () => {
			const map = new AtomMap('test', [['a', 1]])
			const reactor = testReactor('test', () => Array.from(map.values()))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith([1])

			map.set('b', 2)
			expect(reactor).toHaveBeenCalledTimes(2)
			expect(reactor).toHaveLastReturnedWith([1, 2])

			map.delete('a')
			expect(reactor).toHaveBeenCalledTimes(3)
			expect(reactor).toHaveLastReturnedWith([2])

			map.set('a', 3)
			expect(reactor).toHaveBeenCalledTimes(4)
			expect(reactor).toHaveLastReturnedWith([2, 3])
		})
	})

	describe('size', () => {
		it('should return the number of non-empty values', () => {
			const map = new AtomMap('test')
			const size = map.size
			expect(size).toBe(0)

			map.set('a', 1)
			expect(Array.from(map.entries()).length).toBe(1) // verify entries shows 1 item
			expect(map.size).toBe(1)

			map.set('b', 2)
			expect(map.size).toBe(2)

			map.delete('a')
			expect(map.size).toBe(1)

			map.clear()
			expect(map.size).toBe(0)
		})

		it('should react to changes', () => {
			const map = new AtomMap('test')
			const reactor = testReactor('test', () => map.size)
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(0)

			map.set('a', 1)
			// setting a value triggers a reaction for both the value and size
			expect(reactor).toHaveLastReturnedWith(1)

			map.set('a', 2) // updating should trigger a reaction but keep same size
			expect(reactor).toHaveLastReturnedWith(1)

			map.delete('a')
			expect(reactor).toHaveLastReturnedWith(0)
		})
	})

	describe('forEach', () => {
		it('should iterate over all entries', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			const results: Array<[string, number]> = []
			map.forEach((value, key) => {
				results.push([key, value])
			})
			expect(results).toEqual([
				['a', 1],
				['b', 2],
			])
		})

		it('should skip empty values', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			map.delete('a')
			const results: Array<[string, number]> = []
			map.forEach((value, key) => {
				results.push([key, value])
			})
			expect(results).toEqual([['b', 2]])
		})

		it('should react to changes', () => {
			const map = new AtomMap('test', [['a', 1]])
			const reactor = testReactor('test', () => {
				const current: Array<[string, number]> = []
				map.forEach((value, key) => {
					current.push([key, value])
				})
				return current
			})
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith([['a', 1]])

			map.set('b', 2)
			expect(reactor).toHaveBeenCalledTimes(2)
			expect(reactor).toHaveLastReturnedWith([
				['a', 1],
				['b', 2],
			])

			map.delete('a')
			expect(reactor).toHaveBeenCalledTimes(3)
			expect(reactor).toHaveLastReturnedWith([['b', 2]])

			map.set('a', 3)
			expect(reactor).toHaveBeenCalledTimes(4)
			expect(reactor).toHaveLastReturnedWith([
				['b', 2],
				['a', 3],
			])
		})

		it('should use provided thisArg', () => {
			const map = new AtomMap('test', [['a', 1]])
			const thisArg = { test: true }
			map.forEach(function (this: any) {
				expect(this).toBe(thisArg)
			}, thisArg)
		})
	})

	describe('transaction rollbacks', () => {
		it('works for additions', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			transaction((rollback) => {
				map.set('c', 3)
				rollback()
			})
			expect(map.size).toBe(2)
			expect(map.has('c')).toBe(false)
			transaction(() => {
				map.set('c', 3)
			})
			expect(map.size).toBe(3)
			expect(map.get('c')).toBe(3)
		})

		it('works for updates', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			transaction((rollback) => {
				map.set('a', 3)
				map.set('b', 4)
				rollback()
			})
			expect(map.get('a')).toBe(1)
			expect(map.get('b')).toBe(2)

			transaction(() => {
				map.set('a', 3)
				map.set('b', 4)
			})

			expect(map.get('a')).toBe(3)
			expect(map.get('b')).toBe(4)
		})

		it('works for deletions', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			transaction((rollback) => {
				map.delete('a')
				rollback()
			})
			expect(map.has('a')).toBe(true)
			expect(map.size).toBe(2)
			transaction(() => {
				map.delete('a')
			})
			expect(map.has('a')).toBe(false)
			expect(map.size).toBe(1)
		})
	})

	describe('constructor additional tests', () => {
		it('should work with different types of keys and values', () => {
			const entries: [number, string][] = [
				[1, 'one'],
				[2, 'two'],
			]
			const map = new AtomMap<number, string>('typed', entries)
			expect(map.get(1)).toBe('one')
			expect(map.get(2)).toBe('two')
		})

		it('should work with object keys and values', () => {
			const key1 = { id: 1 }
			const key2 = { id: 2 }
			const value1 = { name: 'first' }
			const value2 = { name: 'second' }
			const map = new AtomMap('objects', [
				[key1, value1],
				[key2, value2],
			])
			expect(map.get(key1)).toBe(value1)
			expect(map.get(key2)).toBe(value2)
		})

		it('should accept iterable that is not an array', () => {
			const entriesSet = new Set([
				['a', 1],
				['b', 2],
			] as [string, number][])
			const map = new AtomMap('from-set', entriesSet)
			expect(map.size).toBe(2)
			expect(map.get('a')).toBe(1)
			expect(map.get('b')).toBe(2)
		})
	})

	describe('getAtom', () => {
		it('should return the atom for an existing key', () => {
			const map = new AtomMap('test')
			map.set('key', 'value')
			const atom = map.getAtom('key')
			expect(atom).toBeDefined()
			expect(atom!.get()).toBe('value')
		})

		it('should return undefined for a non-existing key', () => {
			const map = new AtomMap('test')
			const atom = map.getAtom('nonexistent')
			expect(atom).toBeUndefined()
		})

		it('should track access for non-existing keys', () => {
			const map = new AtomMap('test')
			const reactor = testReactor('test', () => {
				const atom = map.getAtom('key')
				return atom ? atom.get() : undefined
			})
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(undefined)

			// Adding the key should trigger reaction
			map.set('key', 'value')
			expect(reactor).toHaveBeenCalledTimes(2)
			expect(reactor).toHaveLastReturnedWith('value')
		})

		it('should return atom that can be used reactively', () => {
			const map = new AtomMap('test')
			map.set('key', 'initial')
			const atom = map.getAtom('key')!
			const reactor = testReactor('test', () => atom.get())
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith('initial')

			// Updating through map should trigger reaction on atom
			map.set('key', 'updated')
			expect(reactor).toHaveBeenCalledTimes(2)
			expect(reactor).toHaveLastReturnedWith('updated')
		})
	})

	describe('__unsafe__getWithoutCapture', () => {
		it('should return the value without creating reactive dependencies', () => {
			const map = new AtomMap('test')
			map.set('key', 'value')
			const reactor = testReactor('test', () => map.__unsafe__getWithoutCapture('key'))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith('value')

			// Updating the key should NOT trigger reaction
			map.set('key', 'updated')
			expect(reactor).toHaveBeenCalledTimes(1) // Still only called once

			// But we can still get the updated value
			expect(map.__unsafe__getWithoutCapture('key')).toBe('updated')
		})

		it('should return undefined for non-existing key without tracking', () => {
			const map = new AtomMap('test')
			const reactor = testReactor('test', () => map.__unsafe__getWithoutCapture('nonexistent'))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(undefined)

			// Adding the key should NOT trigger reaction
			map.set('nonexistent', 'value')
			expect(reactor).toHaveBeenCalledTimes(1) // Still only called once
		})
	})

	describe('__unsafe__hasWithoutCapture', () => {
		it('should return true for existing keys without reactive dependencies', () => {
			const map = new AtomMap('test')
			map.set('key', 'value')
			const reactor = testReactor('test', () => map.__unsafe__hasWithoutCapture('key'))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(true)

			// Deleting the key should NOT trigger reaction
			map.delete('key')
			expect(reactor).toHaveBeenCalledTimes(1) // Still only called once
		})

		it('should return false for non-existing keys without tracking', () => {
			const map = new AtomMap('test')
			const reactor = testReactor('test', () => map.__unsafe__hasWithoutCapture('nonexistent'))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(false)

			// Adding the key should NOT trigger reaction
			map.set('nonexistent', 'value')
			expect(reactor).toHaveBeenCalledTimes(1) // Still only called once
		})
	})

	describe('update', () => {
		it('should update an existing value using updater function', () => {
			const map = new AtomMap<string, number>('test')
			map.set('count', 5)
			map.update('count', (count) => count + 1)
			expect(map.get('count')).toBe(6)
		})

		it('should throw error when trying to update non-existing key', () => {
			const map = new AtomMap<string, string>('test')
			expect(() => {
				map.update('nonexistent', (value) => value)
			}).toThrow('AtomMap: key nonexistent not found')
		})

		it('should trigger reactions when updating', () => {
			const map = new AtomMap<string, number>('test')
			map.set('count', 1)
			const reactor = testReactor('test', () => map.get('count'))
			expect(reactor).toHaveBeenCalledTimes(1)
			expect(reactor).toHaveLastReturnedWith(1)

			map.update('count', (count) => count * 2)
			expect(reactor).toHaveBeenCalledTimes(2)
			expect(reactor).toHaveLastReturnedWith(2)
		})

		it('should work with complex updater functions', () => {
			const map = new AtomMap<string, { count: number; name: string }>('test')
			map.set('item', { count: 1, name: 'initial' })
			map.update('item', (item) => ({ ...item, count: item.count + 5, name: 'updated' }))
			expect(map.get('item')).toEqual({ count: 6, name: 'updated' })
		})

		it('should handle updater function that returns the same value', () => {
			const map = new AtomMap<string, string>('test')
			map.set('value', 'unchanged')
			const reactor = testReactor('test', () => map.get('value'))
			expect(reactor).toHaveBeenCalledTimes(1)

			map.update('value', (value) => value) // Return same value
			// atom.set is called but may not trigger if state library optimizes away same values
			// The important thing is that the operation doesn't fail
			expect(map.get('value')).toBe('unchanged')
		})
	})

	describe('Symbol.iterator', () => {
		it('should make the map iterable with for...of loops', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const entries: [string, number][] = []
			for (const [key, value] of map) {
				entries.push([key, value])
			}
			expect(entries).toEqual([
				['a', 1],
				['b', 2],
				['c', 3],
			])
		})

		it('should return the same iterator as entries()', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			const defaultIterator = map[Symbol.iterator]()
			const entriesIterator = map.entries()

			expect(Array.from(defaultIterator)).toEqual(Array.from(entriesIterator))
		})

		it('should work with spread operator', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
			])
			const entries = [...map]
			expect(entries).toEqual([
				['a', 1],
				['b', 2],
			])
		})

		it('should work with Array.from', () => {
			const map = new AtomMap('test', [
				['x', 10],
				['y', 20],
			])
			const entries = Array.from(map)
			expect(entries).toEqual([
				['x', 10],
				['y', 20],
			])
		})
	})

	describe('Symbol.toStringTag', () => {
		it('should have correct toString tag', () => {
			const map = new AtomMap('test')
			expect(Object.prototype.toString.call(map)).toBe('[object AtomMap]')
		})

		it('should have Symbol.toStringTag property', () => {
			const map = new AtomMap('test')
			expect(map[Symbol.toStringTag]).toBe('AtomMap')
		})
	})

	describe('Map interface compatibility', () => {
		it('should behave like a standard Map for basic operations', () => {
			const atomMap = new AtomMap<string, number>('atom')
			const standardMap = new Map<string, number>()

			// Test basic operations in parallel
			atomMap.set('a', 1)
			standardMap.set('a', 1)
			expect(atomMap.get('a')).toBe(standardMap.get('a'))
			expect(atomMap.has('a')).toBe(standardMap.has('a'))
			expect(atomMap.size).toBe(standardMap.size)

			atomMap.set('b', 2)
			standardMap.set('b', 2)
			expect(atomMap.size).toBe(standardMap.size)

			expect(atomMap.delete('a')).toBe(standardMap.delete('a'))
			expect(atomMap.has('a')).toBe(standardMap.has('a'))
			expect(atomMap.size).toBe(standardMap.size)

			expect(atomMap.delete('nonexistent')).toBe(standardMap.delete('nonexistent'))
		})

		it('should have same iterator behavior as standard Map', () => {
			const entries: [string, number][] = [
				['a', 1],
				['b', 2],
				['c', 3],
			]
			const atomMap = new AtomMap('atom', entries)
			const standardMap = new Map(entries)

			expect(Array.from(atomMap.keys())).toEqual(Array.from(standardMap.keys()))
			expect(Array.from(atomMap.values())).toEqual(Array.from(standardMap.values()))
			expect(Array.from(atomMap.entries())).toEqual(Array.from(standardMap.entries()))
			expect(Array.from(atomMap)).toEqual(Array.from(standardMap))
		})

		it('should behave like Map with forEach', () => {
			const entries: [string, number][] = [
				['a', 1],
				['b', 2],
			]
			const atomMap = new AtomMap('atom', entries)
			const standardMap = new Map(entries)

			const atomResults: Array<[string, number]> = []
			const mapResults: Array<[string, number]> = []

			atomMap.forEach((value, key) => atomResults.push([key, value]))
			standardMap.forEach((value, key) => mapResults.push([key, value]))

			expect(atomResults).toEqual(mapResults)
		})
	})

	describe('edge cases and error conditions', () => {
		it('should handle null and undefined values correctly', () => {
			const map = new AtomMap<string, any>('test')
			map.set('null', null)
			map.set('undefined', undefined)
			map.set('zero', 0)
			map.set('false', false)
			map.set('empty', '')

			expect(map.get('null')).toBe(null)
			expect(map.get('undefined')).toBe(undefined)
			expect(map.get('zero')).toBe(0)
			expect(map.get('false')).toBe(false)
			expect(map.get('empty')).toBe('')

			expect(map.has('null')).toBe(true)
			expect(map.has('undefined')).toBe(true)
			expect(map.has('zero')).toBe(true)
			expect(map.has('false')).toBe(true)
			expect(map.has('empty')).toBe(true)

			expect(map.size).toBe(5)
		})

		it('should handle symbol keys', () => {
			const sym1 = Symbol('key1')
			const sym2 = Symbol('key2')
			const map = new AtomMap<symbol, string>('symbols')

			map.set(sym1, 'value1')
			map.set(sym2, 'value2')

			expect(map.get(sym1)).toBe('value1')
			expect(map.get(sym2)).toBe('value2')
			expect(map.has(sym1)).toBe(true)
			expect(map.has(sym2)).toBe(true)
			expect(map.size).toBe(2)
		})

		it('should handle object references correctly', () => {
			const obj1 = { id: 1 }
			const obj2 = { id: 1 } // Same content but different object
			const map = new AtomMap<object, string>('objects')

			map.set(obj1, 'first')
			map.set(obj2, 'second')

			// Should be treated as different keys
			expect(map.get(obj1)).toBe('first')
			expect(map.get(obj2)).toBe('second')
			expect(map.size).toBe(2)
		})

		it('should handle empty string keys', () => {
			const map = new AtomMap<string, number>('test')
			map.set('', 42)
			expect(map.get('')).toBe(42)
			expect(map.has('')).toBe(true)
			expect(map.size).toBe(1)
		})

		it('should handle concurrent modifications during iteration', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const entries: [string, number][] = []

			// This should not throw or cause issues
			for (const [key, value] of map) {
				entries.push([key, value])
				if (key === 'b') {
					map.set('d', 4) // Add during iteration
				}
			}

			// Check that all original entries were found (arrays need deep equality)
			expect(entries.find(([k, v]) => k === 'a' && v === 1)).toBeDefined()
			expect(entries.find(([k, v]) => k === 'b' && v === 2)).toBeDefined()
			expect(entries.find(([k, v]) => k === 'c' && v === 3)).toBeDefined()
			expect(map.size).toBe(4) // But map should have the new entry
		})
	})

	describe('method chaining', () => {
		it('should support method chaining with set', () => {
			const map = new AtomMap('test')
			const result = map.set('a', 1).set('b', 2).set('c', 3)
			expect(result).toBe(map) // Should return the same instance
			expect(map.size).toBe(3)
			expect(map.get('a')).toBe(1)
			expect(map.get('b')).toBe(2)
			expect(map.get('c')).toBe(3)
		})

		it('should allow operations after other operations (delete returns boolean)', () => {
			const map = new AtomMap('test', [['initial', 0]])
			// delete returns boolean, not the map, so we can't chain
			map.delete('initial')
			map.set('a', 1).set('b', 2)
			expect(map.size).toBe(2)
			expect(map.has('initial')).toBe(false)
			expect(map.get('a')).toBe(1)
			expect(map.get('b')).toBe(2)
		})
	})

	describe('UNINITIALIZED handling', () => {
		it('should properly handle UNINITIALIZED values in atoms', () => {
			const map = new AtomMap('test')
			map.set('key', 'value')

			// Get the atom directly
			const atom = map.getAtom('key')!
			expect(atom.get()).toBe('value')

			// Delete the key, which should set the atom to UNINITIALIZED
			const deleted = map.delete('key')
			expect(deleted).toBe(true)

			// The atom should now contain UNINITIALIZED but map operations shouldn't see it
			expect(map.get('key')).toBeUndefined()
			expect(map.has('key')).toBe(false)
		})

		it('should not iterate over UNINITIALIZED values', () => {
			const map = new AtomMap('test', [
				['a', 1],
				['b', 2],
				['c', 3],
			])

			// Delete middle entry
			map.delete('b')

			const entries = Array.from(map.entries())
			const keys = Array.from(map.keys())
			const values = Array.from(map.values())

			expect(entries).toEqual([
				['a', 1],
				['c', 3],
			])
			expect(keys).toEqual(['a', 'c'])
			expect(values).toEqual([1, 3])
			expect(map.size).toBe(2)
		})
	})
})
