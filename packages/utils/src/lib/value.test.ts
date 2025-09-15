import { describe, expect, it } from 'vitest'
import {
	isDefined,
	isNativeStructuredClone,
	isNonNull,
	isNonNullish,
	STRUCTURED_CLONE_OBJECT_PROTOTYPE,
	structuredClone,
} from './value'

describe('value utilities', () => {
	describe('isDefined', () => {
		it('should return true for defined values', () => {
			expect(isDefined('string')).toBe(true)
			expect(isDefined(0)).toBe(true)
			expect(isDefined(false)).toBe(true)
			expect(isDefined(null)).toBe(true)
			expect(isDefined({})).toBe(true)
			expect(isDefined([])).toBe(true)
			expect(isDefined('')).toBe(true)
		})

		it('should return false for undefined', () => {
			expect(isDefined(undefined)).toBe(false)
		})

		it('should work as array filter', () => {
			const values = [1, undefined, 2, undefined, 3, 0, false, '']
			const result = values.filter(isDefined)

			expect(result).toEqual([1, 2, 3, 0, false, ''])
		})

		it('should work with mixed types', () => {
			const values: (string | number | undefined)[] = ['a', 1, undefined, 'b', 2]
			const result = values.filter(isDefined)

			expect(result).toEqual(['a', 1, 'b', 2])
		})

		it('should handle objects and arrays', () => {
			const obj = {}
			const arr: number[] = []

			expect(isDefined(obj)).toBe(true)
			expect(isDefined(arr)).toBe(true)
		})

		it('should provide proper type narrowing', () => {
			const maybeString: string | undefined = 'test'

			if (isDefined(maybeString)) {
				// This should not cause TypeScript errors
				expect(maybeString.length).toBe(4)
				expect(maybeString.toUpperCase()).toBe('TEST')
			}
		})
	})

	describe('isNonNull', () => {
		it('should return true for non-null values', () => {
			expect(isNonNull('string')).toBe(true)
			expect(isNonNull(0)).toBe(true)
			expect(isNonNull(false)).toBe(true)
			expect(isNonNull(undefined)).toBe(true)
			expect(isNonNull({})).toBe(true)
			expect(isNonNull([])).toBe(true)
			expect(isNonNull('')).toBe(true)
		})

		it('should return false for null', () => {
			expect(isNonNull(null)).toBe(false)
		})

		it('should work as array filter', () => {
			const values = ['a', null, 'b', null, 'c', '', 0, false]
			const result = values.filter(isNonNull)

			expect(result).toEqual(['a', 'b', 'c', '', 0, false])
		})

		it('should work with mixed types', () => {
			const values: (string | number | null)[] = ['a', 1, null, 'b', 2, null]
			const result = values.filter(isNonNull)

			expect(result).toEqual(['a', 1, 'b', 2])
		})

		it('should handle objects and arrays', () => {
			const obj = {}
			const arr: number[] = []

			expect(isNonNull(obj)).toBe(true)
			expect(isNonNull(arr)).toBe(true)
		})

		it('should provide proper type narrowing', () => {
			const maybeString: string | null = 'test'

			if (isNonNull(maybeString)) {
				// This should not cause TypeScript errors
				expect(maybeString.length).toBe(4)
				expect(maybeString.charAt(0)).toBe('t')
			}
		})
	})

	describe('isNonNullish', () => {
		it('should return true for non-nullish values', () => {
			expect(isNonNullish('string')).toBe(true)
			expect(isNonNullish(0)).toBe(true)
			expect(isNonNullish(false)).toBe(true)
			expect(isNonNullish({})).toBe(true)
			expect(isNonNullish([])).toBe(true)
			expect(isNonNullish('')).toBe(true)
		})

		it('should return false for null and undefined', () => {
			expect(isNonNullish(null)).toBe(false)
			expect(isNonNullish(undefined)).toBe(false)
		})

		it('should work as array filter', () => {
			const values = ['hello', null, 'world', undefined, '!', '', 0, false]
			const result = values.filter(isNonNullish)

			expect(result).toEqual(['hello', 'world', '!', '', 0, false])
		})

		it('should work with mixed types', () => {
			const values: (string | number | null | undefined)[] = ['a', 1, null, undefined, 'b', 2]
			const result = values.filter(isNonNullish)

			expect(result).toEqual(['a', 1, 'b', 2])
		})

		it('should handle objects and arrays', () => {
			const obj = {}
			const arr: number[] = []

			expect(isNonNullish(obj)).toBe(true)
			expect(isNonNullish(arr)).toBe(true)
		})

		it('should provide proper type narrowing', () => {
			const maybeString: string | null | undefined = 'test'

			if (isNonNullish(maybeString)) {
				// This should not cause TypeScript errors
				expect(maybeString.length).toBe(4)
				expect(maybeString.charAt(0)).toBe('t')
			}
		})
	})

	describe('structuredClone', () => {
		it('should create deep copies of objects', () => {
			const original = { a: 1, b: { c: 2 } }
			const copy = structuredClone(original)

			expect(copy).toEqual(original)
			expect(copy).not.toBe(original)
			expect(copy.b).not.toBe(original.b)

			// Modifying copy should not affect original
			copy.b.c = 3
			expect(original.b.c).toBe(2)
			expect(copy.b.c).toBe(3)
		})

		it('should handle primitive values', () => {
			expect(structuredClone(42)).toBe(42)
			expect(structuredClone('hello')).toBe('hello')
			expect(structuredClone(true)).toBe(true)
			expect(structuredClone(null)).toBe(null)
			expect(structuredClone(undefined)).toBe(undefined)
		})

		it('should handle arrays', () => {
			const original = [1, [2, 3], { a: 4 }]
			const copy = structuredClone(original)

			expect(copy).toEqual(original)
			expect(copy).not.toBe(original)
			expect(copy[1]).not.toBe(original[1])
			expect(copy[2]).not.toBe(original[2])

			// Modifying copy should not affect original
			;(copy[1] as number[]).push(5)
			;(copy[2] as any).a = 99

			expect(original[1]).toEqual([2, 3])
			expect((original[2] as any).a).toBe(4)
		})

		it('should handle nested structures', () => {
			const original = {
				level1: {
					level2: {
						level3: {
							value: 'deep',
						},
					},
				},
			}

			const copy = structuredClone(original)

			expect(copy).toEqual(original)
			expect(copy.level1).not.toBe(original.level1)
			expect(copy.level1.level2).not.toBe(original.level1.level2)
			expect(copy.level1.level2.level3).not.toBe(original.level1.level2.level3)

			copy.level1.level2.level3.value = 'modified'
			expect(original.level1.level2.level3.value).toBe('deep')
		})

		it('should handle dates', () => {
			const date = new Date('2023-01-01')
			const copy = structuredClone(date)

			expect(copy).toEqual(date)
			expect(copy).not.toBe(date)
			expect(copy instanceof Date).toBe(true)
		})

		it('should handle complex objects with dates', () => {
			const original = {
				created: new Date('2023-01-01'),
				data: { value: 42 },
			}

			const copy = structuredClone(original)

			expect(copy.created).toEqual(original.created)
			expect(copy.created).not.toBe(original.created)
			expect(copy.created instanceof Date).toBe(true)
		})

		it('should handle empty objects and arrays', () => {
			const emptyObj = {}
			const emptyArr: any[] = []

			const copyObj = structuredClone(emptyObj)
			const copyArr = structuredClone(emptyArr)

			expect(copyObj).toEqual({})
			expect(copyArr).toEqual([])
			expect(copyObj).not.toBe(emptyObj)
			expect(copyArr).not.toBe(emptyArr)
		})

		it('should handle circular references if native structuredClone is available', () => {
			if (isNativeStructuredClone) {
				const obj: any = { a: 1 }
				obj.self = obj

				const copy = structuredClone(obj)

				expect(copy.a).toBe(1)
				expect(copy.self).toBe(copy)
				expect(copy).not.toBe(obj)
			}
		})

		it('should handle objects with special properties', () => {
			const obj = {
				regular: 'value',
				number: 42,
				array: [1, 2, 3],
				nested: { deep: 'value' },
			}

			const copy = structuredClone(obj)

			expect(copy).toEqual(obj)
			expect(copy).not.toBe(obj)
			expect(copy.array).not.toBe(obj.array)
			expect(copy.nested).not.toBe(obj.nested)
		})

		it('should preserve property descriptors when using JSON fallback', () => {
			// This test verifies the behavior with the JSON fallback
			const obj = { a: 1, b: 2 }
			const copy = structuredClone(obj)

			expect(Object.getOwnPropertyNames(copy)).toEqual(['a', 'b'])
			expect(copy.a).toBe(1)
			expect(copy.b).toBe(2)
		})

		it('should handle falsy values correctly', () => {
			expect(structuredClone(0)).toBe(0)
			expect(structuredClone('')).toBe('')
			expect(structuredClone(false)).toBe(false)
		})

		it('should handle arrays with mixed types', () => {
			const original = [1, 'string', { obj: true }, [1, 2], null, undefined]
			const copy = structuredClone(original)

			expect(copy).toEqual(original)
			expect(copy).not.toBe(original)
			expect(copy[2]).not.toBe(original[2])
			expect(copy[3]).not.toBe(original[3])
		})
	})

	describe('isNativeStructuredClone', () => {
		it('should be a boolean', () => {
			expect(typeof isNativeStructuredClone).toBe('boolean')
		})

		it('should indicate whether native structuredClone is available', () => {
			const hasNative =
				(typeof globalThis !== 'undefined' && 'structuredClone' in globalThis) ||
				(typeof global !== 'undefined' && 'structuredClone' in global) ||
				(typeof window !== 'undefined' && 'structuredClone' in window)

			expect(isNativeStructuredClone).toBe(hasNative)
		})
	})

	describe('STRUCTURED_CLONE_OBJECT_PROTOTYPE', () => {
		it('should be the prototype of objects created by structuredClone', () => {
			const obj = {}
			const cloned = structuredClone(obj)

			expect(Object.getPrototypeOf(cloned)).toBe(STRUCTURED_CLONE_OBJECT_PROTOTYPE)
		})

		it('should be an object prototype', () => {
			expect(typeof STRUCTURED_CLONE_OBJECT_PROTOTYPE).toBe('object')
			expect(STRUCTURED_CLONE_OBJECT_PROTOTYPE).not.toBe(null)
		})

		it('should have Object.prototype methods', () => {
			// The prototype should have standard Object methods
			expect('toString' in STRUCTURED_CLONE_OBJECT_PROTOTYPE).toBe(true)
			expect('hasOwnProperty' in STRUCTURED_CLONE_OBJECT_PROTOTYPE).toBe(true)
		})
	})

	describe('integration tests', () => {
		it('should work together for data processing pipelines', () => {
			const rawData: (string | null | undefined)[] = ['hello', null, 'world', undefined, '', 'test']

			// Filter out nullish values, then clone the result
			const cleanData = rawData.filter(isNonNullish)
			const clonedData = structuredClone(cleanData)

			expect(clonedData).toEqual(['hello', 'world', '', 'test'])
			expect(clonedData).not.toBe(cleanData)

			// Verify original data is unchanged
			clonedData.push('modified')
			expect(cleanData).not.toContain('modified')
		})

		it('should work with complex filtering scenarios', () => {
			interface DataItem {
				id: number
				name?: string
				value: number | null
				metadata?: { tags: string[] } | null
			}

			const items: DataItem[] = [
				{ id: 1, name: 'item1', value: 100, metadata: { tags: ['a', 'b'] } },
				{ id: 2, value: null, metadata: null },
				{ id: 3, name: 'item3', value: 200, metadata: { tags: [] } },
				{ id: 4, name: undefined, value: 300, metadata: undefined },
			]

			// Filter items with defined names and non-null values
			const validItems = items.filter((item) => isDefined(item.name) && isNonNull(item.value))

			expect(validItems).toHaveLength(2)
			expect(validItems[0].name).toBe('item1')
			expect(validItems[1].name).toBe('item3')

			// Clone the valid items for safe manipulation
			const clonedItems = structuredClone(validItems)
			clonedItems[0].name = 'modified'

			expect(validItems[0].name).toBe('item1') // Original unchanged
			expect(clonedItems[0].name).toBe('modified')
		})

		it('should handle edge cases in filtering and cloning', () => {
			const edgeCases = [0, '', false, null, undefined, {}, [], { empty: undefined }, { zero: 0 }]

			const definedValues = edgeCases.filter(isDefined)
			const nonNullValues = edgeCases.filter(isNonNull)
			const nonNullishValues = edgeCases.filter(isNonNullish)

			expect(definedValues).toHaveLength(8) // All except undefined
			expect(nonNullValues).toHaveLength(8) // All except null
			expect(nonNullishValues).toHaveLength(7) // All except null and undefined

			// Clone each filtered array
			const clonedDefined = structuredClone(definedValues)
			const clonedNonNull = structuredClone(nonNullValues)
			const clonedNonNullish = structuredClone(nonNullishValues)

			expect(clonedDefined).toEqual(definedValues)
			expect(clonedNonNull).toEqual(nonNullValues)
			expect(clonedNonNullish).toEqual(nonNullishValues)
		})
	})

	describe('type safety verification', () => {
		it('should provide proper type narrowing in conditional blocks', () => {
			// This test verifies that TypeScript compilation works correctly
			const maybeValue: string | null | undefined = 'test'

			// Type narrowing with isDefined
			if (isDefined(maybeValue)) {
				// Should not cause TypeScript errors
				expect(maybeValue?.length).toBeDefined()
			}

			// Type narrowing with isNonNull
			if (isNonNull(maybeValue)) {
				// Should not cause TypeScript errors
				expect(maybeValue?.length).toBeDefined()
			}

			// Type narrowing with isNonNullish
			if (isNonNullish(maybeValue)) {
				// Should not cause TypeScript errors
				expect(maybeValue.length).toBe(4)
			}
		})

		it('should work with function parameters', () => {
			function processString(str: string | null | undefined): string {
				if (isNonNullish(str)) {
					return str.toUpperCase()
				}
				return 'DEFAULT'
			}

			expect(processString('hello')).toBe('HELLO')
			expect(processString(null)).toBe('DEFAULT')
			expect(processString(undefined)).toBe('DEFAULT')
		})

		it('should work with array methods', () => {
			const items: (number | null | undefined)[] = [1, null, 2, undefined, 3]

			const definedNumbers = items.filter(isDefined)
			const nonNullNumbers = items.filter(isNonNull)
			const validNumbers = items.filter(isNonNullish)

			// These should all be typed as number[]
			expect(definedNumbers.every((n) => typeof n === 'number' || n === null)).toBe(true)
			expect(nonNullNumbers.every((n) => typeof n === 'number' || n === undefined)).toBe(true)
			expect(validNumbers.every((n) => typeof n === 'number')).toBe(true)
		})
	})
})
