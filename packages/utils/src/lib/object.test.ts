import { describe, expect, it } from 'vitest'
import {
	areObjectsShallowEqual,
	filterEntries,
	getChangedKeys,
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
	it('should work with objects that override hasOwnProperty', () => {
		const obj = {
			name: 'Alice',
			hasOwnProperty: () => false,
		}
		expect(hasOwnProperty(obj, 'name')).toBe(true)
	})
})

describe('objectMapKeys', () => {
	it('should return typed keys preserving order', () => {
		const obj = { z: 1, a: 2, m: 3 }
		const keys = objectMapKeys(obj)
		expect(keys).toEqual(['z', 'a', 'm'])
	})
})

describe('objectMapValues', () => {
	it('should return typed values preserving order', () => {
		const obj = { first: 'a', second: 'b', third: 'c' }
		const values = objectMapValues(obj)
		expect(values).toEqual(['a', 'b', 'c'])
	})
})

describe('objectMapEntries', () => {
	it('should return typed entries preserving order', () => {
		const obj = { z: 1, a: 2 }
		const entries = objectMapEntries(obj)
		expect(entries).toEqual([
			['z', 1],
			['a', 2],
		])
	})
})

describe('objectMapEntriesIterable', () => {
	it('should skip inherited properties and work as iterator', () => {
		const parent = { inherited: 'value' }
		const child = Object.create(parent)
		child.own = 'ownValue'

		const entries = Array.from(objectMapEntriesIterable(child))
		expect(entries).toEqual([['own', 'ownValue']])
	})

	it('should work in for...of loops', () => {
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
	it('should create typed object from entries', () => {
		const entries: Array<['name' | 'age', string | number]> = [
			['name', 'Alice'],
			['age', 30],
		]
		const obj = objectMapFromEntries(entries)
		expect(obj).toEqual({ name: 'Alice', age: 30 })
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
	it('should filter entries and optimize unchanged objects', () => {
		const scores = { alice: 85, bob: 92, charlie: 78 }
		const passing = filterEntries(scores, (name, score) => score >= 80)
		expect(passing).toEqual({ alice: 85, bob: 92 })

		// Optimization: return same reference when no changes
		const unchanged = filterEntries(scores, () => true)
		expect(unchanged).toBe(scores)
	})

	it('should pass key and value to predicate', () => {
		const obj = { prefix_a: 1, other_b: 2, prefix_c: 3 }
		const result = filterEntries(obj, (key, value) => key.startsWith('prefix_') && value > 1)
		expect(result).toEqual({ prefix_c: 3 })
	})
})

describe('mapObjectMapValues', () => {
	it('should map values with key and value access', () => {
		const obj = { a: 1, b: 2, c: 3 }
		const result = mapObjectMapValues(obj, (key, value) => `${key}:${value}`)
		expect(result).toEqual({ a: 'a:1', b: 'b:2', c: 'c:3' })
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
	it('should compare shallow equality correctly', () => {
		const a = { x: 1, y: 2 }
		const b = { x: 1, y: 2 }
		const c = { x: 1, y: 3 }
		const d = { x: 1, z: 2 }

		expect(areObjectsShallowEqual(a, a)).toBe(true) // Same reference
		expect(areObjectsShallowEqual(a, b)).toBe(true) // Same values
		expect(areObjectsShallowEqual(a, c)).toBe(false) // Different values
		expect(areObjectsShallowEqual(a, d as any)).toBe(false) // Different keys
	})

	it('should use Object.is for value comparison', () => {
		expect(areObjectsShallowEqual({ x: NaN }, { x: NaN })).toBe(true)
		expect(areObjectsShallowEqual({ x: -0 }, { x: +0 })).toBe(false)
	})
})

describe('groupBy', () => {
	it('should group items by key selector function', () => {
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

	it('should accumulate duplicate keys', () => {
		const items = ['apple', 'apricot', 'banana']
		const result = groupBy(items, (item) => item.charAt(0))
		expect(result).toEqual({ a: ['apple', 'apricot'], b: ['banana'] })
	})
})

describe('omit', () => {
	it('should create new object without specified keys', () => {
		const user = { id: '123', name: 'Alice', password: 'secret', email: 'alice@example.com' }
		const publicUser = omit(user, ['password'])
		expect(publicUser).toEqual({ id: '123', name: 'Alice', email: 'alice@example.com' })
		expect(publicUser).not.toBe(user)
	})

	it('should handle multiple keys and non-existent keys', () => {
		const obj = { a: 1, b: 2, c: 3 }
		const result = omit(obj, ['b', 'nonexistent'])
		expect(result).toEqual({ a: 1, c: 3 })
	})
})

describe('getChangedKeys', () => {
	it('should identify changed keys using Object.is', () => {
		const before = { name: 'Alice', age: 25, city: 'NYC' }
		const after = { name: 'Alice', age: 26, city: 'NYC' }
		expect(getChangedKeys(before, after)).toEqual(['age'])
	})

	it('should use Object.is comparison (NaN and zero handling)', () => {
		const before = { nan: NaN, zero: -0, normal: 1 }
		const after = { nan: NaN, zero: +0, normal: 2 }
		expect(getChangedKeys(before, after)).toEqual(['zero', 'normal'])
	})

	it('should only check keys from first object', () => {
		const before = { a: 1, b: 2 }
		const after = { a: 1, b: 2, c: 3 }
		expect(getChangedKeys(before, after)).toEqual([])
	})
})

describe('isEqualAllowingForFloatingPointErrors', () => {
	it('should handle floating point precision errors', () => {
		const a = { x: 0.1 + 0.2 } // 0.30000000000000004
		const b = { x: 0.3 }
		expect(isEqualAllowingForFloatingPointErrors(a, b)).toBe(true)
	})

	it('should work with custom threshold and reject large differences', () => {
		const a = { x: 0.1 }
		const b = { x: 0.15 }
		expect(isEqualAllowingForFloatingPointErrors(a, b, 0.1)).toBe(true)
		expect(isEqualAllowingForFloatingPointErrors(a, b, 0.01)).toBe(false)
		expect(isEqualAllowingForFloatingPointErrors({ x: 0.1 }, { x: 0.2 })).toBe(false)
	})

	it('should handle deep objects and arrays with mixed types', () => {
		const a = { user: 'Alice', score: 0.1 + 0.2, values: [1.0000001, 'test'] }
		const b = { user: 'Alice', score: 0.3, values: [1.0000002, 'test'] }
		expect(isEqualAllowingForFloatingPointErrors(a, b)).toBe(true)

		// Different structure should fail
		expect(isEqualAllowingForFloatingPointErrors({ x: 0.3 }, { y: 0.3 })).toBe(false)
	})
})
