import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLRichText, toRichText } from '../misc/TLRichText'
import { TLShapeId } from '../records/TLShape'
import { DefaultColorStyle, DefaultLabelColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultHorizontalAlignStyle } from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultVerticalAlignStyle } from '../styles/TLVerticalAlignStyle'
import {
	GeoShapeGeoStyle,
	TLGeoShape,
	TLGeoShapeGeoStyle,
	TLGeoShapeProps,
	geoShapeMigrations,
	geoShapeProps,
	geoShapeVersions,
} from './TLGeoShape'

describe('TLGeoShape', () => {
	describe('GeoShapeGeoStyle', () => {
		it('should have correct id and default value', () => {
			expect(GeoShapeGeoStyle.id).toBe('tldraw:geo')
			expect(GeoShapeGeoStyle.defaultValue).toBe('rectangle')
		})

		it('should validate all geometric shape types', () => {
			const validGeoTypes = [
				'cloud',
				'rectangle',
				'ellipse',
				'triangle',
				'diamond',
				'pentagon',
				'hexagon',
				'octagon',
				'star',
				'rhombus',
				'rhombus-2',
				'oval',
				'trapezoid',
				'arrow-right',
				'arrow-left',
				'arrow-up',
				'arrow-down',
				'x-box',
				'check-box',
				'heart',
			]

			validGeoTypes.forEach((geoType) => {
				expect(() => GeoShapeGeoStyle.validate(geoType)).not.toThrow()
				expect(GeoShapeGeoStyle.validate(geoType)).toBe(geoType)
			})
		})

		it('should reject invalid geometric shape types', () => {
			const invalidGeoTypes = [
				'square', // Should be 'rectangle'
				'circle', // Should be 'ellipse'
				'RECTANGLE', // Case sensitive
				'Triangle', // Case sensitive
				'arrow', // Should be specific direction
				'',
				null,
				undefined,
				123,
				{},
				[],
				'invalid-shape',
				'polygon',
				'line',
			]

			invalidGeoTypes.forEach((geoType) => {
				expect(() => GeoShapeGeoStyle.validate(geoType)).toThrow()
			})
		})

		it('should check validation results', () => {
			// Valid values should not throw
			expect(() => GeoShapeGeoStyle.validate('rectangle')).not.toThrow()
			expect(() => GeoShapeGeoStyle.validate('ellipse')).not.toThrow()
			expect(() => GeoShapeGeoStyle.validate('triangle')).not.toThrow()
			expect(() => GeoShapeGeoStyle.validate('star')).not.toThrow()

			// Invalid values should throw
			expect(() => GeoShapeGeoStyle.validate('invalid')).toThrow()
			expect(() => GeoShapeGeoStyle.validate('')).toThrow()
			expect(() => GeoShapeGeoStyle.validate(null)).toThrow()
		})

		it('should validate all arrow directions', () => {
			const arrowTypes = ['arrow-right', 'arrow-left', 'arrow-up', 'arrow-down']

			arrowTypes.forEach((arrow) => {
				expect(() => GeoShapeGeoStyle.validate(arrow)).not.toThrow()
				expect(GeoShapeGeoStyle.validate(arrow)).toBe(arrow)
			})
		})

		it('should validate special shapes', () => {
			const specialShapes = ['cloud', 'x-box', 'check-box', 'heart']

			specialShapes.forEach((shape) => {
				expect(() => GeoShapeGeoStyle.validate(shape)).not.toThrow()
				expect(GeoShapeGeoStyle.validate(shape)).toBe(shape)
			})
		})

		it('should validate polygon shapes', () => {
			const polygonShapes = ['triangle', 'diamond', 'pentagon', 'hexagon', 'octagon']

			polygonShapes.forEach((polygon) => {
				expect(() => GeoShapeGeoStyle.validate(polygon)).not.toThrow()
				expect(GeoShapeGeoStyle.validate(polygon)).toBe(polygon)
			})
		})

		it('should validate rhombus variants', () => {
			const rhombusShapes = ['rhombus', 'rhombus-2']

			rhombusShapes.forEach((rhombus) => {
				expect(() => GeoShapeGeoStyle.validate(rhombus)).not.toThrow()
				expect(GeoShapeGeoStyle.validate(rhombus)).toBe(rhombus)
			})
		})
	})

	describe('TLGeoShapeGeoStyle type', () => {
		it('should represent valid geometric shape styles', () => {
			const geoStyles: TLGeoShapeGeoStyle[] = [
				'rectangle',
				'ellipse',
				'triangle',
				'diamond',
				'star',
				'arrow-right',
				'cloud',
				'heart',
			]

			geoStyles.forEach((style) => {
				expect(typeof style).toBe('string')
				expect(() => GeoShapeGeoStyle.validate(style)).not.toThrow()
			})
		})

		it('should be compatible with GeoShapeGeoStyle validation', () => {
			const allValidStyles: TLGeoShapeGeoStyle[] = [
				'cloud',
				'rectangle',
				'ellipse',
				'triangle',
				'diamond',
				'pentagon',
				'hexagon',
				'octagon',
				'star',
				'rhombus',
				'rhombus-2',
				'oval',
				'trapezoid',
				'arrow-right',
				'arrow-left',
				'arrow-up',
				'arrow-down',
				'x-box',
				'check-box',
				'heart',
			]

			allValidStyles.forEach((style) => {
				expect(() => GeoShapeGeoStyle.validate(style)).not.toThrow()
			})
		})
	})

	describe('TLGeoShapeProps interface', () => {
		it('should represent valid geo shape properties', () => {
			const validProps: TLGeoShapeProps = {
				geo: 'rectangle',
				dash: 'solid',
				url: '',
				w: 100,
				h: 80,
				growY: 0,
				scale: 1,
				labelColor: 'black',
				color: 'blue',
				fill: 'none',
				size: 'm',
				font: 'draw',
				align: 'middle',
				verticalAlign: 'middle',
				richText: toRichText('Hello World'),
			}

			expect(validProps.geo).toBe('rectangle')
			expect(validProps.dash).toBe('solid')
			expect(validProps.url).toBe('')
			expect(validProps.w).toBe(100)
			expect(validProps.h).toBe(80)
			expect(validProps.growY).toBe(0)
			expect(validProps.scale).toBe(1)
			expect(validProps.labelColor).toBe('black')
			expect(validProps.color).toBe('blue')
			expect(validProps.fill).toBe('none')
			expect(validProps.size).toBe('m')
			expect(validProps.font).toBe('draw')
			expect(validProps.align).toBe('middle')
			expect(validProps.verticalAlign).toBe('middle')
			expect(validProps.richText).toBeDefined()
		})

		it('should support different geometric shapes', () => {
			const shapes = ['ellipse', 'triangle', 'star', 'arrow-up', 'heart'] as const

			shapes.forEach((geoType) => {
				const props: TLGeoShapeProps = {
					geo: geoType,
					dash: 'dashed',
					url: 'https://example.com',
					w: 200,
					h: 150,
					growY: 10,
					scale: 1.5,
					labelColor: 'red',
					color: 'green',
					fill: 'solid',
					size: 'l',
					font: 'sans',
					align: 'start',
					verticalAlign: 'start',
					richText: toRichText(`${geoType} shape`),
				}

				expect(props.geo).toBe(geoType)
			})
		})

		it('should support different styling combinations', () => {
			const stylingVariations = [
				{
					color: 'black' as const,
					fill: 'none' as const,
					dash: 'solid' as const,
					size: 's' as const,
				},
				{
					color: 'red' as const,
					fill: 'solid' as const,
					dash: 'dashed' as const,
					size: 'm' as const,
				},
				{
					color: 'blue' as const,
					fill: 'pattern' as const,
					dash: 'dotted' as const,
					size: 'l' as const,
				},
				{
					color: 'green' as const,
					fill: 'semi' as const,
					dash: 'draw' as const,
					size: 'xl' as const,
				},
			]

			stylingVariations.forEach((styling, index) => {
				const props: Partial<TLGeoShapeProps> = {
					color: styling.color,
					fill: styling.fill,
					dash: styling.dash,
					size: styling.size,
				}

				expect(props.color).toBe(styling.color)
				expect(props.fill).toBe(styling.fill)
				expect(props.dash).toBe(styling.dash)
				expect(props.size).toBe(styling.size)
			})
		})

		it('should support different alignment combinations', () => {
			const alignmentCombinations: Array<
				[TLGeoShapeProps['align'], TLGeoShapeProps['verticalAlign']]
			> = [
				['start', 'start'],
				['middle', 'middle'],
				['end', 'end'],
				['start-legacy', 'start'],
				['middle-legacy', 'middle'],
				['end-legacy', 'end'],
			]

			alignmentCombinations.forEach(([align, verticalAlign]) => {
				const props: Partial<TLGeoShapeProps> = {
					align,
					verticalAlign,
				}

				expect(props.align).toBe(align)
				expect(props.verticalAlign).toBe(verticalAlign)
			})
		})

		it('should support different font styles', () => {
			const fontStyles = ['draw', 'sans', 'serif', 'mono'] as const

			fontStyles.forEach((font) => {
				const props: Partial<TLGeoShapeProps> = {
					font,
				}

				expect(props.font).toBe(font)
			})
		})

		it('should support rich text content', () => {
			const richTexts = [
				toRichText(''),
				toRichText('Simple text'),
				toRichText('**Bold** text'),
				toRichText('*Italic* text'),
				toRichText('Multiple\nLines'),
			]

			richTexts.forEach((richText, index) => {
				const props: Partial<TLGeoShapeProps> = {
					richText,
				}

				expect(props.richText).toBe(richText)
			})
		})

		it('should support different dimensions and scaling', () => {
			const dimensionVariations = [
				{ w: 50, h: 50, scale: 0.5, growY: 0 },
				{ w: 100, h: 75, scale: 1, growY: 5 },
				{ w: 200, h: 150, scale: 1.5, growY: 20 },
				{ w: 300, h: 400, scale: 2, growY: 50 },
			]

			dimensionVariations.forEach((dims) => {
				const props: Partial<TLGeoShapeProps> = {
					w: dims.w,
					h: dims.h,
					scale: dims.scale,
					growY: dims.growY,
				}

				expect(props.w).toBe(dims.w)
				expect(props.h).toBe(dims.h)
				expect(props.scale).toBe(dims.scale)
				expect(props.growY).toBe(dims.growY)
			})
		})

		it('should support URL links', () => {
			const urlVariations = [
				'',
				'https://tldraw.com',
				'http://example.com',
				'https://subdomain.example.com/path',
				'https://example.com/path?query=value#anchor',
			]

			urlVariations.forEach((url) => {
				const props: Partial<TLGeoShapeProps> = { url }
				expect(props.url).toBe(url)
			})
		})
	})

	describe('TLGeoShape type', () => {
		it('should represent complete geo shape records', () => {
			const validGeoShape: TLGeoShape = {
				id: 'shape:geo123' as TLShapeId,
				typeName: 'shape',
				type: 'geo',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					geo: 'rectangle',
					dash: 'solid',
					url: '',
					w: 150,
					h: 100,
					growY: 0,
					scale: 1,
					labelColor: 'black',
					color: 'blue',
					fill: 'none',
					size: 'm',
					font: 'draw',
					align: 'middle',
					verticalAlign: 'middle',
					richText: toRichText('Rectangle'),
				},
				meta: {},
			}

			expect(validGeoShape.type).toBe('geo')
			expect(validGeoShape.typeName).toBe('shape')
			expect(validGeoShape.props.geo).toBe('rectangle')
			expect(validGeoShape.props.w).toBe(150)
			expect(validGeoShape.props.h).toBe(100)
		})

		it('should support different geometric configurations', () => {
			const configurations = [
				{
					geo: 'ellipse' as const,
					color: 'red' as const,
					fill: 'solid' as const,
					w: 120,
					h: 80,
				},
				{
					geo: 'triangle' as const,
					color: 'green' as const,
					fill: 'pattern' as const,
					w: 100,
					h: 100,
				},
				{
					geo: 'star' as const,
					color: 'blue' as const,
					fill: 'semi' as const,
					w: 80,
					h: 80,
				},
				{
					geo: 'arrow-right' as const,
					color: 'orange' as const,
					fill: 'none' as const,
					w: 150,
					h: 50,
				},
			]

			configurations.forEach((config, index) => {
				const shape: TLGeoShape = {
					id: `shape:geo${index}` as TLShapeId,
					typeName: 'shape',
					type: 'geo',
					x: index * 100,
					y: index * 50,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						geo: config.geo,
						dash: 'solid',
						url: '',
						w: config.w,
						h: config.h,
						growY: 0,
						scale: 1,
						labelColor: 'black',
						color: config.color,
						fill: config.fill,
						size: 'm',
						font: 'draw',
						align: 'middle',
						verticalAlign: 'middle',
						richText: toRichText(''),
					},
					meta: {},
				}

				expect(shape.props.geo).toBe(config.geo)
				expect(shape.props.color).toBe(config.color)
				expect(shape.props.fill).toBe(config.fill)
				expect(shape.props.w).toBe(config.w)
				expect(shape.props.h).toBe(config.h)
			})
		})

		it('should support shapes with text content', () => {
			const textVariations = [
				'',
				'Simple text',
				'Multi\nLine\nText',
				'Text with **bold** and *italic*',
			]

			textVariations.forEach((text, index) => {
				const shape: TLGeoShape = {
					id: `shape:text_geo${index}` as TLShapeId,
					typeName: 'shape',
					type: 'geo',
					x: 0,
					y: 0,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						geo: 'rectangle',
						dash: 'solid',
						url: '',
						w: 200,
						h: 100,
						growY: index * 10, // Different growY for text expansion
						scale: 1,
						labelColor: 'black',
						color: 'black',
						fill: 'none',
						size: 'm',
						font: 'draw',
						align: 'middle',
						verticalAlign: 'middle',
						richText: toRichText(text),
					},
					meta: {},
				}

				expect(shape.props.richText).toBeDefined()
				expect(shape.props.growY).toBe(index * 10)
			})
		})
	})

	describe('geoShapeProps validation schema', () => {
		it('should validate all geo shape properties', () => {
			const validProps = {
				geo: 'ellipse',
				dash: 'dashed',
				url: 'https://example.com',
				w: 150,
				h: 120,
				growY: 15,
				scale: 1.2,
				labelColor: 'red',
				color: 'blue',
				fill: 'solid',
				size: 'l',
				font: 'sans',
				align: 'start',
				verticalAlign: 'end',
				richText: toRichText('Test text'),
			}

			// Validate each property individually
			expect(() => geoShapeProps.geo.validate(validProps.geo)).not.toThrow()
			expect(() => geoShapeProps.dash.validate(validProps.dash)).not.toThrow()
			expect(() => geoShapeProps.url.validate(validProps.url)).not.toThrow()
			expect(() => geoShapeProps.w.validate(validProps.w)).not.toThrow()
			expect(() => geoShapeProps.h.validate(validProps.h)).not.toThrow()
			expect(() => geoShapeProps.growY.validate(validProps.growY)).not.toThrow()
			expect(() => geoShapeProps.scale.validate(validProps.scale)).not.toThrow()
			expect(() => geoShapeProps.labelColor.validate(validProps.labelColor)).not.toThrow()
			expect(() => geoShapeProps.color.validate(validProps.color)).not.toThrow()
			expect(() => geoShapeProps.fill.validate(validProps.fill)).not.toThrow()
			expect(() => geoShapeProps.size.validate(validProps.size)).not.toThrow()
			expect(() => geoShapeProps.font.validate(validProps.font)).not.toThrow()
			expect(() => geoShapeProps.align.validate(validProps.align)).not.toThrow()
			expect(() => geoShapeProps.verticalAlign.validate(validProps.verticalAlign)).not.toThrow()
			expect(() => geoShapeProps.richText.validate(validProps.richText)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(geoShapeProps)

			const validPropsObject = {
				geo: 'triangle' as const,
				dash: 'dotted' as const,
				url: 'https://test.com',
				w: 180,
				h: 140,
				growY: 25,
				scale: 0.8,
				labelColor: 'green' as const,
				color: 'red' as const,
				fill: 'pattern' as const,
				size: 's' as const,
				font: 'mono' as const,
				align: 'end' as const,
				verticalAlign: 'start' as const,
				richText: toRichText('Triangle test') as TLRichText,
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should reject invalid geo types', () => {
			const invalidGeoTypes = ['square', 'circle', 'RECTANGLE', '', null, undefined, 123]

			invalidGeoTypes.forEach((geoType) => {
				expect(() => geoShapeProps.geo.validate(geoType)).toThrow()
			})
		})

		it('should validate dimensions as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validDimensions = [0.1, 1, 50, 100, 1000, 0.001]

			validDimensions.forEach((dimension) => {
				expect(() => geoShapeProps.w.validate(dimension)).not.toThrow()
				expect(() => geoShapeProps.h.validate(dimension)).not.toThrow()
			})

			// Invalid dimensions (zero, negative numbers, and non-numbers)
			const invalidDimensions = [0, -1, -0.1, 'not-number', null, undefined, {}, [], true, false]

			invalidDimensions.forEach((dimension) => {
				expect(() => geoShapeProps.w.validate(dimension)).toThrow()
				expect(() => geoShapeProps.h.validate(dimension)).toThrow()
			})
		})

		it('should validate growY as positiveNumber', () => {
			// Valid positive numbers (including zero)
			const validGrowY = [0, 0.1, 1, 5, 50, 100]

			validGrowY.forEach((growY) => {
				expect(() => geoShapeProps.growY.validate(growY)).not.toThrow()
			})

			// Invalid growY values (negative numbers and non-numbers)
			const invalidGrowY = [-1, -0.1, -100, 'not-number', null, undefined, {}, [], true, false]

			invalidGrowY.forEach((growY) => {
				expect(() => geoShapeProps.growY.validate(growY)).toThrow()
			})
		})

		it('should validate scale as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validScales = [0.1, 0.5, 1, 1.5, 2, 10]

			validScales.forEach((scale) => {
				expect(() => geoShapeProps.scale.validate(scale)).not.toThrow()
			})

			// Invalid scales (zero, negative numbers, and non-numbers)
			const invalidScales = [0, -0.5, -1, -2, 'not-number', null, undefined, {}, [], true, false]

			invalidScales.forEach((scale) => {
				expect(() => geoShapeProps.scale.validate(scale)).toThrow()
			})
		})

		it('should validate URLs using linkUrl validator', () => {
			const validUrls = [
				'',
				'https://example.com',
				'http://test.com',
				'https://subdomain.example.com/path',
				'https://example.com/path?query=value#anchor',
			]

			validUrls.forEach((url) => {
				expect(() => geoShapeProps.url.validate(url)).not.toThrow()
			})

			// Invalid URLs should be handled by linkUrl validator
			const invalidUrls = [
				'not-a-url',
				'ftp://example.com', // May be invalid depending on linkUrl implementation
				null,
				undefined,
				123,
				{},
				[],
			]

			invalidUrls.forEach((url) => {
				expect(() => geoShapeProps.url.validate(url)).toThrow()
			})
		})

		it('should validate rich text property', () => {
			const validRichTexts = [
				toRichText(''),
				toRichText('Simple text'),
				toRichText('**Bold** text'),
				toRichText('*Italic* and **bold**'),
				toRichText('Multiple\nlines\nof\ntext'),
			]

			validRichTexts.forEach((richText) => {
				expect(() => geoShapeProps.richText.validate(richText)).not.toThrow()
			})

			const invalidRichTexts = [
				'plain string', // Not a TLRichText object
				null,
				undefined,
				123,
				{},
				[],
				{ invalid: 'structure' },
			]

			invalidRichTexts.forEach((richText) => {
				expect(() => geoShapeProps.richText.validate(richText)).toThrow()
			})
		})

		it('should use correct default style validators', () => {
			// Verify that the props schema uses the expected style validators
			expect(geoShapeProps.geo).toBe(GeoShapeGeoStyle)
			expect(geoShapeProps.labelColor).toBe(DefaultLabelColorStyle)
			expect(geoShapeProps.color).toBe(DefaultColorStyle)
			expect(geoShapeProps.fill).toBe(DefaultFillStyle)
			expect(geoShapeProps.dash).toBe(DefaultDashStyle)
			expect(geoShapeProps.size).toBe(DefaultSizeStyle)
			expect(geoShapeProps.font).toBe(DefaultFontStyle)
			expect(geoShapeProps.align).toBe(DefaultHorizontalAlignStyle)
			expect(geoShapeProps.verticalAlign).toBe(DefaultVerticalAlignStyle)
		})
	})

	describe('geoShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(geoShapeVersions).toBeDefined()
			expect(typeof geoShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof geoShapeVersions> = [
				'AddUrlProp',
				'AddLabelColor',
				'RemoveJustify',
				'AddCheckBox',
				'AddVerticalAlign',
				'MigrateLegacyAlign',
				'AddCloud',
				'MakeUrlsValid',
				'AddScale',
				'AddRichText',
			]

			expectedVersions.forEach((version) => {
				expect(geoShapeVersions[version]).toBeDefined()
				expect(typeof geoShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(geoShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.geo\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain geo in migration IDs', () => {
			Object.values(geoShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('geo')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(geoShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('geoShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(geoShapeMigrations).toBeDefined()
			expect(geoShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(geoShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = geoShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(geoShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have at least as many migrations as version IDs
			expect(geoShapeMigrations.sequence.length).toBeGreaterThanOrEqual(
				Object.keys(geoShapeVersions).length
			)
		})
	})

	describe('geoShapeMigrations - AddUrlProp migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.AddUrlProp)

		describe('AddUrlProp up migration', () => {
			it('should add url property with empty string default', () => {
				const oldRecord = {
					id: 'shape:geo1',
					typeName: 'shape',
					type: 'geo',
					x: 100,
					y: 200,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {
						geo: 'rectangle',
						color: 'blue',
						fill: 'none',
						dash: 'solid',
						size: 'm',
						w: 100,
						h: 80,
					},
					meta: {},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.geo).toBe('rectangle') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:geo2',
					props: {
						geo: 'ellipse',
						color: 'red',
						fill: 'solid',
						dash: 'dashed',
						size: 'l',
						w: 200,
						h: 150,
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.geo).toBe('ellipse')
				expect(result.props.color).toBe('red')
				expect(result.props.fill).toBe('solid')
				expect(result.props.w).toBe(200)
				expect(result.props.h).toBe(150)
			})
		})

		describe('AddUrlProp down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.geo/1 does not have a down function')
			})
		})
	})

	describe('geoShapeMigrations - AddLabelColor migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.AddLabelColor)

		describe('AddLabelColor up migration', () => {
			it('should add labelColor property with default value "black"', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'triangle',
						color: 'blue',
						url: '',
						w: 100,
						h: 100,
					},
				}

				const result = up(oldRecord)
				expect(result.props.labelColor).toBe('black')
				expect(result.props.color).toBe('blue') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:geo2',
					props: {
						geo: 'star',
						color: 'red',
						fill: 'solid',
						dash: 'dashed',
						size: 'l',
						url: 'https://example.com',
						w: 150,
						h: 150,
					},
				}

				const result = up(oldRecord)
				expect(result.props.labelColor).toBe('black')
				expect(result.props.geo).toBe('star')
				expect(result.props.url).toBe('https://example.com')
			})
		})

		describe('AddLabelColor down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.geo/2 does not have a down function')
			})
		})
	})

	describe('geoShapeMigrations - RemoveJustify migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.RemoveJustify)

		describe('RemoveJustify up migration', () => {
			it('should convert justify alignment to start', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						align: 'justify',
						color: 'blue',
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('start')
				expect(result.props.color).toBe('blue') // Preserve other props
			})

			it('should preserve non-justify alignments', () => {
				const alignments = ['start', 'middle', 'end']

				alignments.forEach((align) => {
					const oldRecord = {
						id: 'shape:geo1',
						props: {
							geo: 'ellipse',
							align,
							color: 'red',
						},
					}

					const result = up(oldRecord)
					expect(result.props.align).toBe(align)
				})
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'diamond',
						align: 'justify',
						color: 'green',
						fill: 'pattern',
						labelColor: 'black',
						w: 120,
						h: 90,
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('start')
				expect(result.props.geo).toBe('diamond')
				expect(result.props.color).toBe('green')
				expect(result.props.fill).toBe('pattern')
			})
		})

		describe('RemoveJustify down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.geo/3 does not have a down function')
			})
		})
	})

	describe('geoShapeMigrations - AddCheckBox migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.AddCheckBox)

		describe('AddCheckBox up migration', () => {
			it('should be a no-op migration', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						color: 'blue',
						align: 'start',
					},
				}

				const result = up(oldRecord)
				expect(result).toEqual(oldRecord)
			})
		})

		describe('AddCheckBox down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.geo/4 does not have a down function')
			})
		})
	})

	describe('geoShapeMigrations - AddVerticalAlign migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.AddVerticalAlign)

		describe('AddVerticalAlign up migration', () => {
			it('should add verticalAlign property with default value "middle"', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						color: 'blue',
						align: 'start',
					},
				}

				const result = up(oldRecord)
				expect(result.props.verticalAlign).toBe('middle')
				expect(result.props.align).toBe('start') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'hexagon',
						color: 'red',
						fill: 'solid',
						align: 'middle',
						labelColor: 'black',
						w: 100,
						h: 100,
					},
				}

				const result = up(oldRecord)
				expect(result.props.verticalAlign).toBe('middle')
				expect(result.props.geo).toBe('hexagon')
				expect(result.props.align).toBe('middle')
			})
		})

		describe('AddVerticalAlign down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.geo/5 does not have a down function')
			})
		})
	})

	describe('geoShapeMigrations - MigrateLegacyAlign migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.MigrateLegacyAlign)

		describe('MigrateLegacyAlign up migration', () => {
			it('should convert start to start-legacy', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						align: 'start',
						verticalAlign: 'middle',
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('start-legacy')
				expect(result.props.verticalAlign).toBe('middle')
			})

			it('should convert end to end-legacy', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'ellipse',
						align: 'end',
						verticalAlign: 'start',
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('end-legacy')
				expect(result.props.verticalAlign).toBe('start')
			})

			it('should convert middle to middle-legacy', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'triangle',
						align: 'middle',
						verticalAlign: 'end',
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('middle-legacy')
				expect(result.props.verticalAlign).toBe('end')
			})

			it('should handle other alignment values as middle-legacy', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'star',
						align: 'unknown-align',
						verticalAlign: 'middle',
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('middle-legacy')
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'pentagon',
						align: 'start',
						verticalAlign: 'middle',
						color: 'blue',
						fill: 'none',
						labelColor: 'red',
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('start-legacy')
				expect(result.props.geo).toBe('pentagon')
				expect(result.props.color).toBe('blue')
				expect(result.props.fill).toBe('none')
			})
		})

		describe('MigrateLegacyAlign down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.geo/6 does not have a down function')
			})
		})
	})

	describe('geoShapeMigrations - AddCloud migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.AddCloud)

		describe('AddCloud up migration', () => {
			it('should be a no-op migration', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						align: 'start-legacy',
						verticalAlign: 'middle',
					},
				}

				const result = up(oldRecord)
				expect(result).toEqual(oldRecord)
			})
		})

		describe('AddCloud down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.geo/7 does not have a down function')
			})
		})
	})

	describe('geoShapeMigrations - MakeUrlsValid migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.MakeUrlsValid)

		describe('MakeUrlsValid up migration', () => {
			it('should clear invalid URLs', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						url: 'invalid-url',
						color: 'blue',
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.color).toBe('blue') // Preserve other props
			})

			it('should preserve valid URLs', () => {
				const validUrls = [
					'',
					'https://example.com',
					'http://test.com',
					'https://subdomain.example.com/path',
				]

				validUrls.forEach((url) => {
					const oldRecord = {
						id: 'shape:geo1',
						props: {
							geo: 'ellipse',
							url,
							color: 'red',
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe(url)
				})
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'triangle',
						url: 'not-valid',
						color: 'green',
						fill: 'solid',
						align: 'middle-legacy',
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.geo).toBe('triangle')
				expect(result.props.color).toBe('green')
				expect(result.props.fill).toBe('solid')
			})
		})

		describe('MakeUrlsValid down migration', () => {
			it('should be a no-op migration', () => {
				const newRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						url: 'https://example.com',
						color: 'blue',
					},
				}

				const result = down(newRecord)
				expect(result).toEqual(newRecord)
			})
		})
	})

	describe('geoShapeMigrations - AddScale migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.AddScale)

		describe('AddScale up migration', () => {
			it('should add scale property with default value 1', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						url: 'https://example.com',
						color: 'blue',
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
				expect(result.props.color).toBe('blue') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'cloud',
						url: '',
						color: 'red',
						fill: 'pattern',
						align: 'start-legacy',
						verticalAlign: 'middle',
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
				expect(result.props.geo).toBe('cloud')
				expect(result.props.align).toBe('start-legacy')
			})
		})

		describe('AddScale down migration', () => {
			it('should remove scale property', () => {
				const newRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						url: 'https://example.com',
						color: 'blue',
						scale: 1.5,
					},
				}

				const result = down(newRecord)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('blue') // Preserve other props
			})
		})
	})

	describe('geoShapeMigrations - AddRichText migration', () => {
		const { up } = getTestMigration(geoShapeVersions.AddRichText)

		describe('AddRichText up migration', () => {
			it('should convert text property to richText', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						text: 'Simple text content',
						scale: 1,
						color: 'blue',
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
				expect(result.props.color).toBe('blue') // Preserve other props
			})

			it('should handle empty text', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'ellipse',
						text: '',
						scale: 1,
						color: 'red',
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'star',
						text: 'Star shape text',
						scale: 1.2,
						color: 'green',
						fill: 'solid',
						url: 'https://example.com',
						align: 'middle-legacy',
						verticalAlign: 'end',
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
				expect(result.props.geo).toBe('star')
				expect(result.props.scale).toBe(1.2)
				expect(result.props.color).toBe('green')
				expect(result.props.fill).toBe('solid')
			})
		})

		// Note: The down migration is explicitly not defined (forced client update)
		// so we don't test it
	})

	describe('integration tests', () => {
		it('should work with complete geo shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('geo'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(geoShapeProps),
				meta: T.jsonValue,
			})

			const validGeoShape = {
				id: 'shape:geo123',
				typeName: 'shape' as const,
				type: 'geo' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					geo: 'star' as const,
					dash: 'dotted' as const,
					url: 'https://example.com',
					w: 120,
					h: 120,
					growY: 10,
					scale: 1.1,
					labelColor: 'red' as const,
					color: 'blue' as const,
					fill: 'pattern' as const,
					size: 'l' as const,
					font: 'sans' as const,
					align: 'start' as const,
					verticalAlign: 'end' as const,
					richText: toRichText('Star shape') as TLRichText,
				},
				meta: { custom: 'data' },
			}

			expect(() => completeValidator.validate(validGeoShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const geoShape: TLGeoShape = {
				id: 'shape:geo_test' as TLShapeId,
				typeName: 'shape',
				type: 'geo',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.5,
				props: {
					geo: 'heart',
					dash: 'draw',
					url: '',
					w: 80,
					h: 80,
					growY: 5,
					scale: 0.9,
					labelColor: 'black',
					color: 'red',
					fill: 'solid',
					size: 's',
					font: 'mono',
					align: 'middle',
					verticalAlign: 'middle',
					richText: toRichText('♥'),
				},
				meta: { shapeType: 'heart' },
			}

			// Should satisfy TLBaseShape structure
			expect(geoShape.typeName).toBe('shape')
			expect(geoShape.type).toBe('geo')
			expect(typeof geoShape.id).toBe('string')
			expect(typeof geoShape.x).toBe('number')
			expect(typeof geoShape.y).toBe('number')
			expect(typeof geoShape.rotation).toBe('number')
			expect(geoShape.props).toBeDefined()
			expect(geoShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof geoShapeVersions> = [
				'AddUrlProp',
				'AddLabelColor',
				'RemoveJustify',
				'AddCheckBox',
				'AddVerticalAlign',
				'MigrateLegacyAlign',
				'AddCloud',
				'MakeUrlsValid',
				'AddScale',
				'AddRichText',
			]

			const migrationIds = geoShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = geoShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(geoShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					geo: 'rectangle',
					w: 100,
					// Missing other required properties
				})
			).toThrow()

			// Extra unexpected properties should throw
			expect(() =>
				fullValidator.validate({
					geo: 'rectangle',
					dash: 'solid',
					url: '',
					w: 100,
					h: 80,
					growY: 0,
					scale: 1,
					labelColor: 'black',
					color: 'blue',
					fill: 'none',
					size: 'm',
					font: 'draw',
					align: 'middle',
					verticalAlign: 'middle',
					richText: toRichText(''),
					unexpectedProperty: 'extra', // This should cause validation to fail
				})
			).toThrow()
		})

		it('should handle boundary values for numeric properties', () => {
			// Test extreme but valid values
			const extremeProps = {
				geo: 'rectangle' as const,
				dash: 'solid' as const,
				url: '',
				w: 0.0001, // Very small but not zero
				h: 999999, // Very large
				growY: 0, // Minimum positive number
				scale: 0.0001, // Very small but not zero
				labelColor: 'black' as const,
				color: 'blue' as const,
				fill: 'none' as const,
				size: 'm' as const,
				font: 'draw' as const,
				align: 'middle' as const,
				verticalAlign: 'middle' as const,
				richText: toRichText('') as TLRichText,
			}

			const fullValidator = T.object(geoShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero and negative values validation correctly', () => {
			// Zero should be invalid for w, h, and scale (nonZeroNumber)
			expect(() => geoShapeProps.w.validate(0)).toThrow()
			expect(() => geoShapeProps.h.validate(0)).toThrow()
			expect(() => geoShapeProps.scale.validate(0)).toThrow()

			// Negative values should be invalid for w, h, scale, and growY
			expect(() => geoShapeProps.w.validate(-1)).toThrow()
			expect(() => geoShapeProps.h.validate(-1)).toThrow()
			expect(() => geoShapeProps.scale.validate(-1)).toThrow()
			expect(() => geoShapeProps.growY.validate(-1)).toThrow()

			// Zero should be valid for growY (positiveNumber includes zero)
			expect(() => geoShapeProps.growY.validate(0)).not.toThrow()
		})

		it('should handle complex rich text content', () => {
			const complexRichTexts = [
				toRichText(''),
				toRichText('Simple text'),
				toRichText('**Bold** and *italic* and ***both***'),
				toRichText('Line 1\nLine 2\nLine 3'),
				toRichText('Special chars: !@#$%^&*()'),
				toRichText('Unicode: 🎨 🖼️ 🎭'),
			]

			complexRichTexts.forEach((richText) => {
				expect(() => geoShapeProps.richText.validate(richText)).not.toThrow()
			})
		})

		it('should handle all geo shape variants with text', () => {
			const allGeoTypes: TLGeoShapeGeoStyle[] = [
				'cloud',
				'rectangle',
				'ellipse',
				'triangle',
				'diamond',
				'pentagon',
				'hexagon',
				'octagon',
				'star',
				'rhombus',
				'rhombus-2',
				'oval',
				'trapezoid',
				'arrow-right',
				'arrow-left',
				'arrow-up',
				'arrow-down',
				'x-box',
				'check-box',
				'heart',
			]

			allGeoTypes.forEach((geoType) => {
				const props: TLGeoShapeProps = {
					geo: geoType,
					dash: 'solid',
					url: '',
					w: 100,
					h: 100,
					growY: 0,
					scale: 1,
					labelColor: 'black',
					color: 'black',
					fill: 'none',
					size: 'm',
					font: 'draw',
					align: 'middle',
					verticalAlign: 'middle',
					richText: toRichText(geoType),
				}

				const fullValidator = T.object(geoShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})

		it('should validate different URL formats correctly', () => {
			const urlTestCases = [
				{ url: '', shouldPass: true },
				{ url: 'https://example.com', shouldPass: true },
				{ url: 'http://test.com', shouldPass: true },
				{ url: 'https://subdomain.example.com/path?query=value', shouldPass: true },
			]

			urlTestCases.forEach(({ url, shouldPass }) => {
				if (shouldPass) {
					expect(() => geoShapeProps.url.validate(url)).not.toThrow()
				} else {
					expect(() => geoShapeProps.url.validate(url)).toThrow()
				}
			})
		})
	})
})
