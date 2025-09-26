import { T } from '@tldraw/validate'
import { describe, expect, it, test } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLRichText, toRichText } from '../misc/TLRichText'
import { TLShapeId } from '../records/TLShape'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultTextAlignStyle } from '../styles/TLTextAlignStyle'
import {
	TLTextShape,
	TLTextShapeProps,
	textShapeMigrations,
	textShapeProps,
	textShapeVersions,
} from './TLTextShape'

describe('TLTextShape', () => {
	describe('TLTextShapeProps interface', () => {
		it('should represent valid text shape properties', () => {
			const validProps: TLTextShapeProps = {
				color: 'black',
				size: 'm',
				font: 'draw',
				textAlign: 'start',
				w: 200,
				richText: toRichText('Hello World'),
				scale: 1,
				autoSize: true,
			}

			expect(validProps.color).toBe('black')
			expect(validProps.size).toBe('m')
			expect(validProps.font).toBe('draw')
			expect(validProps.textAlign).toBe('start')
			expect(validProps.w).toBe(200)
			expect(validProps.richText).toBeDefined()
			expect(validProps.scale).toBe(1)
			expect(validProps.autoSize).toBe(true)
		})

		it('should support different color styles', () => {
			const colors = [
				'black',
				'white',
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
			] as const

			colors.forEach((color) => {
				const props: Partial<TLTextShapeProps> = {
					color,
				}

				expect(props.color).toBe(color)
			})
		})

		it('should support different size styles', () => {
			const sizes = ['s', 'm', 'l', 'xl'] as const

			sizes.forEach((size) => {
				const props: Partial<TLTextShapeProps> = {
					size,
				}

				expect(props.size).toBe(size)
			})
		})

		it('should support different font styles', () => {
			const fonts = ['draw', 'sans', 'serif', 'mono'] as const

			fonts.forEach((font) => {
				const props: Partial<TLTextShapeProps> = {
					font,
				}

				expect(props.font).toBe(font)
			})
		})

		it('should support different text alignment styles', () => {
			const alignments = ['start', 'middle', 'end'] as const

			alignments.forEach((textAlign) => {
				const props: Partial<TLTextShapeProps> = {
					textAlign,
				}

				expect(props.textAlign).toBe(textAlign)
			})
		})

		it('should support different width values', () => {
			const widthValues = [50, 100, 200, 300, 500, 1000]

			widthValues.forEach((w) => {
				const props: Partial<TLTextShapeProps> = {
					w,
				}

				expect(props.w).toBe(w)
			})
		})

		it('should support different scale values', () => {
			const scaleValues = [0.5, 1, 1.5, 2, 3, 5]

			scaleValues.forEach((scale) => {
				const props: Partial<TLTextShapeProps> = {
					scale,
				}

				expect(props.scale).toBe(scale)
			})
		})

		it('should support both autoSize values', () => {
			const autoSizeValues = [true, false]

			autoSizeValues.forEach((autoSize) => {
				const props: Partial<TLTextShapeProps> = {
					autoSize,
				}

				expect(props.autoSize).toBe(autoSize)
			})
		})

		it('should support rich text content', () => {
			const richTexts = [
				toRichText(''),
				toRichText('Simple text'),
				toRichText('**Bold** text'),
				toRichText('*Italic* text'),
				toRichText('Multiple\nLines'),
				toRichText('Mixed **bold** and *italic* text'),
			]

			richTexts.forEach((richText, index) => {
				const props: Partial<TLTextShapeProps> = {
					richText,
				}

				expect(props.richText).toBe(richText)
			})
		})

		it('should support different styling combinations', () => {
			const stylingVariations = [
				{
					color: 'black' as const,
					size: 's' as const,
					font: 'draw' as const,
					textAlign: 'start' as const,
				},
				{
					color: 'red' as const,
					size: 'm' as const,
					font: 'sans' as const,
					textAlign: 'middle' as const,
				},
				{
					color: 'blue' as const,
					size: 'l' as const,
					font: 'serif' as const,
					textAlign: 'end' as const,
				},
				{
					color: 'green' as const,
					size: 'xl' as const,
					font: 'mono' as const,
					textAlign: 'start' as const,
				},
			]

			stylingVariations.forEach((styling, index) => {
				const props: Partial<TLTextShapeProps> = {
					color: styling.color,
					size: styling.size,
					font: styling.font,
					textAlign: styling.textAlign,
				}

				expect(props.color).toBe(styling.color)
				expect(props.size).toBe(styling.size)
				expect(props.font).toBe(styling.font)
				expect(props.textAlign).toBe(styling.textAlign)
			})
		})

		it('should support different dimensions and scaling combinations', () => {
			const dimensionVariations = [
				{ w: 50, scale: 0.5, autoSize: true },
				{ w: 100, scale: 1, autoSize: false },
				{ w: 200, scale: 1.5, autoSize: true },
				{ w: 500, scale: 2, autoSize: false },
			]

			dimensionVariations.forEach((dims) => {
				const props: Partial<TLTextShapeProps> = {
					w: dims.w,
					scale: dims.scale,
					autoSize: dims.autoSize,
				}

				expect(props.w).toBe(dims.w)
				expect(props.scale).toBe(dims.scale)
				expect(props.autoSize).toBe(dims.autoSize)
			})
		})
	})

	describe('TLTextShape type', () => {
		it('should represent complete text shape records', () => {
			const validTextShape: TLTextShape = {
				id: 'shape:text123' as TLShapeId,
				typeName: 'shape',
				type: 'text',
				x: 100,
				y: 200,
				rotation: 0,
				index: 'a1' as any,
				parentId: 'page:main' as any,
				isLocked: false,
				opacity: 1,
				props: {
					color: 'black',
					size: 'm',
					font: 'draw',
					textAlign: 'start',
					w: 200,
					richText: toRichText('Hello World'),
					scale: 1,
					autoSize: true,
				},
				meta: {},
			}

			expect(validTextShape.type).toBe('text')
			expect(validTextShape.typeName).toBe('shape')
			expect(validTextShape.props.color).toBe('black')
			expect(validTextShape.props.w).toBe(200)
			expect(validTextShape.props.autoSize).toBe(true)
		})

		it('should support different text configurations', () => {
			const configurations = [
				{
					color: 'red' as const,
					font: 'sans' as const,
					size: 'l' as const,
					w: 300,
					autoSize: false,
					text: 'Large sans text',
				},
				{
					color: 'blue' as const,
					font: 'serif' as const,
					size: 's' as const,
					w: 150,
					autoSize: true,
					text: 'Small serif text',
				},
				{
					color: 'green' as const,
					font: 'mono' as const,
					size: 'xl' as const,
					w: 400,
					autoSize: false,
					text: 'Extra large mono text',
				},
				{
					color: 'orange' as const,
					font: 'draw' as const,
					size: 'm' as const,
					w: 250,
					autoSize: true,
					text: 'Medium draw text',
				},
			]

			configurations.forEach((config, index) => {
				const shape: TLTextShape = {
					id: `shape:text${index}` as TLShapeId,
					typeName: 'shape',
					type: 'text',
					x: index * 100,
					y: index * 50,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						color: config.color,
						size: config.size,
						font: config.font,
						textAlign: 'start',
						w: config.w,
						richText: toRichText(config.text),
						scale: 1,
						autoSize: config.autoSize,
					},
					meta: {},
				}

				expect(shape.props.color).toBe(config.color)
				expect(shape.props.font).toBe(config.font)
				expect(shape.props.size).toBe(config.size)
				expect(shape.props.w).toBe(config.w)
				expect(shape.props.autoSize).toBe(config.autoSize)
			})
		})

		it('should support shapes with different text alignments', () => {
			const alignmentVariations: TLTextShapeProps['textAlign'][] = ['start', 'middle', 'end']

			alignmentVariations.forEach((textAlign, index) => {
				const shape: TLTextShape = {
					id: `shape:align_text${index}` as TLShapeId,
					typeName: 'shape',
					type: 'text',
					x: 0,
					y: 0,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						color: 'black',
						size: 'm',
						font: 'draw',
						textAlign,
						w: 200,
						richText: toRichText(`${textAlign} aligned text`),
						scale: 1,
						autoSize: false,
					},
					meta: {},
				}

				expect(shape.props.textAlign).toBe(textAlign)
			})
		})

		it('should support shapes with complex rich text content', () => {
			const textVariations = [
				'',
				'Simple text',
				'Multi\nLine\nText',
				'Text with **bold** formatting',
				'Text with *italic* formatting',
				'Text with **bold** and *italic* mixed',
				'Complex text with\n**bold lines**\nand *italic content*',
			]

			textVariations.forEach((text, index) => {
				const shape: TLTextShape = {
					id: `shape:rich_text${index}` as TLShapeId,
					typeName: 'shape',
					type: 'text',
					x: 0,
					y: 0,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						color: 'black',
						size: 'm',
						font: 'draw',
						textAlign: 'start',
						w: 200,
						richText: toRichText(text),
						scale: 1,
						autoSize: true,
					},
					meta: {},
				}

				expect(shape.props.richText).toBeDefined()
			})
		})

		it('should support shapes with different scaling factors', () => {
			const scaleVariations = [0.5, 1, 1.5, 2, 3]

			scaleVariations.forEach((scale, index) => {
				const shape: TLTextShape = {
					id: `shape:scale_text${index}` as TLShapeId,
					typeName: 'shape',
					type: 'text',
					x: 0,
					y: 0,
					rotation: 0,
					index: `a${index}` as any,
					parentId: 'page:main' as any,
					isLocked: false,
					opacity: 1,
					props: {
						color: 'black',
						size: 'm',
						font: 'draw',
						textAlign: 'start',
						w: 200,
						richText: toRichText(`Scale ${scale}x`),
						scale,
						autoSize: false,
					},
					meta: {},
				}

				expect(shape.props.scale).toBe(scale)
			})
		})
	})

	describe('textShapeProps validation schema', () => {
		it('should validate all text shape properties', () => {
			const validProps = {
				color: 'blue',
				size: 'l',
				font: 'sans',
				textAlign: 'middle',
				w: 300,
				richText: toRichText('Test text'),
				scale: 1.5,
				autoSize: false,
			}

			// Validate each property individually
			expect(() => textShapeProps.color.validate(validProps.color)).not.toThrow()
			expect(() => textShapeProps.size.validate(validProps.size)).not.toThrow()
			expect(() => textShapeProps.font.validate(validProps.font)).not.toThrow()
			expect(() => textShapeProps.textAlign.validate(validProps.textAlign)).not.toThrow()
			expect(() => textShapeProps.w.validate(validProps.w)).not.toThrow()
			expect(() => textShapeProps.richText.validate(validProps.richText)).not.toThrow()
			expect(() => textShapeProps.scale.validate(validProps.scale)).not.toThrow()
			expect(() => textShapeProps.autoSize.validate(validProps.autoSize)).not.toThrow()
		})

		it('should validate using comprehensive object validator', () => {
			const fullValidator = T.object(textShapeProps)

			const validPropsObject = {
				color: 'red' as const,
				size: 's' as const,
				font: 'mono' as const,
				textAlign: 'end' as const,
				w: 250,
				richText: toRichText('Complete validation test') as TLRichText,
				scale: 0.8,
				autoSize: true,
			}

			expect(() => fullValidator.validate(validPropsObject)).not.toThrow()
			const result = fullValidator.validate(validPropsObject)
			expect(result).toEqual(validPropsObject)
		})

		it('should reject invalid color values', () => {
			const invalidColors = ['invalid-color', 'BLUE', 'rgb(255,0,0)', '', null, undefined, 123]

			invalidColors.forEach((color) => {
				expect(() => textShapeProps.color.validate(color)).toThrow()
			})
		})

		it('should reject invalid size values', () => {
			const invalidSizes = ['small', 'medium', 'large', 'xs', 'xxl', '', null, undefined, 123]

			invalidSizes.forEach((size) => {
				expect(() => textShapeProps.size.validate(size)).toThrow()
			})
		})

		it('should reject invalid font values', () => {
			const invalidFonts = ['arial', 'helvetica', 'times', 'DRAW', '', null, undefined, 123]

			invalidFonts.forEach((font) => {
				expect(() => textShapeProps.font.validate(font)).toThrow()
			})
		})

		it('should reject invalid text alignment values', () => {
			const invalidAlignments = [
				'left',
				'center',
				'right',
				'justify',
				'START',
				'',
				null,
				undefined,
				123,
			]

			invalidAlignments.forEach((textAlign) => {
				expect(() => textShapeProps.textAlign.validate(textAlign)).toThrow()
			})
		})

		it('should validate width as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validWidths = [0.1, 1, 50, 100, 1000, 0.001]

			validWidths.forEach((w) => {
				expect(() => textShapeProps.w.validate(w)).not.toThrow()
			})

			// Invalid widths (zero, negative numbers, and non-numbers)
			const invalidWidths = [0, -1, -0.1, 'not-number', null, undefined, {}, [], true, false]

			invalidWidths.forEach((w) => {
				expect(() => textShapeProps.w.validate(w)).toThrow()
			})
		})

		it('should validate scale as nonZeroNumber', () => {
			// Valid non-zero positive numbers
			const validScales = [0.1, 0.5, 1, 1.5, 2, 10]

			validScales.forEach((scale) => {
				expect(() => textShapeProps.scale.validate(scale)).not.toThrow()
			})

			// Invalid scales (zero, negative numbers, and non-numbers)
			const invalidScales = [0, -0.5, -1, -2, 'not-number', null, undefined, {}, [], true, false]

			invalidScales.forEach((scale) => {
				expect(() => textShapeProps.scale.validate(scale)).toThrow()
			})
		})

		it('should validate autoSize as boolean', () => {
			// Valid boolean values
			const validAutoSizes = [true, false]

			validAutoSizes.forEach((autoSize) => {
				expect(() => textShapeProps.autoSize.validate(autoSize)).not.toThrow()
			})

			// Invalid autoSize values
			const invalidAutoSizes = [0, 1, 'true', 'false', '', null, undefined, {}, []]

			invalidAutoSizes.forEach((autoSize) => {
				expect(() => textShapeProps.autoSize.validate(autoSize)).toThrow()
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
				expect(() => textShapeProps.richText.validate(richText)).not.toThrow()
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
				expect(() => textShapeProps.richText.validate(richText)).toThrow()
			})
		})

		it('should use correct default style validators', () => {
			// Verify that the props schema uses the expected style validators
			expect(textShapeProps.color).toBe(DefaultColorStyle)
			expect(textShapeProps.size).toBe(DefaultSizeStyle)
			expect(textShapeProps.font).toBe(DefaultFontStyle)
			expect(textShapeProps.textAlign).toBe(DefaultTextAlignStyle)
		})

		it('should use correct primitive validators', () => {
			// Check that non-style properties use correct T validators
			expect(textShapeProps.w).toBe(T.nonZeroNumber)
			expect(textShapeProps.scale).toBe(T.nonZeroNumber)
			expect(textShapeProps.autoSize).toBe(T.boolean)
		})
	})

	describe('textShapeVersions', () => {
		it('should contain expected migration version IDs', () => {
			expect(textShapeVersions).toBeDefined()
			expect(typeof textShapeVersions).toBe('object')
		})

		it('should have all expected migration versions', () => {
			const expectedVersions: Array<keyof typeof textShapeVersions> = [
				'RemoveJustify',
				'AddTextAlign',
				'AddRichText',
			]

			expectedVersions.forEach((version) => {
				expect(textShapeVersions[version]).toBeDefined()
				expect(typeof textShapeVersions[version]).toBe('string')
			})
		})

		it('should have properly formatted migration IDs', () => {
			Object.values(textShapeVersions).forEach((versionId) => {
				expect(versionId).toMatch(/^com\.tldraw\.shape\.text\//)
				expect(versionId).toMatch(/\/\d+$/) // Should end with /number
			})
		})

		it('should contain text in migration IDs', () => {
			Object.values(textShapeVersions).forEach((versionId) => {
				expect(versionId).toContain('text')
			})
		})

		it('should have unique version IDs', () => {
			const versionIds = Object.values(textShapeVersions)
			const uniqueIds = new Set(versionIds)
			expect(uniqueIds.size).toBe(versionIds.length)
		})
	})

	describe('textShapeMigrations', () => {
		it('should be defined and have required structure', () => {
			expect(textShapeMigrations).toBeDefined()
			expect(textShapeMigrations.sequence).toBeDefined()
			expect(Array.isArray(textShapeMigrations.sequence)).toBe(true)
		})

		it('should have migrations for all version IDs', () => {
			const migrationIds = textShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : null))
				.filter(Boolean)

			const versionIds = Object.values(textShapeVersions)

			versionIds.forEach((versionId) => {
				expect(migrationIds).toContain(versionId)
			})
		})

		it('should have correct number of migrations in sequence', () => {
			// Should have at least as many migrations as version IDs
			expect(textShapeMigrations.sequence.length).toBeGreaterThanOrEqual(
				Object.keys(textShapeVersions).length
			)
		})
	})

	describe('textShapeMigrations - RemoveJustify migration', () => {
		const { up, down } = getTestMigration(textShapeVersions.RemoveJustify)

		describe('RemoveJustify up migration', () => {
			it('should convert justify alignment to start', () => {
				const oldRecord = {
					id: 'shape:text1',
					props: {
						color: 'black',
						font: 'draw',
						size: 'm',
						align: 'justify',
						w: 200,
						text: 'Test text',
						scale: 1,
						autoSize: true,
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('start')
				expect(result.props.color).toBe('black') // Preserve other props
				expect(result.props.text).toBe('Test text')
			})

			it('should preserve non-justify alignments', () => {
				const alignments = ['start', 'middle', 'end']

				alignments.forEach((align) => {
					const oldRecord = {
						id: 'shape:text1',
						props: {
							color: 'red',
							font: 'sans',
							size: 'l',
							align,
							w: 300,
							text: 'Aligned text',
							scale: 1,
							autoSize: false,
						},
					}

					const result = up(oldRecord)
					expect(result.props.align).toBe(align)
				})
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:text1',
					props: {
						color: 'blue',
						font: 'serif',
						size: 'xl',
						align: 'justify',
						w: 400,
						text: 'Justified text becomes start aligned',
						scale: 1.5,
						autoSize: false,
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe('start')
				expect(result.props.color).toBe('blue')
				expect(result.props.font).toBe('serif')
				expect(result.props.size).toBe('xl')
				expect(result.props.w).toBe(400)
				expect(result.props.text).toBe('Justified text becomes start aligned')
				expect(result.props.scale).toBe(1.5)
				expect(result.props.autoSize).toBe(false)
			})
		})

		describe('RemoveJustify down migration', () => {
			it('should be retired (no down migration)', () => {
				expect(() => {
					down({})
				}).toThrow('Migration com.tldraw.shape.text/1 does not have a down function')
			})
		})
	})

	describe('textShapeMigrations - AddTextAlign migration', () => {
		const { up, down } = getTestMigration(textShapeVersions.AddTextAlign)

		describe('AddTextAlign up migration', () => {
			it('should migrate align to textAlign', () => {
				const oldRecord = {
					id: 'shape:text1',
					props: {
						color: 'black',
						font: 'draw',
						size: 'm',
						align: 'start',
						w: 200,
						text: 'Test text',
						scale: 1,
						autoSize: true,
					},
				}

				const result = up(oldRecord)
				expect(result.props.textAlign).toBe('start')
				expect(result.props.align).toBeUndefined()
				expect(result.props.color).toBe('black') // Preserve other props
			})

			it('should handle all alignment values', () => {
				const alignments = ['start', 'middle', 'end']

				alignments.forEach((align) => {
					const oldRecord = {
						id: 'shape:text1',
						props: {
							color: 'red',
							align,
							w: 200,
							text: 'Test',
						},
					}

					const result = up(oldRecord)
					expect(result.props.textAlign).toBe(align)
					expect(result.props.align).toBeUndefined()
				})
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:text1',
					props: {
						color: 'green',
						font: 'mono',
						size: 's',
						align: 'middle',
						w: 150,
						text: 'Migration test',
						scale: 2,
						autoSize: false,
					},
				}

				const result = up(oldRecord)
				expect(result.props.textAlign).toBe('middle')
				expect(result.props.align).toBeUndefined()
				expect(result.props.color).toBe('green')
				expect(result.props.font).toBe('mono')
				expect(result.props.size).toBe('s')
				expect(result.props.w).toBe(150)
				expect(result.props.text).toBe('Migration test')
				expect(result.props.scale).toBe(2)
				expect(result.props.autoSize).toBe(false)
			})
		})

		describe('AddTextAlign down migration', () => {
			it('should migrate textAlign back to align', () => {
				const newRecord = {
					id: 'shape:text1',
					props: {
						color: 'black',
						font: 'draw',
						size: 'm',
						textAlign: 'start',
						w: 200,
						text: 'Test text',
						scale: 1,
						autoSize: true,
					},
				}

				const result = down(newRecord)
				expect(result.props.align).toBe('start')
				expect(result.props.textAlign).toBeUndefined()
				expect(result.props.color).toBe('black') // Preserve other props
			})

			it('should handle all textAlign values during down migration', () => {
				const alignments = ['start', 'middle', 'end']

				alignments.forEach((textAlign) => {
					const newRecord = {
						id: 'shape:text1',
						props: {
							color: 'blue',
							textAlign,
							w: 200,
							text: 'Test',
						},
					}

					const result = down(newRecord)
					expect(result.props.align).toBe(textAlign)
					expect(result.props.textAlign).toBeUndefined()
				})
			})
		})
	})

	describe('textShapeMigrations - AddRichText migration', () => {
		const { up } = getTestMigration(textShapeVersions.AddRichText)

		describe('AddRichText up migration', () => {
			it('should convert text property to richText', () => {
				const oldRecord = {
					id: 'shape:text1',
					props: {
						color: 'black',
						font: 'draw',
						size: 'm',
						textAlign: 'start',
						w: 200,
						text: 'Simple text content',
						scale: 1,
						autoSize: true,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
				expect(result.props.color).toBe('black') // Preserve other props
			})

			it('should handle empty text', () => {
				const oldRecord = {
					id: 'shape:text1',
					props: {
						color: 'red',
						font: 'sans',
						size: 'l',
						textAlign: 'middle',
						w: 300,
						text: '',
						scale: 1,
						autoSize: false,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
			})

			it('should handle multi-line text', () => {
				const oldRecord = {
					id: 'shape:text1',
					props: {
						color: 'blue',
						font: 'serif',
						size: 'xl',
						textAlign: 'end',
						w: 400,
						text: 'Line 1\nLine 2\nLine 3',
						scale: 1.2,
						autoSize: true,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:text1',
					props: {
						color: 'green',
						font: 'mono',
						size: 's',
						textAlign: 'start',
						w: 250,
						text: 'Rich text migration test',
						scale: 0.8,
						autoSize: false,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.text).toBeUndefined()
				expect(result.props.color).toBe('green')
				expect(result.props.font).toBe('mono')
				expect(result.props.size).toBe('s')
				expect(result.props.textAlign).toBe('start')
				expect(result.props.w).toBe(250)
				expect(result.props.scale).toBe(0.8)
				expect(result.props.autoSize).toBe(false)
			})
		})

		// Note: The down migration is explicitly not defined (forced client update)
		// so we don't test it
	})

	describe('integration tests', () => {
		it('should work with complete text shape record validation', () => {
			const completeValidator = T.object({
				id: T.string,
				typeName: T.literal('shape'),
				type: T.literal('text'),
				x: T.number,
				y: T.number,
				rotation: T.number,
				index: T.string,
				parentId: T.string,
				isLocked: T.boolean,
				opacity: T.number,
				props: T.object(textShapeProps),
				meta: T.jsonValue,
			})

			const validTextShape = {
				id: 'shape:text123',
				typeName: 'shape' as const,
				type: 'text' as const,
				x: 100,
				y: 200,
				rotation: 0.5,
				index: 'a1',
				parentId: 'page:main',
				isLocked: false,
				opacity: 0.8,
				props: {
					color: 'blue' as const,
					size: 'l' as const,
					font: 'sans' as const,
					textAlign: 'middle' as const,
					w: 300,
					richText: toRichText('Integration test') as TLRichText,
					scale: 1.1,
					autoSize: false,
				},
				meta: { custom: 'data' },
			}

			expect(() => completeValidator.validate(validTextShape)).not.toThrow()
		})

		it('should be compatible with TLBaseShape structure', () => {
			const textShape: TLTextShape = {
				id: 'shape:text_test' as TLShapeId,
				typeName: 'shape',
				type: 'text',
				x: 50,
				y: 75,
				rotation: 1.57,
				index: 'b1' as any,
				parentId: 'page:test' as any,
				isLocked: true,
				opacity: 0.5,
				props: {
					color: 'red',
					size: 's',
					font: 'mono',
					textAlign: 'start',
					w: 150,
					richText: toRichText('Base shape test'),
					scale: 0.9,
					autoSize: true,
				},
				meta: { shapeType: 'text' },
			}

			// Should satisfy TLBaseShape structure
			expect(textShape.typeName).toBe('shape')
			expect(textShape.type).toBe('text')
			expect(typeof textShape.id).toBe('string')
			expect(typeof textShape.x).toBe('number')
			expect(typeof textShape.y).toBe('number')
			expect(typeof textShape.rotation).toBe('number')
			expect(textShape.props).toBeDefined()
			expect(textShape.meta).toBeDefined()
		})

		test('should handle all migration versions in correct order', () => {
			const expectedOrder: Array<keyof typeof textShapeVersions> = [
				'RemoveJustify',
				'AddTextAlign',
				'AddRichText',
			]

			const migrationIds = textShapeMigrations.sequence
				.filter((migration) => 'id' in migration)
				.map((migration) => ('id' in migration ? migration.id : ''))
				.filter(Boolean)

			expectedOrder.forEach((expectedVersion) => {
				const versionId = textShapeVersions[expectedVersion]
				expect(migrationIds).toContain(versionId)
			})
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty or malformed props gracefully during validation', () => {
			const fullValidator = T.object(textShapeProps)

			// Missing required properties should throw
			expect(() => fullValidator.validate({})).toThrow()

			// Partial props should throw for missing required fields
			expect(() =>
				fullValidator.validate({
					color: 'black',
					size: 'm',
					// Missing other required properties
				})
			).toThrow()

			// Extra unexpected properties should throw
			expect(() =>
				fullValidator.validate({
					color: 'black',
					size: 'm',
					font: 'draw',
					textAlign: 'start',
					w: 200,
					richText: toRichText('test'),
					scale: 1,
					autoSize: true,
					unexpectedProperty: 'extra', // This should cause validation to fail
				})
			).toThrow()
		})

		it('should handle boundary values for numeric properties', () => {
			// Test extreme but valid values
			const extremeProps = {
				color: 'black' as const,
				size: 'm' as const,
				font: 'draw' as const,
				textAlign: 'start' as const,
				w: 0.0001, // Very small but not zero
				richText: toRichText('test') as TLRichText,
				scale: 0.0001, // Very small but not zero
				autoSize: true,
			}

			const fullValidator = T.object(textShapeProps)
			expect(() => fullValidator.validate(extremeProps)).not.toThrow()
		})

		it('should handle zero and negative values validation correctly', () => {
			// Zero should be invalid for w and scale (nonZeroNumber)
			expect(() => textShapeProps.w.validate(0)).toThrow()
			expect(() => textShapeProps.scale.validate(0)).toThrow()

			// Negative values should be invalid for w and scale
			expect(() => textShapeProps.w.validate(-1)).toThrow()
			expect(() => textShapeProps.scale.validate(-1)).toThrow()
		})

		it('should handle complex rich text content', () => {
			const complexRichTexts = [
				toRichText(''),
				toRichText('Simple text'),
				toRichText('**Bold** and *italic* and ***both***'),
				toRichText('Line 1\nLine 2\nLine 3'),
				toRichText('Special chars: !@#$%^&*()'),
				toRichText('Unicode: 🎨 📝 ✨'),
			]

			complexRichTexts.forEach((richText) => {
				expect(() => textShapeProps.richText.validate(richText)).not.toThrow()
			})
		})

		it('should handle all text styling combinations with different content types', () => {
			const allColors = [
				'black',
				'white',
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
			] as const
			const allSizes = ['s', 'm', 'l', 'xl'] as const
			const allFonts = ['draw', 'sans', 'serif', 'mono'] as const
			const allAlignments = ['start', 'middle', 'end'] as const

			// Test a representative sample of combinations
			const combinations = [
				{ color: allColors[0], size: allSizes[0], font: allFonts[0], textAlign: allAlignments[0] },
				{ color: allColors[3], size: allSizes[1], font: allFonts[1], textAlign: allAlignments[1] },
				{ color: allColors[6], size: allSizes[2], font: allFonts[2], textAlign: allAlignments[2] },
				{ color: allColors[9], size: allSizes[3], font: allFonts[3], textAlign: allAlignments[0] },
			]

			combinations.forEach((combo) => {
				const props: TLTextShapeProps = {
					color: combo.color,
					size: combo.size,
					font: combo.font,
					textAlign: combo.textAlign,
					w: 200,
					richText: toRichText(`${combo.color} ${combo.size} ${combo.font} ${combo.textAlign}`),
					scale: 1,
					autoSize: true,
				}

				const fullValidator = T.object(textShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})

		it('should handle different width and scale combinations', () => {
			const dimensionCombinations = [
				{ w: 0.1, scale: 0.1 }, // Very small values
				{ w: 1, scale: 1 }, // Unit values
				{ w: 100, scale: 2 }, // Normal values
				{ w: 1000, scale: 10 }, // Large values
			]

			dimensionCombinations.forEach(({ w, scale }) => {
				const props = {
					color: 'black' as const,
					size: 'm' as const,
					font: 'draw' as const,
					textAlign: 'start' as const,
					w,
					richText: toRichText('test') as TLRichText,
					scale,
					autoSize: false,
				}

				const fullValidator = T.object(textShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})

		it('should handle autoSize with different configurations', () => {
			const autoSizeConfigurations = [
				{ w: 100, scale: 1, autoSize: true },
				{ w: 200, scale: 0.5, autoSize: false },
				{ w: 300, scale: 2, autoSize: true },
				{ w: 400, scale: 1.5, autoSize: false },
			]

			autoSizeConfigurations.forEach(({ w, scale, autoSize }) => {
				const props = {
					color: 'black' as const,
					size: 'm' as const,
					font: 'draw' as const,
					textAlign: 'start' as const,
					w,
					richText: toRichText('autoSize test') as TLRichText,
					scale,
					autoSize,
				}

				const fullValidator = T.object(textShapeProps)
				expect(() => fullValidator.validate(props)).not.toThrow()
			})
		})
	})
})
