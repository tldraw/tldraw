import { describe, expect, it } from 'vitest'
import { boxModelValidator, vecModelValidator } from './geometry-types'

describe('geometry-types', () => {
	describe('VecModel validator', () => {
		it('should validate 2D vectors', () => {
			const vector2D = { x: 10, y: 20 }
			expect(vecModelValidator.validate(vector2D)).toEqual(vector2D)
			expect(vecModelValidator.isValid(vector2D)).toBe(true)
		})

		it('should validate 3D vectors with optional z', () => {
			const vector3D = { x: 10, y: 20, z: 30 }
			expect(vecModelValidator.validate(vector3D)).toEqual(vector3D)
			expect(vecModelValidator.isValid(vector3D)).toBe(true)
		})

		it('should reject vectors with missing required properties', () => {
			expect(() => vecModelValidator.validate({ x: 10 })).toThrow()
			expect(() => vecModelValidator.validate({ y: 20 })).toThrow()
			expect(vecModelValidator.isValid({ x: 10 })).toBe(false)
		})

		it('should reject non-numeric coordinates', () => {
			expect(() => vecModelValidator.validate({ x: '10', y: 20 })).toThrow()
			expect(vecModelValidator.isValid({ x: 10, y: '20' })).toBe(false)
		})
	})

	describe('BoxModel validator', () => {
		it('should validate boxes with all required properties', () => {
			const box = { x: 10, y: 20, w: 100, h: 50 }
			expect(boxModelValidator.validate(box)).toEqual(box)
			expect(boxModelValidator.isValid(box)).toBe(true)
		})

		it('should allow negative dimensions', () => {
			const negativeBox = { x: 10, y: 20, w: -100, h: -50 }
			expect(boxModelValidator.validate(negativeBox)).toEqual(negativeBox)
			expect(boxModelValidator.isValid(negativeBox)).toBe(true)
		})

		it('should reject boxes with missing properties', () => {
			expect(() => boxModelValidator.validate({ x: 10, y: 20, w: 100 })).toThrow()
			expect(boxModelValidator.isValid({ x: 10, y: 20 })).toBe(false)
		})

		it('should reject non-numeric properties', () => {
			expect(() => boxModelValidator.validate({ x: '10', y: 20, w: 100, h: 50 })).toThrow()
			expect(boxModelValidator.isValid({ x: 10, y: '20', w: 100, h: 50 })).toBe(false)
		})
	})
})
