import { describe, expect, it } from 'vitest'
import { sortById } from './sort'

describe('sortById', () => {
	describe('string ids', () => {
		it('sorts objects with string ids in ascending order', () => {
			const items = [
				{ id: 'c', name: 'Charlie' },
				{ id: 'a', name: 'Alice' },
				{ id: 'b', name: 'Bob' },
			]

			const sorted = items.sort(sortById)

			expect(sorted).toEqual([
				{ id: 'a', name: 'Alice' },
				{ id: 'b', name: 'Bob' },
				{ id: 'c', name: 'Charlie' },
			])
		})

		it('handles single character string ids', () => {
			const items = [
				{ id: 'z', value: 1 },
				{ id: 'a', value: 2 },
			]

			const sorted = items.sort(sortById)

			expect(sorted).toEqual([
				{ id: 'a', value: 2 },
				{ id: 'z', value: 1 },
			])
		})

		it('handles multi-character string ids', () => {
			const items = [
				{ id: 'zebra', type: 'animal' },
				{ id: 'apple', type: 'fruit' },
				{ id: 'banana', type: 'fruit' },
			]

			const sorted = items.sort(sortById)

			expect(sorted).toEqual([
				{ id: 'apple', type: 'fruit' },
				{ id: 'banana', type: 'fruit' },
				{ id: 'zebra', type: 'animal' },
			])
		})

		it('handles case-sensitive string comparison', () => {
			const items = [
				{ id: 'Z', value: 1 },
				{ id: 'a', value: 2 },
				{ id: 'A', value: 3 },
			]

			const sorted = items.sort(sortById)

			// Capital letters come before lowercase in ASCII
			expect(sorted).toEqual([
				{ id: 'A', value: 3 },
				{ id: 'Z', value: 1 },
				{ id: 'a', value: 2 },
			])
		})
	})

	describe('numeric ids', () => {
		it('sorts objects with numeric ids in ascending order', () => {
			const items = [
				{ id: 3, label: 'three' },
				{ id: 1, label: 'one' },
				{ id: 2, label: 'two' },
			]

			const sorted = items.sort(sortById)

			expect(sorted).toEqual([
				{ id: 1, label: 'one' },
				{ id: 2, label: 'two' },
				{ id: 3, label: 'three' },
			])
		})

		it('handles negative numbers', () => {
			const items = [
				{ id: 5, value: 'positive' },
				{ id: -3, value: 'negative' },
				{ id: 0, value: 'zero' },
			]

			const sorted = items.sort(sortById)

			expect(sorted).toEqual([
				{ id: -3, value: 'negative' },
				{ id: 0, value: 'zero' },
				{ id: 5, value: 'positive' },
			])
		})

		it('handles floating point numbers', () => {
			const items = [
				{ id: 2.5, type: 'float' },
				{ id: 1.1, type: 'float' },
				{ id: 3.7, type: 'float' },
			]

			const sorted = items.sort(sortById)

			expect(sorted).toEqual([
				{ id: 1.1, type: 'float' },
				{ id: 2.5, type: 'float' },
				{ id: 3.7, type: 'float' },
			])
		})
	})

	describe('mixed id types', () => {
		it('handles mixed string and number ids using JavaScript comparison', () => {
			const items = [
				{ id: '10', type: 'string' },
				{ id: 2, type: 'number' },
				{ id: '3', type: 'string' },
				{ id: 11, type: 'number' },
			]

			const sorted = items.sort(sortById)

			// JavaScript comparison: 2 < "10" < "3" < 11 (numbers < strings in mixed comparison)
			expect(sorted).toEqual([
				{ id: 2, type: 'number' },
				{ id: '10', type: 'string' },
				{ id: '3', type: 'string' },
				{ id: 11, type: 'number' },
			])
		})

		it('handles boolean ids', () => {
			const items = [
				{ id: true, value: 'truthy' },
				{ id: false, value: 'falsy' },
			]

			const sorted = items.sort(sortById)

			// false < true in JavaScript
			expect(sorted).toEqual([
				{ id: false, value: 'falsy' },
				{ id: true, value: 'truthy' },
			])
		})
	})

	describe('edge cases', () => {
		it('handles empty array', () => {
			const items: { id: string; name: string }[] = []
			const sorted = items.sort(sortById)
			expect(sorted).toEqual([])
		})

		it('handles single item array', () => {
			const items = [{ id: 'only', value: 42 }]
			const sorted = items.sort(sortById)
			expect(sorted).toEqual([{ id: 'only', value: 42 }])
		})

		it('handles duplicate ids', () => {
			const items = [
				{ id: 'same', index: 1 },
				{ id: 'same', index: 2 },
				{ id: 'different', index: 3 },
			]

			const sorted = items.sort(sortById)

			// When ids are equal, original order should be preserved (stable sort behavior depends on implementation)
			expect(sorted[0].id).toBe('different')
			expect(sorted[1].id).toBe('same')
			expect(sorted[2].id).toBe('same')
		})

		it('handles null and undefined ids', () => {
			const items = [
				{ id: 'string', value: 1 },
				{ id: null, value: 2 },
				{ id: undefined, value: 3 },
			]

			const sorted = items.sort(sortById)

			// null and undefined comparison: both are falsy, undefined < null < strings
			expect(sorted).toEqual([
				{ id: undefined, value: 3 },
				{ id: null, value: 2 },
				{ id: 'string', value: 1 },
			])
		})

		it('preserves object properties during sort', () => {
			const items = [
				{ id: 'b', name: 'Bob', age: 30, active: true },
				{ id: 'a', name: 'Alice', age: 25, active: false },
			]

			const sorted = items.sort(sortById)

			expect(sorted).toEqual([
				{ id: 'a', name: 'Alice', age: 25, active: false },
				{ id: 'b', name: 'Bob', age: 30, active: true },
			])
		})

		it('handles objects with additional properties', () => {
			const items = [
				{ id: 2, extra: { nested: 'value' }, arr: [1, 2, 3] },
				{ id: 1, other: 'property' },
			]

			const sorted = items.sort(sortById)

			expect(sorted).toEqual([
				{ id: 1, other: 'property' },
				{ id: 2, extra: { nested: 'value' }, arr: [1, 2, 3] },
			])
		})
	})

	describe('comparator function behavior', () => {
		it('returns 1 when first id is greater than second', () => {
			const result = sortById({ id: 'b' }, { id: 'a' })
			expect(result).toBe(1)
		})

		it('returns -1 when first id is less than second', () => {
			const result = sortById({ id: 'a' }, { id: 'b' })
			expect(result).toBe(-1)
		})

		it('returns -1 when ids are equal', () => {
			const result = sortById({ id: 'same' }, { id: 'same' })
			expect(result).toBe(-1)
		})

		it('works with objects that have additional properties beyond id', () => {
			// Both objects need to have the same type structure for TypeScript
			const obj1 = { id: 'test', data: { name: 'first', count: 1 } }
			const obj2 = { id: 'test', data: { name: 'second', count: 2 } }

			const result = sortById(obj1, obj2)
			expect(result).toBe(-1)
		})
	})
})
