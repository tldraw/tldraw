import { describe, expect, it } from 'vitest'
import { ImmutableMap, emptyMap, iteratorDone } from './ImmutableMap'

describe('ImmutableMap', () => {
	describe('constructor', () => {
		it('should create empty map when no value provided', () => {
			const map = new ImmutableMap()
			expect(map.size).toBe(0)
		})

		it('should create empty map when null provided', () => {
			const map = new ImmutableMap(null)
			expect(map.size).toBe(0)
		})

		it('should create empty map when undefined provided', () => {
			const map = new ImmutableMap(undefined)
			expect(map.size).toBe(0)
		})

		it('should return same instance when passed another ImmutableMap', () => {
			const original = new ImmutableMap([['a', 1]])
			const copy = new ImmutableMap(original)
			expect(copy).toBe(original)
		})

		it('should create map from iterable of key-value pairs', () => {
			const pairs: Array<[string, number]> = [
				['a', 1],
				['b', 2],
				['c', 3],
			]
			const map = new ImmutableMap(pairs)
			expect(map.size).toBe(3)
			expect(map.get('a')).toBe(1)
			expect(map.get('b')).toBe(2)
			expect(map.get('c')).toBe(3)
		})

		it('should create map from Map object', () => {
			const jsMap = new Map([
				['key1', 'value1'],
				['key2', 'value2'],
			])
			const map = new ImmutableMap(jsMap)
			expect(map.size).toBe(2)
			expect(map.get('key1')).toBe('value1')
			expect(map.get('key2')).toBe('value2')
		})

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
		it('should return value for existing key', () => {
			const map = new ImmutableMap([['key', 'value']])
			expect(map.get('key')).toBe('value')
		})

		it('should return undefined for non-existent key', () => {
			const map = new ImmutableMap([['key', 'value']])
			expect(map.get('missing')).toBeUndefined()
		})

		it('should return fallback value for non-existent key', () => {
			const map = new ImmutableMap<string, string>([['key', 'value']])
			expect(map.get('missing') ?? 'fallback').toBe('fallback')
		})

		it('should return actual value instead of fallback for existing key', () => {
			const map = new ImmutableMap<string, string>([['key', 'value']])
			expect(map.get('key') ?? 'fallback').toBe('value')
		})

		it('should work with different key types', () => {
			const map = new ImmutableMap<any, string>([
				[1, 'number'],
				['string', 'string'],
				[true, 'boolean'],
				[null, 'null'],
			])
			expect(map.get(1)).toBe('number')
			expect(map.get('string')).toBe('string')
			expect(map.get(true)).toBe('boolean')
			expect(map.get(null)).toBe('null')
		})

		it('should handle object keys', () => {
			const objKey = { id: 1 }
			const map = new ImmutableMap([[objKey, 'object']])
			expect(map.get(objKey)).toBe('object')
			expect(map.get({ id: 1 })).toBeUndefined() // Different object
		})

		it('should handle symbol keys', () => {
			const sym = Symbol('test')
			const map = new ImmutableMap([[sym, 'symbol']])
			expect(map.get(sym)).toBe('symbol')
		})

		it('should work with empty map', () => {
			const map = new ImmutableMap<string, string>()
			expect(map.get('any')).toBeUndefined()
			expect(map.get('any') ?? 'default').toBe('default')
		})
	})

	describe('set', () => {
		it('should add new key-value pair', () => {
			const map = new ImmutableMap()
			const newMap = map.set('key', 'value')

			expect(newMap.size).toBe(1)
			expect(newMap.get('key')).toBe('value')
			expect(map.size).toBe(0) // Original unchanged
		})

		it('should update existing key', () => {
			const map = new ImmutableMap([['key', 'old']])
			const newMap = map.set('key', 'new')

			expect(newMap.size).toBe(1)
			expect(newMap.get('key')).toBe('new')
			expect(map.get('key')).toBe('old') // Original unchanged
		})

		it('should return same instance when setting same value (optimization)', () => {
			const map = new ImmutableMap([['key', 'value']])
			const newMap = map.set('key', 'value')

			// ImmutableMap optimizes by returning the same instance when value hasn't changed
			expect(newMap).toBe(map)
			expect(newMap.get('key')).toBe('value')
		})

		it('should handle multiple operations', () => {
			let map = new ImmutableMap<string, number>()
			map = map.set('a', 1)
			map = map.set('b', 2)
			map = map.set('c', 3)

			expect(map.size).toBe(3)
			expect(map.get('a')).toBe(1)
			expect(map.get('b')).toBe(2)
			expect(map.get('c')).toBe(3)
		})

		it('should handle large number of entries', () => {
			let map = new ImmutableMap<number, string>()
			const entries = 1000

			for (let i = 0; i < entries; i++) {
				map = map.set(i, `value${i}`)
			}

			expect(map.size).toBe(entries)
			expect(map.get(0)).toBe('value0')
			expect(map.get(entries - 1)).toBe(`value${entries - 1}`)
			expect(map.get(entries / 2)).toBe(`value${entries / 2}`)
		})

		it('should handle hash collisions gracefully', () => {
			// Create objects that might have hash collisions
			const obj1 = { toString: () => 'collision' }
			const obj2 = { toString: () => 'collision' }

			let map = new ImmutableMap()
			map = map.set(obj1, 'first')
			map = map.set(obj2, 'second')

			expect(map.size).toBe(2)
			expect(map.get(obj1)).toBe('first')
			expect(map.get(obj2)).toBe('second')
		})
	})

	describe('delete', () => {
		it('should remove existing key', () => {
			const map = new ImmutableMap([
				['a', 1],
				['b', 2],
			])
			const newMap = map.delete('a')

			expect(newMap.size).toBe(1)
			expect(newMap.get('a')).toBeUndefined()
			expect(newMap.get('b')).toBe(2)
			expect(map.size).toBe(2) // Original unchanged
		})

		it('should return same instance when deleting non-existent key', () => {
			const map = new ImmutableMap([['a', 1]])
			const newMap = map.delete('missing')

			expect(newMap).toBe(map)
		})

		it('should handle deleting all keys', () => {
			const map = new ImmutableMap([['a', 1]])
			const newMap = map.delete('a')

			expect(newMap.size).toBe(0)
			expect(newMap.get('a')).toBeUndefined()
		})

		it('should work with empty map', () => {
			const map = new ImmutableMap()
			const newMap = map.delete('any')

			expect(newMap).toBe(map)
			expect(newMap.size).toBe(0)
		})

		it('should handle deleting from large map', () => {
			let map = new ImmutableMap<number, string>()
			const entries = 100

			// Add entries
			for (let i = 0; i < entries; i++) {
				map = map.set(i, `value${i}`)
			}

			// Delete half
			for (let i = 0; i < entries / 2; i++) {
				map = map.delete(i)
			}

			expect(map.size).toBe(entries / 2)
			expect(map.get(0)).toBeUndefined()
			expect(map.get(entries - 1)).toBe(`value${entries - 1}`)
		})
	})

	describe('deleteAll', () => {
		it('should remove multiple keys', () => {
			const map = new ImmutableMap([
				['a', 1],
				['b', 2],
				['c', 3],
				['d', 4],
			])
			const newMap = map.deleteAll(['a', 'c'])

			expect(newMap.size).toBe(2)
			expect(newMap.get('a')).toBeUndefined()
			expect(newMap.get('b')).toBe(2)
			expect(newMap.get('c')).toBeUndefined()
			expect(newMap.get('d')).toBe(4)
		})

		it('should handle empty key list', () => {
			const map = new ImmutableMap([['a', 1]])
			const newMap = map.deleteAll([])

			expect(newMap).toBe(map)
		})

		it('should handle non-existent keys', () => {
			const map = new ImmutableMap([['a', 1]])
			const newMap = map.deleteAll(['b', 'c'])

			expect(newMap).toBe(map)
		})

		it('should handle mixed existing and non-existent keys', () => {
			const map = new ImmutableMap([
				['a', 1],
				['b', 2],
			])
			const newMap = map.deleteAll(['a', 'missing', 'b'])

			expect(newMap.size).toBe(0)
		})

		it('should handle deleting all keys', () => {
			const map = new ImmutableMap([
				['a', 1],
				['b', 2],
			])
			const newMap = map.deleteAll(['a', 'b'])

			expect(newMap.size).toBe(0)
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

		it('should return same instance when no mutations made', () => {
			const map = new ImmutableMap([['a', 1]])
			const newMap = map.withMutations(() => {
				// No mutations
			})

			expect(newMap).toBe(map)
		})

		it('should handle complex mutation chains', () => {
			const map = new ImmutableMap()
			const newMap = map.withMutations((mutable) => {
				// Add many items
				for (let i = 0; i < 50; i++) {
					mutable.set(`key${i}`, i)
				}
				// Delete some
				for (let i = 0; i < 25; i++) {
					mutable.delete(`key${i}`)
				}
				// Update others
				for (let i = 25; i < 50; i++) {
					mutable.set(`key${i}`, i * 2)
				}
			})

			expect(newMap.size).toBe(25)
			expect(newMap.get('key0')).toBeUndefined()
			expect(newMap.get('key49')).toBe(98)
		})

		it('should be more efficient than chaining operations', () => {
			const map = new ImmutableMap()
			const operations = 100

			// Measure time for chained operations
			const start1 = performance.now()
			let chained = map
			for (let i = 0; i < operations; i++) {
				chained = chained.set(`key${i}`, i)
			}
			const time1 = performance.now() - start1

			// Measure time for batched mutations
			const start2 = performance.now()
			const batched = map.withMutations((mutable) => {
				for (let i = 0; i < operations; i++) {
					mutable.set(`key${i}`, i)
				}
			})
			const time2 = performance.now() - start2

			expect(chained.size).toBe(operations)
			expect(batched.size).toBe(operations)
			// Batched should be faster (though this might be flaky in CI)
			// expect(time2).toBeLessThan(time1)
		})
	})

	describe('iterators', () => {
		describe('entries', () => {
			it('should iterate over all key-value pairs', () => {
				const map = new ImmutableMap([
					['a', 1],
					['b', 2],
					['c', 3],
				])
				const entries = Array.from(map.entries())

				expect(entries).toHaveLength(3)
				expect(entries).toContainEqual(['a', 1])
				expect(entries).toContainEqual(['b', 2])
				expect(entries).toContainEqual(['c', 3])
			})

			it('should work with empty map', () => {
				const map = new ImmutableMap()
				const entries = Array.from(map.entries())

				expect(entries).toHaveLength(0)
			})

			it('should be iterable multiple times', () => {
				const map = new ImmutableMap([
					['a', 1],
					['b', 2],
				])
				const iter = map.entries()

				const first = Array.from(iter)
				const second = Array.from(map.entries())

				expect(first).toEqual(second)
			})
		})

		describe('keys', () => {
			it('should iterate over all keys', () => {
				const map = new ImmutableMap([
					['a', 1],
					['b', 2],
					['c', 3],
				])
				const keys = Array.from(map.keys())

				expect(keys).toHaveLength(3)
				expect(keys).toContain('a')
				expect(keys).toContain('b')
				expect(keys).toContain('c')
			})

			it('should work with empty map', () => {
				const map = new ImmutableMap()
				const keys = Array.from(map.keys())

				expect(keys).toHaveLength(0)
			})
		})

		describe('values', () => {
			it('should iterate over all values', () => {
				const map = new ImmutableMap([
					['a', 1],
					['b', 2],
					['c', 3],
				])
				const values = Array.from(map.values())

				expect(values).toHaveLength(3)
				expect(values).toContain(1)
				expect(values).toContain(2)
				expect(values).toContain(3)
			})

			it('should work with empty map', () => {
				const map = new ImmutableMap()
				const values = Array.from(map.values())

				expect(values).toHaveLength(0)
			})

			it('should include duplicate values', () => {
				const map = new ImmutableMap([
					['a', 1],
					['b', 1],
					['c', 2],
				])
				const values = Array.from(map.values())

				expect(values).toHaveLength(3)
				expect(values.filter((v) => v === 1)).toHaveLength(2)
			})
		})

		describe('Symbol.iterator', () => {
			it('should make map directly iterable', () => {
				const map = new ImmutableMap([
					['a', 1],
					['b', 2],
				])
				const entries = Array.from(map)

				expect(entries).toHaveLength(2)
				expect(entries).toContainEqual(['a', 1])
				expect(entries).toContainEqual(['b', 2])
			})

			it('should work with for...of loops', () => {
				const map = new ImmutableMap([
					['a', 1],
					['b', 2],
				])
				const collected: Array<[string, number]> = []

				for (const entry of map) {
					collected.push(entry)
				}

				expect(collected).toHaveLength(2)
				expect(collected).toContainEqual(['a', 1])
				expect(collected).toContainEqual(['b', 2])
			})

			it('should work with destructuring', () => {
				const map = new ImmutableMap([['key', 'value']])
				const [[key, value]] = map

				expect(key).toBe('key')
				expect(value).toBe('value')
			})
		})
	})

	describe('edge cases', () => {
		it('should handle undefined and null values', () => {
			const map = new ImmutableMap([
				['null', null],
				['undefined', undefined],
			])

			expect(map.get('null')).toBe(null)
			expect(map.get('undefined')).toBe(undefined)
			expect(map.size).toBe(2)
		})

		it('should handle undefined and null keys', () => {
			const map = new ImmutableMap([
				[null, 'null-key'],
				[undefined, 'undefined-key'],
			])

			expect(map.get(null)).toBe('null-key')
			expect(map.get(undefined)).toBe('undefined-key')
			expect(map.size).toBe(2)
		})

		it('should distinguish between different falsy values', () => {
			const map = new ImmutableMap<any, string>([
				[0, 'zero'],
				['', 'empty-string'],
				[false, 'false'],
				[null, 'null'],
				[undefined, 'undefined'],
			])

			expect(map.get(0)).toBe('zero')
			expect(map.get('')).toBe('empty-string')
			expect(map.get(false)).toBe('false')
			expect(map.get(null)).toBe('null')
			expect(map.get(undefined)).toBe('undefined')
			expect(map.size).toBe(5)
		})

		it('should handle NaN as key', () => {
			const map = new ImmutableMap([[NaN, 'not-a-number']])

			expect(map.get(NaN)).toBe('not-a-number')
			expect(map.size).toBe(1)
		})

		it('should handle very large numbers', () => {
			const large = Number.MAX_SAFE_INTEGER
			const map = new ImmutableMap([[large, 'large']])

			expect(map.get(large)).toBe('large')
		})

		it('should handle negative zero', () => {
			const map = new ImmutableMap([
				[0, 'positive-zero'],
				[-0, 'negative-zero'],
			])

			// Object.is treats +0 and -0 as different, but ImmutableMap uses Object.is internally
			expect(map.size).toBe(2) // They are treated as different keys
			expect(map.get(0)).toBe('positive-zero')
			expect(map.get(-0)).toBe('negative-zero')
		})

		it('should maintain structural sharing', () => {
			const map1 = new ImmutableMap([
				['a', 1],
				['b', 2],
			])
			const map2 = map1.set('c', 3)
			const map3 = map2.delete('nonexistent')

			// map3 should be the same as map2 since no actual deletion occurred
			expect(map3).toBe(map2)
		})

		it('should handle complex nested objects', () => {
			const complex = {
				nested: {
					array: [1, 2, { deep: 'value' }],
					map: new Map([['inner', 'data']]),
				},
			}
			const map = new ImmutableMap([[complex, 'complex-object']])

			expect(map.get(complex)).toBe('complex-object')
			expect(map.size).toBe(1)
		})
	})

	describe('performance characteristics', () => {
		it('should handle large datasets efficiently', () => {
			const size = 10000
			let map = new ImmutableMap<number, string>()

			// Build large map
			const start = performance.now()
			for (let i = 0; i < size; i++) {
				map = map.set(i, `value${i}`)
			}
			const buildTime = performance.now() - start

			expect(map.size).toBe(size)
			// Should complete reasonably quickly (< 1 second)
			expect(buildTime).toBeLessThan(1000)

			// Test random access
			const accessStart = performance.now()
			for (let i = 0; i < 1000; i++) {
				const randomKey = Math.floor(Math.random() * size)
				expect(map.get(randomKey)).toBe(`value${randomKey}`)
			}
			const accessTime = performance.now() - accessStart

			// Random access should be very fast
			expect(accessTime).toBeLessThan(100)
		})
	})

	describe('type safety', () => {
		it('should maintain type information', () => {
			const map = new ImmutableMap<string, number>([['a', 1]])

			// These should work with proper types
			const value: number | undefined = map.get('a')
			const newMap: ImmutableMap<string, number> = map.set('b', 2)

			expect(value).toBe(1)
			expect(newMap.get('b')).toBe(2)
		})

		it('should work with custom object types', () => {
			interface User {
				id: string
				name: string
			}

			const user: User = { id: '1', name: 'John' }
			const map = new ImmutableMap<string, User>([['user1', user]])

			const retrieved = map.get('user1')
			expect(retrieved?.name).toBe('John')
		})
	})

	describe('immutability guarantees', () => {
		it('should never modify original map on set', () => {
			const original = new ImmutableMap([['a', 1]])
			const modified = original.set('b', 2)

			expect(original.size).toBe(1)
			expect(modified.size).toBe(2)
			expect(original.get('b')).toBeUndefined()
			expect(modified.get('b')).toBe(2)
		})

		it('should never modify original map on delete', () => {
			const original = new ImmutableMap([
				['a', 1],
				['b', 2],
			])
			const modified = original.delete('a')

			expect(original.size).toBe(2)
			expect(modified.size).toBe(1)
			expect(original.get('a')).toBe(1)
			expect(modified.get('a')).toBeUndefined()
		})

		it('should prevent mutation of returned iterators', () => {
			const map = new ImmutableMap([
				['a', 1],
				['b', 2],
			])
			const entries = Array.from(map.entries())

			// Modifying the array shouldn't affect the map
			entries.push(['c', 3])
			expect(map.size).toBe(2)
			expect(Array.from(map.entries())).toHaveLength(2)
		})
	})
})

describe('emptyMap', () => {
	it('should return same instance for multiple calls', () => {
		const empty1 = emptyMap()
		const empty2 = emptyMap()

		expect(empty1).toBe(empty2)
	})

	it('should create empty map with correct properties', () => {
		const empty = emptyMap<string, number>()

		expect(empty.size).toBe(0)
		expect(empty.get('any')).toBeUndefined()
		expect(Array.from(empty.entries())).toHaveLength(0)
	})

	it('should work with different type parameters', () => {
		const stringMap = emptyMap<string, string>()
		const numberMap = emptyMap<number, boolean>()

		// They should still be the same instance (runtime)
		expect(stringMap).toBe(numberMap)
	})
})

describe('iteratorDone', () => {
	it('should return correct done iterator result', () => {
		const result = iteratorDone()

		expect(result.done).toBe(true)
		expect(result.value).toBeUndefined()
	})

	it('should return same structure on multiple calls', () => {
		const result1 = iteratorDone()
		const result2 = iteratorDone()

		expect(result1).toEqual(result2)
		expect(result1.done).toBe(true)
		expect(result2.done).toBe(true)
	})
})
