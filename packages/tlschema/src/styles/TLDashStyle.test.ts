import { describe, expect, it } from 'vitest'
import { DefaultDashStyle, TLDefaultDashStyle } from './TLDashStyle'

describe('TLDashStyle', () => {
	describe('DefaultDashStyle', () => {
		it('should have correct configuration', () => {
			expect(DefaultDashStyle.id).toBe('tldraw:dash')
			expect(DefaultDashStyle.defaultValue).toBe('draw')
			expect(DefaultDashStyle.values).toEqual(['draw', 'solid', 'dashed', 'dotted'])
		})
	})

	describe('validation', () => {
		it('should validate all valid dash style values', () => {
			const validDashStyles: TLDefaultDashStyle[] = ['draw', 'solid', 'dashed', 'dotted']

			validDashStyles.forEach((dashStyle) => {
				expect(DefaultDashStyle.validate(dashStyle)).toBe(dashStyle)
			})
		})

		it('should reject invalid values', () => {
			expect(() => DefaultDashStyle.validate('invalid')).toThrow()
			expect(() => DefaultDashStyle.validate('SOLID')).toThrow()
			expect(() => DefaultDashStyle.validate('')).toThrow()
			expect(() => DefaultDashStyle.validate(null)).toThrow()
		})
	})

	describe('default value management', () => {
		it('should allow setting and getting default value', () => {
			const originalDefault = DefaultDashStyle.defaultValue

			DefaultDashStyle.setDefaultValue('solid')
			expect(DefaultDashStyle.defaultValue).toBe('solid')

			// Restore original
			DefaultDashStyle.setDefaultValue(originalDefault)
		})
	})
})
