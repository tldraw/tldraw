import { T } from '@tldraw/validate'
import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { TLRichText, toRichText } from '../misc/TLRichText'
import { DefaultColorStyle } from '../styles/TLColorStyle'
import { DefaultFontStyle } from '../styles/TLFontStyle'
import { DefaultSizeStyle } from '../styles/TLSizeStyle'
import { DefaultTextAlignStyle } from '../styles/TLTextAlignStyle'
import { textShapeMigrations, textShapeProps, textShapeVersions } from './TLTextShape'

describe('TLTextShape', () => {
	describe('textShapeProps validation schema', () => {
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
	})

	describe('textShapeMigrations', () => {
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
})
