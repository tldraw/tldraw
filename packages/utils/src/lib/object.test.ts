import { describe, expect, it } from 'vitest'
import {
	areObjectsShallowEqual,
	filterEntries,
	getChangedKeys,
	getOwnProperty,
	groupBy,
	hasOwnProperty,
	isEqualAllowingForFloatingPointErrors,
	mapObjectMapValues,
	objectMapEntries,
	objectMapEntriesIterable,
	objectMapFromEntries,
	objectMapKeys,
	objectMapValues,
	omit,
} from './object'

describe('hasOwnProperty', () => {
	it('should return true for own properties', () => {
		const obj = { name: 'Alice', age: 30 }
		expect(hasOwnProperty(obj, 'name')).toBe(true)
		expect(hasOwnProperty(obj, 'age')).toBe(true)
	})

	it('should return false for inherited properties', () => {
		const obj = { name: 'Alice' }
		expect(hasOwnProperty(obj, 'toString')).toBe(false)
		expect(hasOwnProperty(obj, 'valueOf')).toBe(false)
	})

	it('should return false for non-existent properties', () => {
		const obj = { name: 'Alice' }
		expect(hasOwnProperty(obj, 'unknown')).toBe(false)
		expect(hasOwnProperty(obj, 'missing')).toBe(false)
	})

	it('should work with objects that override hasOwnProperty', () => {
		const obj = {
			name: 'Alice',
			hasOwnProperty: () => false, // Override
		}
		expect(hasOwnProperty(obj, 'name')).toBe(true)
		expect(hasOwnProperty(obj, 'hasOwnProperty')).toBe(true)
	})

	it('should work with null prototype objects', () => {
		const obj = Object.create(null)
		obj.name = 'Alice'
		expect(hasOwnProperty(obj, 'name')).toBe(true)
		expect(hasOwnProperty(obj, 'toString')).toBe(false)
	})
})

describe('getOwnProperty', () => {
	it('should return own property values', () => {
		const user = { name: 'Alice', age: 30 }
		expect(getOwnProperty(user, 'name')).toBe('Alice')
		expect(getOwnProperty(user, 'age')).toBe(30)
	})

	it('should return undefined for non-existent properties', () => {
		const user = { name: 'Alice' }
		expect(getOwnProperty(user, 'unknown')).toBeUndefined()
		expect(getOwnProperty(user, 'age')).toBeUndefined()
	})

	it('should return undefined for inherited properties', () => {
		const user = { name: 'Alice' }
		expect(getOwnProperty(user, 'toString')).toBeUndefined()
		expect(getOwnProperty(user, 'valueOf')).toBeUndefined()
	})

	it('should work with null and undefined values', () => {
		const obj = { nullable: null, undefinedValue: undefined }
		expect(getOwnProperty(obj, 'nullable')).toBeNull()
		expect(getOwnProperty(obj, 'undefinedValue')).toBeUndefined()
	})

	it('should work with various value types', () => {
		const obj = {
			string: 'hello',
			number: 42,
			boolean: true,
			array: [1, 2, 3],
			object: { nested: true },
		}
		expect(getOwnProperty(obj, 'string')).toBe('hello')
		expect(getOwnProperty(obj, 'number')).toBe(42)
		expect(getOwnProperty(obj, 'boolean')).toBe(true)
		expect(getOwnProperty(obj, 'array')).toEqual([1, 2, 3])
		expect(getOwnProperty(obj, 'object')).toEqual({ nested: true })
	})
})

describe('objectMapKeys', () => {
	it('should return keys as typed array', () => {
		const config = { theme: 'dark', lang: 'en' }
		const keys = objectMapKeys(config)
		expect(keys).toEqual(['theme', 'lang'])
		expect(keys).toHaveLength(2)
	})

	it('should work with empty objects', () => {
		const empty = {}
		const keys = objectMapKeys(empty)
		expect(keys).toEqual([])
		expect(keys).toHaveLength(0)
	})

	it('should preserve key order', () => {
		const obj = { z: 1, a: 2, m: 3 }
		const keys = objectMapKeys(obj)
		expect(keys).toEqual(['z', 'a', 'm'])
	})
})

describe('objectMapValues', () => {
	it('should return values as typed array', () => {
		const scores = { alice: 85, bob: 92, charlie: 78 }
		const values = objectMapValues(scores)
		expect(values).toEqual([85, 92, 78])
		expect(values).toHaveLength(3)
	})

	it('should work with empty objects', () => {
		const empty = {}
		const values = objectMapValues(empty)
		expect(values).toEqual([])
		expect(values).toHaveLength(0)
	})

	it('should preserve value order', () => {
		const obj = { first: 'a', second: 'b', third: 'c' }
		const values = objectMapValues(obj)
		expect(values).toEqual(['a', 'b', 'c'])
	})
})

