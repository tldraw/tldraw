import { describe, expect, it } from 'vitest'
import { getFirstFromIterable } from './iterable'

describe('getFirstFromIterable', () => {
	it('should get first item from Set with numbers', () => {
		const set = new Set([1, 2, 3])
		expect(getFirstFromIterable(set)).toBe(1)
	})

	it('should get first item from Set with strings', () => {
		const set = new Set(['a', 'b', 'c'])
		expect(getFirstFromIterable(set)).toBe('a')
	})

	it('should get first item from Set with objects', () => {
		const obj1 = { id: 1 }
		const obj2 = { id: 2 }
		const set = new Set([obj1, obj2])
		expect(getFirstFromIterable(set)).toBe(obj1)
	})

	it('should get first value from Map', () => {
		const map = new Map([
			['a', 1],
			['b', 2],
		])
		expect(getFirstFromIterable(map)).toBe(1)
	})

	it('should get first value from Map with object values', () => {
		const value1 = { name: 'Alice' }
		const value2 = { name: 'Bob' }
		const map = new Map([
			['first', value1],
			['second', value2],
		])
		expect(getFirstFromIterable(map)).toBe(value1)
	})

	it('should handle Set with single item', () => {
		const set = new Set(['only'])
		expect(getFirstFromIterable(set)).toBe('only')
	})

	it('should handle Map with single item', () => {
		const map = new Map([['key', 'value']])
		expect(getFirstFromIterable(map)).toBe('value')
	})

	it('should preserve insertion order for Set', () => {
		const set = new Set()
		set.add('third')
		set.add('first')
		set.add('second')
		expect(getFirstFromIterable(set)).toBe('third')
	})

	it('should preserve insertion order for Map', () => {
		const map = new Map()
		map.set('c', 3)
		map.set('a', 1)
		map.set('b', 2)
		expect(getFirstFromIterable(map)).toBe(3)
	})

	it('should work with mixed type Map values', () => {
		const map = new Map<string, unknown>([
			['string', 'value'],
			['number', 42],
			['boolean', true],
		])
		expect(getFirstFromIterable(map)).toBe('value')
	})

	it('should handle falsy values in Set', () => {
		const set = new Set([0, 1, 2])
		expect(getFirstFromIterable(set)).toBe(0)

		const set2 = new Set(['', 'a', 'b'])
		expect(getFirstFromIterable(set2)).toBe('')

		const set3 = new Set([false, true])
		expect(getFirstFromIterable(set3)).toBe(false)
	})

	it('should handle falsy values in Map', () => {
		const map = new Map([
			['zero', 0],
			['one', 1],
		])
		expect(getFirstFromIterable(map)).toBe(0)

		const map2 = new Map([
			['empty', ''],
			['text', 'hello'],
		])
		expect(getFirstFromIterable(map2)).toBe('')

		const map3 = new Map([
			['false', false],
			['true', true],
		])
		expect(getFirstFromIterable(map3)).toBe(false)
	})

	it('should handle null and undefined values', () => {
		const setWithNull = new Set([null, 'value'])
		expect(getFirstFromIterable(setWithNull)).toBe(null)

		const setWithUndefined = new Set([undefined, 'value'])
		expect(getFirstFromIterable(setWithUndefined)).toBe(undefined)

		const mapWithNull = new Map([['key', null]])
		expect(getFirstFromIterable(mapWithNull)).toBe(null)

		const mapWithUndefined = new Map([['key', undefined]])
		expect(getFirstFromIterable(mapWithUndefined)).toBe(undefined)
	})
})
