import { STRUCTURED_CLONE_OBJECT_PROTOTYPE } from '@tldraw/utils'
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

		it('should return arrays unchanged in production mode', () => {
			const arr = [1, 2, { nested: 'value' }]
			const result = devFreeze(arr)

			expect(result).toBe(arr) // Same reference
			expect(Object.isFrozen(result)).toBe(false)
			expect(Object.isFrozen(result[2])).toBe(false)
		})

		it('should return primitives unchanged in production mode', () => {
			// In production mode, the function returns early without prototype validation
			expect(devFreeze('string')).toBe('string')
			expect(devFreeze(42)).toBe(42)
			expect(devFreeze(true)).toBe(true)
			expect(devFreeze(null)).toBe(null)
			expect(devFreeze(undefined)).toBe(undefined)
		})

		it('should not validate prototypes in production mode', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			// Create object with custom prototype that would normally throw
			class CustomClass {
				value = 42
			}
			const obj = new CustomClass()

			expect(() => devFreeze(obj)).not.toThrow()
			expect(consoleSpy).not.toHaveBeenCalled()
		})
	})

	describe('development mode behavior', () => {
		beforeEach(() => {
			// Mock development environment
			vi.stubGlobal('process', { env: { NODE_ENV: 'development' } })
		})

		describe('object freezing', () => {
			it('should freeze simple objects', () => {
				const obj = { a: 1, b: 'test' }
				const result = devFreeze(obj)

				expect(result).toBe(obj) // Same reference
				expect(Object.isFrozen(result)).toBe(true)
			})

			it('should recursively freeze nested objects', () => {
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

				expect(Object.isFrozen(result)).toBe(true)
				expect(Object.isFrozen(result.b)).toBe(true)
				expect(Object.isFrozen(result.b.d)).toBe(true)
				expect(Object.isFrozen(result.f)).toBe(true)
				expect(Object.isFrozen(result.f[1])).toBe(true)
			})

			it('should handle objects with null values', () => {
				const obj = { a: null, b: { c: null } }
				const result = devFreeze(obj)

				expect(Object.isFrozen(result)).toBe(true)
				expect(Object.isFrozen(result.b)).toBe(true)
				expect(result.a).toBe(null)
				expect(result.b.c).toBe(null)
			})

			it('should handle objects with undefined values', () => {
				const obj = { a: undefined, b: { c: undefined } }
				const result = devFreeze(obj)

				expect(Object.isFrozen(result)).toBe(true)
				expect(Object.isFrozen(result.b)).toBe(true)
				expect(result.a).toBe(undefined)
				expect(result.b.c).toBe(undefined)
			})

			it('should cause stack overflow with circular references (known limitation)', () => {
				const obj: any = { a: 1 }
				obj.self = obj
				obj.nested = { parent: obj }

				// The current implementation doesn't handle circular references
				expect(() => devFreeze(obj)).toThrow('Maximum call stack size exceeded')
			})

			it('should freeze arrays and their contents', () => {
				const arr = [1, 'string', { nested: true }, [2, { deep: 'value' }]]
				const result = devFreeze(arr)

				expect(Object.isFrozen(result)).toBe(true)
				expect(Object.isFrozen(result[2])).toBe(true)
				expect(Object.isFrozen(result[3])).toBe(true)
				expect(Object.isFrozen((result[3] as any)[1])).toBe(true)
			})

			it('should reject all primitives (including null/undefined)', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

				// Strings have String.prototype, which is not in the allowed list
				expect(() => devFreeze('string')).toThrow('cannot include non-js data in a record')
				expect(consoleSpy).toHaveBeenCalledWith('cannot include non-js data in a record', 'string')

				// Numbers have Number.prototype
				expect(() => devFreeze(42)).toThrow('cannot include non-js data in a record')
				expect(consoleSpy).toHaveBeenCalledWith('cannot include non-js data in a record', 42)

				// Booleans have Boolean.prototype
				expect(() => devFreeze(true)).toThrow('cannot include non-js data in a record')
				expect(consoleSpy).toHaveBeenCalledWith('cannot include non-js data in a record', true)

				// null and undefined cause TypeError when Object.getPrototypeOf is called
				expect(() => devFreeze(null)).toThrow('Cannot convert undefined or null to object')
				expect(() => devFreeze(undefined)).toThrow('Cannot convert undefined or null to object')
			})
		})

		describe('prototype validation', () => {
			it('should allow objects with Object.prototype', () => {
				const obj = { a: 1 }

				expect(() => devFreeze(obj)).not.toThrow()
				expect(Object.isFrozen(obj)).toBe(true)
			})

			it('should allow objects with null prototype', () => {
				const obj = Object.create(null)
				obj.a = 1

				expect(() => devFreeze(obj)).not.toThrow()
				expect(Object.isFrozen(obj)).toBe(true)
			})

			it('should allow arrays', () => {
				const arr = [1, 2, 3]

				expect(() => devFreeze(arr)).not.toThrow()
				expect(Object.isFrozen(arr)).toBe(true)
			})

			it('should allow objects with STRUCTURED_CLONE_OBJECT_PROTOTYPE', () => {
				const cloned = structuredClone({ a: 1 })

				expect(() => devFreeze(cloned)).not.toThrow()
				expect(Object.isFrozen(cloned)).toBe(true)
			})

			it('should reject objects with custom prototypes', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

				class CustomClass {
					value = 42
				}
				const obj = new CustomClass()

				expect(() => devFreeze(obj)).toThrow('cannot include non-js data in a record')
				expect(consoleSpy).toHaveBeenCalledWith('cannot include non-js data in a record', obj)
			})

			it('should reject Date objects', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const date = new Date()

				expect(() => devFreeze(date)).toThrow('cannot include non-js data in a record')
				expect(consoleSpy).toHaveBeenCalledWith('cannot include non-js data in a record', date)
			})

			it('should reject RegExp objects', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const regex = /test/

				expect(() => devFreeze(regex)).toThrow('cannot include non-js data in a record')
				expect(consoleSpy).toHaveBeenCalledWith('cannot include non-js data in a record', regex)
			})

			it('should reject Map objects', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const map = new Map()

				expect(() => devFreeze(map)).toThrow('cannot include non-js data in a record')
				expect(consoleSpy).toHaveBeenCalledWith('cannot include non-js data in a record', map)
			})

			it('should reject Set objects', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
				const set = new Set()

				expect(() => devFreeze(set)).toThrow('cannot include non-js data in a record')
				expect(consoleSpy).toHaveBeenCalledWith('cannot include non-js data in a record', set)
			})

			it('should validate nested objects with invalid prototypes', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

				const obj = {
					valid: { a: 1 },
					invalid: new Date(),
				}

				expect(() => devFreeze(obj)).toThrow('cannot include non-js data in a record')
				expect(consoleSpy).toHaveBeenCalledWith(
					'cannot include non-js data in a record',
					obj.invalid
				)
			})

			it('should validate objects in arrays', () => {
				const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

				const arr = [
					{ valid: true },
					new Date(), // Invalid
				]

				expect(() => devFreeze(arr)).toThrow('cannot include non-js data in a record')
				expect(consoleSpy).toHaveBeenCalledWith('cannot include non-js data in a record', arr[1])
			})
		})

		describe('edge cases', () => {
			it('should handle empty objects', () => {
				const obj = {}
				const result = devFreeze(obj)

				expect(Object.isFrozen(result)).toBe(true)
				expect(result).toBe(obj)
			})

			it('should handle empty arrays', () => {
				const arr: any[] = []
				const result = devFreeze(arr)

				expect(Object.isFrozen(result)).toBe(true)
				expect(result).toBe(arr)
			})

			it('should handle objects with getters and setters', () => {
				const obj = {
					_value: 42,
					get value() {
						return this._value
					},
					set value(val: number) {
						this._value = val
					},
				}

				const result = devFreeze(obj)
				expect(Object.isFrozen(result)).toBe(true)
				expect(result.value).toBe(42)
			})

			it('should handle objects with symbol properties', () => {
				const sym = Symbol('test')
				const obj = {
					regular: 'prop',
					[sym]: 'symbol prop',
				}

				const result = devFreeze(obj)
				expect(Object.isFrozen(result)).toBe(true)
				expect(result.regular).toBe('prop')
				expect((result as any)[sym]).toBe('symbol prop')
			})

			it('should handle objects with non-enumerable properties', () => {
				const obj = { enumerable: true }
				Object.defineProperty(obj, 'nonEnumerable', {
					value: 'hidden',
					enumerable: false,
					writable: true,
					configurable: true,
				})

				const result = devFreeze(obj)
				expect(Object.isFrozen(result)).toBe(true)
				expect((result as any).nonEnumerable).toBe('hidden')
			})

			it('should handle functions as property values', () => {
				const fn = () => 42
				const obj = { callback: fn }

				const result = devFreeze(obj)
				expect(Object.isFrozen(result)).toBe(true)
				expect(result.callback).toBe(fn)
				expect(result.callback()).toBe(42)
			})

			it('should handle deeply nested structures', () => {
				// Create a deeply nested structure
				let current: any = { value: 0 }
				for (let i = 1; i < 100; i++) {
					current = { value: i, nested: current }
				}

				expect(() => devFreeze(current)).not.toThrow()
				expect(Object.isFrozen(current)).toBe(true)

				// Check a few levels deep
				expect(Object.isFrozen(current.nested)).toBe(true)
				expect(Object.isFrozen(current.nested.nested)).toBe(true)
				expect(Object.isFrozen(current.nested.nested.nested)).toBe(true)
			})

			it('should handle objects with mixed array and object properties', () => {
				const obj = {
					arr: [{ a: 1 }, { b: 2 }],
					obj: { arr: [3, 4], nested: { c: 5 } },
				}

				const result = devFreeze(obj)
				expect(Object.isFrozen(result)).toBe(true)
				expect(Object.isFrozen(result.arr)).toBe(true)
				expect(Object.isFrozen(result.arr[0])).toBe(true)
				expect(Object.isFrozen(result.arr[1])).toBe(true)
				expect(Object.isFrozen(result.obj)).toBe(true)
				expect(Object.isFrozen(result.obj.arr)).toBe(true)
				expect(Object.isFrozen(result.obj.nested)).toBe(true)
			})
		})

		describe('integration with STRUCTURED_CLONE_OBJECT_PROTOTYPE', () => {
			it('should properly validate objects created via structuredClone', () => {
				const original = { a: 1, b: { c: 2 } }
				const cloned = structuredClone(original)

				// Verify the cloned object has the expected prototype
				expect(Object.getPrototypeOf(cloned)).toBe(STRUCTURED_CLONE_OBJECT_PROTOTYPE)

				// Should not throw and should freeze properly
				expect(() => devFreeze(cloned)).not.toThrow()
				expect(Object.isFrozen(cloned)).toBe(true)
				expect(Object.isFrozen(cloned.b)).toBe(true)
			})

			it('should handle nested structuredClone objects', () => {
				const obj = {
					normal: { a: 1 },
					cloned: structuredClone({ b: 2 }),
				}

				expect(() => devFreeze(obj)).not.toThrow()
				expect(Object.isFrozen(obj)).toBe(true)
				expect(Object.isFrozen(obj.normal)).toBe(true)
				expect(Object.isFrozen(obj.cloned)).toBe(true)
			})
		})
	})

	describe('type safety', () => {
		it('should preserve type information', () => {
			interface TestRecord {
				id: string
				name: string
				metadata: {
					count: number
				}
			}

			const record: TestRecord = {
				id: 'test:1',
				name: 'Test Record',
				metadata: {
					count: 42,
				},
			}

			// Mock development environment
			vi.stubGlobal('process', { env: { NODE_ENV: 'development' } })

			const result = devFreeze(record)

			// TypeScript should maintain the type
			expect(result.id).toBe('test:1')
			expect(result.name).toBe('Test Record')
			expect(result.metadata.count).toBe(42)

			// Runtime verification that it's frozen
			expect(Object.isFrozen(result)).toBe(true)
			expect(Object.isFrozen(result.metadata)).toBe(true)
		})

		it('should work with generic types for allowed object types', () => {
			function processData<T>(data: T): T {
				vi.stubGlobal('process', { env: { NODE_ENV: 'development' } })
				return devFreeze(data)
			}

			// Test with plain objects (allowed)
			const objectData = processData({ key: 'value' })
			expect(objectData.key).toBe('value')
			expect(Object.isFrozen(objectData)).toBe(true)

			// Test with structuredClone objects (allowed)
			const clonedData = processData(structuredClone({ test: 'value' }))
			expect(clonedData.test).toBe('value')
			expect(Object.isFrozen(clonedData)).toBe(true)

			// Test with arrays (allowed)
			const arrayData = processData([1, 2, 3])
			expect(arrayData).toEqual([1, 2, 3])
			expect(Object.isFrozen(arrayData)).toBe(true)
		})
	})

	// Clean up after all tests
	afterAll(() => {
		// Restore original environment
		vi.stubGlobal('process', { env: { NODE_ENV: originalEnv } })
	})
})
