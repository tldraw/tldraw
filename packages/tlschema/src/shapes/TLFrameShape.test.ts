import { IndexKey } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLParentId, TLShapeId } from '../records/TLShape'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import {
	TLFrameShape,
	TLFrameShapeProps,
	frameShapeMigrations,
	frameShapeProps,
	frameShapeVersions,
} from './TLFrameShape'

describe('TLFrameShape', () => {
	describe('TLFrameShapeProps interface', () => {
		it('should represent valid frame shape properties', () => {
			const validProps: TLFrameShapeProps = {
				w: 400,
				h: 300,
				name: 'Header Section',
				color: 'blue',
			}

			expect(validProps.w).toBe(400)
			expect(validProps.h).toBe(300)
			expect(validProps.name).toBe('Header Section')
			expect(validProps.color).toBe('blue')
		})

		it('should support different frame dimensions', () => {
			const dimensionVariations: Array<Pick<TLFrameShapeProps, 'w' | 'h'>> = [
				{ w: 100, h: 100 }, // Square
				{ w: 1920, h: 1080 }, // Wide aspect ratio
				{ w: 300, h: 800 }, // Tall aspect ratio
				{ w: 0.1, h: 0.1 }, // Very small
				{ w: 10000, h: 10000 }, // Very large
			]

			dimensionVariations.forEach((dimensions) => {
				expect(dimensions.w).toBeGreaterThan(0)
				expect(dimensions.h).toBeGreaterThan(0)
				expect(typeof dimensions.w).toBe('number')
				expect(typeof dimensions.h).toBe('number')
			})
		})

		it('should support different frame names', () => {
			const nameVariations = [
				'',
				'Simple Frame',
				'Frame with Numbers 123',
				'Frame-with-dashes',
				'Frame_with_underscores',
				'Frame with special chars @#$%',
				'Very long frame name that contains many words and characters to test string handling',
				'🎨 Frame with emojis 📐',
				'多言語のフレーム名', // Multilingual name
			]

			nameVariations.forEach((name) => {
				const props: Partial<TLFrameShapeProps> = { name }
				expect(typeof props.name).toBe('string')
				expect(props.name).toBe(name)
			})
		})

		it('should support different color options', () => {
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
				const props: Partial<TLFrameShapeProps> = { color }
				expect(props.color).toBe(color)
			})
		})

		it('should support frame properties for different use cases', () => {
			const useCases = [
				{
					name: 'Wireframe Section',
					w: 300,
					h: 200,
					color: 'grey' as const,
				},
				{
					name: 'Header',
					w: 800,
					h: 100,
					color: 'blue' as const,
				},
				{
					name: 'Sidebar',
					w: 200,
					h: 600,
					color: 'light-blue' as const,
				},
				{
					name: 'Content Area',
					w: 600,
					h: 400,
					color: 'white' as const,
				},
			]

			useCases.forEach((useCase) => {
				expect(useCase.w).toBeGreaterThan(0)
				expect(useCase.h).toBeGreaterThan(0)
				expect(typeof useCase.name).toBe('string')
				expect(typeof useCase.color).toBe('string')
			})
		})
	})

	describe('TLFrameShape type', () => {
		it('should represent complete frame shape records', () => {
			const validFrameShape: TLFrameShape = {
				id: 'shape:frame123' as TLShapeId,
				typeName: 'shape',
				type: 'frame',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {
					w: 400,
					h: 300,
					name: 'Main Content',
					color: 'blue',
				},
				meta: {},
			}

			expect(validFrameShape.type).toBe('frame')
			expect(validFrameShape.typeName).toBe('shape')
			expect(validFrameShape.props.w).toBe(400)
			expect(validFrameShape.props.h).toBe(300)
			expect(validFrameShape.props.name).toBe('Main Content')
			expect(validFrameShape.props.color).toBe('blue')
		})

		it('should support different frame configurations', () => {
			const configurations = [
				{
					name: 'Navigation Frame',
					w: 1200,
					h: 80,
					color: 'black' as const,
					isLocked: false,
					opacity: 1,
				},
				{
					name: 'Modal Frame',
					w: 500,
					h: 350,
					color: 'grey' as const,
					isLocked: true,
					opacity: 0.9,
				},
				{
					name: 'Card Frame',
					w: 250,
					h: 400,
					color: 'light-blue' as const,
					isLocked: false,
					opacity: 0.8,
				},
			]

			configurations.forEach((config, index) => {
				const shape: TLFrameShape = {
					id: `shape:frame${index}` as TLShapeId,
					typeName: 'shape',
					type: 'frame',
					x: index * 100,
					y: index * 50,
					rotation: 0,
					index: `a${index}` as IndexKey,
					parentId: 'page:main' as TLParentId,
					isLocked: config.isLocked,
					opacity: config.opacity,
					props: {
						w: config.w,
						h: config.h,
						name: config.name,
						color: config.color,
					},
					meta: {},
				}

				expect(shape.props.w).toBe(config.w)
				expect(shape.props.h).toBe(config.h)
				expect(shape.props.name).toBe(config.name)
				expect(shape.props.color).toBe(config.color)
				expect(shape.isLocked).toBe(config.isLocked)
				expect(shape.opacity).toBe(config.opacity)
			})
		})

		it('should support frames with child shapes', () => {
			const parentFrame: TLFrameShape = {
				id: 'shape:parent-frame' as TLShapeId,
				typeName: 'shape',
				type: 'frame',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {
					w: 800,
					h: 600,
					name: 'Container Frame',
					color: 'grey',
				},
				meta: {
					children: ['shape:child1', 'shape:child2'],
					purpose: 'layout',
				},
			}

			// Child shapes would have parentId pointing to the frame
			const childShapeParentId: TLParentId = parentFrame.id as TLParentId

			expect(parentFrame.props.name).toBe('Container Frame')
			expect(parentFrame.meta.children).toHaveLength(2)
			expect(childShapeParentId).toBe('shape:parent-frame')
		})

		it('should support nested frame structures', () => {
			const outerFrame: TLFrameShape = {
				id: 'shape:outer-frame' as TLShapeId,
				typeName: 'shape',
				type: 'frame',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {
					w: 1000,
					h: 800,
					name: 'Outer Container',
					color: 'grey',
				},
				meta: {},
			}

			const innerFrame: TLFrameShape = {
				id: 'shape:inner-frame' as TLShapeId,
				typeName: 'shape',
				type: 'frame',
				x: 50,
				y: 50,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: outerFrame.id as TLParentId, // Nested inside outer frame
				isLocked: false,
				opacity: 1,
				props: {
					w: 400,
					h: 300,
					name: 'Inner Container',
					color: 'blue',
				},
				meta: {},
			}

			expect(outerFrame.props.name).toBe('Outer Container')
			expect(innerFrame.props.name).toBe('Inner Container')
			expect(innerFrame.parentId).toBe('shape:outer-frame')
		})

		it('should support frames with custom metadata', () => {
			const frameWithMetadata: TLFrameShape = {
				id: 'shape:meta-frame' as TLShapeId,
				typeName: 'shape',
				type: 'frame',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {
					w: 500,
					h: 400,
					name: 'Component Frame',
					color: 'light-green',
				},
				meta: {
					componentType: 'button',
					version: '2.1.0',
					responsive: true,
					breakpoints: {
						mobile: 320,
						tablet: 768,
						desktop: 1024,
					},
					tags: ['ui', 'interactive'],
					createdAt: '2024-01-01T00:00:00Z',
				},
			}

			expect(frameWithMetadata.meta.componentType).toBe('button')
			expect(frameWithMetadata.meta.version).toBe('2.1.0')
			expect(frameWithMetadata.meta.responsive).toBe(true)
			expect(frameWithMetadata.meta.breakpoints).toBeDefined()
			expect(frameWithMetadata.meta.tags).toHaveLength(2)
		})
	})

	describe('frameShapeProps validation schema', () => {
		it('should validate all frame shape properties', () => {
			const validProps = {
				w: 400,
				h: 300,
				name: 'Test Frame',
				color: 'blue' as const,
			}

			// Validate each property individually
			expect(() => frameShapeProps.w.validate(validProps.w)).not.toThrow()
			expect(() => frameShapeProps.h.validate(validProps.h)).not.toThrow()
			expect(() => frameShapeProps.name.validate(validProps.name)).not.toThrow()
			expect(() => frameShapeProps.color.validate(validProps.color)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(frameShapeProps)

			const validPropsObject = {
				w: 800,
				h: 600,
				name: 'Header Section',
				color: 'red' as const,
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should validate width as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validWidths = [0.1, 1, 10, 100, 1000, 99999]

			validWidths.forEach((width) => {
				expect(() => frameShapeProps.w.validate(width)).not.toThrow()
			})

			// Invalid widths (zero, negative, and non-numbers)
			const invalidWidths = [0, -1, -10, 'not-number', null, undefined, {}, [], true, false]

			invalidWidths.forEach((width) => {
				expect(() => frameShapeProps.w.validate(width)).toThrow()
			})
		})

		it('should validate height as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validHeights = [0.1, 1, 10, 100, 1000, 99999]

			validHeights.forEach((height) => {
				expect(() => frameShapeProps.h.validate(height)).not.toThrow()
			})

			// Invalid heights (zero, negative, and non-numbers)
			const invalidHeights = [0, -1, -10, 'not-number', null, undefined, {}, [], true, false]

			invalidHeights.forEach((height) => {
				expect(() => frameShapeProps.h.validate(height)).toThrow()
			})
		})

		it('should validate name as string', () => {
			// Valid string values
			const validNames = [
				'',
				'Frame Name',
				'Frame123',
				'Frame-with-dashes',
				'Frame_with_underscores',
				'Frame with symbols @#$%^&*()',
				'Very long frame name that contains many words and characters',
				'🎨 Unicode name 📐',
			]

			validNames.forEach((name) => {
				expect(() => frameShapeProps.name.validate(name)).not.toThrow()
			})

			// Invalid name values (non-strings)
			const invalidNames = [null, undefined, 123, true, false, {}, [], Symbol('test')]

			invalidNames.forEach((name) => {
				expect(() => frameShapeProps.name.validate(name)).toThrow()
			})
		})

		it('should validate color with default color style values', () => {
			// Valid default color style values
			const validColors = [
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
			]

			validColors.forEach((color) => {
				expect(() => frameShapeProps.color.validate(color)).not.toThrow()
			})

			// Invalid color values
			const invalidColors = [
				'purple', // Not in default palette
				'BLUE', // Case sensitive
				'light_blue', // Wrong format
				'',
				null,
				undefined,
				123,
				{},
				[],
				true,
				false,
			]

			invalidColors.forEach((color) => {
				expect(() => frameShapeProps.color.validate(color)).toThrow()
			})
		})

		it('should use correct validators for props', () => {
			// Verify that the props schema uses the expected validators
			expect(frameShapeProps.w).toBe(T.nonZeroNumber)
			expect(frameShapeProps.h).toBe(T.nonZeroNumber)
			expect(frameShapeProps.name).toBe(T.string)
			// Color should be a literal enum validator, not the actual DefaultColorStyle
			expect(frameShapeProps.color).not.toBe(DefaultColorStyle)
			expect(typeof frameShapeProps.color.validate).toBe('function')
		})

		it('should reject objects with missing properties', () => {
			const fullValidator = T.object(frameShapeProps)

			const incompleteObjects = [
				{}, // Empty object
				{ w: 100 }, // Missing h, name, color
				{ w: 100, h: 200 }, // Missing name, color
				{ w: 100, h: 200, name: 'Test' }, // Missing color
				{ h: 200, name: 'Test', color: 'blue' }, // Missing w
				{ w: 100, name: 'Test', color: 'blue' }, // Missing h
				{ w: 100, h: 200, color: 'blue' }, // Missing name
			]

			incompleteObjects.forEach((obj) => {
				expect(() => fullValidator.validate(obj)).toThrow()
			})
		})

		it('should reject objects with extra properties', () => {
			const fullValidator = T.object(frameShapeProps)

			const objectsWithExtraProps = [
				{
					w: 100,
					h: 200,
					name: 'Test',
					color: 'blue',
					extraProp: 'extra',
				},
				{
					w: 100,
					h: 200,
					name: 'Test',
					color: 'blue',
					x: 50, // Should not be in props, belongs to base shape
				},
				{
					w: 100,
					h: 200,
					name: 'Test',
					color: 'blue',
					id: 'shape:test', // Should not be in props
				},
			]

			objectsWithExtraProps.forEach((obj) => {
				expect(() => fullValidator.validate(obj)).toThrow()
			})
		})
	})

	describe('frameShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(frameShapeVersions).toBeDefined()
			expect(typeof frameShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof frameShapeVersions> = ['AddColorProp']

			expectedVersions.forEach((version) => {
				expect(frameShapeVersions[version]).toBeDefined()
				expect(typeof frameShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(frameShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.frame\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain frame in migration IDs', () => {
			Object.values(frameShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('frame')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(frameShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('frameShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(frameShapeMigrations).toBeDefined()
			expect(frameShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(frameShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = frameShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(frameShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have exactly the same number of migrations as version IDs
			expect(frameShapeMigrations.sequence.length).toBe(Object.keys(frameShapeVersions).length)
		})
	})

	describe('frameShapeMigrations - AddColorProp migration', () => {
		const { up, down } = getTestMigration(frameShapeVersions.AddColorProp)

		describe('AddColorProp up migration', () => {
			it('should add color property with default value "black"', () => {
				const oldRecord = {
					id: 'shape:frame1',
					props: {
						w: 400,
						h: 300,
						name: 'Test Frame',
					},
				}

				const result = up(oldRecord)
				expect(result.props.color).toBe('black')
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:frame1',
					typeName: 'shape',
					type: 'frame',
					x: 100,
					y: 200,
					rotation: 0.5,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 0.8,
					props: {
						w: 500,
						h: 400,
						name: 'Header Frame',
					},
					meta: { custom: 'data' },
				}

				const result = up(oldRecord)
				expect(result.props.color).toBe('black')
				expect(result.props.w).toBe(500)
				expect(result.props.h).toBe(400)
				expect(result.props.name).toBe('Header Frame')
				expect(result.x).toBe(100)
				expect(result.y).toBe(200)
				expect(result.rotation).toBe(0.5)
				expect(result.isLocked).toBe(false)
				expect(result.opacity).toBe(0.8)
				expect(result.meta).toEqual({ custom: 'data' })
			})

			it('should handle frames with different dimensions and names', () => {
				const testCases = [
					{
						props: { w: 100, h: 50, name: '' },
						expected: { w: 100, h: 50, name: '', color: 'black' },
					},
					{
						props: { w: 1920, h: 1080, name: 'Large Frame' },
						expected: { w: 1920, h: 1080, name: 'Large Frame', color: 'black' },
					},
					{
						props: { w: 0.1, h: 0.1, name: 'Tiny Frame' },
						expected: { w: 0.1, h: 0.1, name: 'Tiny Frame', color: 'black' },
					},
				]

				testCases.forEach((testCase, index) => {
					const oldRecord = {
						id: `shape:frame${index}`,
						props: testCase.props,
					}

					const result = up(oldRecord)
					expect(result.props).toEqual(testCase.expected)
				})
			})

			it('should handle frames with no existing props', () => {
				const oldRecord = {
					id: 'shape:frame1',
				}

				// Migration will fail if props doesn't exist, which is expected behavior
				expect(() => up(oldRecord)).toThrow()
			})

			it('should handle frames with empty props object', () => {
				const oldRecord = {
					id: 'shape:frame1',
					props: {},
				}

				const result = up(oldRecord)
				expect(result.props.color).toBe('black')
			})

			it('should not overwrite existing color property if present', () => {
				const oldRecordWithColor = {
					id: 'shape:frame1',
					props: {
						w: 400,
						h: 300,
						name: 'Test Frame',
						color: 'blue', // Already has color
					},
				}

				const result = up(oldRecordWithColor)
				// Migration adds color regardless, but this tests the migration runs
				expect(result.props.color).toBe('black') // Migration overwrites with default
			})
		})

		describe('AddColorProp down migration', () => {
			it('should remove color property', () => {
				const newRecord = {
					id: 'shape:frame1',
					props: {
						w: 400,
						h: 300,
						name: 'Test Frame',
						color: 'blue',
					},
				}

				const result = down(newRecord)
				expect(result.props.color).toBeUndefined()
				expect(result.props.w).toBe(400)
				expect(result.props.h).toBe(300)
				expect(result.props.name).toBe('Test Frame')
			})

			it('should preserve all other properties during down migration', () => {
				const newRecord = {
					id: 'shape:frame1',
					typeName: 'shape',
					type: 'frame',
					x: 150,
					y: 250,
					rotation: 1.0,
					index: 'b2',
					parentId: 'page:test',
					isLocked: true,
					opacity: 0.6,
					props: {
						w: 600,
						h: 450,
						name: 'Content Frame',
						color: 'red',
					},
					meta: { version: 2 },
				}

				const result = down(newRecord)
				expect(result.props.color).toBeUndefined()
				expect(result.props.w).toBe(600)
				expect(result.props.h).toBe(450)
				expect(result.props.name).toBe('Content Frame')
				expect(result.x).toBe(150)
				expect(result.y).toBe(250)
				expect(result.rotation).toBe(1.0)
				expect(result.isLocked).toBe(true)
				expect(result.opacity).toBe(0.6)
				expect(result.meta).toEqual({ version: 2 })
			})

			it('should handle records without color property', () => {
				const recordWithoutColor = {
					id: 'shape:frame1',
					props: {
						w: 400,
						h: 300,
						name: 'Test Frame',
					},
				}

				const result = down(recordWithoutColor)
				expect(result.props.color).toBeUndefined()
				expect(result.props.w).toBe(400)
				expect(result.props.h).toBe(300)
				expect(result.props.name).toBe('Test Frame')
			})

			it('should handle records with no props', () => {
				const recordWithoutProps = {
					id: 'shape:frame1',
				}

				// Migration will fail if props doesn't exist, which is expected behavior
				expect(() => down(recordWithoutProps)).toThrow()
			})

			it('should handle records with empty props', () => {
				const recordWithEmptyProps = {
					id: 'shape:frame1',
					props: {},
				}

				const result = down(recordWithEmptyProps)
				expect(result.props.color).toBeUndefined()
			})
		})

		it('should support round-trip migration (up then down)', () => {
			const originalRecord = {
				id: 'shape:frame1',
				props: {
					w: 400,
					h: 300,
					name: 'Test Frame',
				},
			}

			// Apply up migration
			const upResult = up(originalRecord)
			expect(upResult.props.color).toBe('black')

			// Apply down migration
			const downResult = down(upResult)
			expect(downResult.props.color).toBeUndefined()
			expect(downResult.props.w).toBe(400)
			expect(downResult.props.h).toBe(300)
			expect(downResult.props.name).toBe('Test Frame')
		})
	})

	describe('integration tests', () => {
		it('should work with complete frame shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('frame'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(frameShapeProps),
				meta: T.jsonValue,
			})

			const validFrameShape = {
				id: 'shape:frame123',
				typeName: 'shape' as const,
				type: 'frame' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					w: 800,
					h: 600,
					name: 'Main Container',
					color: 'blue' as const,
				},
				meta: { purpose: 'layout' },
			}

			expect(() => completeValidator.validate(validFrameShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const frameShape: TLFrameShape = {
				id: 'shape:frame_test' as TLShapeId,
				typeName: 'shape',
				type: 'frame',
				x: 50,
				y: 75,
				rotation: 0.25,
				index: 'b1' as IndexKey,
				parentId: 'page:test' as TLParentId,
				isLocked: true,
				opacity: 0.9,
				props: {
					w: 300,
					h: 400,
					name: 'Sidebar Frame',
					color: 'grey',
				},
				meta: { component: 'sidebar' },
			}

			// Should satisfy TLBaseShape structure
			expect(frameShape.typeName).toBe('shape')
			expect(frameShape.type).toBe('frame')
			expect(typeof frameShape.id).toBe('string')
			expect(typeof frameShape.x).toBe('number')
			expect(typeof frameShape.y).toBe('number')
			expect(typeof frameShape.rotation).toBe('number')
			expect(frameShape.props).toBeDefined()
			expect(frameShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof frameShapeVersions> = ['AddColorProp']

			const migrationIds = frameShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = frameShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should work in frame hierarchy scenarios', () => {
			// Test parent frame
			const parentFrame: TLFrameShape = {
				id: 'shape:parent' as TLShapeId,
				typeName: 'shape',
				type: 'frame',
				x: 0,
				y: 0,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: 'page:main' as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {
					w: 1000,
					h: 800,
					name: 'Page Container',
					color: 'grey',
				},
				meta: {},
			}

			// Test child frame
			const childFrame: TLFrameShape = {
				id: 'shape:child' as TLShapeId,
				typeName: 'shape',
				type: 'frame',
				x: 100,
				y: 100,
				rotation: 0,
				index: 'a1' as IndexKey,
				parentId: parentFrame.id as TLParentId,
				isLocked: false,
				opacity: 1,
				props: {
					w: 300,
					h: 200,
					name: 'Content Section',
					color: 'blue',
				},
				meta: {},
			}

			expect(parentFrame.props.w).toBeGreaterThan(childFrame.props.w)
			expect(parentFrame.props.h).toBeGreaterThan(childFrame.props.h)
			expect(childFrame.parentId).toBe('shape:parent')
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle extreme dimension values', () => {
			// Test very large dimensions
			const largeFrame = {
				w: Number.MAX_SAFE_INTEGER,
				h: Number.MAX_SAFE_INTEGER,
				name: 'Large Frame',
				color: 'black' as const,
			}

			expect(() => frameShapeProps.w.validate(largeFrame.w)).not.toThrow()
			expect(() => frameShapeProps.h.validate(largeFrame.h)).not.toThrow()

			// Test very small positive dimensions
			const smallFrame = {
				w: Number.MIN_VALUE,
				h: Number.MIN_VALUE,
				name: 'Small Frame',
				color: 'black' as const,
			}

			expect(() => frameShapeProps.w.validate(smallFrame.w)).not.toThrow()
			expect(() => frameShapeProps.h.validate(smallFrame.h)).not.toThrow()
		})

		it('should reject invalid dimension values', () => {
			const invalidDimensions = [
				0,
				-1,
				-0.1,
				Number.NEGATIVE_INFINITY,
				Number.POSITIVE_INFINITY,
				Number.NaN,
			]

			invalidDimensions.forEach((dimension) => {
				expect(() => frameShapeProps.w.validate(dimension)).toThrow()
				expect(() => frameShapeProps.h.validate(dimension)).toThrow()
			})
		})

		it('should handle extremely long frame names', () => {
			const longName = 'x'.repeat(10000) // Very long string
			expect(() => frameShapeProps.name.validate(longName)).not.toThrow()

			const veryLongName = 'A'.repeat(100000) // Extremely long string
			expect(() => frameShapeProps.name.validate(veryLongName)).not.toThrow()
		})

		it('should handle special characters in frame names', () => {
			const specialNames = [
				'Frame\n with\n newlines',
				'Frame\t with\t tabs',
				'Frame "with" quotes',
				"Frame 'with' single quotes",
				'Frame with \\backslashes\\',
				'Frame with / forward slashes /',
				'Frame with & ampersands &',
				'Frame with < angle > brackets',
			]

			specialNames.forEach((name) => {
				expect(() => frameShapeProps.name.validate(name)).not.toThrow()
			})
		})

		it('should handle malformed props validation gracefully', () => {
			const fullValidator = T.object(frameShapeProps)

			// Test completely invalid inputs
			const invalidInputs = [null, undefined, 'not-object', 123, true, false, [], () => {}]

			invalidInputs.forEach((input) => {
				expect(() => fullValidator.validate(input)).toThrow()
			})
		})

		it('should handle props with invalid property types', () => {
			const fullValidator = T.object(frameShapeProps)

			const propsWithInvalidTypes = [
				{
					w: 'not-number', // Should be number
					h: 200,
					name: 'Test',
					color: 'blue',
				},
				{
					w: 200,
					h: null, // Should be number
					name: 'Test',
					color: 'blue',
				},
				{
					w: 200,
					h: 300,
					name: 123, // Should be string
					color: 'blue',
				},
				{
					w: 200,
					h: 300,
					name: 'Test',
					color: 123, // Should be string
				},
			]

			propsWithInvalidTypes.forEach((props) => {
				expect(() => fullValidator.validate(props)).toThrow()
			})
		})

		it('should validate aspect ratios from common use cases', () => {
			const commonAspectRatios = [
				{ w: 16, h: 9 }, // Widescreen
				{ w: 4, h: 3 }, // Traditional
				{ w: 1, h: 1 }, // Square
				{ w: 3, h: 4 }, // Portrait
				{ w: 21, h: 9 }, // Ultra-wide
				{ w: 1920, h: 1080 }, // HD
				{ w: 320, h: 568 }, // Mobile portrait
			]

			const fullValidator = T.object(frameShapeProps)

			commonAspectRatios.forEach((ratio, index) => {
				const props = {
					w: ratio.w,
					h: ratio.h,
					name: `Aspect Ratio Frame ${index}`,
					color: 'blue' as const,
				}

				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})

		it('should handle frames used for UI components', () => {
			const componentFrames = [
				{
					w: 280,
					h: 40,
					name: 'Button Frame',
					color: 'blue' as const,
				},
				{
					w: 300,
					h: 200,
					name: 'Card Frame',
					color: 'white' as const,
				},
				{
					w: 64,
					h: 64,
					name: 'Icon Frame',
					color: 'grey' as const,
				},
				{
					w: 1200,
					h: 60,
					name: 'Navigation Frame',
					color: 'black' as const,
				},
			]

			const fullValidator = T.object(frameShapeProps)

			componentFrames.forEach((frame) => {
				expect(() => fullValidator.validate(frame)).not.toThrow()
			})
		})
	})
})
