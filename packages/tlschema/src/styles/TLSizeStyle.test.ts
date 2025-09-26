import { describe, expect, it } from 'vitest'
import { EnumStyleProp, StyleProp } from './StyleProp'
import { DefaultSizeStyle, TLDefaultSizeStyle } from './TLSizeStyle'

describe('TLSizeStyle', () => {
	describe('DefaultSizeStyle', () => {
		it('should be an EnumStyleProp', () => {
			expect(DefaultSizeStyle).toBeInstanceOf(EnumStyleProp)
			expect(DefaultSizeStyle).toBeInstanceOf(StyleProp)
		})

		it('should have correct configuration', () => {
			expect(DefaultSizeStyle.id).toBe('tldraw:size')
			expect(DefaultSizeStyle.defaultValue).toBe('m')
			expect(DefaultSizeStyle.values).toEqual(['s', 'm', 'l', 'xl'])
		})

		it('should validate all size values correctly', () => {
			expect(DefaultSizeStyle.validate('s')).toBe('s')
			expect(DefaultSizeStyle.validate('m')).toBe('m')
			expect(DefaultSizeStyle.validate('l')).toBe('l')
			expect(DefaultSizeStyle.validate('xl')).toBe('xl')
		})

		it('should reject invalid values', () => {
			expect(() => DefaultSizeStyle.validate('invalid')).toThrow()
			expect(() => DefaultSizeStyle.validate(null)).toThrow()
			expect(() => DefaultSizeStyle.validate(123)).toThrow()
			expect(() => DefaultSizeStyle.validate('')).toThrow()
		})

		it('should support setDefaultValue', () => {
			const originalDefault = DefaultSizeStyle.defaultValue

			DefaultSizeStyle.setDefaultValue('l')
			expect(DefaultSizeStyle.defaultValue).toBe('l')

			// Restore original default
			DefaultSizeStyle.setDefaultValue(originalDefault)
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			expect(DefaultSizeStyle.validateUsingKnownGoodVersion('m', 'l')).toBe('l')
			expect(() => DefaultSizeStyle.validateUsingKnownGoodVersion('m', 'invalid')).toThrow()
		})
	})

	describe('TLDefaultSizeStyle type', () => {
		it('should work with all valid size values', () => {
			const testValues: TLDefaultSizeStyle[] = ['s', 'm', 'l', 'xl']

			testValues.forEach((value) => {
				expect(() => DefaultSizeStyle.validate(value)).not.toThrow()
				expect(DefaultSizeStyle.validate(value)).toBe(value)
			})
		})
	})
})
