import { describe, expect, it } from 'vitest'
import { ImmutableMap, emptyMap } from './ImmutableMap'

describe('ImmutableMap', () => {
	describe('constructor', () => {
		it('should handle duplicate keys by keeping last value', () => {
			const pairs: Array<[string, number]> = [
				['a', 1],
				['a', 2],
				['a', 3],
			]
			const map = new ImmutableMap(pairs)
			expect(map.size).toBe(1)
			expect(map.get('a')).toBe(3)
		})
	})

	describe('get', () => {
		it('should handle object keys', () => {
			const objKey = { id: 1 }
			const map = new ImmutableMap([[objKey, 'object']])
			expect(map.get(objKey)).toBe('object')
			expect(map.get({ id: 1 })).toBeUndefined() // Different object
		})
	})

	describe('set', () => {
		it('should create new map with updated value', () => {
			const map = new ImmutableMap([['key', 'value']])
			const newMap = map.set('key', 'newValue')

			expect(newMap.get('key')).toBe('newValue')
			expect(map.get('key')).toBe('value') // Original unchanged
		})

		it('should handle different object keys correctly', () => {
			const obj1 = { id: 1 }
			const obj2 = { id: 2 }

			let map = new ImmutableMap()
			map = map.set(obj1, 'first')
			map = map.set(obj2, 'second')

			expect(map.size).toBe(2)
			expect(map.get(obj1)).toBe('first')
			expect(map.get(obj2)).toBe('second')
		})
	})

	describe('delete', () => {
		it('should remove existing keys', () => {
			const map = new ImmutableMap([
				['a', 1],
				['b', 2],
			])
			const newMap = map.delete('a')

			expect(newMap.size).toBe(1)
			expect(newMap.get('a')).toBeUndefined()
			expect(newMap.get('b')).toBe(2)
		})
	})

	describe('deleteAll', () => {
		it('should remove multiple keys', () => {
			const map = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
			])
			const newMap = map.deleteAll(['a', 'c'])

			expect(newMap.size).toBe(1)
			expect(newMap.get('a')).toBeUndefined()
			expect(newMap.get('b')).toBe(2)
			expect(newMap.get('c')).toBeUndefined()
		})
	})

	describe('withMutations', () => {
		it('should allow efficient batch operations', () => {
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
		})
	})
})

describe('emptyMap', () => {
	it('should create empty map with zero size', () => {
		const empty = emptyMap()
		expect(empty.size).toBe(0)
		expect(empty.get('anything')).toBeUndefined()
	})
})