describe('objectMapEntries', () => {
	it('should return entries as typed array', () => {
		const user = { name: 'Alice', age: 30 }
		const entries = objectMapEntries(user)
		expect(entries).toEqual([
			['name', 'Alice'],
			['age', 30],
		])
	})

	it('should work with empty objects', () => {
		const empty = {}
		const entries = objectMapEntries(empty)
		expect(entries).toEqual([])
		expect(entries).toHaveLength(0)
	})

	it('should preserve entry order', () => {
		const obj = { z: 1, a: 2 }
		const entries = objectMapEntries(obj)
		expect(entries).toEqual([
			['z', 1],
			['a', 2],
		])
	})
})

describe('objectMapEntriesIterable', () => {
	it('should yield entries as iterator', () => {
		const obj = { a: 1, b: 2, c: 3 }
		const entries = Array.from(objectMapEntriesIterable(obj))
		expect(entries).toEqual([
			['a', 1],
			['b', 2],
			['c', 3],
		])
	})

	it('should work with empty objects', () => {
		const empty = {}
		const entries = Array.from(objectMapEntriesIterable(empty))
		expect(entries).toEqual([])
	})

	it('should skip inherited properties', () => {
		const parent = { inherited: 'value' }
		const child = Object.create(parent)
		child.own = 'ownValue'

		const entries = Array.from(objectMapEntriesIterable(child))
		expect(entries).toEqual([['own', 'ownValue']])
		expect(entries).toHaveLength(1)
	})

	it('should be iterable in for...of loops', () => {
		const obj = { x: 10, y: 20 }
		const collected: Array<[string, number]> = []

		for (const [key, value] of objectMapEntriesIterable(obj)) {
			collected.push([key, value])
		}

		expect(collected).toEqual([
			['x', 10],
			['y', 20],
		])
	})
})

describe('objectMapFromEntries', () => {
	it('should create object from entries', () => {
		const entries: Array<['name' | 'age', string | number]> = [
			['name', 'Alice'],
			['age', 30],
		]
		const obj = objectMapFromEntries(entries)
		expect(obj).toEqual({ name: 'Alice', age: 30 })
	})

	it('should work with empty arrays', () => {
		const entries: Array<[string, unknown]> = []
		const obj = objectMapFromEntries(entries)
		expect(obj).toEqual({})
	})

	it('should handle duplicate keys (last wins)', () => {
		const entries: Array<['key', string]> = [
			['key', 'first'],
			['key', 'second'],
		]
		const obj = objectMapFromEntries(entries)
		expect(obj).toEqual({ key: 'second' })
	})
})

describe('filterEntries', () => {
	it('should filter object entries based on predicate', () => {
		const scores = { alice: 85, bob: 92, charlie: 78 }
		const passing = filterEntries(scores, (name, score) => score >= 80)
		expect(passing).toEqual({ alice: 85, bob: 92 })
	})

	it('should return original object if no changes needed', () => {
		const scores = { alice: 85, bob: 92 }
		const result = filterEntries(scores, () => true)
		expect(result).toBe(scores) // Same reference
	})

	it('should return new object if changes needed', () => {
		const scores = { alice: 85, bob: 92, charlie: 78 }
		const result = filterEntries(scores, (name, score) => score >= 90)
		expect(result).not.toBe(scores) // Different reference
		expect(result).toEqual({ bob: 92 })
	})

	it('should work with empty objects', () => {
		const empty = {}
		const result = filterEntries(empty, () => true)
		expect(result).toBe(empty)
		expect(result).toEqual({})
	})

	it('should pass key and value to predicate', () => {
		const obj = { prefix_a: 1, other_b: 2, prefix_c: 3 }
		const result = filterEntries(obj, (key, value) => key.startsWith('prefix_') && value > 1)
		expect(result).toEqual({ prefix_c: 3 })
	})
})

