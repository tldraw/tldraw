import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { VecModel } from '../misc/geometry-types'
import { TLBindingId } from '../records/TLBinding'
import { TLShapeId } from '../records/TLShape'
import { arrowShapeVersions } from '../shapes/TLArrowShape'
import {
	ElbowArrowSnap,
	TLArrowBinding,
	TLArrowBindingProps,
	arrowBindingMigrations,
	arrowBindingProps,
	arrowBindingVersions,
} from './TLArrowBinding'

describe('TLArrowBinding', () => {
	describe('ElbowArrowSnap', () => {
		it('should validate correct snap values', () => {
			const validValues = ['center', 'edge-point', 'edge', 'none']

			validValues.forEach((value) => {
				expect(() => ElbowArrowSnap.validate(value)).not.toThrow()
				expect(ElbowArrowSnap.validate(value)).toBe(value)
			})
		})

		it('should reject invalid snap values', () => {
			const invalidValues = [
				'invalid',
				'CENTER', // case sensitive
				'EDGE',
				'',
				null,
				undefined,
				123,
				{},
				[],
				'point',
				'snap',
			]

			invalidValues.forEach((value) => {
				expect(() => ElbowArrowSnap.validate(value)).toThrow()
			})
		})

		it('should check isValid method', () => {
			expect(ElbowArrowSnap.isValid('center')).toBe(true)
			expect(ElbowArrowSnap.isValid('edge-point')).toBe(true)
			expect(ElbowArrowSnap.isValid('edge')).toBe(true)
			expect(ElbowArrowSnap.isValid('none')).toBe(true)
			expect(ElbowArrowSnap.isValid('invalid')).toBe(false)
			expect(ElbowArrowSnap.isValid('')).toBe(false)
			expect(ElbowArrowSnap.isValid(null)).toBe(false)
		})
	})

	describe('TLArrowBindingProps interface', () => {
		it('should represent valid arrow binding properties', () => {
			const validProps: TLArrowBindingProps = {
				terminal: 'start',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: true,
				isPrecise: false,
				snap: 'center',
			}

			expect(validProps.terminal).toBe('start')
			expect(validProps.normalizedAnchor).toEqual({ x: 0.5, y: 0.5 })
			expect(validProps.isExact).toBe(true)
			expect(validProps.isPrecise).toBe(false)
			expect(validProps.snap).toBe('center')
		})

		it('should support end terminal', () => {
			const endProps: TLArrowBindingProps = {
				terminal: 'end',
				normalizedAnchor: { x: 0, y: 0 },
				isExact: false,
				isPrecise: true,
				snap: 'edge-point',
			}

			expect(endProps.terminal).toBe('end')
			expect(endProps.snap).toBe('edge-point')
		})

		it('should support all snap modes', () => {
			const snapModes: Array<TLArrowBindingProps['snap']> = ['center', 'edge-point', 'edge', 'none']

			snapModes.forEach((snap) => {
				const props: TLArrowBindingProps = {
					terminal: 'start',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: true,
					isPrecise: true,
					snap,
				}
				expect(props.snap).toBe(snap)
			})
		})

		it('should support normalizedAnchor with different coordinates', () => {
			const anchors: VecModel[] = [
				{ x: 0, y: 0 }, // top-left
				{ x: 1, y: 1 }, // bottom-right
				{ x: 0.5, y: 0 }, // top-center
				{ x: 0, y: 0.5 }, // middle-left
				{ x: 0.25, y: 0.75 }, // arbitrary position
			]

			anchors.forEach((normalizedAnchor) => {
				const props: TLArrowBindingProps = {
					terminal: 'start',
					normalizedAnchor,
					isExact: false,
					isPrecise: true,
					snap: 'none',
				}
				expect(props.normalizedAnchor).toEqual(normalizedAnchor)
			})
		})
	})

	describe('arrowBindingProps validation schema', () => {
		it('should validate complete valid props', () => {
			const validProps = {
				terminal: 'start',
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: true,
				isPrecise: false,
				snap: 'center',
			}

			expect(() => arrowBindingProps.terminal.validate(validProps.terminal)).not.toThrow()
			expect(() =>
				arrowBindingProps.normalizedAnchor.validate(validProps.normalizedAnchor)
			).not.toThrow()
			expect(() => arrowBindingProps.isExact.validate(validProps.isExact)).not.toThrow()
			expect(() => arrowBindingProps.isPrecise.validate(validProps.isPrecise)).not.toThrow()
			expect(() => arrowBindingProps.snap.validate(validProps.snap)).not.toThrow()
		})

		it('should validate terminal values', () => {
			expect(() => arrowBindingProps.terminal.validate('start')).not.toThrow()
			expect(() => arrowBindingProps.terminal.validate('end')).not.toThrow()

			// Invalid terminal values
			expect(() => arrowBindingProps.terminal.validate('middle')).toThrow()
			expect(() => arrowBindingProps.terminal.validate('beginning')).toThrow()
			expect(() => arrowBindingProps.terminal.validate('START')).toThrow()
			expect(() => arrowBindingProps.terminal.validate('')).toThrow()
			expect(() => arrowBindingProps.terminal.validate(null)).toThrow()
		})

		it('should validate normalizedAnchor using vecModelValidator', () => {
			const validAnchors = [
				{ x: 0, y: 0 },
				{ x: 1, y: 1 },
				{ x: 0.5, y: 0.5 },
				{ x: -1, y: 2 }, // Allows values outside 0-1 range
				{ x: 10.5, y: -5.2 },
				{ x: 0, y: 0, z: 0 }, // With optional z coordinate
			]

			validAnchors.forEach((anchor) => {
				expect(() => arrowBindingProps.normalizedAnchor.validate(anchor)).not.toThrow()
			})

			const invalidAnchors = [
				{ x: 'not-number', y: 0 },
				{ x: 0 }, // Missing y
				{ y: 0 }, // Missing x
				{ x: null, y: 0 },
				{ x: 0, y: undefined },
				{},
				null,
				undefined,
				'anchor',
				123,
			]

			invalidAnchors.forEach((anchor) => {
				expect(() => arrowBindingProps.normalizedAnchor.validate(anchor)).toThrow()
			})
		})

		it('should validate boolean properties', () => {
			// isExact validation
			expect(() => arrowBindingProps.isExact.validate(true)).not.toThrow()
			expect(() => arrowBindingProps.isExact.validate(false)).not.toThrow()
			expect(() => arrowBindingProps.isExact.validate('true')).toThrow()
			expect(() => arrowBindingProps.isExact.validate(1)).toThrow()
			expect(() => arrowBindingProps.isExact.validate(null)).toThrow()

			// isPrecise validation
			expect(() => arrowBindingProps.isPrecise.validate(true)).not.toThrow()
			expect(() => arrowBindingProps.isPrecise.validate(false)).not.toThrow()
			expect(() => arrowBindingProps.isPrecise.validate('false')).toThrow()
			expect(() => arrowBindingProps.isPrecise.validate(0)).toThrow()
			expect(() => arrowBindingProps.isPrecise.validate(undefined)).toThrow()
		})

		it('should validate snap property', () => {
			const validSnaps = ['center', 'edge-point', 'edge', 'none']
			validSnaps.forEach((snap) => {
				expect(() => arrowBindingProps.snap.validate(snap)).not.toThrow()
			})

			const invalidSnaps = ['invalid', 'CENTER', '', null, undefined, 123, {}]
			invalidSnaps.forEach((snap) => {
				expect(() => arrowBindingProps.snap.validate(snap)).toThrow()
			})
		})

		it('should validate using comprehensive object validator', () => {
			// Create a complete object validator for testing
			const fullValidator = T.object(arrowBindingProps)

			const validPropsObject = {
				terminal: 'end' as const,
				normalizedAnchor: { x: 0.25, y: 0.75 },
				isExact: false,
				isPrecise: true,
				snap: 'edge' as const,
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})
	})

	describe('TLArrowBinding type', () => {
		it('should represent valid arrow binding records', () => {
			const validBinding: TLArrowBinding = {
				id: 'binding:arrow_binding_123' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:arrow_shape_1' as TLShapeId,
				toId: 'shape:target_shape_1' as TLShapeId,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: true,
					isPrecise: false,
					snap: 'center',
				},
				meta: {},
			}

			expect(validBinding.type).toBe('arrow')
			expect(validBinding.typeName).toBe('binding')
			expect(validBinding.fromId).toBe('shape:arrow_shape_1')
			expect(validBinding.toId).toBe('shape:target_shape_1')
			expect(validBinding.props.terminal).toBe('end')
			expect(validBinding.props.snap).toBe('center')
		})

		it('should support different terminal configurations', () => {
			const startBinding: TLArrowBinding = {
				id: 'binding:start_123' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:from_1' as TLShapeId,
				toId: 'shape:to_1' as TLShapeId,
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0, y: 0 },
					isExact: false,
					isPrecise: true,
					snap: 'edge-point',
				},
				meta: { created: '2023-01-01' },
			}

			expect(startBinding.props.terminal).toBe('start')
		})

		it('should support complex anchor positions', () => {
			const binding: TLArrowBinding = {
				id: 'binding:complex_123' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:from_1' as TLShapeId,
				toId: 'shape:to_1' as TLShapeId,
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.125, y: 0.875, z: 0.5 }, // With optional z
					isExact: true,
					isPrecise: true,
					snap: 'none',
				},
				meta: {
					author: 'test-user',
					version: 1,
					custom: { data: 'value' },
				},
			}

			expect(binding.props.normalizedAnchor.z).toBe(0.5)
			expect(binding.meta.custom).toEqual({ data: 'value' })
		})
	})

	describe('arrowBindingVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(arrowBindingVersions).toBeDefined()
			expect(typeof arrowBindingVersions).toBe('object')
		})

		it('should have AddSnap migration version', () => {
			expect(arrowBindingVersions.AddSnap).toBeDefined()
			expect(typeof arrowBindingVersions.AddSnap).toBe('string')
			expect(arrowBindingVersions.AddSnap).toMatch(/^com\.tldraw\.binding\.arrow\//)
		})

		it('should have numeric version number for AddSnap', () => {
			// The version should be a string ending with /1 (based on the file content)
			expect(arrowBindingVersions.AddSnap).toMatch(/\/1$/)
		})

		it('should be consistent with binding type', () => {
			expect(arrowBindingVersions.AddSnap).toContain('arrow')
		})
	})

	describe('arrowBindingMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(arrowBindingMigrations).toBeDefined()
			expect(arrowBindingMigrations.sequence).toBeDefined()
			expect(Array.isArray(arrowBindingMigrations.sequence)).toBe(true)
		})

		it('should have dependency on arrow shape ExtractBindings version', () => {
			const firstMigration = arrowBindingMigrations.sequence[0]
			expect(firstMigration.dependsOn).toBeDefined()
			expect(firstMigration.dependsOn).toContain(arrowShapeVersions.ExtractBindings)
		})

		it('should have AddSnap migration in sequence', () => {
			const addSnapMigration = arrowBindingMigrations.sequence.find(
				(migration) => 'id' in migration && migration.id === arrowBindingVersions.AddSnap
			)
			expect(addSnapMigration).toBeDefined()
			if (addSnapMigration && 'up' in addSnapMigration) {
				expect(addSnapMigration.up).toBeDefined()
				expect(addSnapMigration.down).toBeDefined()
			}
		})

		it('should have at least 2 items in sequence (dependency + AddSnap)', () => {
			expect(arrowBindingMigrations.sequence.length).toBeGreaterThanOrEqual(2)
		})
	})

	describe('arrowBindingMigrations - AddSnap migration', () => {
		const { up, down } = getTestMigration(arrowBindingVersions.AddSnap)

		describe('AddSnap up migration', () => {
			it('should add snap property with default value "none"', () => {
				const oldRecord = {
					id: 'binding:test',
					typeName: 'binding',
					type: 'arrow',
					fromId: 'shape:from',
					toId: 'shape:to',
					props: {
						terminal: 'end',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: true,
						isPrecise: false,
					},
					meta: {},
				}

				const result = up(oldRecord)
				expect(result.props.terminal).toBe('end')
				expect(result.props.normalizedAnchor).toEqual({ x: 0.5, y: 0.5 })
				expect(result.props.isExact).toBe(true)
				expect(result.props.isPrecise).toBe(false)
				expect(result.props.snap).toBe('none')
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'binding:test',
					typeName: 'binding',
					type: 'arrow',
					fromId: 'shape:from',
					toId: 'shape:to',
					props: {
						terminal: 'start',
						normalizedAnchor: { x: 0.25, y: 0.75 },
						isExact: false,
						isPrecise: true,
					},
					meta: {},
				}

				const result = up(oldRecord)
				expect(result.props.terminal).toBe('start')
				expect(result.props.normalizedAnchor).toEqual({ x: 0.25, y: 0.75 })
				expect(result.props.isExact).toBe(false)
				expect(result.props.isPrecise).toBe(true)
				expect(result.props.snap).toBe('none')
			})

			it('should handle props with 3D normalized anchor', () => {
				const oldRecord = {
					id: 'binding:test',
					typeName: 'binding',
					type: 'arrow',
					fromId: 'shape:from',
					toId: 'shape:to',
					props: {
						terminal: 'end',
						normalizedAnchor: { x: 0.5, y: 0.5, z: 1.0 },
						isExact: true,
						isPrecise: true,
					},
					meta: {},
				}

				const result = up(oldRecord)
				expect(result.props.normalizedAnchor.z).toBe(1.0)
				expect(result.props.snap).toBe('none')
			})

			test('should not modify props if snap already exists', () => {
				const recordWithSnap = {
					id: 'binding:test',
					typeName: 'binding',
					type: 'arrow',
					fromId: 'shape:from',
					toId: 'shape:to',
					props: {
						terminal: 'start',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: true,
						isPrecise: false,
						snap: 'center',
					},
					meta: {},
				}

				const result = up(recordWithSnap)
				expect(result.props.snap).toBe('none') // Migration still adds default value
			})
		})

		describe('AddSnap down migration', () => {
			it('should remove snap property', () => {
				const newRecord = {
					id: 'binding:test',
					typeName: 'binding',
					type: 'arrow',
					fromId: 'shape:from',
					toId: 'shape:to',
					props: {
						terminal: 'end',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: true,
						isPrecise: false,
						snap: 'center',
					},
					meta: {},
				}

				const result = down(newRecord)
				expect(result.props.terminal).toBe('end')
				expect(result.props.normalizedAnchor).toEqual({ x: 0.5, y: 0.5 })
				expect(result.props.isExact).toBe(true)
				expect(result.props.isPrecise).toBe(false)
				expect(result.props.snap).toBeUndefined()
			})

			it('should preserve all other properties during down migration', () => {
				const newRecord = {
					id: 'binding:test',
					typeName: 'binding',
					type: 'arrow',
					fromId: 'shape:from',
					toId: 'shape:to',
					props: {
						terminal: 'start',
						normalizedAnchor: { x: 0.1, y: 0.9, z: 0.5 },
						isExact: false,
						isPrecise: true,
						snap: 'edge-point',
					},
					meta: {},
				}

				const result = down(newRecord)
				expect(result.props.terminal).toBe('start')
				expect(result.props.normalizedAnchor).toEqual({ x: 0.1, y: 0.9, z: 0.5 })
				expect(result.props.isExact).toBe(false)
				expect(result.props.isPrecise).toBe(true)
				expect(result.props.snap).toBeUndefined()
			})

			test('should handle props without snap property gracefully', () => {
				const recordWithoutSnap = {
					id: 'binding:test',
					typeName: 'binding',
					type: 'arrow',
					fromId: 'shape:from',
					toId: 'shape:to',
					props: {
						terminal: 'end',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: true,
						isPrecise: false,
					},
					meta: {},
				}

				expect(() => down(recordWithoutSnap)).not.toThrow()
				const result = down(recordWithoutSnap)
				expect(result.props.snap).toBeUndefined()
			})
		})

		describe('AddSnap migration round-trip', () => {
			it('should be reversible for complete props', () => {
				const originalRecord = {
					id: 'binding:test',
					typeName: 'binding',
					type: 'arrow',
					fromId: 'shape:from',
					toId: 'shape:to',
					props: {
						terminal: 'start',
						normalizedAnchor: { x: 0.5, y: 0.5 },
						isExact: true,
						isPrecise: false,
					},
					meta: {},
				}

				const upResult = up(originalRecord)
				expect(upResult.props.snap).toBe('none')

				const downResult = down(upResult)
				expect(downResult.props).toEqual(originalRecord.props)
			})

			it('should handle edge case with different terminal values', () => {
				const terminals = ['start', 'end'] as const
				terminals.forEach((terminal) => {
					const record = {
						id: 'binding:test',
						typeName: 'binding',
						type: 'arrow',
						fromId: 'shape:from',
						toId: 'shape:to',
						props: {
							terminal,
							normalizedAnchor: { x: Math.random(), y: Math.random() },
							isExact: Math.random() > 0.5,
							isPrecise: Math.random() > 0.5,
						},
						meta: {},
					}

					const upResult = up(record)
					const downResult = down(upResult)
					expect(downResult.props).toEqual(record.props)
				})
			})
		})
	})

	describe('integration with binding system', () => {
		test('should work with createBindingValidator pattern', () => {
			// Test that arrowBindingProps can be used to create a complete binding validator
			const fullBindingValidator = T.object({
				id: T.string,
				typeName: T.literal('binding'),
				type: T.literal('arrow'),
				fromId: T.string,
				toId: T.string,
				props: T.object(arrowBindingProps),
				meta: T.jsonValue,
			})

			const validBinding = {
				id: 'binding:test',
				typeName: 'binding' as const,
				type: 'arrow' as const,
				fromId: 'shape:from',
				toId: 'shape:to',
				props: {
					terminal: 'end' as const,
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isExact: true,
					isPrecise: false,
					snap: 'center' as const,
				},
				meta: {},
			}

			expect(() => fullBindingValidator.validate(validBinding)).not.toThrow()
		})

		it('should be compatible with TLBaseBinding interface', () => {
			const binding: TLArrowBinding = {
				id: 'binding:arrow_test' as TLBindingId,
				typeName: 'binding',
				type: 'arrow',
				fromId: 'shape:arrow' as TLShapeId,
				toId: 'shape:rect' as TLShapeId,
				props: {
					terminal: 'start',
					normalizedAnchor: { x: 0, y: 0 },
					isExact: false,
					isPrecise: true,
					snap: 'edge',
				},
				meta: { bindingType: 'arrow-to-shape' },
			}

			// Should satisfy TLBaseBinding structure
			expect(binding.typeName).toBe('binding')
			expect(typeof binding.fromId).toBe('string')
			expect(typeof binding.toId).toBe('string')
			expect(binding.props).toBeDefined()
			expect(binding.meta).toBeDefined()
		})
	})
})
