import { describe, expect, it } from 'vitest'
import { DefaultFillStyle } from './TLFillStyle'

describe('TLFillStyle', () => {
	describe('DefaultFillStyle', () => {
		it('should have correct configuration', () => {
			expect(DefaultFillStyle.id).toBe('tldraw:fill')
			expect(DefaultFillStyle.defaultValue).toBe('none')
			expect(DefaultFillStyle.values).toEqual(['none', 'semi', 'solid', 'pattern', 'fill'])
		})
	})

	describe('validation', () => {
		it('should validate all valid fill style values', () => {
			DefaultFillStyle.values.forEach((fillStyle) => {
				expect(DefaultFillStyle.validate(fillStyle)).toBe(fillStyle)
			})
		})

		it('should reject invalid values', () => {
			const invalidValues = ['invalid', '', null, undefined, 123, 'NONE', 'Solid']
			invalidValues.forEach((invalidValue) => {
				expect(() => DefaultFillStyle.validate(invalidValue)).toThrow()
			})
		})
	})

	it('should work with setDefaultValue', () => {
		const originalDefault = DefaultFillStyle.defaultValue

		DefaultFillStyle.setDefaultValue('solid')
		expect(DefaultFillStyle.defaultValue).toBe('solid')

		// Restore original
		DefaultFillStyle.setDefaultValue(originalDefault)
	})
})
