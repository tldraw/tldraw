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
})
