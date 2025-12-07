import { describe, expect, it } from 'vitest'
import {
	isNativeStructuredClone,
	STRUCTURED_CLONE_OBJECT_PROTOTYPE,
	structuredClone,
} from './value'

describe('value utilities', () => {
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
	})

	describe('STRUCTURED_CLONE_OBJECT_PROTOTYPE', () => {
		it('should be the prototype of objects created by structuredClone', () => {
			const obj = {}
			const cloned = structuredClone(obj)

			expect(Object.getPrototypeOf(cloned)).toBe(STRUCTURED_CLONE_OBJECT_PROTOTYPE)
		})
	})
})
