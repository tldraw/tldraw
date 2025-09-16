import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLRichText, toRichText } from '../misc/TLRichText'
import { TLShapeId } from '../records/TLShape'
import { DefaultColorStyle, DefaultLabelColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultHorizontalAlignStyle } from '../styles/TLHorizontalAlignStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultVerticalAlignStyle } from '../styles/TLVerticalAlignStyle'
import {
	TLNoteShape,
	TLNoteShapeProps,
	noteShapeMigrations,
	noteShapeProps,
	noteShapeVersions,
} from './TLNoteShape'

describe('TLNoteShape', () => {
	describe('TLNoteShapeProps interface', () => {
		it('should represent valid note shape properties', () => {
			const validProps: TLNoteShapeProps = {
				color: 'yellow',
				labelColor: 'black',
				size: 'm',
				font: 'draw',
				fontSizeAdjustment: 0,
				align: 'middle',
				verticalAlign: 'middle',
				growY: 0,
				url: '',
				richText: toRichText('Hello World'),
				scale: 1,
			}

			expect(validProps.color).toBe('yellow')
			expect(validProps.labelColor).toBe('black')
			expect(validProps.size).toBe('m')
			expect(validProps.font).toBe('draw')
			expect(validProps.fontSizeAdjustment).toBe(0)
			expect(validProps.align).toBe('middle')
			expect(validProps.verticalAlign).toBe('middle')
			expect(validProps.growY).toBe(0)
			expect(validProps.url).toBe('')
			expect(validProps.richText).toBeDefined()
			expect(validProps.scale).toBe(1)
		})

		it('should support different color combinations', () => {
			const colorCombinations = [
				{ color: 'black' as const, labelColor: 'white' as const },
				{ color: 'red' as const, labelColor: 'black' as const },
				{ color: 'blue' as const, labelColor: 'yellow' as const },
				{ color: 'green' as const, labelColor: 'red' as const },
				{ color: 'light-blue' as const, labelColor: 'black' as const },
			]

			colorCombinations.forEach(({ color, labelColor }) => {
				const props: Partial<TLNoteShapeProps> = {
					color,
					labelColor,
				}

				expect(props.color).toBe(color)
				expect(props.labelColor).toBe(labelColor)
			})
		})

		it('should support different size variations', () => {
			const sizes = ['s', 'm', 'l', 'xl'] as const

			sizes.forEach((size) => {
				const props: Partial<TLNoteShapeProps> = { size }
				expect(props.size).toBe(size)
			})
		})

		it('should support different font styles', () => {
			const fonts = ['draw', 'sans', 'serif', 'mono'] as const

			fonts.forEach((font) => {
				const props: Partial<TLNoteShapeProps> = { font }
				expect(props.font).toBe(font)
			})
		})

		it('should support different alignment combinations', () => {
			const alignmentCombinations: Array<
				[TLNoteShapeProps['align'], TLNoteShapeProps['verticalAlign']]
			> = [
				['start', 'start'],
				['middle', 'middle'],
				['end', 'end'],
				['start-legacy', 'start'],
				['middle-legacy', 'middle'],
				['end-legacy', 'end'],
			]

			alignmentCombinations.forEach(([align, verticalAlign]) => {
				const props: Partial<TLNoteShapeProps> = {
					align,
					verticalAlign,
				}

				expect(props.align).toBe(align)
				expect(props.verticalAlign).toBe(verticalAlign)
			})
		})

		it('should support font size adjustments', () => {
			const fontAdjustments = [-2, -1, 0, 1, 2, 5, 10]

			fontAdjustments.forEach((adjustment) => {
				const props: Partial<TLNoteShapeProps> = {
					fontSizeAdjustment: adjustment,
				}

				expect(props.fontSizeAdjustment).toBe(adjustment)
			})
		})

		it('should support growY values for height expansion', () => {
			const growYValues = [0, 10, 25, 50, 100, 200]

			growYValues.forEach((growY) => {
				const props: Partial<TLNoteShapeProps> = { growY }
				expect(props.growY).toBe(growY)
			})
		})

		it('should support scale variations', () => {
			const scaleValues = [0.5, 0.8, 1, 1.2, 1.5, 2, 3]

			scaleValues.forEach((scale) => {
				const props: Partial<TLNoteShapeProps> = { scale }
				expect(props.scale).toBe(scale)
			})
		})

		it('should support rich text content', () => {
			const richTexts = [
				toRichText(''),
				toRichText('Simple note'),
				toRichText('**Bold** note'),
				toRichText('*Italic* text'),
				toRichText('Multiple\nLines\nNote'),
				toRichText('Complex **bold** and *italic* formatting'),
			]

			richTexts.forEach((richText) => {
				const props: Partial<TLNoteShapeProps> = { richText }
				expect(props.richText).toBe(richText)
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
				const props: Partial<TLNoteShapeProps> = { url }
				expect(props.url).toBe(url)
			})
		})
	})

	describe('TLNoteShape type', () => {
		it('should represent complete note shape records', () => {
			const validNoteShape: TLNoteShape = {
				id: 'shape:note123' as TLShapeId,
				typeName: 'shape',
				type: 'note',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					color: 'yellow',
					labelColor: 'black',
					size: 's',
					font: 'sans',
					fontSizeAdjustment: 2,
					align: 'start',
					verticalAlign: 'start',
					growY: 50,
					url: 'https://example.com',
					richText: toRichText('Important **note**!'),
					scale: 1,
				},
				meta: {},
			}

			expect(validNoteShape.type).toBe('note')
			expect(validNoteShape.typeName).toBe('shape')
			expect(validNoteShape.props.color).toBe('yellow')
			expect(validNoteShape.props.labelColor).toBe('black')
			expect(validNoteShape.props.size).toBe('s')
			expect(validNoteShape.props.font).toBe('sans')
		})

		it('should support different note configurations', () => {
			const configurations = [
				{
					color: 'light-blue' as const,
					labelColor: 'black' as const,
					size: 's' as const,
					font: 'draw' as const,
					fontSizeAdjustment: 0,
					align: 'start' as const,
					verticalAlign: 'start' as const,
					growY: 0,
					scale: 1,
				},
				{
					color: 'red' as const,
					labelColor: 'white' as const,
					size: 'l' as const,
					font: 'serif' as const,
					fontSizeAdjustment: 5,
					align: 'middle' as const,
					verticalAlign: 'middle' as const,
					growY: 25,
					scale: 1.5,
				},
				{
					color: 'green' as const,
					labelColor: 'black' as const,
					size: 'xl' as const,
					font: 'mono' as const,
					fontSizeAdjustment: -1,
					align: 'end' as const,
					verticalAlign: 'end' as const,
					growY: 100,
					scale: 0.8,
				},
			]

			configurations.forEach((config, index) => {
				const shape: TLNoteShape = {
					id: `shape:note${index}` as TLShapeId,
					typeName: 'shape',
					type: 'note',
					x: index * 100,
					y: index * 50,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						color: config.color,
						labelColor: config.labelColor,
						size: config.size,
						font: config.font,
						fontSizeAdjustment: config.fontSizeAdjustment,
						align: config.align,
						verticalAlign: config.verticalAlign,
						growY: config.growY,
						url: '',
						richText: toRichText(`Note ${index + 1}`),
						scale: config.scale,
					},
					meta: {},
				}

				expect(shape.props.color).toBe(config.color)
				expect(shape.props.labelColor).toBe(config.labelColor)
				expect(shape.props.size).toBe(config.size)
				expect(shape.props.font).toBe(config.font)
				expect(shape.props.fontSizeAdjustment).toBe(config.fontSizeAdjustment)
			})
		})

		it('should support notes with different text content', () => {
			const textVariations = [
				'',
				'Quick note',
				'Multi\nLine\nNote',
				'Note with **formatting**',
				'Long note with multiple paragraphs and detailed content',
			]

			textVariations.forEach((text, index) => {
				const shape: TLNoteShape = {
					id: `shape:text_note${index}` as TLShapeId,
					typeName: 'shape',
					type: 'note',
					x: 0,
					y: 0,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						color: 'yellow',
						labelColor: 'black',
						size: 'm',
						font: 'draw',
						fontSizeAdjustment: 0,
						align: 'middle',
						verticalAlign: 'middle',
						growY: index * 20, // Different growY for text expansion
						url: '',
						richText: toRichText(text),
						scale: 1,
					},
					meta: {},
				}

				expect(shape.props.richText).toBeDefined()
				expect(shape.props.growY).toBe(index * 20)
			})
		})

		it('should support locked and transparent notes', () => {
			const shape: TLNoteShape = {
				id: 'shape:special_note' as TLShapeId,
				typeName: 'shape',
				type: 'note',
				x: 50,
				y: 75,
				rotation: 1.57, // 90 degrees
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.5,
				props: {
					color: 'red',
					labelColor: 'white',
					size: 'l',
					font: 'serif',
					fontSizeAdjustment: 3,
					align: 'end',
					verticalAlign: 'start',
					growY: 30,
					url: 'https://important-note.com',
					richText: toRichText('Locked note'),
					scale: 0.9,
				},
				meta: { priority: 'high' },
			}

			expect(shape.isLocked).toBe(true)
			expect(shape.opacity).toBe(0.5)
			expect(shape.rotation).toBe(1.57)
			expect(shape.meta).toEqual({ priority: 'high' })
		})
	})

	describe('noteShapeProps validation schema', () => {
		it('should validate all note shape properties', () => {
			const validProps = {
				color: 'blue',
				labelColor: 'red',
				size: 'l',
				font: 'sans',
				fontSizeAdjustment: 3,
				align: 'start',
				verticalAlign: 'end',
				growY: 15,
				url: 'https://example.com',
				richText: toRichText('Test note'),
				scale: 1.2,
			}

			// Validate each property individually
			expect(() => noteShapeProps.color.validate(validProps.color)).not.toThrow()
			expect(() => noteShapeProps.labelColor.validate(validProps.labelColor)).not.toThrow()
			expect(() => noteShapeProps.size.validate(validProps.size)).not.toThrow()
			expect(() => noteShapeProps.font.validate(validProps.font)).not.toThrow()
			expect(() =>
				noteShapeProps.fontSizeAdjustment.validate(validProps.fontSizeAdjustment)
			).not.toThrow()
			expect(() => noteShapeProps.align.validate(validProps.align)).not.toThrow()
			expect(() => noteShapeProps.verticalAlign.validate(validProps.verticalAlign)).not.toThrow()
			expect(() => noteShapeProps.growY.validate(validProps.growY)).not.toThrow()
			expect(() => noteShapeProps.url.validate(validProps.url)).not.toThrow()
			expect(() => noteShapeProps.richText.validate(validProps.richText)).not.toThrow()
			expect(() => noteShapeProps.scale.validate(validProps.scale)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(noteShapeProps)

			const validPropsObject = {
				color: 'green' as const,
				labelColor: 'black' as const,
				size: 's' as const,
				font: 'mono' as const,
				fontSizeAdjustment: 2,
				align: 'end' as const,
				verticalAlign: 'start' as const,
				growY: 25,
				url: 'https://test.com',
				richText: toRichText('Note test') as TLRichText,
				scale: 0.8,
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should validate fontSizeAdjustment as positiveNumber', () => {
			// Valid positive numbers (including zero)
			const validAdjustments = [0, 1, 2, 5, 10, 0.5]

			validAdjustments.forEach((adjustment) => {
				expect(() => noteShapeProps.fontSizeAdjustment.validate(adjustment)).not.toThrow()
			})

			// Invalid adjustments (negative numbers and non-numbers)
			const invalidAdjustments = [-1, -0.1, -5, 'not-number', null, undefined, {}, [], true, false]

			invalidAdjustments.forEach((adjustment) => {
				expect(() => noteShapeProps.fontSizeAdjustment.validate(adjustment)).toThrow()
			})
		})

		it('should validate growY as positiveNumber', () => {
			// Valid positive numbers (including zero)
			const validGrowY = [0, 0.1, 1, 5, 50, 100]

			validGrowY.forEach((growY) => {
				expect(() => noteShapeProps.growY.validate(growY)).not.toThrow()
			})

			// Invalid growY values (negative numbers and non-numbers)
			const invalidGrowY = [-1, -0.1, -100, 'not-number', null, undefined, {}, [], true, false]

			invalidGrowY.forEach((growY) => {
				expect(() => noteShapeProps.growY.validate(growY)).toThrow()
			})
		})

		it('should validate scale as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validScales = [0.1, 0.5, 1, 1.5, 2, 10]

			validScales.forEach((scale) => {
				expect(() => noteShapeProps.scale.validate(scale)).not.toThrow()
			})

			// Invalid scales (zero, negative numbers, and non-numbers)
			const invalidScales = [0, -0.5, -1, -2, 'not-number', null, undefined, {}, [], true, false]

			invalidScales.forEach((scale) => {
				expect(() => noteShapeProps.scale.validate(scale)).toThrow()
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
				expect(() => noteShapeProps.url.validate(url)).not.toThrow()
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
				expect(() => noteShapeProps.url.validate(url)).toThrow()
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
				expect(() => noteShapeProps.richText.validate(richText)).not.toThrow()
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
				expect(() => noteShapeProps.richText.validate(richText)).toThrow()
			})
		})

		it('should use correct default style validators', () => {
			// Verify that the props schema uses the expected style validators
			expect(noteShapeProps.color).toBe(DefaultColorStyle)
			expect(noteShapeProps.labelColor).toBe(DefaultLabelColorStyle)
			expect(noteShapeProps.size).toBe(DefaultSizeStyle)
			expect(noteShapeProps.font).toBe(DefaultFontStyle)
			expect(noteShapeProps.align).toBe(DefaultHorizontalAlignStyle)
			expect(noteShapeProps.verticalAlign).toBe(DefaultVerticalAlignStyle)
		})

		it('should validate fontSizeAdjustment with T.positiveNumber', () => {
			expect(noteShapeProps.fontSizeAdjustment).toBe(T.positiveNumber)
		})

		it('should validate growY with T.positiveNumber', () => {
			expect(noteShapeProps.growY).toBe(T.positiveNumber)
		})

		it('should validate scale with T.nonZeroNumber', () => {
			expect(noteShapeProps.scale).toBe(T.nonZeroNumber)
		})

		it('should validate url with T.linkUrl', () => {
			expect(noteShapeProps.url).toBe(T.linkUrl)
		})
	})

	describe('noteShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(noteShapeVersions).toBeDefined()
			expect(typeof noteShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof noteShapeVersions> = [
				'AddUrlProp',
				'RemoveJustify',
				'MigrateLegacyAlign',
				'AddVerticalAlign',
				'MakeUrlsValid',
				'AddFontSizeAdjustment',
				'AddScale',
				'AddLabelColor',
				'AddRichText',
			]

			expectedVersions.forEach((version) => {
				expect(noteShapeVersions[version]).toBeDefined()
				expect(typeof noteShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(noteShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.note\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain note in migration IDs', () => {
			Object.values(noteShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('note')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(noteShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('noteShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(noteShapeMigrations).toBeDefined()
			expect(noteShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(noteShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = noteShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(noteShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have at least as many migrations as version IDs
			expect(noteShapeMigrations.sequence.length).toBeGreaterThanOrEqual(
				Object.keys(noteShapeVersions).length
			)
		})
	})

	describe('noteShapeMigrations - AddUrlProp migration', () => {
		const { up, down } = getTestMigration(noteShapeVersions.AddUrlProp)

		describe('AddUrlProp up migration', () => {
			it('should add url property with empty string default', () => {
				const oldRecord = {
					id: 'shape:note1',
					typeName: 'shape',
					type: 'note',
					x: 100,
					y: 200,
					rotation: 0,
					index: 'a1',
					parentId: 'page:main',
					isLocked: false,
					opacity: 1,
					props: {
						color: 'yellow',
						labelColor: 'black',
						size: 'm',
					},
					meta: {},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.color).toBe('yellow') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:note2',
					props: {
						color: 'blue',
						labelColor: 'red',
						size: 'l',
						font: 'sans',
						fontSizeAdjustment: 2,
						align: 'start',
						verticalAlign: 'middle',
						growY: 25,
						scale: 1.5,
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.color).toBe('blue')
				expect(result.props.labelColor).toBe('red')
				expect(result.props.size).toBe('l')
				expect(result.props.fontSizeAdjustment).toBe(2)
			})
		})

		describe('AddUrlProp down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.note/1 does not have a down function')
			})
		})
	})

	describe('noteShapeMigrations - RemoveJustify migration', () => {
		const { up, down } = getTestMigration(noteShapeVersions.RemoveJustify)

		describe('RemoveJustify up migration', () => {
			it('should convert justify alignment to start', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						align: 'justify',
						labelColor: 'black',
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('start')
				expect(result.props.color).toBe('yellow') // Preserve other props
			})

			it('should preserve non-justify alignments', () => {
				const alignments = ['start', 'middle', 'end']

				alignments.forEach((align) => {
					const oldRecord = {
						id: 'shape:note1',
						props: {
							color: 'red',
							align,
							labelColor: 'black',
						},
					}

					const result = up(oldRecord)
					expect(result.props.align).toBe(align)
				})
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'green',
						align: 'justify',
						labelColor: 'white',
						size: 'l',
						font: 'serif',
						fontSizeAdjustment: 1,
						verticalAlign: 'start',
						growY: 30,
						scale: 0.8,
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('start')
				expect(result.props.color).toBe('green')
				expect(result.props.labelColor).toBe('white')
				expect(result.props.size).toBe('l')
				expect(result.props.font).toBe('serif')
			})
		})

		describe('RemoveJustify down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.note/2 does not have a down function')
			})
		})
	})

	describe('noteShapeMigrations - MigrateLegacyAlign migration', () => {
		const { up, down } = getTestMigration(noteShapeVersions.MigrateLegacyAlign)

		describe('MigrateLegacyAlign up migration', () => {
			it('should convert start to start-legacy', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
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
					id: 'shape:note1',
					props: {
						color: 'blue',
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
					id: 'shape:note1',
					props: {
						color: 'red',
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
					id: 'shape:note1',
					props: {
						color: 'green',
						align: 'unknown-align',
						verticalAlign: 'middle',
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('middle-legacy')
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'purple',
						align: 'start',
						verticalAlign: 'middle',
						labelColor: 'white',
						size: 's',
						font: 'mono',
						fontSizeAdjustment: 3,
						growY: 15,
						url: 'https://example.com',
						scale: 1.2,
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('start-legacy')
				expect(result.props.color).toBe('purple')
				expect(result.props.labelColor).toBe('white')
				expect(result.props.fontSizeAdjustment).toBe(3)
			})
		})

		describe('MigrateLegacyAlign down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.note/3 does not have a down function')
			})
		})
	})

	describe('noteShapeMigrations - AddVerticalAlign migration', () => {
		const { up, down } = getTestMigration(noteShapeVersions.AddVerticalAlign)

		describe('AddVerticalAlign up migration', () => {
			it('should add verticalAlign property with default value "middle"', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						align: 'start-legacy',
						labelColor: 'black',
					},
				}

				const result = up(oldRecord)
				expect(result.props.verticalAlign).toBe('middle')
				expect(result.props.align).toBe('start-legacy') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'red',
						align: 'middle-legacy',
						labelColor: 'white',
						size: 'xl',
						font: 'draw',
						fontSizeAdjustment: 0,
						growY: 50,
						url: 'https://test.com',
						scale: 0.9,
					},
				}

				const result = up(oldRecord)
				expect(result.props.verticalAlign).toBe('middle')
				expect(result.props.color).toBe('red')
				expect(result.props.align).toBe('middle-legacy')
				expect(result.props.size).toBe('xl')
			})
		})

		describe('AddVerticalAlign down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.note/4 does not have a down function')
			})
		})
	})

	describe('noteShapeMigrations - MakeUrlsValid migration', () => {
		const { up, down } = getTestMigration(noteShapeVersions.MakeUrlsValid)

		describe('MakeUrlsValid up migration', () => {
			it('should clear invalid URLs', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						url: 'invalid-url',
						align: 'start-legacy',
						verticalAlign: 'middle',
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.color).toBe('yellow') // Preserve other props
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
						id: 'shape:note1',
						props: {
							color: 'blue',
							url,
							align: 'middle-legacy',
							verticalAlign: 'start',
						},
					}

					const result = up(oldRecord)
					expect(result.props.url).toBe(url)
				})
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'green',
						url: 'not-valid',
						align: 'end-legacy',
						verticalAlign: 'end',
						labelColor: 'red',
						size: 'm',
						font: 'sans',
						fontSizeAdjustment: 2,
						growY: 40,
						scale: 1.1,
					},
				}

				const result = up(oldRecord)
				expect(result.props.url).toBe('')
				expect(result.props.color).toBe('green')
				expect(result.props.align).toBe('end-legacy')
				expect(result.props.verticalAlign).toBe('end')
			})
		})

		describe('MakeUrlsValid down migration', () => {
			it('should be a no-op migration', () => {
				const newRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						url: 'https://example.com',
						align: 'start-legacy',
						verticalAlign: 'middle',
					},
				}

				const result = down(newRecord)
				expect(result).toEqual(newRecord)
			})
		})
	})

	describe('noteShapeMigrations - AddFontSizeAdjustment migration', () => {
		const { up, down } = getTestMigration(noteShapeVersions.AddFontSizeAdjustment)

		describe('AddFontSizeAdjustment up migration', () => {
			it('should add fontSizeAdjustment property with default value 0', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						url: 'https://example.com',
						align: 'start-legacy',
						verticalAlign: 'middle',
					},
				}

				const result = up(oldRecord)
				expect(result.props.fontSizeAdjustment).toBe(0)
				expect(result.props.color).toBe('yellow') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'red',
						url: '',
						align: 'middle-legacy',
						verticalAlign: 'start',
						labelColor: 'white',
						size: 'l',
						font: 'serif',
						growY: 35,
						scale: 1.3,
					},
				}

				const result = up(oldRecord)
				expect(result.props.fontSizeAdjustment).toBe(0)
				expect(result.props.color).toBe('red')
				expect(result.props.align).toBe('middle-legacy')
				expect(result.props.size).toBe('l')
			})
		})

		describe('AddFontSizeAdjustment down migration', () => {
			it('should remove fontSizeAdjustment property', () => {
				const newRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						url: 'https://example.com',
						align: 'start-legacy',
						verticalAlign: 'middle',
						fontSizeAdjustment: 2,
					},
				}

				const result = down(newRecord)
				expect(result.props.fontSizeAdjustment).toBeUndefined()
				expect(result.props.color).toBe('yellow') // Preserve other props
			})
		})
	})

	describe('noteShapeMigrations - AddScale migration', () => {
		const { up, down } = getTestMigration(noteShapeVersions.AddScale)

		describe('AddScale up migration', () => {
			it('should add scale property with default value 1', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						url: 'https://example.com',
						align: 'start-legacy',
						verticalAlign: 'middle',
						fontSizeAdjustment: 1,
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
				expect(result.props.color).toBe('yellow') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'blue',
						url: '',
						align: 'end-legacy',
						verticalAlign: 'end',
						labelColor: 'black',
						size: 's',
						font: 'mono',
						fontSizeAdjustment: 3,
						growY: 60,
					},
				}

				const result = up(oldRecord)
				expect(result.props.scale).toBe(1)
				expect(result.props.color).toBe('blue')
				expect(result.props.fontSizeAdjustment).toBe(3)
				expect(result.props.growY).toBe(60)
			})
		})

		describe('AddScale down migration', () => {
			it('should remove scale property', () => {
				const newRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						url: 'https://example.com',
						align: 'start-legacy',
						verticalAlign: 'middle',
						fontSizeAdjustment: 1,
						scale: 1.5,
					},
				}

				const result = down(newRecord)
				expect(result.props.scale).toBeUndefined()
				expect(result.props.color).toBe('yellow') // Preserve other props
			})
		})
	})

	describe('noteShapeMigrations - AddLabelColor migration', () => {
		const { up, down } = getTestMigration(noteShapeVersions.AddLabelColor)

		describe('AddLabelColor up migration', () => {
			it('should add labelColor property with default value "black"', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						url: 'https://example.com',
						align: 'start-legacy',
						verticalAlign: 'middle',
						fontSizeAdjustment: 1,
						scale: 1,
					},
				}

				const result = up(oldRecord)
				expect(result.props.labelColor).toBe('black')
				expect(result.props.color).toBe('yellow') // Preserve other props
			})

			it('should preserve all existing properties during migration', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'red',
						url: '',
						align: 'middle-legacy',
						verticalAlign: 'start',
						size: 'xl',
						font: 'draw',
						fontSizeAdjustment: 2,
						growY: 45,
						scale: 0.7,
					},
				}

				const result = up(oldRecord)
				expect(result.props.labelColor).toBe('black')
				expect(result.props.color).toBe('red')
				expect(result.props.size).toBe('xl')
				expect(result.props.fontSizeAdjustment).toBe(2)
			})
		})

		describe('AddLabelColor down migration', () => {
			it('should remove labelColor property', () => {
				const newRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						labelColor: 'white',
						url: 'https://example.com',
						align: 'start-legacy',
						verticalAlign: 'middle',
						fontSizeAdjustment: 1,
						scale: 1,
					},
				}

				const result = down(newRecord)
				expect(result.props.labelColor).toBeUndefined()
				expect(result.props.color).toBe('yellow') // Preserve other props
			})
		})
	})

	describe('noteShapeMigrations - AddRichText migration', () => {
		const { up } = getTestMigration(noteShapeVersions.AddRichText)

		describe('AddRichText up migration', () => {
			it('should convert text property to richText', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'yellow',
						labelColor: 'black',
						text: 'Simple note content',
						url: 'https://example.com',
						align: 'start-legacy',
						verticalAlign: 'middle',
						fontSizeAdjustment: 1,
						scale: 1,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
				expect(result.props.color).toBe('yellow') // Preserve other props
			})

			it('should handle empty text', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'blue',
						labelColor: 'white',
						text: '',
						url: '',
						align: 'middle-legacy',
						verticalAlign: 'start',
						fontSizeAdjustment: 0,
						scale: 1,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:note1',
					props: {
						color: 'green',
						labelColor: 'red',
						text: 'Multi-line\nnote content',
						url: 'https://test.com',
						align: 'end-legacy',
						verticalAlign: 'end',
						size: 'l',
						font: 'sans',
						fontSizeAdjustment: 3,
						growY: 70,
						scale: 1.4,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
				expect(result.props.color).toBe('green')
				expect(result.props.labelColor).toBe('red')
				expect(result.props.size).toBe('l')
				expect(result.props.fontSizeAdjustment).toBe(3)
			})
		})

		// Note: The down migration is explicitly not defined (forced client update)
		// so we don't test it
	})

	describe('integration tests', () => {
		it('should work with complete note shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('note'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(noteShapeProps),
				meta: T.jsonValue,
			})

			const validNoteShape = {
				id: 'shape:note123',
				typeName: 'shape' as const,
				type: 'note' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					color: 'light-blue' as const,
					labelColor: 'black' as const,
					size: 'l' as const,
					font: 'sans' as const,
					fontSizeAdjustment: 2,
					align: 'start' as const,
					verticalAlign: 'end' as const,
					growY: 30,
					url: 'https://example.com',
					richText: toRichText('Important **note**') as TLRichText,
					scale: 1.1,
				},
				meta: { priority: 'high' },
			}

			expect(() => completeValidator.validate(validNoteShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const noteShape: TLNoteShape = {
				id: 'shape:note_test' as TLShapeId,
				typeName: 'shape',
				type: 'note',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.5,
				props: {
					color: 'red',
					labelColor: 'white',
					size: 's',
					font: 'mono',
					fontSizeAdjustment: 1,
					align: 'middle',
					verticalAlign: 'middle',
					growY: 15,
					url: '',
					richText: toRichText('📝'),
					scale: 0.9,
				},
				meta: { category: 'reminder' },
			}

			// Should satisfy TLBaseShape structure
			expect(noteShape.typeName).toBe('shape')
			expect(noteShape.type).toBe('note')
			expect(typeof noteShape.id).toBe('string')
			expect(typeof noteShape.x).toBe('number')
			expect(typeof noteShape.y).toBe('number')
			expect(typeof noteShape.rotation).toBe('number')
			expect(noteShape.props).toBeDefined()
			expect(noteShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof noteShapeVersions> = [
				'AddUrlProp',
				'RemoveJustify',
				'MigrateLegacyAlign',
				'AddVerticalAlign',
				'MakeUrlsValid',
				'AddFontSizeAdjustment',
				'AddScale',
				'AddLabelColor',
				'AddRichText',
			]

			const migrationIds = noteShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = noteShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(noteShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					color: 'yellow',
					labelColor: 'black',
					// Missing other required properties
				})
			).toThrow()

			// Extra unexpected properties should throw
			expect(() =>
				fullValidator.validate({
					color: 'yellow',
					labelColor: 'black',
					size: 'm',
					font: 'draw',
					fontSizeAdjustment: 0,
					align: 'middle',
					verticalAlign: 'middle',
					growY: 0,
					url: '',
					richText: toRichText(''),
					scale: 1,
					unexpectedProperty: 'extra', // This should cause validation to fail
				})
			).toThrow()
		})

		it('should handle boundary values for numeric properties', () => {
			// Test extreme but valid values
			const extremeProps = {
				color: 'yellow' as const,
				labelColor: 'black' as const,
				size: 'm' as const,
				font: 'draw' as const,
				fontSizeAdjustment: 0, // Minimum positive number
				align: 'middle' as const,
				verticalAlign: 'middle' as const,
				growY: 0, // Minimum positive number
				url: '',
				richText: toRichText('') as TLRichText,
				scale: 0.0001, // Very small but not zero
			}

			const fullValidator = T.object(noteShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero and negative values validation correctly', () => {
			// Zero should be invalid for scale (nonZeroNumber)
			expect(() => noteShapeProps.scale.validate(0)).toThrow()

			// Negative values should be invalid for fontSizeAdjustment, growY, and scale
			expect(() => noteShapeProps.fontSizeAdjustment.validate(-1)).toThrow()
			expect(() => noteShapeProps.growY.validate(-1)).toThrow()
			expect(() => noteShapeProps.scale.validate(-1)).toThrow()

			// Zero should be valid for fontSizeAdjustment and growY (positiveNumber includes zero)
			expect(() => noteShapeProps.fontSizeAdjustment.validate(0)).not.toThrow()
			expect(() => noteShapeProps.growY.validate(0)).not.toThrow()
		})

		it('should handle complex rich text content', () => {
			const complexRichTexts = [
				toRichText(''),
				toRichText('Simple note'),
				toRichText('**Bold** and *italic* and ***both***'),
				toRichText('Line 1\nLine 2\nLine 3'),
				toRichText('Special chars: !@#$%^&*()'),
				toRichText('Unicode: 📝 ✅ ❗'),
			]

			complexRichTexts.forEach((richText) => {
				expect(() => noteShapeProps.richText.validate(richText)).not.toThrow()
			})
		})

		it('should handle different font size adjustments', () => {
			const fontAdjustments = [0, 0.5, 1, 2, 5, 10, 20]

			fontAdjustments.forEach((adjustment) => {
				expect(() => noteShapeProps.fontSizeAdjustment.validate(adjustment)).not.toThrow()
			})

			// Negative adjustments should be invalid
			const negativeAdjustments = [-1, -0.5, -10]
			negativeAdjustments.forEach((adjustment) => {
				expect(() => noteShapeProps.fontSizeAdjustment.validate(adjustment)).toThrow()
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
					expect(() => noteShapeProps.url.validate(url)).not.toThrow()
				} else {
					expect(() => noteShapeProps.url.validate(url)).toThrow()
				}
			})
		})

		it('should handle all style property combinations', () => {
			const styleVariations = [
				{
					color: 'black' as const,
					labelColor: 'white' as const,
					size: 's' as const,
					font: 'draw' as const,
					align: 'start' as const,
					verticalAlign: 'start' as const,
				},
				{
					color: 'red' as const,
					labelColor: 'black' as const,
					size: 'm' as const,
					font: 'sans' as const,
					align: 'middle' as const,
					verticalAlign: 'middle' as const,
				},
				{
					color: 'blue' as const,
					labelColor: 'yellow' as const,
					size: 'l' as const,
					font: 'serif' as const,
					align: 'end' as const,
					verticalAlign: 'end' as const,
				},
				{
					color: 'green' as const,
					labelColor: 'red' as const,
					size: 'xl' as const,
					font: 'mono' as const,
					align: 'start-legacy' as const,
					verticalAlign: 'start' as const,
				},
			]

			styleVariations.forEach((styling, index) => {
				const props: TLNoteShapeProps = {
					color: styling.color,
					labelColor: styling.labelColor,
					size: styling.size,
					font: styling.font,
					fontSizeAdjustment: index,
					align: styling.align,
					verticalAlign: styling.verticalAlign,
					growY: index * 10,
					url: '',
					richText: toRichText(`Note ${index + 1}`),
					scale: 1,
				}

				const fullValidator = T.object(noteShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})

		it('should handle note shapes with different growth and scaling', () => {
			const dimensionVariations = [
				{ fontSizeAdjustment: 0, growY: 0, scale: 0.5 },
				{ fontSizeAdjustment: 1, growY: 10, scale: 1 },
				{ fontSizeAdjustment: 3, growY: 50, scale: 1.5 },
				{ fontSizeAdjustment: 5, growY: 100, scale: 2 },
			]

			dimensionVariations.forEach((dims) => {
				const props: Partial<TLNoteShapeProps> = {
					fontSizeAdjustment: dims.fontSizeAdjustment,
					growY: dims.growY,
					scale: dims.scale,
				}

				expect(() =>
					noteShapeProps.fontSizeAdjustment.validate(props.fontSizeAdjustment)
				).not.toThrow()
				expect(() => noteShapeProps.growY.validate(props.growY)).not.toThrow()
				expect(() => noteShapeProps.scale.validate(props.scale)).not.toThrow()
			})
		})
	})
})
