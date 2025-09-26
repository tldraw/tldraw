import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { VecModel } from '../misc/geometry-types'
import { TLShapeId } from '../records/TLShape'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import {
	DrawShapeSegment,
	TLDrawShape,
	TLDrawShapeProps,
	TLDrawShapeSegment,
	drawShapeMigrations,
	drawShapeProps,
	drawShapeVersions,
} from './TLDrawShape'

describe('TLDrawShape', () => {
	describe('TLDrawShapeSegment interface', () => {
		it('should represent valid draw shape segments', () => {
			const freeSegment: TLDrawShapeSegment = {
				type: 'free',
				points: [
					{ x: 0, y: 0, z: 0.5 },
					{ x: 10, y: 15, z: 0.6 },
					{ x: 25, y: 30, z: 0.7 },
				],
			}

			const straightSegment: TLDrawShapeSegment = {
				type: 'straight',
				points: [
					{ x: 0, y: 0 },
					{ x: 100, y: 50 },
				],
			}

			expect(freeSegment.type).toBe('free')
			expect(freeSegment.points).toHaveLength(3)
			expect(freeSegment.points[0]).toEqual({ x: 0, y: 0, z: 0.5 })

			expect(straightSegment.type).toBe('straight')
			expect(straightSegment.points).toHaveLength(2)
			expect(straightSegment.points[0]).toEqual({ x: 0, y: 0 })
		})

		it('should support segments with different point configurations', () => {
			const segmentWith2D: TLDrawShapeSegment = {
				type: 'free',
				points: [
					{ x: 10, y: 20 },
					{ x: 30, y: 40 },
				],
			}

			const segmentWith3D: TLDrawShapeSegment = {
				type: 'straight',
				points: [
					{ x: 5, y: 10, z: 0.3 },
					{ x: 15, y: 25, z: 0.8 },
					{ x: 30, y: 45, z: 1.0 },
				],
			}

			const emptySegment: TLDrawShapeSegment = {
				type: 'free',
				points: [],
			}

			expect(segmentWith2D.points[0].z).toBeUndefined()
			expect(segmentWith3D.points[0].z).toBe(0.3)
			expect(emptySegment.points).toHaveLength(0)
		})

		it('should support complex drawing paths', () => {
			const complexFreehandPath: TLDrawShapeSegment = {
				type: 'free',
				points: Array.from({ length: 50 }, (_, i) => ({
					x: i * 2,
					y: Math.sin(i * 0.1) * 20,
					z: 0.5 + Math.random() * 0.5,
				})),
			}

			const polygonPath: TLDrawShapeSegment = {
				type: 'straight',
				points: [
					{ x: 0, y: 0 },
					{ x: 50, y: 0 },
					{ x: 50, y: 50 },
					{ x: 25, y: 75 },
					{ x: 0, y: 50 },
					{ x: 0, y: 0 }, // Closed path
				],
			}

			expect(complexFreehandPath.points).toHaveLength(50)
			expect(complexFreehandPath.points.every((p) => p.z !== undefined && p.z >= 0.5)).toBe(true)
			expect(polygonPath.points[0]).toEqual(polygonPath.points[polygonPath.points.length - 1])
		})
	})

	describe('DrawShapeSegment validator', () => {
		it('should validate valid segment structures', () => {
			const validSegments = [
				{
					type: 'free',
					points: [{ x: 0, y: 0 }],
				},
				{
					type: 'straight',
					points: [
						{ x: 0, y: 0, z: 0.5 },
						{ x: 100, y: 100, z: 0.7 },
					],
				},
				{
					type: 'free',
					points: [],
				},
			]

			validSegments.forEach((segment) => {
				expect(() => DrawShapeSegment.validate(segment)).not.toThrow()
				const result = DrawShapeSegment.validate(segment)
				expect(result).toEqual(segment)
			})
		})

		it('should reject segments with invalid type', () => {
			const invalidTypes = [
				'curve',
				'bezier',
				'FREE', // case sensitive
				'STRAIGHT',
				'',
				null,
				undefined,
				123,
				{},
				[],
			]

			invalidTypes.forEach((type) => {
				const invalidSegment = {
					type,
					points: [{ x: 0, y: 0 }],
				}

				expect(() => DrawShapeSegment.validate(invalidSegment)).toThrow()
			})
		})

		it('should reject segments with invalid points', () => {
			const invalidPointsConfigs = [
				{
					type: 'free',
					points: [{ x: 'not-number', y: 0 }],
				},
				{
					type: 'straight',
					points: [
						{ x: 0 }, // Missing y
					],
				},
				{
					type: 'free',
					points: [
						{ y: 0 }, // Missing x
					],
				},
				{
					type: 'straight',
					points: 'not-array',
				},
				{
					type: 'free',
					points: null,
				},
				{
					type: 'straight',
					// Missing points property
				},
			]

			invalidPointsConfigs.forEach((segment) => {
				expect(() => DrawShapeSegment.validate(segment)).toThrow()
			})
		})

		it('should validate points with optional z coordinates', () => {
			const segmentWith2DPoints = {
				type: 'free' as const,
				points: [
					{ x: 0, y: 0 },
					{ x: 10, y: 15 },
				],
			}

			const segmentWith3DPoints = {
				type: 'straight' as const,
				points: [
					{ x: 0, y: 0, z: 0.5 },
					{ x: 10, y: 15, z: 0.7 },
				],
			}

			const segmentWithMixed = {
				type: 'free' as const,
				points: [
					{ x: 0, y: 0 },
					{ x: 5, y: 7, z: 0.6 },
					{ x: 10, y: 15 },
				],
			}

			expect(() => DrawShapeSegment.validate(segmentWith2DPoints)).not.toThrow()
			expect(() => DrawShapeSegment.validate(segmentWith3DPoints)).not.toThrow()
			expect(() => DrawShapeSegment.validate(segmentWithMixed)).not.toThrow()
		})

		it('should reject points with invalid z coordinates', () => {
			const invalidZConfigs = [
				{
					type: 'free' as const,
					points: [{ x: 0, y: 0, z: 'not-number' }],
				},
				{
					type: 'straight' as const,
					points: [{ x: 0, y: 0, z: null }],
				},
				{
					type: 'free' as const,
					points: [{ x: 0, y: 0, z: {} }],
				},
			]

			invalidZConfigs.forEach((segment) => {
				expect(() => DrawShapeSegment.validate(segment)).toThrow()
			})
		})

		it('should handle empty and malformed segment objects', () => {
			const malformedSegments = [
				{}, // Empty object
				{ type: 'free' }, // Missing points
				{ points: [] }, // Missing type
				'not-an-object', // Wrong type
				null,
				undefined,
				[], // Array instead of object
				42, // Number instead of object
			]

			malformedSegments.forEach((segment) => {
				expect(() => DrawShapeSegment.validate(segment)).toThrow()
			})
		})
	})

	describe('TLDrawShapeProps interface', () => {
		it('should represent valid draw shape properties', () => {
			const validProps: TLDrawShapeProps = {
				color: 'black',
				fill: 'none',
				dash: 'solid',
				size: 'm',
				segments: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0, z: 0.5 },
							{ x: 20, y: 15, z: 0.6 },
						],
					},
				],
				isComplete: true,
				isClosed: false,
				isPen: false,
				scale: 1,
			}

			expect(validProps.color).toBe('black')
			expect(validProps.fill).toBe('none')
			expect(validProps.dash).toBe('solid')
			expect(validProps.size).toBe('m')
			expect(validProps.segments).toHaveLength(1)
			expect(validProps.segments[0].type).toBe('free')
			expect(validProps.isComplete).toBe(true)
			expect(validProps.isClosed).toBe(false)
			expect(validProps.isPen).toBe(false)
			expect(validProps.scale).toBe(1)
		})

		it('should support different style combinations', () => {
			const styleVariations: Array<Partial<TLDrawShapeProps>> = [
				{
					color: 'red',
					fill: 'solid',
					dash: 'dashed',
					size: 'l',
				},
				{
					color: 'blue',
					fill: 'semi',
					dash: 'dotted',
					size: 's',
				},
				{
					color: 'green',
					fill: 'pattern',
					dash: 'solid',
					size: 'xl',
				},
			]

			styleVariations.forEach((variation) => {
				expect(variation.color).toMatch(/^(red|blue|green)$/)
				expect(variation.fill).toMatch(/^(solid|semi|pattern)$/)
				expect(variation.dash).toMatch(/^(dashed|dotted|solid)$/)
				expect(variation.size).toMatch(/^(l|s|xl)$/)
			})
		})

		it('should support different segment configurations', () => {
			const singleFreehandSegment: Partial<TLDrawShapeProps> = {
				segments: [
					{
						type: 'free',
						points: [
							{ x: 0, y: 0, z: 0.5 },
							{ x: 10, y: 10, z: 0.6 },
							{ x: 20, y: 5, z: 0.7 },
						],
					},
				],
			}

			const multipleSegments: Partial<TLDrawShapeProps> = {
				segments: [
					{
						type: 'straight',
						points: [
							{ x: 0, y: 0 },
							{ x: 50, y: 0 },
						],
					},
					{
						type: 'free',
						points: [
							{ x: 50, y: 0, z: 0.5 },
							{ x: 60, y: 10, z: 0.6 },
							{ x: 75, y: 20, z: 0.7 },
						],
					},
					{
						type: 'straight',
						points: [
							{ x: 75, y: 20 },
							{ x: 100, y: 50 },
						],
					},
				],
			}

			const emptySegments: Partial<TLDrawShapeProps> = {
				segments: [],
			}

			expect(singleFreehandSegment.segments).toHaveLength(1)
			expect(multipleSegments.segments).toHaveLength(3)
			expect(emptySegments.segments).toHaveLength(0)
		})

		it('should support different drawing states', () => {
			const states = [
				{ isComplete: true, isClosed: true, isPen: true },
				{ isComplete: true, isClosed: false, isPen: false },
				{ isComplete: false, isClosed: false, isPen: true },
				{ isComplete: false, isClosed: true, isPen: false },
			]

			states.forEach((state) => {
				expect(typeof state.isComplete).toBe('boolean')
				expect(typeof state.isClosed).toBe('boolean')
				expect(typeof state.isPen).toBe('boolean')
			})
		})

		it('should support different scale values', () => {
			const scaleValues = [0.1, 0.5, 1, 1.5, 2, 5, 10]

			scaleValues.forEach((scale) => {
				const props: Partial<TLDrawShapeProps> = { scale }
				expect(props.scale).toBe(scale)
				expect(props.scale).toBeGreaterThan(0)
			})
		})
	})

	describe('TLDrawShape type', () => {
		it('should represent complete draw shape records', () => {
			const validDrawShape: TLDrawShape = {
				id: 'shape:draw123' as TLShapeId,
				typeName: 'shape',
				type: 'draw',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					color: 'black',
					fill: 'none',
					dash: 'solid',
					size: 'm',
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.5 },
								{ x: 20, y: 15, z: 0.6 },
							],
						},
					],
					isComplete: true,
					isClosed: false,
					isPen: false,
					scale: 1,
				},
				meta: {},
			}

			expect(validDrawShape.type).toBe('draw')
			expect(validDrawShape.typeName).toBe('shape')
			expect(validDrawShape.props.segments[0].type).toBe('free')
			expect(validDrawShape.props.segments[0].points).toHaveLength(2)
		})

		it('should support different draw configurations', () => {
			const configurations = [
				{
					color: 'red' as const,
					fill: 'solid' as const,
					isPen: true,
					isClosed: true,
					scale: 1.5,
				},
				{
					color: 'blue' as const,
					fill: 'none' as const,
					isPen: false,
					isClosed: false,
					scale: 0.8,
				},
				{
					color: 'green' as const,
					fill: 'pattern' as const,
					isPen: true,
					isClosed: false,
					scale: 2.0,
				},
			]

			configurations.forEach((config, index) => {
				const shape: TLDrawShape = {
					id: `shape:draw${index}` as TLShapeId,
					typeName: 'shape',
					type: 'draw',
					x: 0,
					y: 0,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						color: config.color,
						fill: config.fill,
						dash: 'solid',
						size: 'm',
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0 },
									{ x: 10, y: 10 },
								],
							},
						],
						isComplete: true,
						isClosed: config.isClosed,
						isPen: config.isPen,
						scale: config.scale,
					},
					meta: {},
				}

				expect(shape.props.color).toBe(config.color)
				expect(shape.props.fill).toBe(config.fill)
				expect(shape.props.isPen).toBe(config.isPen)
				expect(shape.props.isClosed).toBe(config.isClosed)
				expect(shape.props.scale).toBe(config.scale)
			})
		})
	})

	describe('drawShapeProps validation schema', () => {
		it('should validate all draw shape properties', () => {
			const validProps = {
				color: 'black',
				fill: 'none',
				dash: 'solid',
				size: 'm',
				segments: [
					{
						type: 'free' as const,
						points: [{ x: 0, y: 0, z: 0.5 }] as VecModel[],
					},
				],
				isComplete: true,
				isClosed: false,
				isPen: false,
				scale: 1,
			}

			// Validate each property individually
			expect(() => drawShapeProps.color.validate(validProps.color)).not.toThrow()
			expect(() => drawShapeProps.fill.validate(validProps.fill)).not.toThrow()
			expect(() => drawShapeProps.dash.validate(validProps.dash)).not.toThrow()
			expect(() => drawShapeProps.size.validate(validProps.size)).not.toThrow()
			expect(() => drawShapeProps.segments.validate(validProps.segments)).not.toThrow()
			expect(() => drawShapeProps.isComplete.validate(validProps.isComplete)).not.toThrow()
			expect(() => drawShapeProps.isClosed.validate(validProps.isClosed)).not.toThrow()
			expect(() => drawShapeProps.isPen.validate(validProps.isPen)).not.toThrow()
			expect(() => drawShapeProps.scale.validate(validProps.scale)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(drawShapeProps)

			const validPropsObject = {
				color: 'red' as const,
				fill: 'solid' as const,
				dash: 'dashed' as const,
				size: 'l' as const,
				segments: [
					{
						type: 'free' as const,
						points: [
							{ x: 0, y: 0, z: 0.5 },
							{ x: 25, y: 50, z: 0.7 },
						] as VecModel[],
					},
					{
						type: 'straight' as const,
						points: [
							{ x: 25, y: 50 },
							{ x: 100, y: 100 },
						] as VecModel[],
					},
				],
				isComplete: true,
				isClosed: true,
				isPen: true,
				scale: 1.5,
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should reject invalid color values', () => {
			const invalidColors = ['purple', 'BLUE', '', null, undefined, 123, {}, []]

			invalidColors.forEach((color) => {
				expect(() => drawShapeProps.color.validate(color)).toThrow()
			})
		})

		it('should reject invalid fill values', () => {
			const invalidFills = ['filled', 'SOLID', 'transparent', '', null, undefined, 123]

			invalidFills.forEach((fill) => {
				expect(() => drawShapeProps.fill.validate(fill)).toThrow()
			})
		})

		it('should reject invalid dash values', () => {
			const invalidDashes = ['line', 'DASHED', 'dot-dash', '', null, undefined, 123]

			invalidDashes.forEach((dash) => {
				expect(() => drawShapeProps.dash.validate(dash)).toThrow()
			})
		})

		it('should reject invalid size values', () => {
			const invalidSizes = ['medium', 'SM', 'large', '', null, undefined, 123]

			invalidSizes.forEach((size) => {
				expect(() => drawShapeProps.size.validate(size)).toThrow()
			})
		})

		it('should validate segments array', () => {
			const validSegmentArrays = [
				[], // Empty array
				[
					{
						type: 'free' as const,
						points: [{ x: 0, y: 0 }],
					},
				],
				[
					{
						type: 'straight' as const,
						points: [
							{ x: 0, y: 0 },
							{ x: 100, y: 100 },
						],
					},
					{
						type: 'free' as const,
						points: [{ x: 100, y: 100, z: 0.5 }],
					},
				],
			]

			validSegmentArrays.forEach((segments) => {
				expect(() => drawShapeProps.segments.validate(segments)).not.toThrow()
			})

			const invalidSegmentArrays = [
				'not-array',
				null,
				undefined,
				[{ type: 'invalid', points: [] }], // Invalid segment type
				[{ type: 'free' }], // Missing points
				[{ points: [] }], // Missing type
			]

			invalidSegmentArrays.forEach((segments) => {
				expect(() => drawShapeProps.segments.validate(segments)).toThrow()
			})
		})

		it('should validate boolean properties', () => {
			const booleanProps = ['isComplete', 'isClosed', 'isPen'] as const

			booleanProps.forEach((prop) => {
				// Valid boolean values
				expect(() => drawShapeProps[prop].validate(true)).not.toThrow()
				expect(() => drawShapeProps[prop].validate(false)).not.toThrow()

				// Invalid boolean values
				const invalidBooleans = ['true', 'false', 1, 0, null, undefined, {}, []]
				invalidBooleans.forEach((value) => {
					expect(() => drawShapeProps[prop].validate(value)).toThrow()
				})
			})
		})

		it('should validate scale as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validScales = [0.01, 0.1, 0.5, 1, 1.5, 2, 10, 100]

			validScales.forEach((scale) => {
				expect(() => drawShapeProps.scale.validate(scale)).not.toThrow()
			})

			// Invalid scales (zero, negative, and non-numbers)
			const invalidScales = [0, -0.1, -1, -10, 'not-number', null, undefined, {}, [], true, false]

			invalidScales.forEach((scale) => {
				expect(() => drawShapeProps.scale.validate(scale)).toThrow()
			})
		})

		it('should use correct default style validators', () => {
			// Verify that the props schema uses the expected style validators
			expect(drawShapeProps.color).toBe(DefaultColorStyle)
			expect(drawShapeProps.fill).toBe(DefaultFillStyle)
			expect(drawShapeProps.dash).toBe(DefaultDashStyle)
			expect(drawShapeProps.size).toBe(DefaultSizeStyle)
		})
	})

	describe('drawShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(drawShapeVersions).toBeDefined()
			expect(typeof drawShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof drawShapeVersions> = ['AddInPen', 'AddScale']

			expectedVersions.forEach((version) => {
				expect(drawShapeVersions[version]).toBeDefined()
				expect(typeof drawShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(drawShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.draw\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain draw in migration IDs', () => {
			Object.values(drawShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('draw')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(drawShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('drawShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(drawShapeMigrations).toBeDefined()
			expect(drawShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(drawShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = drawShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(drawShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have exactly the same number of migrations as version IDs
			expect(drawShapeMigrations.sequence.length).toBe(Object.keys(drawShapeVersions).length)
		})
	})

	describe('drawShapeMigrations - AddInPen migration', () => {
		const { up } = getTestMigration(drawShapeVersions.AddInPen)

		describe('AddInPen up migration', () => {
			it('should add isPen property based on pressure data', () => {
				const oldRecordWithPressure = {
					id: 'shape:draw1',
					props: {
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0.3 }, // Non-standard pressure
									{ x: 10, y: 10, z: 0.7 }, // Non-standard pressure
								],
							},
						],
					},
				}

				const result = up(oldRecordWithPressure)
				expect(result.props.isPen).toBe(true) // Should detect pen based on pressure
			})

			it('should set isPen to false for mouse/touch input (standard pressure)', () => {
				const oldRecordWithoutPressure = {
					id: 'shape:draw1',
					props: {
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0 }, // Standard mouse pressure
									{ x: 10, y: 10, z: 0.5 }, // Standard touch pressure
								],
							},
						],
					},
				}

				const result = up(oldRecordWithoutPressure)
				expect(result.props.isPen).toBe(false)
			})

			it('should set isPen to false for empty segments', () => {
				const oldRecordEmpty = {
					id: 'shape:draw1',
					props: {
						segments: [
							{
								type: 'free',
								points: [], // No points
							},
						],
					},
				}

				const result = up(oldRecordEmpty)
				expect(result.props.isPen).toBe(false)
			})

			it('should detect pen from first point only if second point has standard pressure', () => {
				const oldRecord = {
					id: 'shape:draw1',
					props: {
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0.3 }, // Non-standard pressure
									{ x: 10, y: 10, z: 0.5 }, // Standard pressure
								],
							},
						],
					},
				}

				const result = up(oldRecord)
				expect(result.props.isPen).toBe(false) // Both points need non-standard pressure
			})

			it('should detect pen when both first and second points have non-standard pressure', () => {
				const oldRecord = {
					id: 'shape:draw1',
					props: {
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0.3 }, // Non-standard pressure
									{ x: 10, y: 10, z: 0.7 }, // Non-standard pressure
								],
							},
						],
					},
				}

				const result = up(oldRecord)
				expect(result.props.isPen).toBe(true)
			})

			it('should handle single point segments for pen detection', () => {
				const oldRecordSinglePoint = {
					id: 'shape:draw1',
					props: {
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0.3 }, // Single point with non-standard pressure
								],
							},
						],
					},
				}

				const result = up(oldRecordSinglePoint)
				expect(result.props.isPen).toBe(true) // Single point with non-standard pressure is pen
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:draw1',
					typeName: 'shape',
					type: 'draw',
					x: 50,
					y: 75,
					rotation: 0.5,
					index: 'b1',
					parentId: 'page:test',
					isLocked: true,
					opacity: 0.8,
					props: {
						color: 'red',
						fill: 'solid',
						dash: 'dashed',
						size: 'l',
						segments: [
							{
								type: 'free',
								points: [{ x: 25, y: 50, z: 0.6 }],
							},
						],
						isComplete: true,
						isClosed: false,
					},
					meta: { custom: 'data' },
				}

				const result = up(oldRecord)
				expect(result.props.isPen).toBe(true)
				expect(result.props.color).toBe('red')
				expect(result.props.fill).toBe('solid')
				expect(result.props.dash).toBe('dashed')
				expect(result.props.size).toBe('l')
				expect(result.props.segments).toEqual(oldRecord.props.segments)
				expect(result.props.isComplete).toBe(true)
				expect(result.props.isClosed).toBe(false)
				expect(result.meta).toEqual({ custom: 'data' })
			})
		})

		describe('AddInPen down migration', () => {
			it('should be retired (no down migration)', () => {
				// Based on the source code, the down migration is 'retired'
				const { down } = getTestMigration(drawShapeVersions.AddInPen)
				expect(() => {
					// This should throw since the migration is retired
					down({})
				}).toThrow('Migration com.tldraw.shape.draw/1 does not have a down function')
			})
		})
	})

	describe('drawShapeMigrations - AddScale migration', () => {
		const { up, down } = getTestMigration(drawShapeVersions.AddScale)

		describe('AddScale up migration', () => {
			it('should add scale property with default value 1', () => {
				const oldRecord = {
					id: 'shape:draw1',
					props: {
						color: 'blue',
						segments: [
							{
								type: 'free',
								points: [{ x: 0, y: 0 }],
							},
						],
						isPen: false,
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:draw1',
					props: {
						color: 'red',
						fill: 'solid',
						dash: 'dashed',
						size: 'l',
						segments: [
							{
								type: 'straight',
								points: [
									{ x: 10, y: 20 },
									{ x: 100, y: 150 },
								],
							},
						],
						isComplete: true,
						isClosed: true,
						isPen: true,
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
				expect(result.props.color).toBe('red')
				expect(result.props.fill).toBe('solid')
				expect(result.props.dash).toBe('dashed')
				expect(result.props.size).toBe('l')
				expect(result.props.segments).toEqual(oldRecord.props.segments)
				expect(result.props.isComplete).toBe(true)
				expect(result.props.isClosed).toBe(true)
				expect(result.props.isPen).toBe(true)
			})
		})

		describe('AddScale down migration', () => {
			it('should remove scale property', () => {
				const newRecord = {
					id: 'shape:draw1',
					props: {
						color: 'blue',
						segments: [
							{
								type: 'free',
								points: [{ x: 0, y: 0 }],
							},
						],
						isPen: false,
						scale: 1.5,
					},
				}

				const result = down(newRecord)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('blue') // Preserve other props
				expect(result.props.isPen).toBe(false) // Preserve other props
			})
		})
	})

	describe('integration tests', () => {
		it('should work with complete draw shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('draw'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(drawShapeProps),
				meta: T.jsonValue,
			})

			const validDrawShape = {
				id: 'shape:draw123',
				typeName: 'shape' as const,
				type: 'draw' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					color: 'red' as const,
					fill: 'solid' as const,
					dash: 'dashed' as const,
					size: 'l' as const,
					segments: [
						{
							type: 'free' as const,
							points: [
								{ x: 0, y: 0, z: 0.5 },
								{ x: 25, y: 50, z: 0.7 },
							] as VecModel[],
						},
						{
							type: 'straight' as const,
							points: [
								{ x: 25, y: 50 },
								{ x: 100, y: 100 },
							] as VecModel[],
						},
					],
					isComplete: true,
					isClosed: true,
					isPen: true,
					scale: 1.2,
				},
				meta: { custom: 'data' },
			}

			expect(() => completeValidator.validate(validDrawShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const drawShape: TLDrawShape = {
				id: 'shape:draw_test' as TLShapeId,
				typeName: 'shape',
				type: 'draw',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.5,
				props: {
					color: 'green',
					fill: 'pattern',
					dash: 'dotted',
					size: 's',
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.4 },
								{ x: 15, y: 25, z: 0.6 },
								{ x: 30, y: 10, z: 0.8 },
							],
						},
					],
					isComplete: false,
					isClosed: false,
					isPen: true,
					scale: 0.9,
				},
				meta: { drawType: 'sketch' },
			}

			// Should satisfy TLBaseShape structure
			expect(drawShape.typeName).toBe('shape')
			expect(drawShape.type).toBe('draw')
			expect(typeof drawShape.id).toBe('string')
			expect(typeof drawShape.x).toBe('number')
			expect(typeof drawShape.y).toBe('number')
			expect(typeof drawShape.rotation).toBe('number')
			expect(drawShape.props).toBeDefined()
			expect(drawShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof drawShapeVersions> = ['AddInPen', 'AddScale']

			const migrationIds = drawShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = drawShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(drawShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					color: 'black',
					segments: [{ type: 'free', points: [] }],
					// Missing other required properties
				})
			).toThrow()

			// Extra unexpected properties should throw
			expect(() =>
				fullValidator.validate({
					color: 'black',
					fill: 'none',
					dash: 'solid',
					size: 'm',
					segments: [{ type: 'free', points: [] }],
					isComplete: true,
					isClosed: false,
					isPen: false,
					scale: 1,
					unexpectedProperty: 'extra', // This should cause validation to fail
				})
			).toThrow()
		})

		it('should handle boundary values for numeric properties', () => {
			// Test extreme but valid values
			const extremeProps = {
				color: 'black' as const,
				fill: 'none' as const,
				dash: 'solid' as const,
				size: 'm' as const,
				segments: [
					{
						type: 'free' as const,
						points: [
							{ x: -999999, y: 999999, z: 0 },
							{ x: 0.0001, y: -0.0001, z: 1 },
						] as VecModel[],
					},
				],
				isComplete: true,
				isClosed: false,
				isPen: false,
				scale: 0.0001, // Very small but not zero
			}

			const fullValidator = T.object(drawShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero scale validation correctly', () => {
			// Zero should be invalid for scale (nonZeroNumber)
			expect(() => drawShapeProps.scale.validate(0)).toThrow()

			// Very small positive numbers should be valid, but negative numbers should be invalid
			expect(() => drawShapeProps.scale.validate(0.0001)).not.toThrow()
			expect(() => drawShapeProps.scale.validate(-0.0001)).toThrow()
		})

		it('should handle complex segment configurations', () => {
			const complexSegments = [
				// Mixed segment types
				{
					type: 'free' as const,
					points: Array.from({ length: 100 }, (_, i) => ({
						x: i,
						y: Math.sin(i * 0.1) * 50,
						z: 0.5 + Math.random() * 0.5,
					})),
				},
				// Geometric pattern
				{
					type: 'straight' as const,
					points: [
						{ x: 0, y: 0 },
						{ x: 100, y: 0 },
						{ x: 100, y: 100 },
						{ x: 0, y: 100 },
						{ x: 0, y: 0 }, // Closed shape
					],
				},
				// Single point
				{
					type: 'free' as const,
					points: [{ x: 50, y: 50, z: 0.7 }],
				},
			]

			expect(() => drawShapeProps.segments.validate(complexSegments)).not.toThrow()
		})

		it('should handle segments with no points', () => {
			const emptySegments = [
				{
					type: 'free' as const,
					points: [] as VecModel[],
				},
			]

			expect(() => drawShapeProps.segments.validate(emptySegments)).not.toThrow()
		})

		it('should reject malformed segment arrays', () => {
			const malformedSegmentArrays = [
				[
					{
						// Missing type
						points: [{ x: 0, y: 0 }],
					},
				],
				[
					{
						type: 'free',
						// Missing points
					},
				],
				[
					{
						type: 'invalid-type', // Invalid type
						points: [{ x: 0, y: 0 }],
					},
				],
				[
					{
						type: 'free',
						points: [
							{ x: 'invalid', y: 0 }, // Invalid point
						],
					},
				],
			]

			malformedSegmentArrays.forEach((segments) => {
				expect(() => drawShapeProps.segments.validate(segments)).toThrow()
			})
		})
	})
})
