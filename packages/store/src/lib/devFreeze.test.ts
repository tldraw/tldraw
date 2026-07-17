import { beforeEach, describe, expect, it, MockedFunction, vi } from 'vitest'
import { devFreeze } from './devFreeze'
import { isDev } from './isDev'

// Tests for SPEC.md §24 (devFreeze).
// Rule IDs like [DF1] in test names refer to that document.

vi.mock('./isDev', () => ({
	isDev: vi.fn(() => true),
}))

describe('devFreeze in dev/test builds (DF)', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		;(isDev as MockedFunction<typeof isDev>).mockReturnValue(true)
	})

	it('[DF1] recursively freezes the object and returns it', () => {
		const obj = {
			a: 1,
			b: { c: 2, d: { e: 3 } },
			f: [1, { g: 4 }],
		}

		const result = devFreeze(obj)

		expect(result).toBe(obj)
		expect(Object.isFrozen(result)).toBe(true)
		expect(Object.isFrozen(result.b)).toBe(true)
		expect(Object.isFrozen(result.b.d)).toBe(true)
		expect(Object.isFrozen(result.f)).toBe(true)
		expect(Object.isFrozen(result.f[1])).toBe(true)
	})

	it('[DF1] mutating a frozen object afterwards throws in strict mode', () => {
		'use strict'
		const obj = devFreeze({ a: 1 })
		expect(() => {
			;(obj as any).a = 2
		}).toThrow()
	})

	it('[DF2] allows arrays, plain objects, null-prototype objects, and structured-clone objects', () => {
		const obj = { a: 1 }
		expect(() => devFreeze(obj)).not.toThrow()
		expect(Object.isFrozen(obj)).toBe(true)

		const nullProtoObj = Object.create(null)
		nullProtoObj.a = 1
		expect(() => devFreeze(nullProtoObj)).not.toThrow()
		expect(Object.isFrozen(nullProtoObj)).toBe(true)

		const arr = [1, 2, 3]
		expect(() => devFreeze(arr)).not.toThrow()
		expect(Object.isFrozen(arr)).toBe(true)

		const cloned = structuredClone({ a: 1 })
		expect(() => devFreeze(cloned)).not.toThrow()
		expect(Object.isFrozen(cloned)).toBe(true)
	})

	it('[DF2] throws for objects with non-plain prototypes', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		class CustomClass {
			value = 42
		}
		expect(() => devFreeze(new CustomClass())).toThrow('cannot include non-js data in a record')
		expect(() => devFreeze(new Date())).toThrow('cannot include non-js data in a record')
		expect(() => devFreeze(/regex/)).toThrow('cannot include non-js data in a record')
		expect(() => devFreeze(new Map())).toThrow('cannot include non-js data in a record')
		expect(() => devFreeze(new Set())).toThrow('cannot include non-js data in a record')

		// also when nested inside an otherwise valid object
		expect(() => devFreeze({ valid: { a: 1 }, invalid: new Date() })).toThrow(
			'cannot include non-js data in a record'
		)
	})

	it('[DF2] throws for primitives, whose prototypes are not plain', () => {
		expect(() => devFreeze('string')).toThrow('cannot include non-js data in a record')
		expect(() => devFreeze(42)).toThrow('cannot include non-js data in a record')
		expect(() => devFreeze(true)).toThrow('cannot include non-js data in a record')
	})
})

describe('devFreeze in production builds (DF)', () => {
	beforeEach(() => {
		vi.restoreAllMocks()
		;(isDev as MockedFunction<typeof isDev>).mockReturnValue(false)
	})

	it('[DF3] returns the object unchanged without freezing', () => {
		const obj = { a: 1, b: { c: 2 } }
		const result = devFreeze(obj)

		expect(result).toBe(obj)
		expect(Object.isFrozen(result)).toBe(false)
		expect(Object.isFrozen(result.b)).toBe(false)
	})

	it('[DF3] does not validate prototypes', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

		class CustomClass {
			value = 42
		}
		expect(() => devFreeze(new CustomClass())).not.toThrow()
		expect(consoleSpy).not.toHaveBeenCalled()
	})
})
