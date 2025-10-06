import { describe, expect, it } from 'vitest'
import { bind } from './bind'

describe('bind decorator', () => {
	describe('legacy TypeScript decorator format', () => {
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

		it('should throw error when decorating non-method', () => {
			expect(() => {
				bind({}, 'notAMethod', { value: 'not a function', configurable: true } as any)
			}).toThrow('Only methods can be decorated with @bind. <notAMethod> is not a method!')
		})
	})
})
