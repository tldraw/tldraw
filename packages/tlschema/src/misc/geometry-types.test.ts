import { describe, expect, it, test } from 'vitest'
import { BoxModel, VecModel, boxModelValidator, vecModelValidator } from './geometry-types'

describe('geometry-types', () => {
	describe('VecModel interface and validator', () => {
		describe('vecModelValidator', () => {
			describe('validate method', () => {
				it('should validate 2D vectors with x and y coordinates', () => {
					const validVectors: VecModel[] = [
						{ x: 0, y: 0 },
						{ x: 10, y: 20 },
						{ x: -5, y: -10 },
						{ x: 3.14, y: 2.71 },
						{ x: Number.MAX_SAFE_INTEGER, y: Number.MIN_SAFE_INTEGER },
						{ x: 0.1, y: 0.2 },
						{ x: 100.5, y: 200.7 },
					]

					validVectors.forEach((vector) => {
						expect(() => vecModelValidator.validate(vector)).not.toThrow()
						expect(vecModelValidator.validate(vector)).toEqual(vector)
					})
				})

				it('should validate 3D vectors with x, y, and z coordinates', () => {
					const valid3DVectors: VecModel[] = [
						{ x: 0, y: 0, z: 0 },
						{ x: 10, y: 20, z: 30 },
						{ x: -5, y: -10, z: -15 },
						{ x: 3.14, y: 2.71, z: 1.41 },
						{ x: 100.5, y: 200.7, z: 300.9 },
					]

					valid3DVectors.forEach((vector) => {
						expect(() => vecModelValidator.validate(vector)).not.toThrow()
						expect(vecModelValidator.validate(vector)).toEqual(vector)
					})
				})

				it('should accept vectors with only x and y (z is optional)', () => {
					const vector2D = { x: 10, y: 20 }
					const result = vecModelValidator.validate(vector2D)

					expect(result).toEqual({ x: 10, y: 20 })
					expect('z' in result).toBe(false)
				})

				it('should preserve optional z coordinate when present', () => {
					const vector3D = { x: 10, y: 20, z: 30 }
					const result = vecModelValidator.validate(vector3D)

					expect(result).toEqual({ x: 10, y: 20, z: 30 })
					expect(result.z).toBe(30)
				})

				it('should handle z: undefined correctly', () => {
					const vectorWithUndefinedZ = { x: 10, y: 20, z: undefined }

					expect(() => vecModelValidator.validate(vectorWithUndefinedZ)).not.toThrow()
					const result = vecModelValidator.validate(vectorWithUndefinedZ)
					expect(result.x).toBe(10)
					expect(result.y).toBe(20)
					expect(result.z).toBeUndefined()
				})

				it('should reject vectors with missing x coordinate', () => {
					const invalidVectors = [{ y: 10 }, { y: 10, z: 20 }, { z: 30 }]

					invalidVectors.forEach((vector) => {
						expect(() => vecModelValidator.validate(vector)).toThrow()
					})
				})

				it('should reject vectors with missing y coordinate', () => {
					const invalidVectors = [{ x: 10 }, { x: 10, z: 20 }, { z: 30 }]

					invalidVectors.forEach((vector) => {
						expect(() => vecModelValidator.validate(vector)).toThrow()
					})
				})

				it('should reject non-numeric x coordinates', () => {
					const invalidVectors = [
						{ x: '10', y: 20 },
						{ x: null, y: 20 },
						{ x: undefined, y: 20 },
						{ x: true, y: 20 },
						{ x: [], y: 20 },
						{ x: {}, y: 20 },
						{ x: 'string', y: 20 },
						{ x: NaN, y: 20 },
						{ x: Infinity, y: 20 },
						{ x: -Infinity, y: 20 },
					]

					invalidVectors.forEach((vector) => {
						expect(() => vecModelValidator.validate(vector)).toThrow()
					})
				})

				it('should reject non-numeric y coordinates', () => {
					const invalidVectors = [
						{ x: 10, y: '20' },
						{ x: 10, y: null },
						{ x: 10, y: undefined },
						{ x: 10, y: true },
						{ x: 10, y: [] },
						{ x: 10, y: {} },
						{ x: 10, y: 'string' },
						{ x: 10, y: NaN },
						{ x: 10, y: Infinity },
						{ x: 10, y: -Infinity },
					]

					invalidVectors.forEach((vector) => {
						expect(() => vecModelValidator.validate(vector)).toThrow()
					})
				})

				it('should reject non-numeric z coordinates when present', () => {
					const invalidVectors = [
						{ x: 10, y: 20, z: '30' },
						{ x: 10, y: 20, z: null },
						{ x: 10, y: 20, z: true },
						{ x: 10, y: 20, z: [] },
						{ x: 10, y: 20, z: {} },
						{ x: 10, y: 20, z: 'string' },
						{ x: 10, y: 20, z: NaN },
						{ x: 10, y: 20, z: Infinity },
						{ x: 10, y: 20, z: -Infinity },
					]

					invalidVectors.forEach((vector) => {
						expect(() => vecModelValidator.validate(vector)).toThrow()
					})
				})

				it('should reject non-object values', () => {
					const invalidValues = [
						'string',
						123,
						true,
						false,
						null,
						undefined,
						[],
						[10, 20],
						'10,20',
						Symbol('vector'),
						new Date(),
						() => {},
					]

					invalidValues.forEach((value) => {
						expect(() => vecModelValidator.validate(value)).toThrow()
					})
				})

				it('should reject objects with extra properties (strict validation)', () => {
					const vectorsWithExtraProps = [
						{ x: 10, y: 20, extra: 'property' },
						{ x: 10, y: 20, z: 30, id: 'vec1' },
						{ x: 10, y: 20, name: 'vector' },
					]

					vectorsWithExtraProps.forEach((vector) => {
						expect(() => vecModelValidator.validate(vector)).toThrow()
					})
				})

				test('should handle edge case numeric values', () => {
					const edgeCaseVectors = [
						{ x: 0, y: 0 },
						{ x: -0, y: -0 },
						{ x: 0.000001, y: 0.000001 },
						{ x: Number.EPSILON, y: Number.EPSILON },
						{ x: Number.MAX_VALUE, y: Number.MIN_VALUE },
						{ x: 1e-10, y: 1e10 },
					]

					edgeCaseVectors.forEach((vector) => {
						expect(() => vecModelValidator.validate(vector)).not.toThrow()
						const result = vecModelValidator.validate(vector)
						expect(typeof result.x).toBe('number')
						expect(typeof result.y).toBe('number')
					})
				})
			})

			describe('isValid method', () => {
				it('should return true for valid 2D vectors', () => {
					const validVectors: VecModel[] = [
						{ x: 0, y: 0 },
						{ x: 10, y: 20 },
						{ x: -5, y: -10 },
						{ x: 3.14, y: 2.71 },
					]

					validVectors.forEach((vector) => {
						expect(vecModelValidator.isValid(vector)).toBe(true)
					})
				})

				it('should return true for valid 3D vectors', () => {
					const valid3DVectors: VecModel[] = [
						{ x: 0, y: 0, z: 0 },
						{ x: 10, y: 20, z: 30 },
						{ x: -5, y: -10, z: -15 },
					]

					valid3DVectors.forEach((vector) => {
						expect(vecModelValidator.isValid(vector)).toBe(true)
					})
				})

				it('should return false for invalid vectors', () => {
					const invalidVectors = [
						{ x: '10', y: 20 },
						{ x: 10, y: '20' },
						{ x: 10 }, // missing y
						{ y: 20 }, // missing x
						{ x: null, y: 20 },
						{ x: 10, y: null },
						{ x: 10, y: 20, z: 'invalid' },
						'string',
						123,
						null,
						undefined,
						[],
						{},
					]

					invalidVectors.forEach((vector) => {
						expect(vecModelValidator.isValid(vector)).toBe(false)
					})
				})

				test('should not throw for any input', () => {
					const testValues = [
						{ x: 10, y: 20 },
						{ x: '10', y: 20 },
						'invalid',
						123,
						null,
						undefined,
						{},
						[],
					]

					testValues.forEach((value) => {
						expect(() => vecModelValidator.isValid(value)).not.toThrow()
					})
				})
			})

			describe('consistency between validate and isValid', () => {
				test('should be consistent for valid vectors', () => {
					const validVectors: VecModel[] = [
						{ x: 10, y: 20 },
						{ x: 10, y: 20, z: 30 },
						{ x: 0, y: 0 },
						{ x: -5, y: -10 },
					]

					validVectors.forEach((vector) => {
						const isValidResult = vecModelValidator.isValid(vector)
						expect(isValidResult).toBe(true)

						expect(() => vecModelValidator.validate(vector)).not.toThrow()
						expect(vecModelValidator.validate(vector)).toEqual(vector)
					})
				})

				test('should be consistent for invalid vectors', () => {
					const invalidVectors = [
						{ x: '10', y: 20 },
						{ x: 10 },
						'invalid',
						123,
						null,
						undefined,
						{},
						[],
					]

					invalidVectors.forEach((vector) => {
						const isValidResult = vecModelValidator.isValid(vector)
						expect(isValidResult).toBe(false)

						expect(() => vecModelValidator.validate(vector)).toThrow()
					})
				})
			})
		})
	})

	describe('BoxModel interface and validator', () => {
		describe('boxModelValidator', () => {
			describe('validate method', () => {
				it('should validate boxes with numeric x, y, w, h coordinates', () => {
					const validBoxes: BoxModel[] = [
						{ x: 0, y: 0, w: 0, h: 0 },
						{ x: 10, y: 20, w: 100, h: 50 },
						{ x: -5, y: -10, w: 200, h: 150 },
						{ x: 3.14, y: 2.71, w: 100.5, h: 200.7 },
						{ x: Number.MAX_SAFE_INTEGER, y: Number.MIN_SAFE_INTEGER, w: 1000, h: 1000 },
						{ x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
					]

					validBoxes.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).not.toThrow()
						expect(boxModelValidator.validate(box)).toEqual(box)
					})
				})

				it('should allow negative dimensions (as per JSDoc comment)', () => {
					const boxesWithNegativeDimensions: BoxModel[] = [
						{ x: 10, y: 20, w: -100, h: 50 },
						{ x: 10, y: 20, w: 100, h: -50 },
						{ x: 10, y: 20, w: -100, h: -50 },
						{ x: -10, y: -20, w: -100, h: -50 },
					]

					boxesWithNegativeDimensions.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).not.toThrow()
						expect(boxModelValidator.validate(box)).toEqual(box)
					})
				})

				it('should reject boxes with missing x coordinate', () => {
					const invalidBoxes = [
						{ y: 10, w: 100, h: 50 },
						{ y: 10, w: 100, h: 50, extra: 'prop' },
					]

					invalidBoxes.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).toThrow()
					})
				})

				it('should reject boxes with missing y coordinate', () => {
					const invalidBoxes = [
						{ x: 10, w: 100, h: 50 },
						{ x: 10, w: 100, h: 50, extra: 'prop' },
					]

					invalidBoxes.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).toThrow()
					})
				})

				it('should reject boxes with missing w coordinate', () => {
					const invalidBoxes = [
						{ x: 10, y: 20, h: 50 },
						{ x: 10, y: 20, h: 50, extra: 'prop' },
					]

					invalidBoxes.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).toThrow()
					})
				})

				it('should reject boxes with missing h coordinate', () => {
					const invalidBoxes = [
						{ x: 10, y: 20, w: 100 },
						{ x: 10, y: 20, w: 100, extra: 'prop' },
					]

					invalidBoxes.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).toThrow()
					})
				})

				it('should reject non-numeric x coordinates', () => {
					const invalidBoxes = [
						{ x: '10', y: 20, w: 100, h: 50 },
						{ x: null, y: 20, w: 100, h: 50 },
						{ x: undefined, y: 20, w: 100, h: 50 },
						{ x: true, y: 20, w: 100, h: 50 },
						{ x: [], y: 20, w: 100, h: 50 },
						{ x: {}, y: 20, w: 100, h: 50 },
						{ x: 'string', y: 20, w: 100, h: 50 },
						{ x: NaN, y: 20, w: 100, h: 50 },
						{ x: Infinity, y: 20, w: 100, h: 50 },
						{ x: -Infinity, y: 20, w: 100, h: 50 },
					]

					invalidBoxes.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).toThrow()
					})
				})

				it('should reject non-numeric y coordinates', () => {
					const invalidBoxes = [
						{ x: 10, y: '20', w: 100, h: 50 },
						{ x: 10, y: null, w: 100, h: 50 },
						{ x: 10, y: undefined, w: 100, h: 50 },
						{ x: 10, y: true, w: 100, h: 50 },
						{ x: 10, y: [], w: 100, h: 50 },
						{ x: 10, y: {}, w: 100, h: 50 },
						{ x: 10, y: 'string', w: 100, h: 50 },
						{ x: 10, y: NaN, w: 100, h: 50 },
						{ x: 10, y: Infinity, w: 100, h: 50 },
						{ x: 10, y: -Infinity, w: 100, h: 50 },
					]

					invalidBoxes.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).toThrow()
					})
				})

				it('should reject non-numeric w coordinates', () => {
					const invalidBoxes = [
						{ x: 10, y: 20, w: '100', h: 50 },
						{ x: 10, y: 20, w: null, h: 50 },
						{ x: 10, y: 20, w: undefined, h: 50 },
						{ x: 10, y: 20, w: true, h: 50 },
						{ x: 10, y: 20, w: [], h: 50 },
						{ x: 10, y: 20, w: {}, h: 50 },
						{ x: 10, y: 20, w: 'string', h: 50 },
						{ x: 10, y: 20, w: NaN, h: 50 },
						{ x: 10, y: 20, w: Infinity, h: 50 },
						{ x: 10, y: 20, w: -Infinity, h: 50 },
					]

					invalidBoxes.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).toThrow()
					})
				})

				it('should reject non-numeric h coordinates', () => {
					const invalidBoxes = [
						{ x: 10, y: 20, w: 100, h: '50' },
						{ x: 10, y: 20, w: 100, h: null },
						{ x: 10, y: 20, w: 100, h: undefined },
						{ x: 10, y: 20, w: 100, h: true },
						{ x: 10, y: 20, w: 100, h: [] },
						{ x: 10, y: 20, w: 100, h: {} },
						{ x: 10, y: 20, w: 100, h: 'string' },
						{ x: 10, y: 20, w: 100, h: NaN },
						{ x: 10, y: 20, w: 100, h: Infinity },
						{ x: 10, y: 20, w: 100, h: -Infinity },
					]

					invalidBoxes.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).toThrow()
					})
				})

				it('should reject non-object values', () => {
					const invalidValues = [
						'string',
						123,
						true,
						false,
						null,
						undefined,
						[],
						[10, 20, 100, 50],
						'10,20,100,50',
						Symbol('box'),
						new Date(),
						() => {},
					]

					invalidValues.forEach((value) => {
						expect(() => boxModelValidator.validate(value)).toThrow()
					})
				})

				it('should reject objects with extra properties (strict validation)', () => {
					const boxesWithExtraProps = [
						{ x: 10, y: 20, w: 100, h: 50, extra: 'property' },
						{ x: 10, y: 20, w: 100, h: 50, id: 'box1' },
						{ x: 10, y: 20, w: 100, h: 50, name: 'rectangle' },
					]

					boxesWithExtraProps.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).toThrow()
					})
				})

				test('should handle edge case numeric values', () => {
					const edgeCaseBoxes = [
						{ x: 0, y: 0, w: 0, h: 0 },
						{ x: -0, y: -0, w: -0, h: -0 },
						{ x: 0.000001, y: 0.000001, w: 0.000001, h: 0.000001 },
						{ x: Number.EPSILON, y: Number.EPSILON, w: Number.EPSILON, h: Number.EPSILON },
						{ x: Number.MAX_VALUE, y: Number.MIN_VALUE, w: 1000, h: 1000 },
						{ x: 1e-10, y: 1e10, w: 1e5, h: 1e-5 },
					]

					edgeCaseBoxes.forEach((box) => {
						expect(() => boxModelValidator.validate(box)).not.toThrow()
						const result = boxModelValidator.validate(box)
						expect(typeof result.x).toBe('number')
						expect(typeof result.y).toBe('number')
						expect(typeof result.w).toBe('number')
						expect(typeof result.h).toBe('number')
					})
				})
			})

			describe('isValid method', () => {
				it('should return true for valid boxes', () => {
					const validBoxes: BoxModel[] = [
						{ x: 0, y: 0, w: 0, h: 0 },
						{ x: 10, y: 20, w: 100, h: 50 },
						{ x: -5, y: -10, w: 200, h: 150 },
						{ x: 3.14, y: 2.71, w: 100.5, h: 200.7 },
						{ x: 10, y: 20, w: -100, h: 50 }, // negative dimensions allowed
					]

					validBoxes.forEach((box) => {
						expect(boxModelValidator.isValid(box)).toBe(true)
					})
				})

				it('should return false for invalid boxes', () => {
					const invalidBoxes = [
						{ x: '10', y: 20, w: 100, h: 50 },
						{ x: 10, y: '20', w: 100, h: 50 },
						{ x: 10, y: 20, w: '100', h: 50 },
						{ x: 10, y: 20, w: 100, h: '50' },
						{ x: 10, y: 20, w: 100 }, // missing h
						{ x: 10, y: 20, h: 50 }, // missing w
						{ x: 10, w: 100, h: 50 }, // missing y
						{ y: 20, w: 100, h: 50 }, // missing x
						{ x: null, y: 20, w: 100, h: 50 },
						{ x: 10, y: null, w: 100, h: 50 },
						{ x: 10, y: 20, w: null, h: 50 },
						{ x: 10, y: 20, w: 100, h: null },
						'string',
						123,
						null,
						undefined,
						[],
						{},
					]

					invalidBoxes.forEach((box) => {
						expect(boxModelValidator.isValid(box)).toBe(false)
					})
				})

				test('should not throw for any input', () => {
					const testValues = [
						{ x: 10, y: 20, w: 100, h: 50 },
						{ x: '10', y: 20, w: 100, h: 50 },
						'invalid',
						123,
						null,
						undefined,
						{},
						[],
					]

					testValues.forEach((value) => {
						expect(() => boxModelValidator.isValid(value)).not.toThrow()
					})
				})
			})

			describe('consistency between validate and isValid', () => {
				test('should be consistent for valid boxes', () => {
					const validBoxes: BoxModel[] = [
						{ x: 10, y: 20, w: 100, h: 50 },
						{ x: 0, y: 0, w: 0, h: 0 },
						{ x: -5, y: -10, w: -100, h: -50 },
						{ x: 3.14, y: 2.71, w: 100.5, h: 200.7 },
					]

					validBoxes.forEach((box) => {
						const isValidResult = boxModelValidator.isValid(box)
						expect(isValidResult).toBe(true)

						expect(() => boxModelValidator.validate(box)).not.toThrow()
						expect(boxModelValidator.validate(box)).toEqual(box)
					})
				})

				test('should be consistent for invalid boxes', () => {
					const invalidBoxes = [
						{ x: '10', y: 20, w: 100, h: 50 },
						{ x: 10, y: 20, w: 100 }, // missing h
						'invalid',
						123,
						null,
						undefined,
						{},
						[],
					]

					invalidBoxes.forEach((box) => {
						const isValidResult = boxModelValidator.isValid(box)
						expect(isValidResult).toBe(false)

						expect(() => boxModelValidator.validate(box)).toThrow()
					})
				})
			})
		})
	})

	describe('integration tests', () => {
		test('should work with TypeScript types correctly', () => {
			// This test verifies that the types work correctly at runtime
			const vector: VecModel = { x: 10, y: 20 }
			const vector3D: VecModel = { x: 10, y: 20, z: 30 }
			const box: BoxModel = { x: 10, y: 20, w: 100, h: 50 }

			expect(vecModelValidator.validate(vector)).toEqual(vector)
			expect(vecModelValidator.validate(vector3D)).toEqual(vector3D)
			expect(boxModelValidator.validate(box)).toEqual(box)

			expect(vecModelValidator.isValid(vector)).toBe(true)
			expect(vecModelValidator.isValid(vector3D)).toBe(true)
			expect(boxModelValidator.isValid(box)).toBe(true)
		})

		test('should work with documented examples from JSDoc', () => {
			// Test examples from vecModelValidator JSDoc
			const vector2D = { x: 10, y: 20 }
			expect(vecModelValidator.isValid(vector2D)).toBe(true)

			const vector3D = { x: 10, y: 20, z: 30 }
			expect(vecModelValidator.isValid(vector3D)).toBe(true)

			// Test examples from boxModelValidator JSDoc
			const box = { x: 10, y: 20, w: 100, h: 50 }
			expect(boxModelValidator.isValid(box)).toBe(true)

			const invalidBox = { x: 10, y: 20, w: -5, h: 50 }
			expect(boxModelValidator.isValid(invalidBox)).toBe(true) // validator allows negative values
		})

		test('should support realistic usage scenarios', () => {
			// Simulate real-world usage patterns
			const processVectorInput = (input: unknown): VecModel | null => {
				if (vecModelValidator.isValid(input)) {
					return vecModelValidator.validate(input)
				}
				return null
			}

			const processBoxInput = (input: unknown): BoxModel | null => {
				if (boxModelValidator.isValid(input)) {
					return boxModelValidator.validate(input)
				}
				return null
			}

			// Valid inputs
			expect(processVectorInput({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
			expect(processVectorInput({ x: 10, y: 20, z: 30 })).toEqual({ x: 10, y: 20, z: 30 })
			expect(processBoxInput({ x: 10, y: 20, w: 100, h: 50 })).toEqual({
				x: 10,
				y: 20,
				w: 100,
				h: 50,
			})

			// Invalid inputs
			expect(processVectorInput({ x: '10', y: 20 })).toBe(null)
			expect(processVectorInput('invalid')).toBe(null)
			expect(processBoxInput({ x: 10, y: 20, w: 100 })).toBe(null)
			expect(processBoxInput('invalid')).toBe(null)
		})

		test('should work with geometry calculations', () => {
			// Test realistic geometry operations
			const origin: VecModel = { x: 0, y: 0 }
			const point: VecModel = { x: 10, y: 20 }
			const point3D: VecModel = { x: 10, y: 20, z: 30 }

			const boundingBox: BoxModel = { x: 0, y: 0, w: 100, h: 200 }
			const negativeBox: BoxModel = { x: -50, y: -100, w: 100, h: 200 }

			// All should be valid
			expect(vecModelValidator.isValid(origin)).toBe(true)
			expect(vecModelValidator.isValid(point)).toBe(true)
			expect(vecModelValidator.isValid(point3D)).toBe(true)
			expect(boxModelValidator.isValid(boundingBox)).toBe(true)
			expect(boxModelValidator.isValid(negativeBox)).toBe(true)

			// Validate that we can safely use them
			const validatedOrigin = vecModelValidator.validate(origin)
			const validatedBox = boxModelValidator.validate(boundingBox)

			expect(validatedOrigin.x + validatedOrigin.y).toBe(0)
			expect(validatedBox.w * validatedBox.h).toBe(20000)
		})
	})

	describe('error handling', () => {
		test('should provide helpful error messages for VecModel validation', () => {
			try {
				vecModelValidator.validate({ x: 10 }) // missing y
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toContain('At')
			}

			try {
				vecModelValidator.validate({ x: '10', y: 20 }) // non-numeric x
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toContain('At')
			}
		})

		test('should provide helpful error messages for BoxModel validation', () => {
			try {
				boxModelValidator.validate({ x: 10, y: 20, w: 100 }) // missing h
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toContain('At')
			}

			try {
				boxModelValidator.validate({ x: '10', y: 20, w: 100, h: 50 }) // non-numeric x
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toContain('At')
			}
		})

		test('should handle validation errors gracefully', () => {
			const safeValidateVector = (value: unknown): VecModel | null => {
				try {
					return vecModelValidator.validate(value)
				} catch {
					return null
				}
			}

			const safeValidateBox = (value: unknown): BoxModel | null => {
				try {
					return boxModelValidator.validate(value)
				} catch {
					return null
				}
			}

			expect(safeValidateVector({ x: 10, y: 20 })).toEqual({ x: 10, y: 20 })
			expect(safeValidateVector('invalid')).toBe(null)
			expect(safeValidateVector({ x: '10', y: 20 })).toBe(null)

			expect(safeValidateBox({ x: 10, y: 20, w: 100, h: 50 })).toEqual({
				x: 10,
				y: 20,
				w: 100,
				h: 50,
			})
			expect(safeValidateBox('invalid')).toBe(null)
			expect(safeValidateBox({ x: 10, y: 20, w: 100 })).toBe(null)
		})
	})

	describe('validator properties', () => {
		test('should have correct validator structure for vecModelValidator', () => {
			expect(vecModelValidator).toBeDefined()
			expect(typeof vecModelValidator.validate).toBe('function')
			expect(typeof vecModelValidator.isValid).toBe('function')
		})

		test('should have correct validator structure for boxModelValidator', () => {
			expect(boxModelValidator).toBeDefined()
			expect(typeof boxModelValidator.validate).toBe('function')
			expect(typeof boxModelValidator.isValid).toBe('function')
		})

		test('should be based on T.object validator behavior', () => {
			// The validators should behave consistently with T.object behavior
			const validVector = { x: 10, y: 20 }
			const validBox = { x: 10, y: 20, w: 100, h: 50 }

			expect(vecModelValidator.validate(validVector)).toEqual(validVector)
			expect(boxModelValidator.validate(validBox)).toEqual(validBox)

			// Object reference should be preserved when valid
			const vectorResult = vecModelValidator.validate(validVector)
			const boxResult = boxModelValidator.validate(validBox)

			expect(vectorResult.x).toBe(validVector.x)
			expect(vectorResult.y).toBe(validVector.y)
			expect(boxResult.x).toBe(validBox.x)
			expect(boxResult.y).toBe(validBox.y)
			expect(boxResult.w).toBe(validBox.w)
			expect(boxResult.h).toBe(validBox.h)
		})
	})
})
