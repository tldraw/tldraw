import { T } from '@tldraw/validate'
import { describe, expect, it, vi } from 'vitest'
import { StyleProp } from './StyleProp'

describe('StyleProp', () => {
	describe('StyleProp.define', () => {
		it('should use T.any as default type when no type is provided', () => {
			const prop = StyleProp.define('test:any', {
				defaultValue: 'anything',
			})

			// Should accept any value since it uses T.any
			expect(prop.validate('string')).toBe('string')
			expect(prop.validate(123)).toBe(123)
			expect(prop.validate({ obj: 'ect' })).toEqual({ obj: 'ect' })
			expect(prop.validate(null)).toBe(null)
		})

		it('should validate values using provided validator', () => {
			const prop = StyleProp.define('test:number', {
				defaultValue: 42,
				type: T.number,
			})

			expect(prop.validate(100)).toBe(100)
			expect(() => prop.validate('not a number')).toThrow()
		})
	})

	describe('StyleProp.defineEnum', () => {
		it('should validate enum values correctly', () => {
			const prop = StyleProp.defineEnum('test:color', {
				defaultValue: 'red',
				values: ['red', 'green', 'blue'],
			})

			expect(prop.validate('red')).toBe('red')
			expect(prop.validate('green')).toBe('green')
			expect(prop.validate('blue')).toBe('blue')
			expect(() => prop.validate('yellow')).toThrow()
		})

		it('should work with mixed type enum values', () => {
			const prop = StyleProp.defineEnum('test:mixed', {
				defaultValue: 'auto',
				values: ['auto', 10, 20, true],
			})

			expect(prop.validate('auto')).toBe('auto')
			expect(prop.validate(10)).toBe(10)
			expect(prop.validate(true)).toBe(true)
			expect(() => prop.validate(false)).toThrow()
		})
	})

	describe('StyleProp instance methods', () => {
		it('should update the default value', () => {
			const prop = StyleProp.define('test:instance', {
				defaultValue: 'initial',
				type: T.string,
			})

			expect(prop.defaultValue).toBe('initial')
			prop.setDefaultValue('updated')
			expect(prop.defaultValue).toBe('updated')
		})

		it('should fall back to regular validate when optimized version not available', () => {
			const mockValidator = {
				validate: vi.fn().mockReturnValue('fallback'),
			}
			const basicProp = StyleProp.define('test:basic', {
				defaultValue: 'default',
				type: mockValidator,
			})

			const result = basicProp.validateUsingKnownGoodVersion('prev', 'new')
			expect(result).toBe('fallback')
			expect(mockValidator.validate).toHaveBeenCalledWith('new')
		})

		it('should use underlying validator when available', () => {
			const mockValidator = {
				validate: vi.fn(),
				validateUsingKnownGoodVersion: vi.fn().mockReturnValue('optimized'),
			}
			const optimizedProp = StyleProp.define('test:optimized', {
				defaultValue: 'default',
				type: mockValidator,
			})

			const result = optimizedProp.validateUsingKnownGoodVersion('prev', 'new')
			expect(result).toBe('optimized')
			expect(mockValidator.validateUsingKnownGoodVersion).toHaveBeenCalledWith('prev', 'new')
			expect(mockValidator.validate).not.toHaveBeenCalled()
		})
	})
})
