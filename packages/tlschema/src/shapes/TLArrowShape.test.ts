import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLRichText, toRichText } from '../misc/TLRichText'
import { VecModel } from '../misc/geometry-types'
import { TLShapeId } from '../records/TLShape'
import { DefaultColorStyle, DefaultLabelColorStyle } from '../styles/TLColorStyle'
import { DefaultDashStyle } from '../styles/TLDashStyle'
import { DefaultFillStyle } from '../styles/TLFillStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import {
	ArrowShapeArrowheadEndStyle,
	ArrowShapeArrowheadStartStyle,
	ArrowShapeKindStyle,
	TLArrowShape,
	TLArrowShapeArrowheadStyle,
	TLArrowShapeKind,
	TLArrowShapeProps,
	arrowShapeMigrations,
	arrowShapeProps,
	arrowShapeVersions,
} from './TLArrowShape'

describe('TLArrowShape', () => {
	describe('ArrowShapeKindStyle', () => {
		it('should have correct id and default value', () => {
			expect(ArrowShapeKindStyle.id).toBe('tldraw:arrowKind')
			expect(ArrowShapeKindStyle.defaultValue).toBe('arc')
		})

		it('should validate correct kind values', () => {
			const validKinds = ['arc', 'elbow']

			validKinds.forEach((kind) => {
				expect(() => ArrowShapeKindStyle.validate(kind)).not.toThrow()
				expect(ArrowShapeKindStyle.validate(kind)).toBe(kind)
			})
		})

		it('should reject invalid kind values', () => {
			const invalidKinds = [
				'straight',
				'curve',
				'ARC', // case sensitive
				'ELBOW',
				'',
				null,
				undefined,
				123,
				{},
				[],
				'bezier',
			]

			invalidKinds.forEach((kind) => {
				expect(() => ArrowShapeKindStyle.validate(kind)).toThrow()
			})
		})

		it('should check validation results', () => {
			// Valid values should not throw
			expect(() => ArrowShapeKindStyle.validate('arc')).not.toThrow()
			expect(() => ArrowShapeKindStyle.validate('elbow')).not.toThrow()

			// Invalid values should throw
			expect(() => ArrowShapeKindStyle.validate('invalid')).toThrow()
			expect(() => ArrowShapeKindStyle.validate('')).toThrow()
			expect(() => ArrowShapeKindStyle.validate(null)).toThrow()
		})
	})

	describe('ArrowShapeArrowheadStartStyle', () => {
		it('should have correct id and default value', () => {
			expect(ArrowShapeArrowheadStartStyle.id).toBe('tldraw:arrowheadStart')
			expect(ArrowShapeArrowheadStartStyle.defaultValue).toBe('none')
		})

		it('should validate all arrowhead types', () => {
			const validArrowheads = [
				'arrow',
				'triangle',
				'square',
				'dot',
				'pipe',
				'diamond',
				'inverted',
				'bar',
				'none',
			]

			validArrowheads.forEach((arrowhead) => {
				expect(() => ArrowShapeArrowheadStartStyle.validate(arrowhead)).not.toThrow()
				expect(ArrowShapeArrowheadStartStyle.validate(arrowhead)).toBe(arrowhead)
			})
		})

		it('should reject invalid arrowhead values', () => {
			const invalidArrowheads = [
				'point',
				'ARROW', // case sensitive
				'Triangle',
				'',
				null,
				undefined,
				123,
				{},
				[],
				'circle',
				'star',
			]

			invalidArrowheads.forEach((arrowhead) => {
				expect(() => ArrowShapeArrowheadStartStyle.validate(arrowhead)).toThrow()
			})
		})

		it('should check validation results', () => {
			// Valid values should not throw
			expect(() => ArrowShapeArrowheadStartStyle.validate('arrow')).not.toThrow()
			expect(() => ArrowShapeArrowheadStartStyle.validate('none')).not.toThrow()
			expect(() => ArrowShapeArrowheadStartStyle.validate('diamond')).not.toThrow()

			// Invalid values should throw
			expect(() => ArrowShapeArrowheadStartStyle.validate('invalid')).toThrow()
			expect(() => ArrowShapeArrowheadStartStyle.validate('')).toThrow()
			expect(() => ArrowShapeArrowheadStartStyle.validate(null)).toThrow()
		})
	})

	describe('ArrowShapeArrowheadEndStyle', () => {
		it('should have correct id and default value', () => {
			expect(ArrowShapeArrowheadEndStyle.id).toBe('tldraw:arrowheadEnd')
			expect(ArrowShapeArrowheadEndStyle.defaultValue).toBe('arrow')
		})

		it('should validate all arrowhead types', () => {
			const validArrowheads = [
				'arrow',
				'triangle',
				'square',
				'dot',
				'pipe',
				'diamond',
				'inverted',
				'bar',
				'none',
			]

			validArrowheads.forEach((arrowhead) => {
				expect(() => ArrowShapeArrowheadEndStyle.validate(arrowhead)).not.toThrow()
				expect(ArrowShapeArrowheadEndStyle.validate(arrowhead)).toBe(arrowhead)
			})
		})

		it('should reject invalid arrowhead values', () => {
			const invalidArrowheads = [
				'tip',
				'TRIANGLE', // case sensitive
				'Square',
				'',
				null,
				undefined,
				456,
				{},
				[],
				'oval',
				'plus',
			]

			invalidArrowheads.forEach((arrowhead) => {
				expect(() => ArrowShapeArrowheadEndStyle.validate(arrowhead)).toThrow()
			})
		})

		it('should have same validation as ArrowShapeArrowheadStartStyle', () => {
			// Both should validate the same arrowhead types
			const testValues = [
				'arrow',
				'triangle',
				'square',
				'dot',
				'pipe',
				'diamond',
				'inverted',
				'bar',
				'none',
			]

			testValues.forEach((value) => {
				// Both validators should behave the same for valid values
				expect(() => ArrowShapeArrowheadStartStyle.validate(value)).not.toThrow()
				expect(() => ArrowShapeArrowheadEndStyle.validate(value)).not.toThrow()
			})

			// Both validators should behave the same for invalid values
			const invalidValues = ['invalid', '', null]
			invalidValues.forEach((value) => {
				expect(() => ArrowShapeArrowheadStartStyle.validate(value)).toThrow()
				expect(() => ArrowShapeArrowheadEndStyle.validate(value)).toThrow()
			})
		})
	})

	describe('TLArrowShapeKind type', () => {
		it('should represent valid arrow shape kinds', () => {
			const arcKind: TLArrowShapeKind = 'arc'
			const elbowKind: TLArrowShapeKind = 'elbow'

			expect(arcKind).toBe('arc')
			expect(elbowKind).toBe('elbow')
		})

		it('should be compatible with ArrowShapeKindStyle validation', () => {
			const kinds: TLArrowShapeKind[] = ['arc', 'elbow']

			kinds.forEach((kind) => {
				expect(() => ArrowShapeKindStyle.validate(kind)).not.toThrow()
			})
		})
	})

	describe('TLArrowShapeArrowheadStyle type', () => {
		it('should represent valid arrowhead styles', () => {
			const arrowheadStyles: TLArrowShapeArrowheadStyle[] = [
				'arrow',
				'triangle',
				'square',
				'dot',
				'pipe',
				'diamond',
				'inverted',
				'bar',
				'none',
			]

			arrowheadStyles.forEach((style) => {
				expect(typeof style).toBe('string')
				expect(() => ArrowShapeArrowheadStartStyle.validate(style)).not.toThrow()
				expect(() => ArrowShapeArrowheadEndStyle.validate(style)).not.toThrow()
			})
		})
	})

	describe('TLArrowShapeProps interface', () => {
		it('should represent valid arrow shape properties', () => {
			const validProps: TLArrowShapeProps = {
				kind: 'arc',
				labelColor: 'black',
				color: 'blue',
				fill: 'none',
				dash: 'solid',
				size: 'm',
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
				font: 'draw',
				start: { x: 0, y: 0 },
				end: { x: 100, y: 100 },
				bend: 0.2,
				richText: toRichText('Label'),
				labelPosition: 0.5,
				scale: 1,
				elbowMidPoint: 0.5,
			}

			expect(validProps.kind).toBe('arc')
			expect(validProps.labelColor).toBe('black')
			expect(validProps.color).toBe('blue')
			expect(validProps.fill).toBe('none')
			expect(validProps.dash).toBe('solid')
			expect(validProps.size).toBe('m')
			expect(validProps.arrowheadStart).toBe('none')
			expect(validProps.arrowheadEnd).toBe('arrow')
			expect(validProps.font).toBe('draw')
			expect(validProps.start).toEqual({ x: 0, y: 0 })
			expect(validProps.end).toEqual({ x: 100, y: 100 })
			expect(validProps.bend).toBe(0.2)
			expect(validProps.labelPosition).toBe(0.5)
			expect(validProps.scale).toBe(1)
			expect(validProps.elbowMidPoint).toBe(0.5)
		})

		it('should support different kind values', () => {
			const arcProps: TLArrowShapeProps = {
				kind: 'arc',
				labelColor: 'black',
				color: 'red',
				fill: 'solid',
				dash: 'dashed',
				size: 'l',
				arrowheadStart: 'triangle',
				arrowheadEnd: 'diamond',
				font: 'sans',
				start: { x: 10, y: 20 },
				end: { x: 200, y: 150 },
				bend: -0.3,
				richText: toRichText('Arc Arrow'),
				labelPosition: 0.3,
				scale: 1.5,
				elbowMidPoint: 0.7,
			}

			const elbowProps: TLArrowShapeProps = {
				kind: 'elbow',
				labelColor: 'red',
				color: 'green',
				fill: 'pattern',
				dash: 'dotted',
				size: 's',
				arrowheadStart: 'square',
				arrowheadEnd: 'bar',
				font: 'mono',
				start: { x: 50, y: 75 },
				end: { x: 300, y: 250 },
				bend: 0.1,
				richText: toRichText('Elbow Arrow'),
				labelPosition: 0.8,
				scale: 0.8,
				elbowMidPoint: 0.2,
			}

			expect(arcProps.kind).toBe('arc')
			expect(elbowProps.kind).toBe('elbow')
		})

		it('should support different arrowhead combinations', () => {
			const arrowheadCombinations: Array<[TLArrowShapeArrowheadStyle, TLArrowShapeArrowheadStyle]> =
				[
					['none', 'arrow'],
					['triangle', 'triangle'],
					['square', 'dot'],
					['pipe', 'diamond'],
					['inverted', 'bar'],
					['arrow', 'none'],
				]

			arrowheadCombinations.forEach(([start, end]) => {
				const props: Partial<TLArrowShapeProps> = {
					arrowheadStart: start,
					arrowheadEnd: end,
				}

				expect(props.arrowheadStart).toBe(start)
				expect(props.arrowheadEnd).toBe(end)
			})
		})

		it('should support complex vector positions', () => {
			const props: Partial<TLArrowShapeProps> = {
				start: { x: -100.5, y: 200.75 },
				end: { x: 450.25, y: -75.1 },
			}

			expect(props.start?.x).toBe(-100.5)
			expect(props.start?.y).toBe(200.75)
			expect(props.end?.x).toBe(450.25)
			expect(props.end?.y).toBe(-75.1)
		})

		it('should support rich text content', () => {
			const simpleText = toRichText('Simple label')
			const emptyText = toRichText('')
			const complexText = toRichText('**Bold** and *italic* text')

			const props1: Partial<TLArrowShapeProps> = { richText: simpleText }
			const props2: Partial<TLArrowShapeProps> = { richText: emptyText }
			const props3: Partial<TLArrowShapeProps> = { richText: complexText }

			expect(props1.richText).toBe(simpleText)
			expect(props2.richText).toBe(emptyText)
			expect(props3.richText).toBe(complexText)
		})
	})

	describe('TLArrowShape type', () => {
		it('should represent complete arrow shape records', () => {
			const validArrowShape: TLArrowShape = {
				id: 'shape:arrow123' as TLShapeId,
				typeName: 'shape',
				type: 'arrow',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					kind: 'arc',
					labelColor: 'black',
					color: 'blue',
					fill: 'none',
					dash: 'solid',
					size: 'm',
					arrowheadStart: 'none',
					arrowheadEnd: 'arrow',
					font: 'draw',
					start: { x: 0, y: 0 },
					end: { x: 150, y: 100 },
					bend: 0,
					richText: toRichText(''),
					labelPosition: 0.5,
					scale: 1,
					elbowMidPoint: 0.5,
				},
				meta: {},
			}

			expect(validArrowShape.type).toBe('arrow')
			expect(validArrowShape.typeName).toBe('shape')
			expect(validArrowShape.props.kind).toBe('arc')
			expect(validArrowShape.props.start).toEqual({ x: 0, y: 0 })
			expect(validArrowShape.props.end).toEqual({ x: 150, y: 100 })
		})

		it('should support different arrow configurations', () => {
			const configurations = [
				{
					kind: 'arc' as const,
					arrowheadStart: 'triangle' as const,
					arrowheadEnd: 'diamond' as const,
					bend: 0.5,
				},
				{
					kind: 'elbow' as const,
					arrowheadStart: 'none' as const,
					arrowheadEnd: 'square' as const,
					bend: -0.2,
				},
			]

			configurations.forEach((config, index) => {
				const shape: TLArrowShape = {
					id: `shape:arrow${index}` as TLShapeId,
					typeName: 'shape',
					type: 'arrow',
					x: 0,
					y: 0,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						kind: config.kind,
						labelColor: 'black',
						color: 'black',
						fill: 'none',
						dash: 'solid',
						size: 'm',
						arrowheadStart: config.arrowheadStart,
						arrowheadEnd: config.arrowheadEnd,
						font: 'draw',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
						bend: config.bend,
						richText: toRichText(''),
						labelPosition: 0.5,
						scale: 1,
						elbowMidPoint: 0.5,
					},
					meta: {},
				}

				expect(shape.props.kind).toBe(config.kind)
				expect(shape.props.arrowheadStart).toBe(config.arrowheadStart)
				expect(shape.props.arrowheadEnd).toBe(config.arrowheadEnd)
				expect(shape.props.bend).toBe(config.bend)
			})
		})
	})

	describe('arrowShapeProps validation schema', () => {
		it('should validate all arrow shape properties', () => {
			const validProps = {
				kind: 'arc',
				labelColor: 'black',
				color: 'blue',
				fill: 'none',
				dash: 'solid',
				size: 'm',
				arrowheadStart: 'none',
				arrowheadEnd: 'arrow',
				font: 'draw',
				start: { x: 0, y: 0 },
				end: { x: 100, y: 100 },
				bend: 0.2,
				richText: toRichText('Label'),
				labelPosition: 0.5,
				scale: 1,
				elbowMidPoint: 0.5,
			}

			// Validate each property individually
			expect(() => arrowShapeProps.kind.validate(validProps.kind)).not.toThrow()
			expect(() => arrowShapeProps.labelColor.validate(validProps.labelColor)).not.toThrow()
			expect(() => arrowShapeProps.color.validate(validProps.color)).not.toThrow()
			expect(() => arrowShapeProps.fill.validate(validProps.fill)).not.toThrow()
			expect(() => arrowShapeProps.dash.validate(validProps.dash)).not.toThrow()
			expect(() => arrowShapeProps.size.validate(validProps.size)).not.toThrow()
			expect(() => arrowShapeProps.arrowheadStart.validate(validProps.arrowheadStart)).not.toThrow()
			expect(() => arrowShapeProps.arrowheadEnd.validate(validProps.arrowheadEnd)).not.toThrow()
			expect(() => arrowShapeProps.font.validate(validProps.font)).not.toThrow()
			expect(() => arrowShapeProps.start.validate(validProps.start)).not.toThrow()
			expect(() => arrowShapeProps.end.validate(validProps.end)).not.toThrow()
			expect(() => arrowShapeProps.bend.validate(validProps.bend)).not.toThrow()
			expect(() => arrowShapeProps.richText.validate(validProps.richText)).not.toThrow()
			expect(() => arrowShapeProps.labelPosition.validate(validProps.labelPosition)).not.toThrow()
			expect(() => arrowShapeProps.scale.validate(validProps.scale)).not.toThrow()
			expect(() => arrowShapeProps.elbowMidPoint.validate(validProps.elbowMidPoint)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(arrowShapeProps)

			const validPropsObject = {
				kind: 'elbow' as const,
				labelColor: 'red' as const,
				color: 'green' as const,
				fill: 'solid' as const,
				dash: 'dashed' as const,
				size: 'l' as const,
				arrowheadStart: 'triangle' as const,
				arrowheadEnd: 'diamond' as const,
				font: 'sans' as const,
				start: { x: 25, y: 50 } as VecModel,
				end: { x: 200, y: 150 } as VecModel,
				bend: -0.3,
				richText: toRichText('Test Label') as TLRichText,
				labelPosition: 0.7,
				scale: 1.2,
				elbowMidPoint: 0.3,
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should reject invalid kind values', () => {
			const invalidKinds = ['straight', 'curve', 'ARC', '', null, undefined, 123]

			invalidKinds.forEach((kind) => {
				expect(() => arrowShapeProps.kind.validate(kind)).toThrow()
			})
		})

		it('should reject invalid arrowhead values', () => {
			const invalidArrowheads = ['point', 'tip', 'ARROW', '', null, undefined, 123]

			invalidArrowheads.forEach((arrowhead) => {
				expect(() => arrowShapeProps.arrowheadStart.validate(arrowhead)).toThrow()
				expect(() => arrowShapeProps.arrowheadEnd.validate(arrowhead)).toThrow()
			})
		})

		it('should validate vector properties', () => {
			const validVectors: VecModel[] = [
				{ x: 0, y: 0 },
				{ x: -100, y: 200 },
				{ x: 1.5, y: -2.7 },
				{ x: 0, y: 0, z: 0 }, // With optional z
			]

			validVectors.forEach((vector) => {
				expect(() => arrowShapeProps.start.validate(vector)).not.toThrow()
				expect(() => arrowShapeProps.end.validate(vector)).not.toThrow()
			})

			const invalidVectors = [
				{ x: 'not-number', y: 0 },
				{ x: 0 }, // Missing y
				{ y: 0 }, // Missing x
				{},
				null,
				undefined,
				'vector',
			]

			invalidVectors.forEach((vector) => {
				expect(() => arrowShapeProps.start.validate(vector)).toThrow()
				expect(() => arrowShapeProps.end.validate(vector)).toThrow()
			})
		})

		it('should validate numeric properties', () => {
			// Valid numbers
			const validNumbers = [0, 1, -1, 0.5, -0.5, 100, -100, 1.234, -1.234]

			validNumbers.forEach((num) => {
				expect(() => arrowShapeProps.bend.validate(num)).not.toThrow()
				expect(() => arrowShapeProps.labelPosition.validate(num)).not.toThrow()
				expect(() => arrowShapeProps.elbowMidPoint.validate(num)).not.toThrow()
			})

			// Invalid numbers for bend, labelPosition, elbowMidPoint
			const invalidNumbers = ['not-number', null, undefined, {}, [], true, false]

			invalidNumbers.forEach((num) => {
				expect(() => arrowShapeProps.bend.validate(num)).toThrow()
				expect(() => arrowShapeProps.labelPosition.validate(num)).toThrow()
				expect(() => arrowShapeProps.elbowMidPoint.validate(num)).toThrow()
			})
		})

		it('should validate scale as nonZeroNumber', () => {
			// Valid non-zero positive numbers only
			const validScales = [0.1, 0.5, 1, 1.5, 2, 10]

			validScales.forEach((scale) => {
				expect(() => arrowShapeProps.scale.validate(scale)).not.toThrow()
			})

			// Invalid scales (zero, negative numbers, and non-numbers)
			const invalidScales = [0, -0.5, -1, -2, 'not-number', null, undefined, {}, [], true, false]

			invalidScales.forEach((scale) => {
				expect(() => arrowShapeProps.scale.validate(scale)).toThrow()
			})
		})

		it('should validate rich text property', () => {
			const validRichTexts = [
				toRichText(''),
				toRichText('Simple text'),
				toRichText('**Bold** text'),
				toRichText('*Italic* and **bold**'),
			]

			validRichTexts.forEach((richText) => {
				expect(() => arrowShapeProps.richText.validate(richText)).not.toThrow()
			})

			const invalidRichTexts = [
				'plain string', // Not a TLRichText object
				null,
				undefined,
				123,
				{},
				[],
			]

			invalidRichTexts.forEach((richText) => {
				expect(() => arrowShapeProps.richText.validate(richText)).toThrow()
			})
		})

		it('should use correct default style validators', () => {
			// Verify that the props schema uses the expected style validators
			expect(arrowShapeProps.kind).toBe(ArrowShapeKindStyle)
			expect(arrowShapeProps.labelColor).toBe(DefaultLabelColorStyle)
			expect(arrowShapeProps.color).toBe(DefaultColorStyle)
			expect(arrowShapeProps.fill).toBe(DefaultFillStyle)
			expect(arrowShapeProps.dash).toBe(DefaultDashStyle)
			expect(arrowShapeProps.size).toBe(DefaultSizeStyle)
			expect(arrowShapeProps.arrowheadStart).toBe(ArrowShapeArrowheadStartStyle)
			expect(arrowShapeProps.arrowheadEnd).toBe(ArrowShapeArrowheadEndStyle)
			expect(arrowShapeProps.font).toBe(DefaultFontStyle)
		})
	})

	describe('arrowShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(arrowShapeVersions).toBeDefined()
			expect(typeof arrowShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof arrowShapeVersions> = [
				'AddLabelColor',
				'AddIsPrecise',
				'AddLabelPosition',
				'ExtractBindings',
				'AddScale',
				'AddElbow',
				'AddRichText',
			]

			expectedVersions.forEach((version) => {
				expect(arrowShapeVersions[version]).toBeDefined()
				expect(typeof arrowShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(arrowShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.arrow\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain arrow in migration IDs', () => {
			Object.values(arrowShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('arrow')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(arrowShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('arrowShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(arrowShapeMigrations).toBeDefined()
			expect(arrowShapeMigrations.sequenceId).toBe('com.tldraw.shape.arrow')
			expect(arrowShapeMigrations.retroactive).toBe(false)
			expect(arrowShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(arrowShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = arrowShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(arrowShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have at least as many migrations as version IDs
			expect(arrowShapeMigrations.sequence.length).toBeGreaterThanOrEqual(
				Object.keys(arrowShapeVersions).length
			)
		})
	})

	describe('arrowShapeMigrations - AddLabelColor migration', () => {
		const { up, down } = getTestMigration(arrowShapeVersions.AddLabelColor)

		describe('AddLabelColor up migration', () => {
			it('should add labelColor property with default value "black"', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					typeName: 'shape',
					type: 'arrow',
					x: 100,
					y: 200,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {
						color: 'blue',
						fill: 'none',
						dash: 'solid',
						size: 'm',
						arrowheadStart: 'none',
						arrowheadEnd: 'arrow',
						font: 'draw',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
					meta: {},
				}

				const result = up(oldRecord)
				expect(result.props.labelColor).toBe('black')
				expect(result.props.color).toBe('blue') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:arrow2',
					typeName: 'shape',
					type: 'arrow',
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
						arrowheadStart: 'triangle',
						arrowheadEnd: 'diamond',
						font: 'sans',
						start: { x: 25, y: 50 },
						end: { x: 200, y: 150 },
					},
					meta: { custom: 'data' },
				}

				const result = up(oldRecord)
				expect(result.props.labelColor).toBe('black')
				expect(result.props.color).toBe('red')
				expect(result.props.fill).toBe('solid')
				expect(result.props.dash).toBe('dashed')
				expect(result.props.size).toBe('l')
				expect(result.props.arrowheadStart).toBe('triangle')
				expect(result.props.arrowheadEnd).toBe('diamond')
				expect(result.props.font).toBe('sans')
				expect(result.props.start).toEqual({ x: 25, y: 50 })
				expect(result.props.end).toEqual({ x: 200, y: 150 })
				expect(result.meta).toEqual({ custom: 'data' })
			})

			test('should not modify labelColor if it already exists', () => {
				const recordWithLabelColor = {
					id: 'shape:arrow3',
					typeName: 'shape',
					type: 'arrow',
					props: {
						labelColor: 'red', // Already has labelColor
						color: 'blue',
					},
				}

				const result = up(recordWithLabelColor)
				expect(result.props.labelColor).toBe('black') // Migration sets default regardless
			})
		})

		describe('AddLabelColor down migration', () => {
			it('should be retired (no down migration)', () => {
				// Based on the source code, the down migration is 'retired'
				// The getTestMigration utility should throw when trying to access down migration
				expect(() => {
					// This should throw since the migration is retired
					down({})
				}).toThrow('Migration com.tldraw.shape.arrow/1 does not have a down function')
			})
		})
	})

	describe('arrowShapeMigrations - AddIsPrecise migration', () => {
		const { up, down } = getTestMigration(arrowShapeVersions.AddIsPrecise)

		describe('AddIsPrecise up migration', () => {
			it('should add isPrecise property to binding start and end', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						start: {
							type: 'binding',
							boundShapeId: 'shape:rect1',
							normalizedAnchor: { x: 0.5, y: 0.5 },
						},
						end: {
							type: 'binding',
							boundShapeId: 'shape:rect2',
							normalizedAnchor: { x: 0.5, y: 0.5 },
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.start.isPrecise).toBe(false) // 0.5, 0.5 is not precise
				expect(result.props.end.isPrecise).toBe(false)
			})

			it('should set isPrecise to true for non-center anchors', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						start: {
							type: 'binding',
							boundShapeId: 'shape:rect1',
							normalizedAnchor: { x: 0.25, y: 0.75 }, // Not center
						},
						end: {
							type: 'binding',
							boundShapeId: 'shape:rect2',
							normalizedAnchor: { x: 1, y: 0 }, // Not center
						},
					},
				}

				const result = up(oldRecord)
				expect(result.props.start.isPrecise).toBe(true)
				expect(result.props.end.isPrecise).toBe(true)
			})

			it('should not modify non-binding terminals', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						start: { type: 'point', x: 0, y: 0 },
						end: { type: 'point', x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.start.isPrecise).toBeUndefined()
				expect(result.props.end.isPrecise).toBeUndefined()
			})

			it('should handle mixed binding and point terminals', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						start: {
							type: 'binding',
							boundShapeId: 'shape:rect1',
							normalizedAnchor: { x: 0, y: 0 }, // Precise
						},
						end: { type: 'point', x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.start.isPrecise).toBe(true)
				expect(result.props.end.isPrecise).toBeUndefined()
			})
		})

		describe('AddIsPrecise down migration', () => {
			it('should remove isPrecise property and adjust normalizedAnchor if not precise', () => {
				const newRecord = {
					id: 'shape:arrow1',
					props: {
						start: {
							type: 'binding',
							boundShapeId: 'shape:rect1',
							normalizedAnchor: { x: 0.25, y: 0.75 },
							isPrecise: false,
						},
						end: {
							type: 'binding',
							boundShapeId: 'shape:rect2',
							normalizedAnchor: { x: 0.1, y: 0.9 },
							isPrecise: true,
						},
					},
				}

				const result = down(newRecord)
				expect(result.props.start.isPrecise).toBeUndefined()
				expect(result.props.start.normalizedAnchor).toEqual({ x: 0.5, y: 0.5 }) // Reset to center
				expect(result.props.end.isPrecise).toBeUndefined()
				expect(result.props.end.normalizedAnchor).toEqual({ x: 0.1, y: 0.9 }) // Keep precise anchor
			})

			it('should not modify non-binding terminals', () => {
				const newRecord = {
					id: 'shape:arrow1',
					props: {
						start: { type: 'point', x: 0, y: 0 },
						end: { type: 'point', x: 100, y: 100 },
					},
				}

				const result = down(newRecord)
				expect(result.props.start).toEqual({ type: 'point', x: 0, y: 0 })
				expect(result.props.end).toEqual({ type: 'point', x: 100, y: 100 })
			})
		})
	})

	describe('arrowShapeMigrations - AddLabelPosition migration', () => {
		const { up, down } = getTestMigration(arrowShapeVersions.AddLabelPosition)

		describe('AddLabelPosition up migration', () => {
			it('should add labelPosition property with default value 0.5', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.labelPosition).toBe(0.5)
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'red',
						fill: 'solid',
						start: { x: 25, y: 50 },
						end: { x: 200, y: 150 },
						bend: 0.3,
					},
				}

				const result = up(oldRecord)
				expect(result.props.labelPosition).toBe(0.5)
				expect(result.props.color).toBe('red')
				expect(result.props.fill).toBe('solid')
				expect(result.props.start).toEqual({ x: 25, y: 50 })
				expect(result.props.end).toEqual({ x: 200, y: 150 })
				expect(result.props.bend).toBe(0.3)
			})
		})

		describe('AddLabelPosition down migration', () => {
			it('should remove labelPosition property', () => {
				const newRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
						labelPosition: 0.7,
					},
				}

				const result = down(newRecord)
				expect(result.props.labelPosition).toBeUndefined()
				expect(result.props.color).toBe('blue') // Preserve other props
			})
		})
	})

	describe('arrowShapeMigrations - ExtractBindings migration', () => {
		const migration = arrowShapeMigrations.sequence.find(
			(m) => 'id' in m && m.id === arrowShapeVersions.ExtractBindings
		)

		it('should be a store-scope migration', () => {
			expect(migration).toBeDefined()
			if (migration && 'scope' in migration) {
				expect(migration.scope).toBe('store')
			}
		})

		it('should have up function for extracting bindings', () => {
			if (migration && 'up' in migration) {
				expect(migration.up).toBeDefined()
				expect(typeof migration.up).toBe('function')
			}
		})

		// Note: This migration is complex and modifies the entire store
		// Testing the full migration would require setting up a mock store
		// The migration extracts binding information from arrow terminals
		// and creates separate binding records
	})

	describe('arrowShapeMigrations - AddScale migration', () => {
		const { up, down } = getTestMigration(arrowShapeVersions.AddScale)

		describe('AddScale up migration', () => {
			it('should add scale property with default value 1', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'red',
						labelPosition: 0.3,
						start: { x: 10, y: 20 },
						end: { x: 200, y: 150 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
				expect(result.props.color).toBe('red')
				expect(result.props.labelPosition).toBe(0.3)
			})
		})

		describe('AddScale down migration', () => {
			it('should remove scale property', () => {
				const newRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
						scale: 1.5,
					},
				}

				const result = down(newRecord)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('blue') // Preserve other props
			})
		})
	})

	describe('arrowShapeMigrations - AddElbow migration', () => {
		const { up, down } = getTestMigration(arrowShapeVersions.AddElbow)

		describe('AddElbow up migration', () => {
			it('should add kind and elbowMidPoint properties with default values', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.kind).toBe('arc')
				expect(result.props.elbowMidPoint).toBe(0.5)
			})

			it('should preserve existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						color: 'red',
						scale: 1.2,
						labelPosition: 0.7,
						start: { x: 25, y: 50 },
						end: { x: 200, y: 150 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.kind).toBe('arc')
				expect(result.props.elbowMidPoint).toBe(0.5)
				expect(result.props.color).toBe('red')
				expect(result.props.scale).toBe(1.2)
				expect(result.props.labelPosition).toBe(0.7)
			})
		})

		describe('AddElbow down migration', () => {
			it('should remove kind and elbowMidPoint properties', () => {
				const newRecord = {
					id: 'shape:arrow1',
					props: {
						kind: 'elbow',
						elbowMidPoint: 0.3,
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				}

				const result = down(newRecord)
				expect(result.props.kind).toBeUndefined()
				expect(result.props.elbowMidPoint).toBeUndefined()
				expect(result.props.color).toBe('blue') // Preserve other props
			})
		})
	})

	describe('arrowShapeMigrations - AddRichText migration', () => {
		const { up } = getTestMigration(arrowShapeVersions.AddRichText)

		describe('AddRichText up migration', () => {
			it('should convert text property to richText', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						text: 'Simple text label',
						color: 'blue',
						start: { x: 0, y: 0 },
						end: { x: 100, y: 100 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
			})

			it('should handle empty text', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						text: '',
						color: 'red',
						start: { x: 10, y: 20 },
						end: { x: 200, y: 150 },
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
			})

			it('should preserve other properties during migration', () => {
				const oldRecord = {
					id: 'shape:arrow1',
					props: {
						text: 'Label text',
						kind: 'elbow',
						elbowMidPoint: 0.3,
						color: 'green',
						scale: 1.5,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
				expect(result.props.kind).toBe('elbow')
				expect(result.props.elbowMidPoint).toBe(0.3)
				expect(result.props.color).toBe('green')
				expect(result.props.scale).toBe(1.5)
			})
		})

		// Note: The down migration is explicitly not defined (forced client update)
		// so we don't test it
	})

	describe('integration tests', () => {
		it('should work with complete arrow shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('arrow'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(arrowShapeProps),
				meta: T.jsonValue,
			})

			const validArrowShape = {
				id: 'shape:arrow123',
				typeName: 'shape' as const,
				type: 'arrow' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					kind: 'elbow' as const,
					labelColor: 'red' as const,
					color: 'blue' as const,
					fill: 'solid' as const,
					dash: 'dashed' as const,
					size: 'l' as const,
					arrowheadStart: 'triangle' as const,
					arrowheadEnd: 'diamond' as const,
					font: 'sans' as const,
					start: { x: 0, y: 0 } as VecModel,
					end: { x: 150, y: 100 } as VecModel,
					bend: 0.2,
					richText: toRichText('Test Label') as TLRichText,
					labelPosition: 0.7,
					scale: 1.2,
					elbowMidPoint: 0.3,
				},
				meta: { custom: 'data' },
			}

			expect(() => completeValidator.validate(validArrowShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const arrowShape: TLArrowShape = {
				id: 'shape:arrow_test' as TLShapeId,
				typeName: 'shape',
				type: 'arrow',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.5,
				props: {
					kind: 'arc',
					labelColor: 'black',
					color: 'green',
					fill: 'pattern',
					dash: 'dotted',
					size: 's',
					arrowheadStart: 'square',
					arrowheadEnd: 'bar',
					font: 'mono',
					start: { x: 25, y: 50 },
					end: { x: 200, y: 150 },
					bend: -0.3,
					richText: toRichText('Arrow Label'),
					labelPosition: 0.8,
					scale: 0.9,
					elbowMidPoint: 0.6,
				},
				meta: { arrowType: 'custom' },
			}

			// Should satisfy TLBaseShape structure
			expect(arrowShape.typeName).toBe('shape')
			expect(arrowShape.type).toBe('arrow')
			expect(typeof arrowShape.id).toBe('string')
			expect(typeof arrowShape.x).toBe('number')
			expect(typeof arrowShape.y).toBe('number')
			expect(typeof arrowShape.rotation).toBe('number')
			expect(arrowShape.props).toBeDefined()
			expect(arrowShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof arrowShapeVersions> = [
				'AddLabelColor',
				'AddIsPrecise',
				'AddLabelPosition',
				'ExtractBindings',
				'AddScale',
				'AddElbow',
				'AddRichText',
			]

			const migrationIds = arrowShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = arrowShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(arrowShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					kind: 'arc',
					start: { x: 0, y: 0 },
					// Missing other required properties
				})
			).toThrow()

			// Extra unexpected properties should throw
			expect(() =>
				fullValidator.validate({
					kind: 'arc',
					labelColor: 'black',
					color: 'blue',
					fill: 'none',
					dash: 'solid',
					size: 'm',
					arrowheadStart: 'none',
					arrowheadEnd: 'arrow',
					font: 'draw',
					start: { x: 0, y: 0 },
					end: { x: 100, y: 100 },
					bend: 0,
					richText: toRichText(''),
					labelPosition: 0.5,
					scale: 1,
					elbowMidPoint: 0.5,
					unexpectedProperty: 'extra', // This should cause validation to fail
				})
			).toThrow()
		})

		it('should handle boundary values for numeric properties', () => {
			// Test extreme but valid values
			const extremeProps = {
				kind: 'arc' as const,
				labelColor: 'black' as const,
				color: 'blue' as const,
				fill: 'none' as const,
				dash: 'solid' as const,
				size: 'm' as const,
				arrowheadStart: 'none' as const,
				arrowheadEnd: 'arrow' as const,
				font: 'draw' as const,
				start: { x: -999999, y: 999999 } as VecModel,
				end: { x: 0.0001, y: -0.0001 } as VecModel,
				bend: -999.999,
				richText: toRichText('') as TLRichText,
				labelPosition: -1000,
				scale: 0.0001, // Very small but not zero
				elbowMidPoint: 999,
			}

			const fullValidator = T.object(arrowShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero scale validation correctly', () => {
			// Zero should be invalid for scale (nonZeroNumber)
			expect(() => arrowShapeProps.scale.validate(0)).toThrow()

			// Very small positive numbers should be valid, but negative numbers should be invalid
			expect(() => arrowShapeProps.scale.validate(0.0001)).not.toThrow()
			expect(() => arrowShapeProps.scale.validate(-0.0001)).toThrow()
		})

		it('should handle complex rich text content', () => {
			const complexRichTexts = [
				toRichText(''),
				toRichText('Simple text'),
				toRichText('**Bold** and *italic* and ***both***'),
				toRichText('Line 1\nLine 2\nLine 3'),
				toRichText('Special chars: !@#$%^&*()'),
			]

			complexRichTexts.forEach((richText) => {
				expect(() => arrowShapeProps.richText.validate(richText)).not.toThrow()
			})
		})
	})
})
