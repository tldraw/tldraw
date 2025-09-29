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
})