describe('mapObjectMapValues', () => {
	it('should map values while preserving keys', () => {
		const prices = { apple: 1.5, banana: 0.75, orange: 2.0 }
		const withTax = mapObjectMapValues(prices, (fruit, price) => price * 1.08)
		expect(withTax).toEqual({
			apple: 1.62,
			banana: 0.81,
			orange: 2.16,
		})
	})

	it('should pass key and value to mapper', () => {
		const obj = { a: 1, b: 2, c: 3 }
		const result = mapObjectMapValues(obj, (key, value) => `${key}:${value}`)
		expect(result).toEqual({
			a: 'a:1',
			b: 'b:2',
			c: 'c:3',
		})
	})

	it('should work with empty objects', () => {
		const empty = {}
		const result = mapObjectMapValues(empty, (k, v) => v)
		expect(result).toEqual({})
	})

	it('should skip inherited properties', () => {
		const parent = { inherited: 'value' }
		const child = Object.create(parent)
		child.own = 'ownValue'

		const result = mapObjectMapValues(child, (k, v) => (v as string).toUpperCase())
		expect(result).toEqual({ own: 'OWNVALUE' })
	})
})

describe('areObjectsShallowEqual', () => {
	it('should return true for same reference', () => {
		const obj = { x: 1, y: 2 }
		expect(areObjectsShallowEqual(obj, obj)).toBe(true)
	})

	it('should return true for shallow equal objects', () => {
		const a = { x: 1, y: 2 }
		const b = { x: 1, y: 2 }
		expect(areObjectsShallowEqual(a, b)).toBe(true)
	})

	it('should return false for different values', () => {
		const a = { x: 1, y: 2 }
		const c = { x: 1, y: 3 }
		expect(areObjectsShallowEqual(a, c)).toBe(false)
	})

	it('should return false for different keys', () => {
		const a: Record<string, number> = { x: 1, y: 2 }
		const d: Record<string, number> = { x: 1, z: 2 }
		expect(areObjectsShallowEqual(a, d)).toBe(false)
	})

	it('should return false for different number of keys', () => {
		const a = { x: 1, y: 2 }
		const e = { x: 1 }
		expect(areObjectsShallowEqual(a, e)).toBe(false)
	})

	it('should handle NaN correctly using Object.is', () => {
		const a = { x: NaN }
		const b = { x: NaN }
		const c = { x: Number.NaN }
		expect(areObjectsShallowEqual(a, b)).toBe(true)
		expect(areObjectsShallowEqual(a, c)).toBe(true)
	})

	it('should handle -0 and +0 correctly using Object.is', () => {
		const a = { x: -0 }
		const b = { x: +0 }
		expect(areObjectsShallowEqual(a, b)).toBe(false)
	})

	it('should work with empty objects', () => {
		expect(areObjectsShallowEqual({}, {})).toBe(true)
	})
})

describe('groupBy', () => {
	it('should group array items by key selector', () => {
		const people = [
			{ name: 'Alice', age: 25 },
			{ name: 'Bob', age: 30 },
			{ name: 'Charlie', age: 25 },
		]
		const byAge = groupBy(people, (person) => `age-${person.age}`)
		expect(byAge).toEqual({
			'age-25': [
				{ name: 'Alice', age: 25 },
				{ name: 'Charlie', age: 25 },
			],
			'age-30': [{ name: 'Bob', age: 30 }],
		})
	})

	it('should work with empty arrays', () => {
		const result = groupBy([], () => 'key')
		expect(result).toEqual({})
	})

	it('should work with single item', () => {
		const items = ['apple']
		const result = groupBy(items, (item) => item.charAt(0))
		expect(result).toEqual({ a: ['apple'] })
	})

	it('should handle duplicate keys properly', () => {
		const items = ['apple', 'apricot', 'banana']
		const result = groupBy(items, (item) => item.charAt(0))
		expect(result).toEqual({
			a: ['apple', 'apricot'],
			b: ['banana'],
		})
	})
})

describe('omit', () => {
	it('should omit specified keys', () => {
		const user = { id: '123', name: 'Alice', password: 'secret', email: 'alice@example.com' }
		const publicUser = omit(user, ['password'])
		expect(publicUser).toEqual({
			id: '123',
			name: 'Alice',
			email: 'alice@example.com',
		})
	})

	it('should omit multiple keys', () => {
		const obj = { a: 1, b: 2, c: 3, d: 4 }
		const result = omit(obj, ['b', 'd'])
		expect(result).toEqual({ a: 1, c: 3 })
	})

	it('should handle non-existent keys gracefully', () => {
		const obj = { a: 1, b: 2 }
		const result = omit(obj, ['c', 'd'])
		expect(result).toEqual({ a: 1, b: 2 })
	})

	it('should work with empty key array', () => {
		const obj = { a: 1, b: 2 }
		const result = omit(obj, [])
		expect(result).toEqual({ a: 1, b: 2 })
		expect(result).not.toBe(obj) // Should still create new object
	})

	it('should work with empty objects', () => {
		const result = omit({}, ['key'])
		expect(result).toEqual({})
	})
})

