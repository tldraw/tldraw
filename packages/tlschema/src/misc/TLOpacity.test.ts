import { describe, expect, it } from 'vitest'
import { opacityValidator } from './TLOpacity'

describe('TLOpacity', () => {
	describe('opacityValidator', () => {
		describe('validate method', () => {
			it('should validate opacity values within range 0-1', () => {
				const validOpacities = [0, 0.5, 1, 0.001, 0.999]

				validOpacities.forEach((opacity) => {
					expect(opacityValidator.validate(opacity)).toBe(opacity)
				})
			})

			it('should reject opacity values outside 0-1 range', () => {
				const invalidOpacities = [-0.1, 1.5, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]

				invalidOpacities.forEach((opacity) => {
					expect(() => opacityValidator.validate(opacity)).toThrow()
				})
			})

			it('should reject non-number values', () => {
				const invalidValues = ['0.5', null, undefined, {}, [], NaN]

				invalidValues.forEach((value) => {
					expect(() => opacityValidator.validate(value)).toThrow()
				})
			})
		})

		describe('isValid method', () => {
			it('should return true for valid opacity values', () => {
				expect(opacityValidator.isValid(0)).toBe(true)
				expect(opacityValidator.isValid(0.5)).toBe(true)
				expect(opacityValidator.isValid(1)).toBe(true)
			})

			it('should return false for invalid values', () => {
				expect(opacityValidator.isValid(-0.1)).toBe(false)
				expect(opacityValidator.isValid(1.5)).toBe(false)
				expect(opacityValidator.isValid('0.5')).toBe(false)
				expect(opacityValidator.isValid(null)).toBe(false)
				expect(opacityValidator.isValid(NaN)).toBe(false)
			})
		})
	})
})
