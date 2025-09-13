import { describe, expect, it, vi } from 'vitest'
import { bind } from './bind'

describe('bind decorator', () => {
	describe('legacy TypeScript decorator format', () => {
		it('should bind method to class instance', () => {
			class TestClass {
				name = 'test'

				@bind
				getName() {
					return this.name
				}
			}

			const instance = new TestClass()
			const unboundMethod = instance.getName

			expect(unboundMethod()).toBe('test')
		})

		it('should maintain method binding when extracted', () => {
			class TestClass {
				value = 42

				@bind
				getValue() {
					return this.value
				}
			}

			const instance = new TestClass()
			const { getValue } = instance

			expect(getValue()).toBe(42)
		})

		it('should cache bound method on instance', () => {
			class TestClass {
				@bind
				testMethod() {
					return 'test'
				}
			}

			const instance = new TestClass()
			const firstAccess = instance.testMethod
			const secondAccess = instance.testMethod

			expect(firstAccess).toBe(secondAccess)
		})

		it('should handle methods with parameters', () => {
			class TestClass {
				multiplier = 2

				@bind
				multiply(value: number) {
					return value * this.multiplier
				}
			}

			const instance = new TestClass()
			const { multiply } = instance

			expect(multiply(5)).toBe(10)
		})

		it('should handle methods that return functions', () => {
			class TestClass {
				prefix = 'hello'

				@bind
				createGreeter() {
					return (name: string) => `${this.prefix} ${name}`
				}
			}

			const instance = new TestClass()
			const { createGreeter } = instance
			const greeter = createGreeter()

			expect(greeter('world')).toBe('hello world')
		})

		it('should work with inheritance', () => {
			class BaseClass {
				baseValue = 'base'

				@bind
				getBaseValue() {
					return this.baseValue
				}
			}

			class DerivedClass extends BaseClass {
				derivedValue = 'derived'

				@bind
				getDerivedValue() {
					return this.derivedValue
				}
			}

			const instance = new DerivedClass()
			const { getBaseValue, getDerivedValue } = instance

			expect(getBaseValue()).toBe('base')
			expect(getDerivedValue()).toBe('derived')
		})

		it('should handle async methods', async () => {
			class TestClass {
				value = 'async test'

				@bind
				async getValue() {
					return Promise.resolve(this.value)
				}
			}

			const instance = new TestClass()
			const { getValue } = instance

			await expect(getValue()).resolves.toBe('async test')
		})

		it('should throw error when decorating non-method', () => {
			// TypeScript prevents applying @bind to non-methods at compile time,
			// so we test the runtime error directly by calling bind with invalid descriptor
			const target = {}
			const propertyKey = 'notAMethod'
			const descriptor = { value: 'not a function', configurable: true }

			expect(() => {
				bind(target, propertyKey, descriptor as any)
			}).toThrow('Only methods can be decorated with @bind. <notAMethod> is not a method!')
		})

		it('should throw error when descriptor is undefined', () => {
			expect(() => {
				bind({}, 'testMethod', undefined as any)
			}).toThrow('Only methods can be decorated with @bind. <testMethod> is not a method!')
		})

		it('should throw error when descriptor.value is not a function', () => {
			expect(() => {
				bind({}, 'testMethod', { value: 'not a function' } as any)
			}).toThrow('Only methods can be decorated with @bind. <testMethod> is not a method!')
		})

		it('should create configurable property descriptor', () => {
			class TestClass {
				@bind
				testMethod() {
					return 'test'
				}
			}

			const instance = new TestClass()
			const descriptor = Object.getOwnPropertyDescriptor(instance, 'testMethod')

			expect(descriptor?.configurable).toBe(true)
			expect(descriptor?.writable).toBe(true)
		})
	})

	describe('TC39 decorator format', () => {
		it('should bind method using TC39 decorator context', () => {
			// Mock TC39 decorator context
			const mockContext = {
				name: 'testMethod',
				addInitializer: vi.fn(),
			}

			const originalMethod = function (this: any) {
				return this.value
			}

			bind(originalMethod, mockContext as any)

			expect(mockContext.addInitializer).toHaveBeenCalledOnce()

			// Simulate the initializer being called
			const initializer = mockContext.addInitializer.mock.calls[0][0]
			const mockInstance = { value: 'test' }

			initializer.call(mockInstance)

			expect(mockInstance).toHaveProperty('testMethod')
			expect(typeof (mockInstance as any).testMethod).toBe('function')
		})

		it('should bind method correctly in TC39 format', () => {
			let capturedInitializer: Function | null = null

			const mockContext = {
				name: 'getValue',
				addInitializer: vi.fn((fn) => {
					capturedInitializer = fn
				}),
			}

			const originalMethod = function (this: any) {
				return this.value
			}

			bind(originalMethod, mockContext as any)

			// Create mock instance and run initializer
			const mockInstance = { value: 'TC39 test' }
			capturedInitializer!.call(mockInstance)

			// Test that the bound method works
			const boundMethod = (mockInstance as any).getValue
			expect(boundMethod()).toBe('TC39 test')
		})

		it('should handle TC39 format with parameters', () => {
			let capturedInitializer: Function | null = null

			const mockContext = {
				name: 'multiply',
				addInitializer: vi.fn((fn) => {
					capturedInitializer = fn
				}),
			}

			const originalMethod = function (this: any, value: number) {
				return value * this.multiplier
			}

			bind(originalMethod, mockContext as any)

			const mockInstance = { multiplier: 3 }
			capturedInitializer!.call(mockInstance)

			const boundMethod = (mockInstance as any).multiply
			expect(boundMethod(4)).toBe(12)
		})

		it('should assert extensible object in TC39 format', () => {
			let capturedInitializer: Function | null = null

			const mockContext = {
				name: 'testMethod',
				addInitializer: vi.fn((fn) => {
					capturedInitializer = fn
				}),
			}

			bind(() => {}, mockContext as any)

			const nonExtensibleInstance = Object.preventExtensions({})

			expect(() => {
				capturedInitializer!.call(nonExtensibleInstance)
			}).toThrow('Cannot bind to a non-extensible class.')
		})

		it('should assert configurable property in TC39 format', () => {
			let capturedInitializer: Function | null = null

			const mockContext = {
				name: 'testMethod',
				addInitializer: vi.fn((fn) => {
					capturedInitializer = fn
				}),
			}

			bind(() => {}, mockContext as any)

			const instance = {}
			// Make the property non-configurable
			Object.defineProperty(instance, 'testMethod', {
				value: 'existing',
				configurable: false,
			})

			expect(() => {
				capturedInitializer!.call(instance)
			}).toThrow('Cannot bind a non-configurable class method.')
		})
	})

	describe('decorator format detection', () => {
		it('should detect TC39 format with 2 arguments', () => {
			const mockContext = {
				name: 'testMethod',
				addInitializer: vi.fn(),
			}

			// Should not throw and should call addInitializer
			expect(() => {
				bind(() => {}, mockContext as any)
			}).not.toThrow()

			expect(mockContext.addInitializer).toHaveBeenCalled()
		})

		it('should detect legacy format with 3 arguments', () => {
			const target = {}
			const propertyKey = 'testMethod'
			const descriptor = {
				value: () => 'test',
				configurable: true,
				enumerable: true,
				writable: true,
			}

			const result = bind(target, propertyKey, descriptor)

			expect(result).toHaveProperty('configurable', true)
			expect(result).toHaveProperty('get')
			expect(typeof result.get).toBe('function')
		})
	})

	describe('edge cases', () => {
		it('should work with getter methods', () => {
			class TestClass {
				private _value = 'getter test'

				@bind
				getValue() {
					return this._value
				}
			}

			const instance = new TestClass()
			const { getValue } = instance

			expect(getValue()).toBe('getter test')
		})

		it('should preserve method arguments length', () => {
			class TestClass {
				@bind
				multiParam(a: number, b: string, c: boolean) {
					return { a, b, c }
				}
			}

			const instance = new TestClass()
			expect(instance.multiParam.length).toBe(3)
		})

		it('should work with methods that modify instance state', () => {
			class TestClass {
				count = 0

				@bind
				increment() {
					this.count++
					return this.count
				}
			}

			const instance = new TestClass()
			const { increment } = instance

			expect(increment()).toBe(1)
			expect(increment()).toBe(2)
			expect(instance.count).toBe(2)
		})
	})
})
