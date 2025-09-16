import { describe, expect, it, test } from 'vitest'
import { TLOpacityType, opacityValidator } from './TLOpacity'

describe('TLOpacity', () => {
	describe('TLOpacityType', () => {
		test('should accept valid opacity values', () => {
			// Type system tests - these should compile without errors
			const fullyOpaque: TLOpacityType = 1.0
			const halfTransparent: TLOpacityType = 0.5
			const fullyTransparent: TLOpacityType = 0.0
			const quarterOpaque: TLOpacityType = 0.25

			expect(fullyOpaque).toBe(1.0)
			expect(halfTransparent).toBe(0.5)
			expect(fullyTransparent).toBe(0.0)
			expect(quarterOpaque).toBe(0.25)
		})

		test('should support all valid opacity ranges', () => {
			const validOpacityValues: TLOpacityType[] = [
				0, 0.1, 0.25, 0.33, 0.5, 0.66, 0.75, 0.9, 1, 0.001, 0.999, 0.12345, 0.98765,
			]

			validOpacityValues.forEach((opacity) => {
				expect(typeof opacity).toBe('number')
				expect(opacity).toBeGreaterThanOrEqual(0)
				expect(opacity).toBeLessThanOrEqual(1)
			})
		})
	})

	describe('opacityValidator', () => {
		describe('validate method', () => {
			it('should validate all opacity values within range 0-1', () => {
				const validOpacities = [
					0, // Fully transparent
					0.1, // 10% opacity
					0.25, // 25% opacity
					0.33, // 33% opacity
					0.5, // Half opacity
					0.66, // 66% opacity
					0.75, // 75% opacity
					0.9, // 90% opacity
					1, // Fully opaque
					0.001, // Very low opacity
					0.999, // Very high opacity
				]

				validOpacities.forEach((opacity) => {
					expect(() => opacityValidator.validate(opacity)).not.toThrow()
					expect(opacityValidator.validate(opacity)).toBe(opacity)
				})
			})

			it('should accept exact boundary values', () => {
				// Test exact boundaries
				expect(() => opacityValidator.validate(0)).not.toThrow()
				expect(opacityValidator.validate(0)).toBe(0)

				expect(() => opacityValidator.validate(1)).not.toThrow()
				expect(opacityValidator.validate(1)).toBe(1)
			})

			it('should accept floating point precision values', () => {
				const precisionValues = [
					0.123456789,
					0.000000001,
					0.999999999,
					Number.EPSILON,
					1 - Number.EPSILON,
				]

				precisionValues.forEach((value) => {
					if (value >= 0 && value <= 1) {
						expect(() => opacityValidator.validate(value)).not.toThrow()
						expect(opacityValidator.validate(value)).toBe(value)
					}
				})
			})

			it('should reject opacity values below 0', () => {
				const belowZeroValues = [-0.1, -1, -0.001, -100, -Number.EPSILON]

				belowZeroValues.forEach((opacity) => {
					expect(() => opacityValidator.validate(opacity)).toThrow(
						'At null: Opacity must be between 0 and 1'
					)
				})

				// Infinity throws a different error
				expect(() => opacityValidator.validate(Number.NEGATIVE_INFINITY)).toThrow(
					'At null: Expected a finite number, got -Infinity'
				)
			})

			it('should reject opacity values above 1', () => {
				const aboveOneValues = [1.1, 2, 1.001, 100, 1 + Number.EPSILON]

				aboveOneValues.forEach((opacity) => {
					expect(() => opacityValidator.validate(opacity)).toThrow(
						'At null: Opacity must be between 0 and 1'
					)
				})

				// Infinity throws a different error
				expect(() => opacityValidator.validate(Number.POSITIVE_INFINITY)).toThrow(
					'At null: Expected a finite number, got Infinity'
				)
			})

			it('should reject non-number values', () => {
				const nonNumberValues = [
					'0.5',
					'1',
					'0',
					null,
					undefined,
					{},
					[],
					[0.5],
					true,
					false,
					Symbol('opacity'),
					new Date(),
					() => 0.5,
				]

				nonNumberValues.forEach((value) => {
					expect(() => opacityValidator.validate(value)).toThrow()
				})
			})

			it('should reject NaN values', () => {
				expect(() => opacityValidator.validate(NaN)).toThrow()
			})

			it('should provide descriptive error messages', () => {
				// Test error message content
				try {
					opacityValidator.validate(1.5)
					expect.fail('Should have thrown an error')
				} catch (error) {
					expect(error).toBeInstanceOf(Error)
					expect((error as Error).message).toBe('At null: Opacity must be between 0 and 1')
				}

				try {
					opacityValidator.validate(-0.1)
					expect.fail('Should have thrown an error')
				} catch (error) {
					expect(error).toBeInstanceOf(Error)
					expect((error as Error).message).toBe('At null: Opacity must be between 0 and 1')
				}
			})

			test('should handle edge cases correctly', () => {
				// Test various edge cases
				const edgeCases = [
					{ value: 0.0, shouldPass: true },
					{ value: 1.0, shouldPass: true },
					{ value: 0.0000001, shouldPass: true },
					{ value: 0.9999999, shouldPass: true },
					{ value: -0.0000001, shouldPass: false },
					{ value: 1.0000001, shouldPass: false },
				]

				edgeCases.forEach(({ value, shouldPass }) => {
					if (shouldPass) {
						expect(() => opacityValidator.validate(value)).not.toThrow()
						expect(opacityValidator.validate(value)).toBe(value)
					} else {
						expect(() => opacityValidator.validate(value)).toThrow(
							'Opacity must be between 0 and 1'
						)
					}
				})
			})
		})

		describe('isValid method', () => {
			it('should return true for all valid opacity values', () => {
				const validOpacities = [
					0, 0.1, 0.25, 0.33, 0.5, 0.66, 0.75, 0.9, 1, 0.001, 0.999, 0.12345, 0.98765,
				]

				validOpacities.forEach((opacity) => {
					expect(opacityValidator.isValid(opacity)).toBe(true)
				})
			})

			it('should return false for opacity values outside 0-1 range', () => {
				const invalidOpacities = [
					-0.1,
					-1,
					-0.001,
					-100,
					1.1,
					2,
					1.001,
					100,
					Number.POSITIVE_INFINITY,
					Number.NEGATIVE_INFINITY,
				]

				invalidOpacities.forEach((opacity) => {
					expect(opacityValidator.isValid(opacity)).toBe(false)
				})
			})

			it('should return false for non-number values', () => {
				const nonNumberValues = [
					'0.5',
					'1',
					'0',
					null,
					undefined,
					{},
					[],
					[0.5],
					true,
					false,
					Symbol('opacity'),
					new Date(),
					() => 0.5,
				]

				nonNumberValues.forEach((value) => {
					expect(opacityValidator.isValid(value)).toBe(false)
				})
			})

			it('should return false for NaN', () => {
				expect(opacityValidator.isValid(NaN)).toBe(false)
			})

			it('should not throw errors for any input', () => {
				const testValues = [
					0.5,
					1.5,
					-0.5,
					'invalid',
					null,
					undefined,
					{},
					[],
					true,
					false,
					NaN,
					Infinity,
					-Infinity,
				]

				testValues.forEach((value) => {
					expect(() => opacityValidator.isValid(value)).not.toThrow()
				})
			})

			test('should handle boundary conditions consistently', () => {
				expect(opacityValidator.isValid(0)).toBe(true)
				expect(opacityValidator.isValid(1)).toBe(true)
				expect(opacityValidator.isValid(-0)).toBe(true) // -0 equals 0
				expect(opacityValidator.isValid(0 - Number.EPSILON)).toBe(false)
				expect(opacityValidator.isValid(1 + Number.EPSILON)).toBe(false)
			})
		})

		describe('consistency between validate and isValid', () => {
			test('should be consistent for valid values', () => {
				const validOpacities = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1, 0.001, 0.999, 0.123456789]

				validOpacities.forEach((opacity) => {
					const isValidResult = opacityValidator.isValid(opacity)
					expect(isValidResult).toBe(true)

					expect(() => opacityValidator.validate(opacity)).not.toThrow()
					expect(opacityValidator.validate(opacity)).toBe(opacity)
				})
			})

			test('should be consistent for invalid values', () => {
				const invalidValues = [
					-0.1,
					1.5,
					'invalid',
					null,
					undefined,
					{},
					[],
					true,
					false,
					NaN,
					Infinity,
					-Infinity,
				]

				invalidValues.forEach((value) => {
					const isValidResult = opacityValidator.isValid(value)
					expect(isValidResult).toBe(false)

					expect(() => opacityValidator.validate(value)).toThrow()
				})
			})
		})

		describe('validator properties', () => {
			it('should have the correct validator structure', () => {
				expect(opacityValidator).toBeDefined()
				expect(typeof opacityValidator.validate).toBe('function')
				expect(typeof opacityValidator.isValid).toBe('function')
			})

			it('should be based on T.number validator', () => {
				// The validator should behave like a number validator with additional checks
				expect(() => opacityValidator.validate('not a number')).toThrow()
				expect(opacityValidator.validate(0.5)).toBe(0.5)
				expect(opacityValidator.validate(1)).toBe(1)
			})
		})
	})

	describe('integration tests', () => {
		test('should work with type system correctly', () => {
			// This test verifies that the types work correctly at runtime
			const opacity: TLOpacityType = 0.75

			expect(typeof opacity).toBe('number')
			expect(opacityValidator.validate(opacity)).toBe(0.75)
			expect(opacityValidator.isValid(opacity)).toBe(true)
		})

		test('should support all documented opacity examples', () => {
			// Test examples from JSDoc comments
			const fullyOpaque: TLOpacityType = 1.0
			const halfTransparent: TLOpacityType = 0.5
			const fullyTransparent: TLOpacityType = 0.0
			const quarterOpaque: TLOpacityType = 0.25

			const examples = [fullyOpaque, halfTransparent, fullyTransparent, quarterOpaque]

			examples.forEach((opacity) => {
				expect(opacityValidator.validate(opacity)).toBe(opacity)
				expect(opacityValidator.isValid(opacity)).toBe(true)
			})
		})

		test('should work in realistic usage scenarios', () => {
			// Simulate real-world usage patterns
			const userInputs = [0, 0.25, 0.5, 0.75, 1, -0.1, 1.5, 'invalid', null]

			const processOpacityInput = (input: unknown): TLOpacityType | null => {
				if (opacityValidator.isValid(input)) {
					return opacityValidator.validate(input)
				}
				return null
			}

			expect(processOpacityInput(0)).toBe(0)
			expect(processOpacityInput(0.5)).toBe(0.5)
			expect(processOpacityInput(1)).toBe(1)
			expect(processOpacityInput(-0.1)).toBe(null)
			expect(processOpacityInput(1.5)).toBe(null)
			expect(processOpacityInput('invalid')).toBe(null)
			expect(processOpacityInput(null)).toBe(null)
		})

		test('should work with conditional logic', () => {
			const checkOpacity = (opacity: unknown): boolean => {
				return typeof opacity === 'number' && opacity >= 0 && opacity <= 1
			}

			const validateOpacity = (opacity: unknown): opacity is TLOpacityType => {
				return opacityValidator.isValid(opacity)
			}

			expect(checkOpacity(0.5)).toBe(true)
			expect(checkOpacity(1.5)).toBe(false)
			expect(checkOpacity('0.5')).toBe(false)

			expect(validateOpacity(0.5)).toBe(true)
			expect(validateOpacity(1.5)).toBe(false)
			expect(validateOpacity('0.5')).toBe(false)

			// Both methods should agree
			const testValues = [0, 0.5, 1, -0.1, 1.5, 'invalid', null, undefined]
			testValues.forEach((value) => {
				expect(checkOpacity(value)).toBe(validateOpacity(value))
			})
		})

		test('should work with shape opacity scenarios', () => {
			// Test realistic shape opacity scenarios
			interface MockShape {
				id: string
				opacity: TLOpacityType
			}

			const createShape = (opacity: unknown): MockShape | null => {
				if (opacityValidator.isValid(opacity)) {
					return {
						id: 'shape-1',
						opacity: opacityValidator.validate(opacity),
					}
				}
				return null
			}

			const validShape = createShape(0.8)
			expect(validShape).toBeDefined()
			expect(validShape?.opacity).toBe(0.8)

			const invalidShape = createShape(1.5)
			expect(invalidShape).toBe(null)

			// Test opacity modification
			if (validShape) {
				const fadeShape = (shape: MockShape, newOpacity: number): MockShape | null => {
					if (opacityValidator.isValid(newOpacity)) {
						return { ...shape, opacity: newOpacity }
					}
					return null
				}

				const fadedShape = fadeShape(validShape, 0.3)
				expect(fadedShape?.opacity).toBe(0.3)

				const invalidFade = fadeShape(validShape, -0.1)
				expect(invalidFade).toBe(null)
			}
		})

		test('should work with animation opacity scenarios', () => {
			// Test opacity animation scenarios
			const animateOpacity = (
				startOpacity: TLOpacityType,
				endOpacity: TLOpacityType,
				progress: number // 0 to 1
			): TLOpacityType | null => {
				if (!opacityValidator.isValid(startOpacity) || !opacityValidator.isValid(endOpacity)) {
					return null
				}
				if (progress < 0 || progress > 1) {
					return null
				}

				const interpolatedOpacity = startOpacity + (endOpacity - startOpacity) * progress
				return opacityValidator.isValid(interpolatedOpacity) ? interpolatedOpacity : null
			}

			// Valid animations
			expect(animateOpacity(0, 1, 0.5)).toBe(0.5)
			expect(animateOpacity(0.2, 0.8, 0.25)).toBeCloseTo(0.35, 10)
			expect(animateOpacity(1, 0, 0.75)).toBe(0.25)

			// Invalid start/end values
			expect(animateOpacity(-0.1, 1, 0.5)).toBe(null)
			expect(animateOpacity(0, 1.5, 0.5)).toBe(null)

			// Invalid progress
			expect(animateOpacity(0, 1, -0.1)).toBe(null)
			expect(animateOpacity(0, 1, 1.1)).toBe(null)
		})
	})

	describe('error handling', () => {
		test('should provide helpful error messages', () => {
			// Test specific error messages
			const testCases = [
				{ value: -0.5, expectedMessage: 'At null: Opacity must be between 0 and 1' },
				{ value: 1.5, expectedMessage: 'At null: Opacity must be between 0 and 1' },
				{ value: -100, expectedMessage: 'At null: Opacity must be between 0 and 1' },
				{ value: 100, expectedMessage: 'At null: Opacity must be between 0 and 1' },
			]

			testCases.forEach(({ value, expectedMessage }) => {
				try {
					opacityValidator.validate(value)
					expect.fail(`Should have thrown an error for value: ${value}`)
				} catch (error) {
					expect(error).toBeInstanceOf(Error)
					expect((error as Error).message).toBe(expectedMessage)
				}
			})
		})

		test('should handle validation errors gracefully', () => {
			const safeValidate = (value: unknown): TLOpacityType | null => {
				try {
					return opacityValidator.validate(value)
				} catch {
					return null
				}
			}

			expect(safeValidate(0.5)).toBe(0.5)
			expect(safeValidate(1.5)).toBe(null)
			expect(safeValidate(-0.5)).toBe(null)
			expect(safeValidate('invalid')).toBe(null)
			expect(safeValidate(null)).toBe(null)
			expect(safeValidate(undefined)).toBe(null)
		})

		test('should maintain error consistency for boundary violations', () => {
			const boundaryViolations = [
				-Number.EPSILON,
				-0.000001,
				-1,
				-100,
				1 + Number.EPSILON,
				1.000001,
				2,
				100,
			]

			boundaryViolations.forEach((value) => {
				expect(() => opacityValidator.validate(value)).toThrow(
					'At null: Opacity must be between 0 and 1'
				)
				expect(opacityValidator.isValid(value)).toBe(false)
			})

			// Infinity values throw different errors
			expect(() => opacityValidator.validate(Number.NEGATIVE_INFINITY)).toThrow(
				'At null: Expected a finite number, got -Infinity'
			)
			expect(() => opacityValidator.validate(Number.POSITIVE_INFINITY)).toThrow(
				'At null: Expected a finite number, got Infinity'
			)
			expect(opacityValidator.isValid(Number.NEGATIVE_INFINITY)).toBe(false)
			expect(opacityValidator.isValid(Number.POSITIVE_INFINITY)).toBe(false)
		})
	})

	describe('performance characteristics', () => {
		test('should validate quickly for common opacity values', () => {
			const commonValues = [0, 0.25, 0.5, 0.75, 1]
			const iterations = 1000

			const start = performance.now()
			for (let i = 0; i < iterations; i++) {
				commonValues.forEach((value) => {
					opacityValidator.isValid(value)
				})
			}
			const end = performance.now()

			// Should complete quickly (this is more of a smoke test)
			expect(end - start).toBeLessThan(100) // Less than 100ms for 5000 validations
		})

		test('should handle large arrays of opacity values efficiently', () => {
			const opacityArray = Array.from({ length: 1000 }, (_, i) => i / 1000) // 0, 0.001, 0.002, ..., 0.999

			const validOpacities = opacityArray.filter((value) => opacityValidator.isValid(value))
			expect(validOpacities).toHaveLength(1000) // All should be valid

			const validatedOpacities = validOpacities.map((value) => opacityValidator.validate(value))
			expect(validatedOpacities).toEqual(opacityArray)
		})
	})

	describe('mathematical properties', () => {
		test('should handle floating point precision correctly', () => {
			// Test precision edge cases
			const precisionTests = [
				{ value: 0.1 + 0.2, expected: true }, // 0.30000000000000004
				{ value: 0.7 + 0.3, expected: true }, // 1.0000000000000002
				{ value: 1.0 - 0.9, expected: true }, // 0.09999999999999998
				{ value: 0.3 - 0.1, expected: true }, // 0.19999999999999998
			]

			precisionTests.forEach(({ value, expected }) => {
				if (value >= 0 && value <= 1) {
					expect(opacityValidator.isValid(value)).toBe(expected)
					if (expected) {
						expect(opacityValidator.validate(value)).toBe(value)
					}
				}
			})
		})

		test('should handle zero variations correctly', () => {
			const zeroVariations = [0, -0, +0, 0.0, -0.0]

			zeroVariations.forEach((zero) => {
				expect(opacityValidator.isValid(zero)).toBe(true)
				expect(opacityValidator.validate(zero)).toBe(zero)
			})
		})

		test('should handle special number values', () => {
			const specialValues = [
				{ value: Number.MIN_VALUE, shouldPass: true }, // Smallest positive number
				{ value: Number.MAX_SAFE_INTEGER, shouldPass: false }, // Too large
				{ value: Number.MIN_SAFE_INTEGER, shouldPass: false }, // Too small (negative)
				{ value: Number.EPSILON, shouldPass: true }, // Machine epsilon
			]

			specialValues.forEach(({ value, shouldPass }) => {
				expect(opacityValidator.isValid(value)).toBe(shouldPass)
				if (shouldPass) {
					expect(opacityValidator.validate(value)).toBe(value)
				} else {
					expect(() => opacityValidator.validate(value)).toThrow()
				}
			})
		})
	})
})
