import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { devFreeze } from './devFreeze'

// Mock process.env for testing
const originalEnv = process.env.NODE_ENV

describe('devFreeze', () => {
	beforeEach(() => {
		// Reset any mocks
		vi.restoreAllMocks()
	})

	describe('production mode behavior', () => {
		beforeEach(() => {
			// Mock production environment
			vi.stubGlobal('process', { env: { NODE_ENV: 'production' } })
		})

		it('should return objects unchanged in production mode', () => {
			const obj = { a: 1, b: { c: 2 } }
			const result = devFreeze(obj)

			expect(result).toBe(obj) // Same reference
			expect(Object.isFrozen(result)).toBe(false)
			expect(Object.isFrozen(result.b)).toBe(false)
		})

		it('should not validate prototypes in production mode', () => {
			const _consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			// Create object with custom prototype that would normally throw
			class CustomClass {
				value = 42
			}
			const obj = new CustomClass()

			expect(() => devFreeze(obj)).not.toThrow()
			expect(_consoleSpy).not.toHaveBeenCalled()
		})
	})

	describe('development mode behavior', () => {
		beforeEach(() => {
			// Mock development environment
			vi.stubGlobal('process', { env: { NODE_ENV: 'development' } })
		})

		it('should freeze objects recursively', () => {
			const obj = {
				a: 1,
				b: {
					c: 2,
					d: {
						e: 3,
					},
				},
				f: [1, { g: 4 }],
			}

			const result = devFreeze(obj)

			expect(result).toBe(obj) // Same reference
			expect(Object.isFrozen(result)).toBe(true)
			expect(Object.isFrozen(result.b)).toBe(true)
			expect(Object.isFrozen(result.b.d)).toBe(true)
			expect(Object.isFrozen(result.f)).toBe(true)
			expect(Object.isFrozen(result.f[1])).toBe(true)
		})

		it('should reject primitives', () => {
			const _consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			// Primitives have built-in prototypes that aren't allowed
			expect(() => devFreeze('string')).toThrow('cannot include non-js data in a record')
			expect(() => devFreeze(42)).toThrow('cannot include non-js data in a record')
			expect(() => devFreeze(true)).toThrow('cannot include non-js data in a record')

			// null and undefined cause TypeError when Object.getPrototypeOf is called
			expect(() => devFreeze(null)).toThrow('Cannot convert undefined or null to object')
			expect(() => devFreeze(undefined)).toThrow('Cannot convert undefined or null to object')
		})

		it('should allow valid prototypes', () => {
			// Object.prototype
			const obj = { a: 1 }
			expect(() => devFreeze(obj)).not.toThrow()
			expect(Object.isFrozen(obj)).toBe(true)

			// null prototype
			const nullProtoObj = Object.create(null)
			nullProtoObj.a = 1
			expect(() => devFreeze(nullProtoObj)).not.toThrow()
			expect(Object.isFrozen(nullProtoObj)).toBe(true)

			// Arrays
			const arr = [1, 2, 3]
			expect(() => devFreeze(arr)).not.toThrow()
			expect(Object.isFrozen(arr)).toBe(true)

			// structuredClone objects
			const cloned = structuredClone({ a: 1 })
			expect(() => devFreeze(cloned)).not.toThrow()
			expect(Object.isFrozen(cloned)).toBe(true)
		})

		it('should reject invalid prototypes', () => {
			const _consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			// Custom class instances
			class CustomClass {
				value = 42
			}
			expect(() => devFreeze(new CustomClass())).toThrow('cannot include non-js data in a record')

			// Built-in object types
			expect(() => devFreeze(new Date())).toThrow('cannot include non-js data in a record')
			expect(() => devFreeze(/regex/)).toThrow('cannot include non-js data in a record')
			expect(() => devFreeze(new Map())).toThrow('cannot include non-js data in a record')
			expect(() => devFreeze(new Set())).toThrow('cannot include non-js data in a record')

			// Nested invalid objects
			const objWithInvalidNested = {
				valid: { a: 1 },
				invalid: new Date(),
			}
			expect(() => devFreeze(objWithInvalidNested)).toThrow(
				'cannot include non-js data in a record'
			)
		})
	})

	// Clean up after all tests
	afterAll(() => {
		// Restore original environment
		vi.stubGlobal('process', { env: { NODE_ENV: originalEnv } })
	})
})
