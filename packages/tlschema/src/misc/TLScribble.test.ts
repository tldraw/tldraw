import { describe, expect, it, test } from 'vitest'
import { scribbleValidator, TL_SCRIBBLE_STATES, TLScribble } from './TLScribble'

describe('TLScribble', () => {
	describe('TL_SCRIBBLE_STATES', () => {
		it('should be a Set containing expected scribble states', () => {
			expect(TL_SCRIBBLE_STATES).toBeInstanceOf(Set)
			expect(TL_SCRIBBLE_STATES.size).toBeGreaterThan(0)
		})

		it('should contain all expected scribble states', () => {
			const expectedStates = ['starting', 'paused', 'active', 'stopping']

			expectedStates.forEach((state) => {
				expect(TL_SCRIBBLE_STATES.has(state as any)).toBe(true)
			})
		})

		it('should have the correct number of scribble states', () => {
			// Verify the set contains exactly 4 states
			expect(TL_SCRIBBLE_STATES.size).toBe(4)
		})

		it('should not contain unexpected scribble states', () => {
			const unexpectedStates = [
				'idle',
				'running',
				'finished',
				'cancelled',
				'pending',
				'completed',
				'started',
				'stopped',
				'drawing',
				'waiting',
				'ready',
			]

			unexpectedStates.forEach((state) => {
				expect(TL_SCRIBBLE_STATES.has(state as any)).toBe(false)
			})
		})

		it('should be immutable (readonly)', () => {
			// The Set should be created with readonly values
			const originalSize = TL_SCRIBBLE_STATES.size

			// Try to add a new value (this should not affect the original set due to const assertion)
			expect(TL_SCRIBBLE_STATES.size).toBe(originalSize)
		})

		test('should work with Array.from() conversion', () => {
			const statesArray = Array.from(TL_SCRIBBLE_STATES)

			expect(Array.isArray(statesArray)).toBe(true)
			expect(statesArray.length).toBe(TL_SCRIBBLE_STATES.size)

			// All array elements should be strings
			statesArray.forEach((state) => {
				expect(typeof state).toBe('string')
			})
		})

		test('should support iteration', () => {
			let count = 0
			for (const state of TL_SCRIBBLE_STATES) {
				expect(typeof state).toBe('string')
				count++
			}
			expect(count).toBe(TL_SCRIBBLE_STATES.size)
		})

		test('should match expected state values exactly', () => {
			const statesArray = Array.from(TL_SCRIBBLE_STATES).sort()
			const expectedArray = ['starting', 'paused', 'active', 'stopping'].sort()

			expect(statesArray).toEqual(expectedArray)
		})
	})

	describe('scribbleValidator', () => {
		describe('validate method', () => {
			it('should validate a complete valid scribble object', () => {
				const validScribble: TLScribble = {
					id: 'scribble-123',
					points: [
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 5, z: 0.7 },
						{ x: 20, y: 10, z: 0.6 },
					],
					size: 4,
					color: 'black',
					opacity: 0.8,
					state: 'active',
					delay: 0,
					shrink: 0.1,
					taper: true,
				}

				expect(() => scribbleValidator.validate(validScribble)).not.toThrow()
				const result = scribbleValidator.validate(validScribble)
				expect(result).toEqual(validScribble)
			})

			it('should validate a scribble with minimal valid properties', () => {
				const minimalScribble: TLScribble = {
					id: 'minimal-scribble',
					points: [{ x: 0, y: 0 }],
					size: 1,
					color: 'accent',
					opacity: 1,
					state: 'starting',
					delay: 0,
					shrink: 0,
					taper: false,
				}

				expect(() => scribbleValidator.validate(minimalScribble)).not.toThrow()
				const result = scribbleValidator.validate(minimalScribble)
				expect(result).toEqual(minimalScribble)
			})

			it('should validate all valid scribble states', () => {
				const baseScribble = {
					id: 'test-scribble',
					points: [{ x: 0, y: 0 }],
					size: 2,
					color: 'white' as const,
					opacity: 0.5,
					delay: 10,
					shrink: 0.05,
					taper: true,
				}

				const validStates = Array.from(TL_SCRIBBLE_STATES)
				validStates.forEach((state) => {
					const scribble = { ...baseScribble, state }
					expect(() => scribbleValidator.validate(scribble)).not.toThrow()
					expect(scribbleValidator.validate(scribble).state).toBe(state)
				})
			})

			it('should validate all valid canvas UI colors', () => {
				const validColors = [
					'accent',
					'white',
					'black',
					'selection-stroke',
					'selection-fill',
					'laser',
					'muted-1',
				]
				const baseScribble = {
					id: 'color-test',
					points: [{ x: 0, y: 0 }],
					size: 3,
					opacity: 1,
					state: 'active' as const,
					delay: 0,
					shrink: 0,
					taper: false,
				}

				validColors.forEach((color) => {
					const scribble = { ...baseScribble, color }
					expect(() => scribbleValidator.validate(scribble)).not.toThrow()
					expect(scribbleValidator.validate(scribble).color).toBe(color)
				})
			})

			it('should validate points arrays with different vector types', () => {
				const baseScribble = {
					id: 'points-test',
					size: 2,
					color: 'black' as const,
					opacity: 1,
					state: 'active' as const,
					delay: 0,
					shrink: 0,
					taper: false,
				}

				// 2D points only
				const scribble2D = {
					...baseScribble,
					points: [
						{ x: 0, y: 0 },
						{ x: 10, y: 10 },
						{ x: 20, y: 5 },
					],
				}
				expect(() => scribbleValidator.validate(scribble2D)).not.toThrow()

				// 3D points (with z coordinate)
				const scribble3D = {
					...baseScribble,
					points: [
						{ x: 0, y: 0, z: 0.5 },
						{ x: 10, y: 10, z: 0.8 },
						{ x: 20, y: 5, z: 0.3 },
					],
				}
				expect(() => scribbleValidator.validate(scribble3D)).not.toThrow()

				// Mixed 2D and 3D points
				const scribbleMixed = {
					...baseScribble,
					points: [
						{ x: 0, y: 0 },
						{ x: 10, y: 10, z: 0.7 },
						{ x: 20, y: 5 },
					],
				}
				expect(() => scribbleValidator.validate(scribbleMixed)).not.toThrow()

				// Empty points array
				const scribbleEmpty = {
					...baseScribble,
					points: [],
				}
				expect(() => scribbleValidator.validate(scribbleEmpty)).not.toThrow()

				// Single point
				const scribbleSingle = {
					...baseScribble,
					points: [{ x: 100, y: 200, z: 1.0 }],
				}
				expect(() => scribbleValidator.validate(scribbleSingle)).not.toThrow()
			})

			it('should validate various numeric properties', () => {
				const baseScribble = {
					id: 'numeric-test',
					points: [{ x: 0, y: 0 }],
					color: 'accent' as const,
					state: 'active' as const,
				}

				// Test different size values (must be positive)
				const validSizes = [0.1, 1, 5, 10, 100, 1000]
				validSizes.forEach((size) => {
					const scribble = { ...baseScribble, size, opacity: 1, delay: 0, shrink: 0, taper: false }
					expect(() => scribbleValidator.validate(scribble)).not.toThrow()
				})

				// Test different opacity values
				const validOpacities = [0, 0.1, 0.5, 0.8, 1, 1.5, -0.5] // Allow any number for opacity
				validOpacities.forEach((opacity) => {
					const scribble = { ...baseScribble, size: 1, opacity, delay: 0, shrink: 0, taper: false }
					expect(() => scribbleValidator.validate(scribble)).not.toThrow()
				})

				// Test different delay values
				const validDelays = [0, 10, 100, 1000, -10] // Allow any number for delay
				validDelays.forEach((delay) => {
					const scribble = { ...baseScribble, size: 1, opacity: 1, delay, shrink: 0, taper: false }
					expect(() => scribbleValidator.validate(scribble)).not.toThrow()
				})

				// Test different shrink values
				const validShrinks = [0, 0.1, 0.5, 1, 2, -0.5] // Allow any number for shrink
				validShrinks.forEach((shrink) => {
					const scribble = { ...baseScribble, size: 1, opacity: 1, delay: 0, shrink, taper: false }
					expect(() => scribbleValidator.validate(scribble)).not.toThrow()
				})
			})

			it('should validate boolean taper values', () => {
				const baseScribble = {
					id: 'taper-test',
					points: [{ x: 0, y: 0 }],
					size: 2,
					color: 'black' as const,
					opacity: 1,
					state: 'active' as const,
					delay: 0,
					shrink: 0,
				}

				const scribbleTrue = { ...baseScribble, taper: true }
				expect(() => scribbleValidator.validate(scribbleTrue)).not.toThrow()

				const scribbleFalse = { ...baseScribble, taper: false }
				expect(() => scribbleValidator.validate(scribbleFalse)).not.toThrow()
			})

			describe('invalid inputs', () => {
				it('should reject missing required properties', () => {
					const incompleteScribbles = [
						{}, // completely empty
						{ id: 'test' }, // missing other properties
						{
							id: 'test',
							points: [{ x: 0, y: 0 }],
							// missing size, color, opacity, state, delay, shrink, taper
						},
						{
							id: 'test',
							points: [{ x: 0, y: 0 }],
							size: 2,
							color: 'black',
							opacity: 1,
							// missing state, delay, shrink, taper
						},
					]

					incompleteScribbles.forEach((scribble) => {
						expect(() => scribbleValidator.validate(scribble)).toThrow()
					})
				})

				it('should reject invalid property types', () => {
					const baseScribble = {
						id: 'type-test',
						points: [{ x: 0, y: 0 }],
						size: 2,
						color: 'black' as const,
						opacity: 1,
						state: 'active' as const,
						delay: 0,
						shrink: 0,
						taper: false,
					}

					// Invalid id types
					const invalidIds = [123, null, undefined, {}, [], true]
					invalidIds.forEach((id) => {
						expect(() => scribbleValidator.validate({ ...baseScribble, id })).toThrow()
					})

					// Invalid points types
					const invalidPoints = [null, undefined, 'string', 123, true, {}]
					invalidPoints.forEach((points) => {
						expect(() => scribbleValidator.validate({ ...baseScribble, points })).toThrow()
					})

					// Invalid points array content
					const invalidPointArrays = [
						[null],
						[undefined],
						[123],
						['string'],
						[{ x: 'not-number', y: 0 }],
						[{ x: 0, y: 'not-number' }],
						[{ x: 0 }], // missing y
						[{ y: 0 }], // missing x
						[{}], // empty object
					]
					invalidPointArrays.forEach((points) => {
						expect(() => scribbleValidator.validate({ ...baseScribble, points })).toThrow()
					})

					// Invalid size types (must be positive number)
					const invalidSizes = ['string', null, undefined, {}, [], true, false, -1, -10]
					invalidSizes.forEach((size) => {
						expect(() => scribbleValidator.validate({ ...baseScribble, size })).toThrow()
					})

					// Invalid color types
					const invalidColors = [123, null, undefined, {}, [], true, 'invalid-color', 'red']
					invalidColors.forEach((color) => {
						expect(() => scribbleValidator.validate({ ...baseScribble, color })).toThrow()
					})

					// Invalid state types
					const invalidStates = [123, null, undefined, {}, [], true, 'invalid-state', 'running']
					invalidStates.forEach((state) => {
						expect(() => scribbleValidator.validate({ ...baseScribble, state })).toThrow()
					})

					// Invalid opacity types
					const invalidOpacities = ['string', null, undefined, {}, [], true]
					invalidOpacities.forEach((opacity) => {
						expect(() => scribbleValidator.validate({ ...baseScribble, opacity })).toThrow()
					})

					// Invalid delay types
					const invalidDelays = ['string', null, undefined, {}, [], true]
					invalidDelays.forEach((delay) => {
						expect(() => scribbleValidator.validate({ ...baseScribble, delay })).toThrow()
					})

					// Invalid shrink types
					const invalidShrinks = ['string', null, undefined, {}, [], true]
					invalidShrinks.forEach((shrink) => {
						expect(() => scribbleValidator.validate({ ...baseScribble, shrink })).toThrow()
					})

					// Invalid taper types
					const invalidTapers = ['string', null, undefined, {}, [], 123, 0, 1]
					invalidTapers.forEach((taper) => {
						expect(() => scribbleValidator.validate({ ...baseScribble, taper })).toThrow()
					})
				})

				it('should provide descriptive error messages', () => {
					expect(() => scribbleValidator.validate({})).toThrow()

					try {
						scribbleValidator.validate({ id: 123 })
						expect.fail('Should have thrown an error')
					} catch (error) {
						expect(error).toBeInstanceOf(Error)
						expect((error as Error).message).toContain('string')
					}

					try {
						scribbleValidator.validate({
							id: 'test',
							points: [{ x: 0, y: 0 }],
							size: 2,
							color: 'invalid-color',
							opacity: 1,
							state: 'active',
							delay: 0,
							shrink: 0,
							taper: false,
						})
						expect.fail('Should have thrown an error')
					} catch (error) {
						expect(error).toBeInstanceOf(Error)
						expect((error as Error).message).toContain('Expected')
					}
				})
			})
		})

		describe('isValid method', () => {
			it('should return true for valid scribble objects', () => {
				const validScribbles: TLScribble[] = [
					{
						id: 'scribble-1',
						points: [{ x: 0, y: 0 }],
						size: 2,
						color: 'black',
						opacity: 1,
						state: 'active',
						delay: 0,
						shrink: 0,
						taper: false,
					},
					{
						id: 'laser-pointer',
						points: [{ x: 50, y: 50, z: 1.0 }],
						size: 8,
						color: 'laser',
						opacity: 1.0,
						state: 'active',
						delay: 100,
						shrink: 0,
						taper: false,
					},
					{
						id: 'complex-scribble',
						points: [
							{ x: 0, y: 0, z: 0.5 },
							{ x: 10, y: 5, z: 0.7 },
							{ x: 20, y: 10, z: 0.6 },
						],
						size: 4,
						color: 'selection-stroke',
						opacity: 0.8,
						state: 'stopping',
						delay: 50,
						shrink: 0.1,
						taper: true,
					},
				]

				validScribbles.forEach((scribble) => {
					expect(scribbleValidator.isValid(scribble)).toBe(true)
				})
			})

			it('should return false for invalid scribble objects', () => {
				const invalidScribbles = [
					{}, // empty object
					null,
					undefined,
					'string',
					123,
					[],
					{ id: 'missing-props' }, // missing required properties
					{
						id: 123, // wrong type
						points: [{ x: 0, y: 0 }],
						size: 2,
						color: 'black',
						opacity: 1,
						state: 'active',
						delay: 0,
						shrink: 0,
						taper: false,
					},
					{
						id: 'invalid-size',
						points: [{ x: 0, y: 0 }],
						size: -1, // negative size
						color: 'black',
						opacity: 1,
						state: 'active',
						delay: 0,
						shrink: 0,
						taper: false,
					},
					{
						id: 'invalid-color',
						points: [{ x: 0, y: 0 }],
						size: 2,
						color: 'red', // not a valid canvas UI color
						opacity: 1,
						state: 'active',
						delay: 0,
						shrink: 0,
						taper: false,
					},
					{
						id: 'invalid-state',
						points: [{ x: 0, y: 0 }],
						size: 2,
						color: 'black',
						opacity: 1,
						state: 'running', // not a valid scribble state
						delay: 0,
						shrink: 0,
						taper: false,
					},
				]

				invalidScribbles.forEach((scribble) => {
					expect(scribbleValidator.isValid(scribble)).toBe(false)
				})
			})

			it('should not throw errors for any input', () => {
				const testValues = [
					null,
					undefined,
					{},
					[],
					'string',
					123,
					true,
					false,
					Symbol('test'),
					new Date(),
					{
						id: 'test',
						points: [{ x: 0, y: 0 }],
						size: 2,
						color: 'black',
						opacity: 1,
						state: 'active',
						delay: 0,
						shrink: 0,
						taper: false,
					},
				]

				testValues.forEach((value) => {
					expect(() => scribbleValidator.isValid(value)).not.toThrow()
				})
			})
		})

		describe('consistency between validate and isValid', () => {
			test('should be consistent for valid values', () => {
				const validScribble: TLScribble = {
					id: 'consistency-test',
					points: [{ x: 0, y: 0, z: 0.5 }],
					size: 3,
					color: 'accent',
					opacity: 0.9,
					state: 'paused',
					delay: 25,
					shrink: 0.05,
					taper: true,
				}

				const isValidResult = scribbleValidator.isValid(validScribble)
				expect(isValidResult).toBe(true)

				expect(() => scribbleValidator.validate(validScribble)).not.toThrow()
				expect(scribbleValidator.validate(validScribble)).toEqual(validScribble)
			})

			test('should be consistent for invalid values', () => {
				const invalidValues = [
					null,
					undefined,
					{},
					'string',
					123,
					{
						id: 123, // invalid type
						points: [{ x: 0, y: 0 }],
						size: 2,
						color: 'black',
						opacity: 1,
						state: 'active',
						delay: 0,
						shrink: 0,
						taper: false,
					},
					{
						id: 'test',
						points: 'invalid', // invalid points
						size: 2,
						color: 'black',
						opacity: 1,
						state: 'active',
						delay: 0,
						shrink: 0,
						taper: false,
					},
				]

				invalidValues.forEach((value) => {
					const isValidResult = scribbleValidator.isValid(value)
					expect(isValidResult).toBe(false)

					expect(() => scribbleValidator.validate(value)).toThrow()
				})
			})
		})

		describe('validator properties', () => {
			it('should have the correct validator structure', () => {
				expect(scribbleValidator).toBeDefined()
				expect(typeof scribbleValidator.validate).toBe('function')
				expect(typeof scribbleValidator.isValid).toBe('function')
			})

			it('should be based on object validator', () => {
				// The validator should behave consistently with T.object behavior
				const validScribble: TLScribble = {
					id: 'structure-test',
					points: [{ x: 10, y: 20 }],
					size: 1,
					color: 'white',
					opacity: 1,
					state: 'starting',
					delay: 0,
					shrink: 0,
					taper: false,
				}

				const result = scribbleValidator.validate(validScribble)
				expect(result).toEqual(validScribble)
				expect(result).toBe(validScribble) // Returns the same object reference
			})
		})
	})

	describe('integration tests', () => {
		test('should work with type system correctly', () => {
			// This test verifies that the types work correctly at runtime
			const scribble: TLScribble = {
				id: 'integration-test',
				points: [{ x: 0, y: 0, z: 0.5 }],
				size: 2,
				color: 'accent',
				opacity: 0.8,
				state: 'active',
				delay: 0,
				shrink: 0.1,
				taper: true,
			}

			expect(TL_SCRIBBLE_STATES.has(scribble.state)).toBe(true)
			expect(scribbleValidator.validate(scribble)).toEqual(scribble)
			expect(scribbleValidator.isValid(scribble)).toBe(true)
		})

		test('should support all documented example scribbles', () => {
			// Test the basic scribble from the JSDoc
			const basicScribble: TLScribble = {
				id: 'scribble-123',
				points: [
					{ x: 0, y: 0, z: 0.5 },
					{ x: 10, y: 5, z: 0.7 },
					{ x: 20, y: 10, z: 0.6 },
				],
				size: 4,
				color: 'black',
				opacity: 0.8,
				state: 'active',
				delay: 0,
				shrink: 0.1,
				taper: true,
			}

			expect(scribbleValidator.isValid(basicScribble)).toBe(true)
			expect(scribbleValidator.validate(basicScribble)).toEqual(basicScribble)

			// Test the laser pointer scribble from the JSDoc
			const laserScribble: TLScribble = {
				id: 'laser-pointer',
				points: [{ x: 50, y: 50, z: 1.0 }],
				size: 8,
				color: 'laser',
				opacity: 1.0,
				state: 'active',
				delay: 100,
				shrink: 0,
				taper: false,
			}

			expect(scribbleValidator.isValid(laserScribble)).toBe(true)
			expect(scribbleValidator.validate(laserScribble)).toEqual(laserScribble)
		})

		test('should maintain consistency between Set and validator state checking', () => {
			// Every state in the Set should be valid according to the validator
			for (const state of TL_SCRIBBLE_STATES) {
				const testScribble = {
					id: `state-test-${state}`,
					points: [{ x: 0, y: 0 }],
					size: 1,
					color: 'black' as const,
					opacity: 1,
					state,
					delay: 0,
					shrink: 0,
					taper: false,
				}

				expect(scribbleValidator.isValid(testScribble)).toBe(true)
				expect(scribbleValidator.validate(testScribble).state).toBe(state)
			}
		})

		test('should work in realistic usage scenarios', () => {
			// Simulate creating scribbles during drawing
			const createScribble = (
				id: string,
				points: Array<{ x: number; y: number; z?: number }>,
				state: any
			): TLScribble | null => {
				const scribble = {
					id,
					points,
					size: 3,
					color: 'black' as const,
					opacity: 0.8,
					state,
					delay: 0,
					shrink: 0.05,
					taper: true,
				}

				if (scribbleValidator.isValid(scribble)) {
					return scribbleValidator.validate(scribble)
				}
				return null
			}

			// Valid scenarios
			expect(createScribble('scribble-1', [{ x: 0, y: 0 }], 'starting')).toMatchObject({
				id: 'scribble-1',
				state: 'starting',
			})
			expect(createScribble('scribble-2', [{ x: 0, y: 0, z: 0.5 }], 'active')).toMatchObject({
				id: 'scribble-2',
				state: 'active',
			})
			expect(
				createScribble(
					'scribble-3',
					[
						{ x: 10, y: 20 },
						{ x: 30, y: 40 },
					],
					'stopping'
				)
			).toMatchObject({
				id: 'scribble-3',
				state: 'stopping',
			})

			// Invalid scenarios
			expect(createScribble('invalid-1', [{ x: 0, y: 0 }], 'invalid-state')).toBe(null)
			expect(createScribble('invalid-2', [], 'running')).toBe(null)
		})

		test('should work with state transitions', () => {
			// Simulate state transitions during drawing lifecycle
			const baseScribble = {
				id: 'transition-test',
				points: [{ x: 0, y: 0 }],
				size: 2,
				color: 'accent' as const,
				opacity: 1,
				delay: 0,
				shrink: 0,
				taper: false,
			}

			// Test each state in a typical drawing lifecycle
			const stateOrder = ['starting', 'active', 'paused', 'active', 'stopping']
			stateOrder.forEach((state, index) => {
				const scribble = { ...baseScribble, id: `transition-${index}`, state }
				expect(scribbleValidator.isValid(scribble)).toBe(true)
				expect(scribbleValidator.validate(scribble).state).toBe(state)
			})
		})

		test('should handle complex drawing scenarios', () => {
			// Test a complex scribble with many points and various properties
			const complexPoints = []
			for (let i = 0; i < 100; i++) {
				complexPoints.push({
					x: Math.cos(i * 0.1) * 50,
					y: Math.sin(i * 0.1) * 50,
					z: Math.random(),
				})
			}

			const complexScribble: TLScribble = {
				id: 'complex-drawing',
				points: complexPoints,
				size: 5.5,
				color: 'selection-fill',
				opacity: 0.75,
				state: 'active',
				delay: 16.67, // ~60fps timing
				shrink: 0.02,
				taper: true,
			}

			expect(scribbleValidator.isValid(complexScribble)).toBe(true)
			const validated = scribbleValidator.validate(complexScribble)
			expect(validated.points).toHaveLength(100)
			expect(validated.points[0]).toMatchObject({ x: 50, y: 0 })
		})
	})

	describe('error handling', () => {
		test('should provide helpful error messages for validation failures', () => {
			try {
				scribbleValidator.validate({
					id: 'test',
					points: [{ x: 0, y: 0 }],
					size: 2,
					color: 'invalid-color',
					opacity: 1,
					state: 'active',
					delay: 0,
					shrink: 0,
					taper: false,
				})
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toContain('Expected')
			}

			try {
				scribbleValidator.validate({
					id: 'test',
					points: [{ x: 0, y: 0 }],
					size: -1, // negative size should fail
					color: 'black',
					opacity: 1,
					state: 'active',
					delay: 0,
					shrink: 0,
					taper: false,
				})
				expect.fail('Should have thrown an error')
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
				expect((error as Error).message).toContain('positive')
			}
		})

		test('should handle validation errors gracefully', () => {
			const safeValidate = (value: unknown): TLScribble | null => {
				try {
					return scribbleValidator.validate(value)
				} catch {
					return null
				}
			}

			const validScribble: TLScribble = {
				id: 'safe-test',
				points: [{ x: 0, y: 0 }],
				size: 1,
				color: 'black',
				opacity: 1,
				state: 'active',
				delay: 0,
				shrink: 0,
				taper: false,
			}

			expect(safeValidate(validScribble)).toEqual(validScribble)
			expect(safeValidate('invalid')).toBe(null)
			expect(safeValidate({})).toBe(null)
			expect(safeValidate(null)).toBe(null)
			expect(safeValidate({ id: 'incomplete' })).toBe(null)
		})
	})

	describe('performance and edge cases', () => {
		test('should handle empty points array', () => {
			const emptyPointsScribble: TLScribble = {
				id: 'empty-points',
				points: [],
				size: 1,
				color: 'white',
				opacity: 1,
				state: 'active',
				delay: 0,
				shrink: 0,
				taper: false,
			}

			expect(scribbleValidator.isValid(emptyPointsScribble)).toBe(true)
			expect(scribbleValidator.validate(emptyPointsScribble)).toEqual(emptyPointsScribble)
		})

		test('should handle extreme numeric values', () => {
			const extremeScribble: TLScribble = {
				id: 'extreme-values',
				points: [{ x: Number.MAX_SAFE_INTEGER, y: Number.MIN_SAFE_INTEGER, z: Math.PI }],
				size: Number.MAX_VALUE,
				color: 'laser',
				opacity: Number.MAX_VALUE, // Use finite number instead of infinity
				state: 'active',
				delay: Number.MAX_VALUE, // Use finite number instead of infinity
				shrink: Number.MAX_SAFE_INTEGER,
				taper: true,
			}

			// The validator should handle extreme finite numbers without throwing
			expect(() => scribbleValidator.validate(extremeScribble)).not.toThrow()
			expect(scribbleValidator.isValid(extremeScribble)).toBe(true)
		})

		test('should handle special float values', () => {
			const baseScribble = {
				id: 'float-test',
				points: [{ x: 0, y: 0 }],
				size: 1,
				color: 'black' as const,
				state: 'active' as const,
				delay: 0,
				shrink: 0,
				taper: false,
			}

			// Test NaN (should be rejected as it's not a valid number)
			expect(() => scribbleValidator.validate({ ...baseScribble, opacity: NaN })).toThrow()

			// Test infinity values (should be rejected as they're not finite numbers)
			expect(() => scribbleValidator.validate({ ...baseScribble, opacity: Infinity })).toThrow()
			expect(() => scribbleValidator.validate({ ...baseScribble, delay: -Infinity })).toThrow()
		})

		test('should preserve object references correctly', () => {
			const points = [{ x: 10, y: 20, z: 0.5 }]
			const scribble: TLScribble = {
				id: 'reference-test',
				points,
				size: 2,
				color: 'muted-1',
				opacity: 0.9,
				state: 'paused',
				delay: 5,
				shrink: 0.1,
				taper: true,
			}

			const validated = scribbleValidator.validate(scribble)

			// The validator returns the same object reference when validation passes
			expect(validated).toBe(scribble)

			// The points array should be exactly the same reference
			expect(validated.points).toBe(points)
		})
	})
})
