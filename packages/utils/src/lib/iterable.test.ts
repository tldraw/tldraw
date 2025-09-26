import { describe, expect, it } from 'vitest'
import { getFirstFromIterable } from './iterable'

describe('getFirstFromIterable', () => {
	it('should get first item from Set', () => {
		const set = new Set([1, 2, 3])
		expect(getFirstFromIterable(set)).toBe(1)
	})

	it('should get first value from Map', () => {
		const map = new Map([
			['a', 1],
			['b', 2],
		])
		expect(getFirstFromIterable(map)).toBe(1)
	})

	it('should preserve insertion order', () => {
		const set = new Set()
		set.add('third')
		set.add('first')
		set.add('second')
		expect(getFirstFromIterable(set)).toBe('third')
	})
})
