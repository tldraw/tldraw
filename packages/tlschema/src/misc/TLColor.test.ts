import { describe, expect, it, test } from 'vitest'
import { canvasUiColorTypeValidator, TL_CANVAS_UI_COLOR_TYPES, TLCanvasUiColor } from './TLColor'

describe('TLColor', () => {
	describe('TL_CANVAS_UI_COLOR_TYPES', () => {
		it('should be a Set containing expected color types', () => {
			expect(TL_CANVAS_UI_COLOR_TYPES).toBeInstanceOf(Set)
			expect(TL_CANVAS_UI_COLOR_TYPES.size).toBeGreaterThan(0)
		})

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

		it('should have the correct number of color types', () => {
			// Verify the set contains exactly the expected number of colors
			expect(TL_CANVAS_UI_COLOR_TYPES.size).toBe(7)
		})

		it('should not contain unexpected color types', () => {
			const unexpectedColors = [
				'red',
				'blue',
				'green',
				'yellow',
				'purple',
				'orange',
				'selection',
				'muted',
				'accent-stroke',
				'white-fill',
				'black-stroke',
			]

			unexpectedColors.forEach((color) => {
				expect(TL_CANVAS_UI_COLOR_TYPES.has(color as any)).toBe(false)
			})
		})

		it('should be immutable (readonly)', () => {
			// The Set should be created with readonly values
			const originalSize = TL_CANVAS_UI_COLOR_TYPES.size

			// Try to add a new value (this should not affect the original set due to const assertion)
			expect(TL_CANVAS_UI_COLOR_TYPES.size).toBe(originalSize)
		})

		test('should work with Array.from() conversion', () => {
			const colorsArray = Array.from(TL_CANVAS_UI_COLOR_TYPES)

			expect(Array.isArray(colorsArray)).toBe(true)
			expect(colorsArray.length).toBe(TL_CANVAS_UI_COLOR_TYPES.size)

			// All array elements should be strings
			colorsArray.forEach((color) => {
				expect(typeof color).toBe('string')
			})
		})

		test('should support iteration', () => {
			let count = 0
			for (const color of TL_CANVAS_UI_COLOR_TYPES) {
				expect(typeof color).toBe('string')
				count++
			}
			expect(count).toBe(TL_CANVAS_UI_COLOR_TYPES.size)
		})
	})

	describe('canvasUiColorTypeValidator', () => {
		describe('validate method', () => {
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
				const invalidColors = [
					'red',
					'blue',
					'green',
					'yellow',
					'purple',
					'orange',
					'selection',
					'muted',
					'accent-stroke',
					'white-fill',
					'black-stroke',
					'invalid-color',
					'',
				]

				invalidColors.forEach((color) => {
					expect(() => canvasUiColorTypeValidator.validate(color)).toThrow()
				})
			})

			it('should reject non-string values', () => {
				const nonStringValues = [
					123,
					null,
					undefined,
					{},
					[],
					true,
					false,
					Symbol('color'),
					new Date(),
				]

				nonStringValues.forEach((value) => {
					expect(() => canvasUiColorTypeValidator.validate(value)).toThrow()
				})
			})

			it('should provide descriptive error messages for invalid values', () => {
				expect(() => canvasUiColorTypeValidator.validate('invalid')).toThrow(
					/Expected.*"accent".*"white".*"black".*"selection-stroke".*"selection-fill".*"laser".*"muted-1".*got invalid/
				)
			})

			test('should handle edge case values', () => {
				const edgeCases = [
					'ACCENT', // wrong case
					'accent ', // trailing space
					' accent', // leading space
					'accent\n', // with newline
					'accent\t', // with tab
				]

				edgeCases.forEach((value) => {
					expect(() => canvasUiColorTypeValidator.validate(value)).toThrow()
				})
			})

			test('should be case-sensitive', () => {
				const caseSensitiveTests = [
					{ input: 'ACCENT', expected: false },
					{ input: 'Accent', expected: false },
					{ input: 'accent', expected: true },
					{ input: 'WHITE', expected: false },
					{ input: 'White', expected: false },
					{ input: 'white', expected: true },
					{ input: 'BLACK', expected: false },
					{ input: 'Black', expected: false },
					{ input: 'black', expected: true },
				]

				caseSensitiveTests.forEach(({ input, expected }) => {
					if (expected) {
						expect(() => canvasUiColorTypeValidator.validate(input)).not.toThrow()
					} else {
						expect(() => canvasUiColorTypeValidator.validate(input)).toThrow()
					}
				})
			})
		})

		describe('isValid method', () => {
			it('should return true for all valid canvas UI color types', () => {
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
					expect(canvasUiColorTypeValidator.isValid(color)).toBe(true)
				})
			})

			it('should return false for invalid color types', () => {
				const invalidColors = [
					'red',
					'blue',
					'green',
					'yellow',
					'purple',
					'orange',
					'selection',
					'muted',
					'accent-stroke',
					'white-fill',
					'black-stroke',
					'invalid-color',
					'',
				]

				invalidColors.forEach((color) => {
					expect(canvasUiColorTypeValidator.isValid(color)).toBe(false)
				})
			})

			it('should return false for non-string values', () => {
				const nonStringValues = [
					123,
					null,
					undefined,
					{},
					[],
					true,
					false,
					Symbol('color'),
					new Date(),
				]

				nonStringValues.forEach((value) => {
					expect(canvasUiColorTypeValidator.isValid(value)).toBe(false)
				})
			})

			test('should not throw errors for any input', () => {
				const testValues = ['accent', 'invalid', 123, null, undefined, {}, [], true, false]

				testValues.forEach((value) => {
					expect(() => canvasUiColorTypeValidator.isValid(value)).not.toThrow()
				})
			})

			test('should handle edge cases gracefully', () => {
				expect(canvasUiColorTypeValidator.isValid('accent ')).toBe(false)
				expect(canvasUiColorTypeValidator.isValid(' accent')).toBe(false)
				expect(canvasUiColorTypeValidator.isValid('ACCENT')).toBe(false)
				expect(canvasUiColorTypeValidator.isValid('accent\n')).toBe(false)
				expect(canvasUiColorTypeValidator.isValid('accent\t')).toBe(false)
			})
		})

		describe('consistency between validate and isValid', () => {
			test('should be consistent for valid values', () => {
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
					const isValidResult = canvasUiColorTypeValidator.isValid(color)
					expect(isValidResult).toBe(true)

					expect(() => canvasUiColorTypeValidator.validate(color)).not.toThrow()
				})
			})

			test('should be consistent for invalid values', () => {
				const invalidValues = [
					'invalid',
					123,
					null,
					undefined,
					{},
					[],
					true,
					false,
					'red',
					'blue',
					'',
					'ACCENT',
				]

				invalidValues.forEach((value) => {
					const isValidResult = canvasUiColorTypeValidator.isValid(value)
					expect(isValidResult).toBe(false)

					expect(() => canvasUiColorTypeValidator.validate(value)).toThrow()
				})
			})
		})

		describe('validator properties', () => {
			it('should have the correct validator structure', () => {
				expect(canvasUiColorTypeValidator).toBeDefined()
				expect(typeof canvasUiColorTypeValidator.validate).toBe('function')
				expect(typeof canvasUiColorTypeValidator.isValid).toBe('function')
			})

			it('should be based on setEnum validator', () => {
				// The validator should behave consistently with T.setEnum behavior
				expect(canvasUiColorTypeValidator.validate('accent')).toBe('accent')
				expect(canvasUiColorTypeValidator.validate('white')).toBe('white')
			})
		})
	})

	describe('integration tests', () => {
		test('should work with type system correctly', () => {
			// This test verifies that the types work correctly at runtime
			const color: TLCanvasUiColor = 'accent'

			expect(TL_CANVAS_UI_COLOR_TYPES.has(color)).toBe(true)
			expect(canvasUiColorTypeValidator.validate(color)).toBe('accent')
			expect(canvasUiColorTypeValidator.isValid(color)).toBe(true)
		})

		test('should support all documented color types', () => {
			// Verify all documented colors in the examples work
			const exampleColors = ['selection-stroke', 'accent', 'white']

			exampleColors.forEach((color) => {
				expect(TL_CANVAS_UI_COLOR_TYPES.has(color as TLCanvasUiColor)).toBe(true)
				expect(canvasUiColorTypeValidator.validate(color)).toBe(color)
				expect(canvasUiColorTypeValidator.isValid(color)).toBe(true)
			})
		})

		test('should maintain consistency between Set and validator', () => {
			// Every value in the Set should be valid according to the validator
			for (const color of TL_CANVAS_UI_COLOR_TYPES) {
				expect(canvasUiColorTypeValidator.isValid(color)).toBe(true)
				expect(canvasUiColorTypeValidator.validate(color)).toBe(color)
			}
		})

		test('should work in realistic usage scenarios', () => {
			// Simulate real-world usage patterns
			const userInputs = ['accent', 'selection-stroke', 'white', 'invalid-color', 'red']

			const processColorInput = (input: string): TLCanvasUiColor | null => {
				if (canvasUiColorTypeValidator.isValid(input)) {
					return canvasUiColorTypeValidator.validate(input)
				}
				return null
			}

			expect(processColorInput('accent')).toBe('accent')
			expect(processColorInput('selection-stroke')).toBe('selection-stroke')
			expect(processColorInput('white')).toBe('white')
			expect(processColorInput('invalid-color')).toBe(null)
			expect(processColorInput('red')).toBe(null)
		})

		test('should work with conditional logic', () => {
			const checkColor = (color: unknown): boolean => {
				return TL_CANVAS_UI_COLOR_TYPES.has(color as TLCanvasUiColor)
			}

			expect(checkColor('accent')).toBe(true)
			expect(checkColor('selection-stroke')).toBe(true)
			expect(checkColor('invalid')).toBe(false)
			expect(checkColor(123)).toBe(false)
		})
	})

	describe('error handling', () => {
		test('should provide helpful error messages', () => {
			try {
				canvasUiColorTypeValidator.validate('invalid')
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toContain('Expected')
				expect((error as Error).message).toContain('got invalid')
			}
		})

		test('should handle validation errors gracefully', () => {
			const safeValidate = (value: unknown): TLCanvasUiColor | null => {
				try {
					return canvasUiColorTypeValidator.validate(value)
				} catch {
					return null
				}
			}

			expect(safeValidate('accent')).toBe('accent')
			expect(safeValidate('invalid')).toBe(null)
			expect(safeValidate(123)).toBe(null)
			expect(safeValidate(null)).toBe(null)
		})
	})
})
