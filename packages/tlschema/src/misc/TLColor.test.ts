import { describe, expect, it } from 'vitest'
import { canvasUiColorTypeValidator, TL_CANVAS_UI_COLOR_TYPES, TLCanvasUiColor } from './TLColor'

describe('TLColor', () => {
	describe('TL_CANVAS_UI_COLOR_TYPES', () => {
		it('should contain all expected canvas UI color types', () => {
			const expectedColors = [
				'accent',
				'white',
				'black',
				'selection-stroke',
				'selection-fill',
				'laser',
				'muted-1',
			]

			expectedColors.forEach((color) => {
				expect(TL_CANVAS_UI_COLOR_TYPES.has(color as TLCanvasUiColor)).toBe(true)
			})
		})
	})

	describe('canvasUiColorTypeValidator', () => {
		it('should validate all valid canvas UI color types', () => {
			const validColors: TLCanvasUiColor[] = [
				'accent',
				'white',
				'black',
				'selection-stroke',
				'selection-fill',
				'laser',
				'muted-1',
			]

			validColors.forEach((color) => {
				expect(() => canvasUiColorTypeValidator.validate(color)).not.toThrow()
				expect(canvasUiColorTypeValidator.validate(color)).toBe(color)
			})
		})

		it('should reject invalid color types', () => {
			const invalidColors = ['invalid-color', '', 'red', 'ACCENT']

			invalidColors.forEach((color) => {
				expect(() => canvasUiColorTypeValidator.validate(color)).toThrow()
			})
		})

		it('should reject non-string values', () => {
			const nonStringValues = [123, null, undefined, {}, []]

			nonStringValues.forEach((value) => {
				expect(() => canvasUiColorTypeValidator.validate(value)).toThrow()
			})
		})
	})

	it('should maintain consistency between Set and validator', () => {
		// Every value in the Set should be valid according to the validator
		for (const color of TL_CANVAS_UI_COLOR_TYPES) {
			expect(canvasUiColorTypeValidator.isValid(color)).toBe(true)
			expect(canvasUiColorTypeValidator.validate(color)).toBe(color)
		}
	})
})