describe('getChangedKeys', () => {
	it('should return keys where values differ', () => {
		const before = { name: 'Alice', age: 25, city: 'NYC' }
		const after = { name: 'Alice', age: 26, city: 'NYC' }
		const changed = getChangedKeys(before, after)
		expect(changed).toEqual(['age'])
	})

	it('should return multiple changed keys', () => {
		const before = { a: 1, b: 2, c: 3 }
		const after = { a: 1, b: 5, c: 6 }
		const changed = getChangedKeys(before, after)
		expect(changed).toEqual(['b', 'c'])
	})

	it('should return empty array when objects are equal', () => {
		const before = { a: 1, b: 2 }
		const after = { a: 1, b: 2 }
		const changed = getChangedKeys(before, after)
		expect(changed).toEqual([])
	})

	it('should handle NaN correctly using Object.is', () => {
		const before = { x: NaN, y: 1 }
		const after = { x: NaN, y: 2 }
		const changed = getChangedKeys(before, after)
		expect(changed).toEqual(['y']) // NaN === NaN with Object.is
	})

	it('should handle -0 and +0 correctly using Object.is', () => {
		const before = { x: -0 }
		const after = { x: +0 }
		const changed = getChangedKeys(before, after)
		expect(changed).toEqual(['x']) // -0 !== +0 with Object.is
	})

	it('should only check keys from first object', () => {
		const before = { a: 1, b: 2 }
		const after = { a: 1, b: 2, c: 3 } // Extra key
		const changed = getChangedKeys(before, after)
		expect(changed).toEqual([]) // 'c' not checked since it's not in before
	})

	it('should work with empty objects', () => {
		const changed = getChangedKeys({}, {})
		expect(changed).toEqual([])
	})
})

describe('isEqualAllowingForFloatingPointErrors', () => {
	it('should handle floating point precision errors', () => {
		const a = { x: 0.1 + 0.2 } // 0.30000000000000004
		const b = { x: 0.3 }
		expect(isEqualAllowingForFloatingPointErrors(a, b)).toBe(true)
	})

	it('should work with nested objects containing floats', () => {
		const c = { coords: [1.0000001, 2.0000001] }
		const d = { coords: [1.0000002, 2.0000002] }
		expect(isEqualAllowingForFloatingPointErrors(c, d)).toBe(true)
	})

	it('should reject differences larger than threshold', () => {
		const a = { x: 0.1 }
		const b = { x: 0.2 }
		expect(isEqualAllowingForFloatingPointErrors(a, b)).toBe(false)
	})

	it('should work with custom threshold', () => {
		const a = { x: 0.1 }
		const b = { x: 0.15 }
		expect(isEqualAllowingForFloatingPointErrors(a, b, 0.1)).toBe(true)
		expect(isEqualAllowingForFloatingPointErrors(a, b, 0.01)).toBe(false)
	})

	it('should handle non-numeric values normally', () => {
		const a = { name: 'Alice', active: true }
		const b = { name: 'Alice', active: true }
		const c = { name: 'Bob', active: true }
		expect(isEqualAllowingForFloatingPointErrors(a, b)).toBe(true)
		expect(isEqualAllowingForFloatingPointErrors(a, c)).toBe(false)
	})

	it('should handle deep equality with mixed types', () => {
		const a = {
			user: 'Alice',
			score: 0.1 + 0.2,
			data: { x: 1.0000001, y: 'test' },
		}
		const b = {
			user: 'Alice',
			score: 0.3,
			data: { x: 1.0000002, y: 'test' },
		}
		expect(isEqualAllowingForFloatingPointErrors(a, b)).toBe(true)
	})

	it('should work with arrays', () => {
		const a = { values: [0.1 + 0.2, 0.4] }
		const b = { values: [0.3, 0.4] }
		expect(isEqualAllowingForFloatingPointErrors(a, b)).toBe(true)
	})

	it('should return false for structurally different objects', () => {
		const a = { x: 0.3 }
		const b = { y: 0.3 }
		expect(isEqualAllowingForFloatingPointErrors(a, b)).toBe(false)
	})

	it('should work with same reference', () => {
		const obj = { x: 0.1 + 0.2 }
		expect(isEqualAllowingForFloatingPointErrors(obj, obj)).toBe(true)
	})
})
