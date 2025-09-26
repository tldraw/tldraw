import { IndexKey } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { VecModel } from '../misc/geometry-types'
import { TLParentId, TLShapeId } from '../records/TLShape'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { TLDrawShapeSegment } from './TLDrawShape'
import {
	TLHighlightShape,
	TLHighlightShapeProps,
	highlightShapeMigrations,
	highlightShapeProps,
	highlightShapeVersions,
} from './TLHighlightShape'

describe('TLHighlightShape', () => {
	describe('TLHighlightShapeProps interface', () => {
		it('should represent valid highlight shape properties', () => {
			const validProps: TLHighlightShapeProps = {
				color: 'yellow',
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
				isPen: false,
				scale: 1,
			}

			expect(validProps.color).toBe('yellow')
			expect(validProps.size).toBe('m')
			expect(validProps.segments).toHaveLength(1)
			expect(validProps.segments[0].type).toBe('free')
			expect(validProps.isComplete).toBe(true)
			expect(validProps.isPen).toBe(false)
			expect(validProps.scale).toBe(1)
		})

		it('should support different highlight color options', () => {
			const colorVariations = [
				'black',
				'grey',
				'light-violet',
				'violet',
				'blue',
				'light-blue',
				'yellow',
				'orange',
				'green',
				'light-green',
				'light-red',
				'red',
				'white',
			] as const

			colorVariations.forEach((color) => {
				const props: Partial<TLHighlightShapeProps> = { color }
				expect(props.color).toBe(color)
			})
		})

		it('should support different highlight size options', () => {
			const sizeVariations = ['s', 'm', 'l', 'xl'] as const

			sizeVariations.forEach((size) => {
				const props: Partial<TLHighlightShapeProps> = { size }
				expect(props.size).toBe(size)
			})
		})

		it('should support different segment configurations for highlights', () => {
			const singleFreehandSegment: Partial<TLHighlightShapeProps> = {
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

			const multipleMixedSegments: Partial<TLHighlightShapeProps> = {
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
				],
			}

			const emptySegments: Partial<TLHighlightShapeProps> = {
				segments: [],
			}

			expect(singleFreehandSegment.segments).toHaveLength(1)
			expect(multipleMixedSegments.segments).toHaveLength(2)
			expect(emptySegments.segments).toHaveLength(0)
		})

		it('should support different highlight completion states', () => {
			const completionStates = [
				{ isComplete: true, isPen: true },
				{ isComplete: true, isPen: false },
				{ isComplete: false, isPen: true },
				{ isComplete: false, isPen: false },
			]

			completionStates.forEach((state) => {
				expect(typeof state.isComplete).toBe('boolean')
				expect(typeof state.isPen).toBe('boolean')
			})
		})

		it('should support different scale values for highlights', () => {
			const scaleValues = [0.1, 0.5, 1, 1.5, 2, 5, 10]

			scaleValues.forEach((scale) => {
				const props: Partial<TLHighlightShapeProps> = { scale }
				expect(props.scale).toBe(scale)
				expect(props.scale).toBeGreaterThan(0)
			})
		})

		it('should support highlight strokes for markup use cases', () => {
			const markupHighlights = [
				{
					color: 'yellow' as const,
					size: 'l' as const,
					segments: [
						{
							type: 'free' as const,
							points: [
								{ x: 10, y: 100, z: 0.6 },
								{ x: 200, y: 105, z: 0.6 },
								{ x: 400, y: 102, z: 0.6 },
							],
						},
					],
					isComplete: true,
					isPen: false,
					scale: 1,
				},
				{
					color: 'green' as const,
					size: 'm' as const,
					segments: [
						{
							type: 'straight' as const,
							points: [
								{ x: 50, y: 200 },
								{ x: 350, y: 200 },
							],
						},
					],
					isComplete: true,
					isPen: true,
					scale: 1.2,
				},
			]

			markupHighlights.forEach((highlight) => {
				expect(highlight.color).toMatch(/^(yellow|green)$/)
				expect(highlight.size).toMatch(/^(l|m)$/)
				expect(highlight.segments).toHaveLength(1)
				expect(typeof highlight.isComplete).toBe('boolean')
				expect(typeof highlight.isPen).toBe('boolean')
				expect(highlight.scale).toBeGreaterThan(0)
			})
		})
	})

	describe('TLHighlightShape type', () => {
		it('should represent complete highlight shape records', () => {
			const validHighlightShape: TLHighlightShape = {
				id: 'shape:highlight123' as TLShapeId,
				typeName: 'shape',
				type: 'highlight',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 0.7,
				props: {
					color: 'yellow',
					size: 'l',
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
					isPen: false,
					scale: 1,
				},
				meta: {},
			}

			expect(validHighlightShape.type).toBe('highlight')
			expect(validHighlightShape.typeName).toBe('shape')
			expect(validHighlightShape.props.color).toBe('yellow')
			expect(validHighlightShape.props.segments[0].type).toBe('free')
			expect(validHighlightShape.props.segments[0].points).toHaveLength(2)
			expect(validHighlightShape.opacity).toBe(0.7) // Typical for highlights
		})

		it('should support different highlight configurations', () => {
			const configurations = [
				{
					color: 'yellow' as const,
					size: 'l' as const,
					isPen: false,
					scale: 1,
					opacity: 0.6,
				},
				{
					color: 'green' as const,
					size: 'm' as const,
					isPen: true,
					scale: 1.5,
					opacity: 0.5,
				},
				{
					color: 'blue' as const,
					size: 'xl' as const,
					isPen: false,
					scale: 0.8,
					opacity: 0.8,
				},
			]

			configurations.forEach((config, index) => {
				const shape: TLHighlightShape = {
					id: `shape:highlight${index}` as TLShapeId,
					typeName: 'shape',
					type: 'highlight',
					x: index * 100,
					y: index * 50,
					rotation: 0,
					index: `a${index}` as IndexKey,
					parentId: 'page:main' as TLParentId,
					isLocked: false,
					opacity: config.opacity,
					props: {
						color: config.color,
						size: config.size,
						segments: [
							{
								type: 'free',
								points: [
									{ x: 0, y: 0, z: 0.5 },
									{ x: 10, y: 10, z: 0.6 },
								],
							},
						],
						isComplete: true,
						isPen: config.isPen,
						scale: config.scale,
					},
					meta: {},
				}

				expect(shape.props.color).toBe(config.color)
				expect(shape.props.size).toBe(config.size)
				expect(shape.props.isPen).toBe(config.isPen)
				expect(shape.props.scale).toBe(config.scale)
				expect(shape.opacity).toBe(config.opacity)
			})
		})

		it('should support highlight shapes for text markup', () => {
			const textMarkupHighlight: TLHighlightShape = {
				id: 'shape:text-highlight' as TLShapeId,
				typeName: 'shape',
				type: 'highlight',
				x: 50,
				y: 100,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 0.4, // Semi-transparent for text highlighting
				props: {
					color: 'yellow',
					size: 'l', // Wider for text highlighting
					segments: [
						{
							type: 'straight',
							points: [
								{ x: 0, y: 0 },
								{ x: 200, y: 0 }, // Horizontal line under text
							],
						},
					],
					isComplete: true,
					isPen: false,
					scale: 1,
				},
				meta: {
					purpose: 'text-highlight',
					targetText: 'Important text to highlight',
				},
			}

			expect(textMarkupHighlight.props.color).toBe('yellow')
			expect(textMarkupHighlight.props.size).toBe('l')
			expect(textMarkupHighlight.props.segments[0].type).toBe('straight')
			expect(textMarkupHighlight.opacity).toBeLessThan(0.5) // Should be semi-transparent
			expect(textMarkupHighlight.meta.purpose).toBe('text-highlight')
		})

		it('should support highlight shapes with custom metadata', () => {
			const highlightWithMetadata: TLHighlightShape = {
				id: 'shape:meta-highlight' as TLShapeId,
				typeName: 'shape',
				type: 'highlight',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 0.6,
				props: {
					color: 'green',
					size: 'm',
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.4 },
								{ x: 50, y: 25, z: 0.6 },
								{ x: 100, y: 10, z: 0.8 },
							],
						},
					],
					isComplete: true,
					isPen: true,
					scale: 1.2,
				},
				meta: {
					highlightType: 'emphasis',
					createdBy: 'reviewer',
					timestamp: '2024-01-01T00:00:00Z',
					notes: 'Key point to remember',
					category: 'important',
				},
			}

			expect(highlightWithMetadata.meta.highlightType).toBe('emphasis')
			expect(highlightWithMetadata.meta.createdBy).toBe('reviewer')
			expect(highlightWithMetadata.meta.category).toBe('important')
		})
	})

	describe('highlightShapeProps validation schema', () => {
		it('should validate all highlight shape properties', () => {
			const validProps = {
				color: 'yellow' as const,
				size: 'l' as const,
				segments: [
					{
						type: 'free' as const,
						points: [{ x: 0, y: 0, z: 0.5 }] as VecModel[],
					},
				],
				isComplete: true,
				isPen: false,
				scale: 1,
			}

			// Validate each property individually
			expect(() => highlightShapeProps.color.validate(validProps.color)).not.toThrow()
			expect(() => highlightShapeProps.size.validate(validProps.size)).not.toThrow()
			expect(() => highlightShapeProps.segments.validate(validProps.segments)).not.toThrow()
			expect(() => highlightShapeProps.isComplete.validate(validProps.isComplete)).not.toThrow()
			expect(() => highlightShapeProps.isPen.validate(validProps.isPen)).not.toThrow()
			expect(() => highlightShapeProps.scale.validate(validProps.scale)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(highlightShapeProps)

			const validPropsObject = {
				color: 'green' as const,
				size: 'xl' as const,
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
				isPen: true,
				scale: 1.5,
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should reject invalid color values', () => {
			const invalidColors = ['purple', 'YELLOW', 'neon', '', null, undefined, 123, {}, []]

			invalidColors.forEach((color) => {
				expect(() => highlightShapeProps.color.validate(color)).toThrow()
			})
		})

		it('should reject invalid size values', () => {
			const invalidSizes = ['medium', 'SM', 'large', 'xxl', '', null, undefined, 123]

			invalidSizes.forEach((size) => {
				expect(() => highlightShapeProps.size.validate(size)).toThrow()
			})
		})

		it('should validate segments array with DrawShapeSegment validator', () => {
			const validSegmentArrays = [
				[], // Empty array
				[
					{
						type: 'free' as const,
						points: [{ x: 0, y: 0, z: 0.5 }],
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
				expect(() => highlightShapeProps.segments.validate(segments)).not.toThrow()
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
				expect(() => highlightShapeProps.segments.validate(segments)).toThrow()
			})
		})

		it('should validate boolean properties', () => {
			const booleanProps = ['isComplete', 'isPen'] as const

			booleanProps.forEach((prop) => {
				// Valid boolean values
				expect(() => highlightShapeProps[prop].validate(true)).not.toThrow()
				expect(() => highlightShapeProps[prop].validate(false)).not.toThrow()

				// Invalid boolean values
				const invalidBooleans = ['true', 'false', 1, 0, null, undefined, {}, []]
				invalidBooleans.forEach((value) => {
					expect(() => highlightShapeProps[prop].validate(value)).toThrow()
				})
			})
		})

		it('should validate scale as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validScales = [0.01, 0.1, 0.5, 1, 1.5, 2, 10, 100]

			validScales.forEach((scale) => {
				expect(() => highlightShapeProps.scale.validate(scale)).not.toThrow()
			})

			// Invalid scales (zero, negative, and non-numbers)
			const invalidScales = [0, -0.1, -1, -10, 'not-number', null, undefined, {}, [], true, false]

			invalidScales.forEach((scale) => {
				expect(() => highlightShapeProps.scale.validate(scale)).toThrow()
			})
		})

		it('should use correct default style validators', () => {
			// Verify that the props schema uses the expected style validators
			expect(highlightShapeProps.color).toBe(DefaultColorStyle)
			expect(highlightShapeProps.size).toBe(DefaultSizeStyle)
		})

		it('should use DrawShapeSegment validator for segments', () => {
			// Verify that segments use the same validator structure as draw shapes
			expect(highlightShapeProps.segments).toBeDefined()
			expect(typeof highlightShapeProps.segments.validate).toBe('function')

			// Test that it validates correctly with valid segment data
			const validSegment = {
				type: 'free' as const,
				points: [{ x: 0, y: 0, z: 0.5 }],
			}
			expect(() => highlightShapeProps.segments.validate([validSegment])).not.toThrow()
		})

		it('should reject objects with missing properties', () => {
			const fullValidator = T.object(highlightShapeProps)

			const incompleteObjects = [
				{}, // Empty object
				{ color: 'yellow' }, // Missing other props
				{ color: 'yellow', size: 'm' }, // Missing segments, isComplete, isPen, scale
				{ color: 'yellow', size: 'm', segments: [] }, // Missing isComplete, isPen, scale
			]

			incompleteObjects.forEach((obj) => {
				expect(() => fullValidator.validate(obj)).toThrow()
			})
		})

		it('should reject objects with extra properties', () => {
			const fullValidator = T.object(highlightShapeProps)

			const objectsWithExtraProps = [
				{
					color: 'yellow',
					size: 'm',
					segments: [],
					isComplete: true,
					isPen: false,
					scale: 1,
					extraProp: 'extra',
				},
				{
					color: 'yellow',
					size: 'm',
					segments: [],
					isComplete: true,
					isPen: false,
					scale: 1,
					x: 50, // Should not be in props, belongs to base shape
				},
			]

			objectsWithExtraProps.forEach((obj) => {
				expect(() => fullValidator.validate(obj)).toThrow()
			})
		})
	})

	describe('highlightShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(highlightShapeVersions).toBeDefined()
			expect(typeof highlightShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof highlightShapeVersions> = ['AddScale']

			expectedVersions.forEach((version) => {
				expect(highlightShapeVersions[version]).toBeDefined()
				expect(typeof highlightShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(highlightShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.highlight\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain highlight in migration IDs', () => {
			Object.values(highlightShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('highlight')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(highlightShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('highlightShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(highlightShapeMigrations).toBeDefined()
			expect(highlightShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(highlightShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = highlightShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(highlightShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have exactly the same number of migrations as version IDs
			expect(highlightShapeMigrations.sequence.length).toBe(
				Object.keys(highlightShapeVersions).length
			)
		})
	})

	describe('highlightShapeMigrations - AddScale migration', () => {
		const { up, down } = getTestMigration(highlightShapeVersions.AddScale)

		describe('AddScale up migration', () => {
			it('should add scale property with default value 1', () => {
				const oldRecord = {
					id: 'shape:highlight1',
					props: {
						color: 'yellow',
						size: 'm',
						segments: [
							{
								type: 'free',
								points: [{ x: 0, y: 0, z: 0.5 }],
							},
						],
						isComplete: true,
						isPen: false,
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:highlight1',
					typeName: 'shape',
					type: 'highlight',
					x: 100,
					y: 200,
					rotation: 0.5,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 0.7,
					props: {
						color: 'green',
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
						isPen: true,
					},
					meta: { highlightType: 'emphasis' },
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
				expect(result.props.color).toBe('green')
				expect(result.props.size).toBe('l')
				expect(result.props.segments).toEqual(oldRecord.props.segments)
				expect(result.props.isComplete).toBe(true)
				expect(result.props.isPen).toBe(true)
				expect(result.x).toBe(100)
				expect(result.y).toBe(200)
				expect(result.rotation).toBe(0.5)
				expect(result.opacity).toBe(0.7)
				expect(result.meta).toEqual({ highlightType: 'emphasis' })
			})

			it('should handle different highlight configurations', () => {
				const testCases = [
					{
						props: {
							color: 'yellow',
							size: 's',
							segments: [],
							isComplete: false,
							isPen: false,
						},
						expected: {
							color: 'yellow',
							size: 's',
							segments: [],
							isComplete: false,
							isPen: false,
							scale: 1,
						},
					},
					{
						props: {
							color: 'blue',
							size: 'xl',
							segments: [
								{
									type: 'free',
									points: [
										{ x: 0, y: 0, z: 0.6 },
										{ x: 50, y: 25, z: 0.8 },
									],
								},
							],
							isComplete: true,
							isPen: true,
						},
						expected: {
							color: 'blue',
							size: 'xl',
							segments: [
								{
									type: 'free',
									points: [
										{ x: 0, y: 0, z: 0.6 },
										{ x: 50, y: 25, z: 0.8 },
									],
								},
							],
							isComplete: true,
							isPen: true,
							scale: 1,
						},
					},
				]

				testCases.forEach((testCase, index) => {
					const oldRecord = {
						id: `shape:highlight${index}`,
						props: testCase.props,
					}

					const result = up(oldRecord)
					expect(result.props).toEqual(testCase.expected)
				})
			})
		})

		describe('AddScale down migration', () => {
			it('should remove scale property', () => {
				const newRecord = {
					id: 'shape:highlight1',
					props: {
						color: 'yellow',
						size: 'm',
						segments: [
							{
								type: 'free',
								points: [{ x: 0, y: 0, z: 0.5 }],
							},
						],
						isComplete: true,
						isPen: false,
						scale: 1.5,
					},
				}

				const result = down(newRecord)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('yellow') // Preserve other props
				expect(result.props.isPen).toBe(false) // Preserve other props
			})

			it('should preserve all other properties during down migration', () => {
				const newRecord = {
					id: 'shape:highlight1',
					typeName: 'shape',
					type: 'highlight',
					x: 150,
					y: 250,
					rotation: 1.0,
					index: 'b2',
					parentId: 'page:test',
					isLocked: true,
					opacity: 0.6,
					props: {
						color: 'red',
						size: 'xl',
						segments: [
							{
								type: 'straight',
								points: [
									{ x: 0, y: 0 },
									{ x: 200, y: 0 },
								],
							},
						],
						isComplete: true,
						isPen: false,
						scale: 2.0,
					},
					meta: { purpose: 'text-highlight' },
				}

				const result = down(newRecord)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('red')
				expect(result.props.size).toBe('xl')
				expect(result.props.segments).toEqual(newRecord.props.segments)
				expect(result.props.isComplete).toBe(true)
				expect(result.props.isPen).toBe(false)
				expect(result.x).toBe(150)
				expect(result.y).toBe(250)
				expect(result.rotation).toBe(1.0)
				expect(result.opacity).toBe(0.6)
				expect(result.meta).toEqual({ purpose: 'text-highlight' })
			})

			it('should handle records without scale property', () => {
				const recordWithoutScale = {
					id: 'shape:highlight1',
					props: {
						color: 'yellow',
						size: 'm',
						segments: [],
						isComplete: true,
						isPen: false,
					},
				}

				const result = down(recordWithoutScale)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('yellow')
			})
		})

		it('should support round-trip migration (up then down)', () => {
			const originalRecord = {
				id: 'shape:highlight1',
				props: {
					color: 'green',
					size: 'l',
					segments: [
						{
							type: 'free',
							points: [{ x: 0, y: 0, z: 0.5 }],
						},
					],
					isComplete: true,
					isPen: true,
				},
			}

			// Apply up migration
			const upResult = up(originalRecord)
			expect(upResult.props.scale).toBe(1)

			// Apply down migration
			const downResult = down(upResult)
			expect(downResult.props.scale).toBeUndefined()
			expect(downResult.props.color).toBe('green')
			expect(downResult.props.size).toBe('l')
			expect(downResult.props.isComplete).toBe(true)
			expect(downResult.props.isPen).toBe(true)
		})
	})

	describe('integration tests', () => {
		it('should work with complete highlight shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('highlight'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(highlightShapeProps),
				meta: T.jsonValue,
			})

			const validHighlightShape = {
				id: 'shape:highlight123',
				typeName: 'shape' as const,
				type: 'highlight' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.6,
				props: {
					color: 'yellow' as const,
					size: 'l' as const,
					segments: [
						{
							type: 'free' as const,
							points: [
								{ x: 0, y: 0, z: 0.5 },
								{ x: 25, y: 50, z: 0.7 },
							] as VecModel[],
						},
					],
					isComplete: true,
					isPen: false,
					scale: 1.2,
				},
				meta: { purpose: 'text-markup' },
			}

			expect(() => completeValidator.validate(validHighlightShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const highlightShape: TLHighlightShape = {
				id: 'shape:highlight_test' as TLShapeId,
				typeName: 'shape',
				type: 'highlight',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as IndexKey,
				parentId: 'page:test' as TLParentId,
				isLocked: true,
				opacity: 0.5,
				props: {
					color: 'green',
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
					isPen: true,
					scale: 0.9,
				},
				meta: { highlightType: 'annotation' },
			}

			// Should satisfy TLBaseShape structure
			expect(highlightShape.typeName).toBe('shape')
			expect(highlightShape.type).toBe('highlight')
			expect(typeof highlightShape.id).toBe('string')
			expect(typeof highlightShape.x).toBe('number')
			expect(typeof highlightShape.y).toBe('number')
			expect(typeof highlightShape.rotation).toBe('number')
			expect(highlightShape.props).toBeDefined()
			expect(highlightShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof highlightShapeVersions> = ['AddScale']

			const migrationIds = highlightShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = highlightShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should work for typical highlighting use cases', () => {
			// Test text highlighting scenario
			const textHighlight: TLHighlightShape = {
				id: 'shape:text-highlight' as TLShapeId,
				typeName: 'shape',
				type: 'highlight',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 0.4, // Semi-transparent
				props: {
					color: 'yellow',
					size: 'l', // Wide for text
					segments: [
						{
							type: 'straight',
							points: [
								{ x: 0, y: 0 },
								{ x: 200, y: 0 }, // Horizontal line
							],
						},
					],
					isComplete: true,
					isPen: false, // Mouse/touch input
					scale: 1,
				},
				meta: {},
			}

			// Test annotation highlighting scenario
			const annotationHighlight: TLHighlightShape = {
				id: 'shape:annotation-highlight' as TLShapeId,
				typeName: 'shape',
				type: 'highlight',
				x: 300,
				y: 150,
				rotation: 0,
				index: 'a2' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 0.6,
				props: {
					color: 'green',
					size: 'm',
					segments: [
						{
							type: 'free',
							points: [
								{ x: 0, y: 0, z: 0.7 },
								{ x: 30, y: 15, z: 0.8 },
								{ x: 60, y: -5, z: 0.6 },
							],
						},
					],
					isComplete: true,
					isPen: true, // Stylus input
					scale: 1.5,
				},
				meta: {},
			}

			expect(textHighlight.props.color).toBe('yellow')
			expect(textHighlight.props.segments[0].type).toBe('straight')
			expect(textHighlight.opacity).toBeLessThan(0.5)

			expect(annotationHighlight.props.color).toBe('green')
			expect(annotationHighlight.props.segments[0].type).toBe('free')
			expect(annotationHighlight.props.isPen).toBe(true)
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(highlightShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					color: 'yellow',
					segments: [{ type: 'free', points: [] }],
					// Missing other required properties
				})
			).toThrow()

			// Extra unexpected properties should throw
			expect(() =>
				fullValidator.validate({
					color: 'yellow',
					size: 'm',
					segments: [{ type: 'free', points: [] }],
					isComplete: true,
					isPen: false,
					scale: 1,
					unexpectedProperty: 'extra', // This should cause validation to fail
				})
			).toThrow()
		})

		it('should handle boundary values for numeric properties', () => {
			// Test extreme but valid values
			const extremeProps = {
				color: 'yellow' as const,
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
				isPen: false,
				scale: 0.0001, // Very small but not zero
			}

			const fullValidator = T.object(highlightShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero scale validation correctly', () => {
			// Zero should be invalid for scale (nonZeroNumber)
			expect(() => highlightShapeProps.scale.validate(0)).toThrow()

			// Very small positive numbers should be valid, but negative numbers should be invalid
			expect(() => highlightShapeProps.scale.validate(0.0001)).not.toThrow()
			expect(() => highlightShapeProps.scale.validate(-0.0001)).toThrow()
		})

		it('should handle complex segment configurations', () => {
			const complexSegments = [
				// Mixed segment types for highlighting
				{
					type: 'free' as const,
					points: Array.from({ length: 50 }, (_, i) => ({
						x: i * 2,
						y: Math.sin(i * 0.2) * 10, // Wavy highlight
						z: 0.6 + Math.random() * 0.3,
					})),
				},
				// Geometric highlight pattern
				{
					type: 'straight' as const,
					points: [
						{ x: 0, y: 0 },
						{ x: 100, y: 0 },
						{ x: 100, y: 20 },
						{ x: 0, y: 20 },
						{ x: 0, y: 0 }, // Rectangle highlight
					],
				},
				// Single point highlight (dot)
				{
					type: 'free' as const,
					points: [{ x: 50, y: 50, z: 0.8 }],
				},
			]

			expect(() => highlightShapeProps.segments.validate(complexSegments)).not.toThrow()
		})

		it('should handle segments with no points', () => {
			const emptySegments = [
				{
					type: 'free' as const,
					points: [] as VecModel[],
				},
			]

			expect(() => highlightShapeProps.segments.validate(emptySegments)).not.toThrow()
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
				expect(() => highlightShapeProps.segments.validate(segments)).toThrow()
			})
		})

		it('should handle highlight-specific color combinations', () => {
			// Typical highlighting colors
			const highlightColors = ['yellow', 'green', 'blue', 'orange', 'red'] as const

			highlightColors.forEach((color) => {
				const props = {
					color,
					size: 'l' as const,
					segments: [] as TLDrawShapeSegment[],
					isComplete: true,
					isPen: false,
					scale: 1,
				}

				expect(() => highlightShapeProps.color.validate(props.color)).not.toThrow()
			})
		})

		it('should validate typical highlighting opacity ranges', () => {
			// Highlight shapes typically use lower opacity for semi-transparency
			const typicalHighlightOpacities = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]

			typicalHighlightOpacities.forEach((opacity) => {
				expect(opacity).toBeGreaterThan(0)
				expect(opacity).toBeLessThanOrEqual(1)
			})
		})

		it('should handle highlighting with various input methods', () => {
			const inputMethods = [
				{ isPen: true, expectedPressure: true }, // Stylus/pen input
				{ isPen: false, expectedPressure: false }, // Mouse/touch input
			]

			inputMethods.forEach((method) => {
				const props = {
					color: 'yellow' as const,
					size: 'm' as const,
					segments: [
						{
							type: 'free' as const,
							points: method.expectedPressure
								? [
										{ x: 0, y: 0, z: 0.6 }, // Variable pressure
										{ x: 10, y: 5, z: 0.8 },
									]
								: [
										{ x: 0, y: 0 }, // No pressure data
										{ x: 10, y: 5 },
									],
						},
					] as TLDrawShapeSegment[],
					isComplete: true,
					isPen: method.isPen,
					scale: 1,
				}

				const fullValidator = T.object(highlightShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})
	})
})
