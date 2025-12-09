import { describe, expect, it } from 'vitest'
import { getTestMigration } from '../__tests__/migrationTestUtils'
import { toRichText } from '../misc/TLRichText'
import { GeoShapeGeoStyle, geoShapeProps, geoShapeVersions } from './TLGeoShape'

describe('TLGeoShape', () => {
	describe('GeoShapeGeoStyle', () => {
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
			})
		})

		it('should reject invalid geometric shape types', () => {
			const invalidGeoTypes = ['square', 'circle', 'invalid-shape', null, undefined]

			invalidGeoTypes.forEach((geoType) => {
				expect(() => GeoShapeGeoStyle.validate(geoType)).toThrow()
			})
		})
	})

	describe('geoShapeProps validation schema', () => {
		it('should validate numeric constraints', () => {
			// Test nonZeroNumber validation for w, h, scale
			expect(() => geoShapeProps.w.validate(100)).not.toThrow()
			expect(() => geoShapeProps.h.validate(50)).not.toThrow()
			expect(() => geoShapeProps.scale.validate(1.5)).not.toThrow()

			expect(() => geoShapeProps.w.validate(0)).toThrow()
			expect(() => geoShapeProps.h.validate(0)).toThrow()
			expect(() => geoShapeProps.scale.validate(0)).toThrow()

			// Test positiveNumber validation for growY
			expect(() => geoShapeProps.growY.validate(0)).not.toThrow()
			expect(() => geoShapeProps.growY.validate(10)).not.toThrow()
			expect(() => geoShapeProps.growY.validate(-1)).toThrow()
		})

		it('should validate rich text property', () => {
			expect(() => geoShapeProps.richText.validate(toRichText('test'))).not.toThrow()
			expect(() => geoShapeProps.richText.validate('plain string')).toThrow()
		})
	})

	describe('geoShapeMigrations - AddUrlProp migration', () => {
		const { up } = getTestMigration(geoShapeVersions.AddUrlProp)

		it('should add url property with empty string default', () => {
			const oldRecord = {
				props: {
					geo: 'rectangle',
					w: 100,
					h: 80,
				},
			}

			const result = up(oldRecord)
			expect(result.props.url).toBe('')
		})
	})

	describe('geoShapeMigrations - AddLabelColor migration', () => {
		const { up } = getTestMigration(geoShapeVersions.AddLabelColor)

		it('should add labelColor property with default value "black"', () => {
			const oldRecord = {
				props: {
					geo: 'triangle',
					color: 'blue',
				},
			}

			const result = up(oldRecord)
			expect(result.props.labelColor).toBe('black')
		})
	})

	describe('geoShapeMigrations - RemoveJustify migration', () => {
		const { up } = getTestMigration(geoShapeVersions.RemoveJustify)

		it('should convert justify alignment to start', () => {
			const oldRecord = {
				props: {
					align: 'justify',
				},
			}

			const result = up(oldRecord)
			expect(result.props.align).toBe('start')
		})

		it('should preserve non-justify alignments', () => {
			const oldRecord = {
				props: {
					align: 'middle',
				},
			}

			const result = up(oldRecord)
			expect(result.props.align).toBe('middle')
		})
	})

	describe('geoShapeMigrations - AddVerticalAlign migration', () => {
		const { up } = getTestMigration(geoShapeVersions.AddVerticalAlign)

		it('should add verticalAlign property with default value "middle"', () => {
			const oldRecord = {
				props: {
					geo: 'rectangle',
				},
			}

			const result = up(oldRecord)
			expect(result.props.verticalAlign).toBe('middle')
		})
	})

	describe('geoShapeMigrations - MigrateLegacyAlign migration', () => {
		const { up } = getTestMigration(geoShapeVersions.MigrateLegacyAlign)

		it('should convert alignment values to legacy versions', () => {
			const testCases = [
				{ input: 'start', expected: 'start-legacy' },
				{ input: 'end', expected: 'end-legacy' },
				{ input: 'middle', expected: 'middle-legacy' },
				{ input: 'unknown-align', expected: 'middle-legacy' },
			]

			testCases.forEach(({ input, expected }) => {
				const oldRecord = {
					props: {
						align: input,
					},
				}

				const result = up(oldRecord)
				expect(result.props.align).toBe(expected)
			})
		})
	})

	describe('geoShapeMigrations - MakeUrlsValid migration', () => {
		const { up } = getTestMigration(geoShapeVersions.MakeUrlsValid)

		it('should clear invalid URLs', () => {
			const oldRecord = {
				props: {
					url: 'invalid-url',
				},
			}

			const result = up(oldRecord)
			expect(result.props.url).toBe('')
		})

		it('should preserve valid URLs', () => {
			const oldRecord = {
				props: {
					url: 'https://example.com',
				},
			}

			const result = up(oldRecord)
			expect(result.props.url).toBe('https://example.com')
		})
	})

	describe('geoShapeMigrations - AddScale migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.AddScale)

		it('should add scale property with default value 1', () => {
			const oldRecord = {
				props: {
					geo: 'rectangle',
				},
			}

			const result = up(oldRecord)
			expect(result.props.scale).toBe(1)
		})

		it('should remove scale property on down migration', () => {
			const newRecord = {
				props: {
					geo: 'rectangle',
					scale: 1.5,
				},
			}

			const result = down(newRecord)
			expect(result.props.scale).toBeUndefined()
		})
	})

	describe('geoShapeMigrations - AddRichText migration', () => {
		const { up } = getTestMigration(geoShapeVersions.AddRichText)

		it('should convert text property to richText', () => {
			const oldRecord = {
				props: {
					text: 'Simple text content',
				},
			}

			const result = up(oldRecord)
			expect(result.props.richText).toBeDefined()
			expect(result.props.text).toBeUndefined()
		})

		it('should handle empty text', () => {
			const oldRecord = {
				props: {
					text: '',
				},
			}

			const result = up(oldRecord)
			expect(result.props.richText).toBeDefined()
			expect(result.props.text).toBeUndefined()
		})
	})

	describe('geoShapeMigrations - AddRichTextAttrs migration', () => {
		const { up, down } = getTestMigration(geoShapeVersions.AddRichTextAttrs)

		describe('AddRichTextAttrs up migration', () => {
			it('should handle richText without attrs', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						w: 100,
						h: 100,
						richText: toRichText('Test label'),
						scale: 1,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.geo).toBe('rectangle') // Preserve other props
			})

			it('should handle richText with attrs already present', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'ellipse',
						w: 200,
						h: 150,
						richText: { ...toRichText('Test'), attrs: { someAttr: 'value' } },
						scale: 1,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect((result.props.richText as any).attrs).toEqual({ someAttr: 'value' })
			})

			it('should preserve all other properties during migration', () => {
				const oldRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'triangle',
						dash: 'dashed',
						color: 'red',
						fill: 'solid',
						w: 300,
						h: 200,
						richText: toRichText('Migration test'),
						scale: 1.5,
					},
				}

				const result = up(oldRecord)
				expect(result.props.richText).toBeDefined()
				expect(result.props.geo).toBe('triangle')
				expect(result.props.dash).toBe('dashed')
				expect(result.props.color).toBe('red')
				expect(result.props.fill).toBe('solid')
				expect(result.props.w).toBe(300)
				expect(result.props.h).toBe(200)
				expect(result.props.scale).toBe(1.5)
			})
		})

		describe('AddRichTextAttrs down migration', () => {
			it('should remove attrs from richText', () => {
				const newRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'rectangle',
						w: 100,
						h: 100,
						richText: { ...toRichText('Test label'), attrs: { someAttr: 'value' } },
						scale: 1,
					},
				}

				const result = down(newRecord)
				expect(result.props.richText).toBeDefined()
				expect((result.props.richText as any).attrs).toBeUndefined()
				expect(result.props.geo).toBe('rectangle') // Preserve other props
			})

			it('should handle richText without attrs gracefully', () => {
				const newRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'ellipse',
						w: 200,
						h: 150,
						richText: toRichText('Test label'),
						scale: 1,
					},
				}

				const result = down(newRecord)
				expect(result.props.richText).toBeDefined()
				expect((result.props.richText as any).attrs).toBeUndefined()
			})

			it('should preserve all other properties during down migration', () => {
				const newRecord = {
					id: 'shape:geo1',
					props: {
						geo: 'star',
						dash: 'dotted',
						color: 'blue',
						fill: 'pattern',
						size: 'l',
						font: 'sans',
						w: 400,
						h: 300,
						richText: { ...toRichText('Rich text with attrs'), attrs: { test: true } },
						scale: 2,
					},
				}

				const result = down(newRecord)
				expect(result.props.richText).toBeDefined()
				expect((result.props.richText as any).attrs).toBeUndefined()
				expect(result.props.geo).toBe('star')
				expect(result.props.dash).toBe('dotted')
				expect(result.props.color).toBe('blue')
				expect(result.props.fill).toBe('pattern')
				expect(result.props.size).toBe('l')
				expect(result.props.font).toBe('sans')
				expect(result.props.w).toBe(400)
				expect(result.props.h).toBe(300)
				expect(result.props.scale).toBe(2)
			})
		})
	})
})
