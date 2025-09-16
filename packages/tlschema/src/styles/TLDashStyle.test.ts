import { describe, expect, it, test } from 'vitest'
import { DefaultDashStyle, TLDefaultDashStyle } from './TLDashStyle'

describe('TLDashStyle', () => {
	describe('DefaultDashStyle', () => {
		it('should be a StyleProp with correct configuration', () => {
			expect(DefaultDashStyle.id).toBe('tldraw:dash')
			expect(DefaultDashStyle.defaultValue).toBe('draw')
		})

		it('should be an EnumStyleProp instance', () => {
			expect(DefaultDashStyle).toHaveProperty('values')
			expect(Array.isArray(DefaultDashStyle.values)).toBe(true)
		})

		it('should have correct enum values', () => {
			expect(DefaultDashStyle.values).toEqual(['draw', 'solid', 'dashed', 'dotted'])
		})

		it('should have values property with all dash styles', () => {
			const expectedValues: TLDefaultDashStyle[] = ['draw', 'solid', 'dashed', 'dotted']
			expect(DefaultDashStyle.values).toEqual(expectedValues)
			expect(DefaultDashStyle.values).toHaveLength(4)
		})

		it('should not contain duplicate values', () => {
			const uniqueValues = new Set(DefaultDashStyle.values)
			expect(uniqueValues.size).toBe(DefaultDashStyle.values.length)
		})

		it('should contain only string values', () => {
			DefaultDashStyle.values.forEach((dashStyle) => {
				expect(typeof dashStyle).toBe('string')
				expect(dashStyle.length).toBeGreaterThan(0)
			})
		})

		it('should contain all expected dash styles', () => {
			const requiredStyles: TLDefaultDashStyle[] = ['draw', 'solid', 'dashed', 'dotted']
			requiredStyles.forEach((style) => {
				expect(DefaultDashStyle.values).toContain(style)
			})
		})

		it('should maintain readonly values array', () => {
			// Values should be immutable
			const originalValues = DefaultDashStyle.values
			expect(DefaultDashStyle.values).toBe(originalValues)
		})
	})

	describe('validation', () => {
		it('should validate all default dash style values', () => {
			const validDashStyles: TLDefaultDashStyle[] = ['draw', 'solid', 'dashed', 'dotted']

			validDashStyles.forEach((dashStyle) => {
				expect(() => DefaultDashStyle.validate(dashStyle)).not.toThrow()
				expect(DefaultDashStyle.validate(dashStyle)).toBe(dashStyle)
			})
		})

		it('should validate draw style', () => {
			expect(DefaultDashStyle.validate('draw')).toBe('draw')
		})

		it('should validate solid style', () => {
			expect(DefaultDashStyle.validate('solid')).toBe('solid')
		})

		it('should validate dashed style', () => {
			expect(DefaultDashStyle.validate('dashed')).toBe('dashed')
		})

		it('should validate dotted style', () => {
			expect(DefaultDashStyle.validate('dotted')).toBe('dotted')
		})

		it('should reject invalid dash style values', () => {
			const invalidDashStyles = [
				'invalid',
				'line',
				'stroke',
				'pattern',
				'',
				'SOLID',
				'Draw',
				'dashed-line',
				'double',
				'wavy',
			]

			invalidDashStyles.forEach((invalidStyle) => {
				expect(() => DefaultDashStyle.validate(invalidStyle)).toThrow()
			})
		})

		it('should reject non-string values', () => {
			const nonStringValues = [
				123,
				null,
				undefined,
				true,
				false,
				{},
				[],
				{ type: 'solid' },
				['solid'],
			]

			nonStringValues.forEach((value) => {
				expect(() => DefaultDashStyle.validate(value)).toThrow()
			})
		})

		it('should be case sensitive', () => {
			const caseMismatchStyles = ['Draw', 'SOLID', 'Dashed', 'DOTTED', 'Draw', 'sOlId']

			caseMismatchStyles.forEach((style) => {
				expect(() => DefaultDashStyle.validate(style)).toThrow()
			})
		})

		it('should reject similar but invalid values', () => {
			const similarValues = [
				'draws', // extra 's'
				'solids', // extra 's'
				'dash', // missing 'ed'
				'dot', // missing 'ted'
				'drawing', // different word
				'solid-line', // with suffix
				' solid', // with space
				'solid ', // with trailing space
			]

			similarValues.forEach((value) => {
				expect(() => DefaultDashStyle.validate(value)).toThrow()
			})
		})
	})

	describe('default value management', () => {
		it('should have correct initial default value', () => {
			expect(DefaultDashStyle.defaultValue).toBe('draw')
		})

		it('should allow setting default value to any valid dash style', () => {
			const originalDefault = DefaultDashStyle.defaultValue

			// Test setting each valid value
			const validStyles: TLDefaultDashStyle[] = ['solid', 'dashed', 'dotted', 'draw']

			validStyles.forEach((style) => {
				DefaultDashStyle.setDefaultValue(style)
				expect(DefaultDashStyle.defaultValue).toBe(style)
			})

			// Restore original default
			DefaultDashStyle.setDefaultValue(originalDefault)
		})

		it('should persist default value changes', () => {
			const originalDefault = DefaultDashStyle.defaultValue

			DefaultDashStyle.setDefaultValue('solid')
			expect(DefaultDashStyle.defaultValue).toBe('solid')

			DefaultDashStyle.setDefaultValue('dashed')
			expect(DefaultDashStyle.defaultValue).toBe('dashed')

			// Restore original
			DefaultDashStyle.setDefaultValue(originalDefault)
		})

		it('should allow setting same default value multiple times', () => {
			const originalDefault = DefaultDashStyle.defaultValue

			DefaultDashStyle.setDefaultValue('dotted')
			expect(DefaultDashStyle.defaultValue).toBe('dotted')

			DefaultDashStyle.setDefaultValue('dotted')
			expect(DefaultDashStyle.defaultValue).toBe('dotted')

			// Restore original
			DefaultDashStyle.setDefaultValue(originalDefault)
		})
	})

	describe('validateUsingKnownGoodVersion', () => {
		it('should work with all valid dash styles', () => {
			const validStyles: TLDefaultDashStyle[] = ['draw', 'solid', 'dashed', 'dotted']

			validStyles.forEach((style) => {
				const result = DefaultDashStyle.validateUsingKnownGoodVersion('draw', style)
				expect(result).toBe(style)
			})
		})

		it('should work with different known good values', () => {
			const knownGoodValues: TLDefaultDashStyle[] = ['draw', 'solid', 'dashed', 'dotted']

			knownGoodValues.forEach((knownGood) => {
				const result = DefaultDashStyle.validateUsingKnownGoodVersion(knownGood, 'solid')
				expect(result).toBe('solid')
			})
		})

		it('should throw for invalid new values', () => {
			const invalidValues = ['invalid', 'stroke', '', null, 123, true]

			invalidValues.forEach((invalidValue) => {
				expect(() => {
					DefaultDashStyle.validateUsingKnownGoodVersion('draw', invalidValue)
				}).toThrow()
			})
		})

		it('should handle all combinations of valid values', () => {
			const allStyles: TLDefaultDashStyle[] = ['draw', 'solid', 'dashed', 'dotted']

			allStyles.forEach((prevValue) => {
				allStyles.forEach((newValue) => {
					const result = DefaultDashStyle.validateUsingKnownGoodVersion(prevValue, newValue)
					expect(result).toBe(newValue)
				})
			})
		})
	})

	describe('TypeScript type integration', () => {
		it('should work with TLDefaultDashStyle type', () => {
			// These are compile-time type checks
			const drawStyle: TLDefaultDashStyle = 'draw'
			const solidStyle: TLDefaultDashStyle = 'solid'
			const dashedStyle: TLDefaultDashStyle = 'dashed'
			const dottedStyle: TLDefaultDashStyle = 'dotted'

			expect(typeof drawStyle).toBe('string')
			expect(typeof solidStyle).toBe('string')
			expect(typeof dashedStyle).toBe('string')
			expect(typeof dottedStyle).toBe('string')

			// Should validate correctly
			expect(DefaultDashStyle.validate(drawStyle)).toBe('draw')
			expect(DefaultDashStyle.validate(solidStyle)).toBe('solid')
			expect(DefaultDashStyle.validate(dashedStyle)).toBe('dashed')
			expect(DefaultDashStyle.validate(dottedStyle)).toBe('dotted')
		})

		it('should work in function parameters', () => {
			function setDashStyle(dash: TLDefaultDashStyle): TLDefaultDashStyle {
				return DefaultDashStyle.validate(dash)
			}

			expect(setDashStyle('draw')).toBe('draw')
			expect(setDashStyle('solid')).toBe('solid')
			expect(setDashStyle('dashed')).toBe('dashed')
			expect(setDashStyle('dotted')).toBe('dotted')
		})

		it('should work in object properties', () => {
			interface ShapeProps {
				dash: TLDefaultDashStyle
				other: string
			}

			const shapeProps: ShapeProps = {
				dash: 'solid',
				other: 'test',
			}

			expect(DefaultDashStyle.validate(shapeProps.dash)).toBe('solid')
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty string validation', () => {
			expect(() => DefaultDashStyle.validate('')).toThrow()
		})

		it('should handle whitespace-only strings', () => {
			const whitespaceValues = [' ', '\t', '\n', '\r', '  ', '\t\n\r']

			whitespaceValues.forEach((value) => {
				expect(() => DefaultDashStyle.validate(value)).toThrow()
			})
		})

		it('should handle strings with extra whitespace', () => {
			const whitespaceValues = [' draw', 'draw ', ' draw ', 'draw\n', '\tdraw']

			whitespaceValues.forEach((value) => {
				expect(() => DefaultDashStyle.validate(value)).toThrow()
			})
		})

		it('should handle numeric strings', () => {
			const numericStrings = ['1', '2', '0', '-1', '3.14', 'NaN', 'Infinity']

			numericStrings.forEach((value) => {
				expect(() => DefaultDashStyle.validate(value)).toThrow()
			})
		})

		it('should handle special characters', () => {
			const specialChars = ['draw!', 'solid?', 'dashed#', 'dotted@', 'draw-line', 'solid_line']

			specialChars.forEach((value) => {
				expect(() => DefaultDashStyle.validate(value)).toThrow()
			})
		})

		it('should handle unicode characters', () => {
			const unicodeValues = ['drāw', 'sōlid', 'dashëd', 'døtted', '绘制', 'сплошной']

			unicodeValues.forEach((value) => {
				expect(() => DefaultDashStyle.validate(value)).toThrow()
			})
		})
	})

	describe('real-world usage patterns', () => {
		it('should work like other tldraw default styles', () => {
			// Simulate how dash style would be used in shape props
			expect(DefaultDashStyle.validate('solid')).toBe('solid')
			expect(DefaultDashStyle.id).toBe('tldraw:dash')

			// Simulate setting a new default
			const originalDefault = DefaultDashStyle.defaultValue
			DefaultDashStyle.setDefaultValue('dashed')
			expect(DefaultDashStyle.defaultValue).toBe('dashed')

			// Restore
			DefaultDashStyle.setDefaultValue(originalDefault)
		})

		it('should work in shape props patterns', () => {
			// Simulate how dash style is used in shape definitions
			interface GeoShapeProps {
				dash: typeof DefaultDashStyle
				color: string
			}

			const mockShapeProps: Partial<GeoShapeProps> = {
				dash: DefaultDashStyle,
			}

			expect(mockShapeProps.dash?.validate('dashed')).toBe('dashed')
			expect(mockShapeProps.dash?.defaultValue).toBe('draw')
		})

		it('should support typical UI patterns', () => {
			// Simulate dropdown/button selection patterns
			const dashOptions = DefaultDashStyle.values

			expect(dashOptions).toContain('draw')
			expect(dashOptions).toContain('solid')
			expect(dashOptions).toContain('dashed')
			expect(dashOptions).toContain('dotted')

			// Simulate user selection
			const userSelection = 'solid'
			expect(DefaultDashStyle.validate(userSelection)).toBe(userSelection)
		})

		it('should handle style application scenarios', () => {
			// Simulate applying dash style to multiple shapes
			const shapeDashStyles: TLDefaultDashStyle[] = ['solid', 'dashed', 'dotted', 'draw']

			shapeDashStyles.forEach((dashStyle) => {
				expect(DefaultDashStyle.validate(dashStyle)).toBe(dashStyle)
			})
		})

		test('should work with style persistence patterns', () => {
			const originalDefault = DefaultDashStyle.defaultValue

			// Simulate user selecting different dash styles
			DefaultDashStyle.setDefaultValue('solid')
			expect(DefaultDashStyle.defaultValue).toBe('solid')

			DefaultDashStyle.setDefaultValue('dashed')
			expect(DefaultDashStyle.defaultValue).toBe('dashed')

			// New shapes would use this default
			expect(DefaultDashStyle.defaultValue).toBe('dashed')

			// Restore
			DefaultDashStyle.setDefaultValue(originalDefault)
		})
	})

	describe('integration with validation system', () => {
		it('should work with complex validation scenarios', () => {
			// Test nested validation patterns
			interface ShapeWithMultipleStyles {
				dash: TLDefaultDashStyle
				fill: string
				size: number
			}

			const mockShape: ShapeWithMultipleStyles = {
				dash: 'dashed',
				fill: 'solid',
				size: 16,
			}

			expect(DefaultDashStyle.validate(mockShape.dash)).toBe('dashed')
		})

		it('should maintain consistent behavior with other style props', () => {
			// Ensure consistent ID format
			expect(DefaultDashStyle.id).toMatch(/^tldraw:/)
			expect(DefaultDashStyle.id).toBe('tldraw:dash')

			// Ensure consistent default value type
			expect(typeof DefaultDashStyle.defaultValue).toBe('string')
			expect(DefaultDashStyle.values).toContain(DefaultDashStyle.defaultValue)
		})

		it('should handle validation in batch operations', () => {
			const batchValues: TLDefaultDashStyle[] = ['draw', 'solid', 'dashed', 'dotted']

			const validatedValues = batchValues.map((value) => DefaultDashStyle.validate(value))

			expect(validatedValues).toEqual(batchValues)
		})
	})

	describe('performance considerations', () => {
		it('should validate dash styles efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				DefaultDashStyle.values.forEach((dashStyle) => {
					DefaultDashStyle.validate(dashStyle)
				})
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(100) // Should be fast
		})

		it('should handle repeated validation efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 10000; i++) {
				DefaultDashStyle.validate('solid')
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(50) // Should be very fast
		})

		it('should handle validateUsingKnownGoodVersion efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 5000; i++) {
				DefaultDashStyle.validateUsingKnownGoodVersion('draw', 'solid')
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(50) // Should be optimized
		})

		test('should handle large batch operations efficiently', () => {
			const largeBatch = Array.from(
				{ length: 1000 },
				(_, i) => DefaultDashStyle.values[i % DefaultDashStyle.values.length]
			)

			const start = performance.now()
			largeBatch.forEach((value) => {
				DefaultDashStyle.validate(value)
			})
			const end = performance.now()

			expect(end - start).toBeLessThan(100) // Should handle large batches efficiently
		})
	})

	describe('immutability and consistency', () => {
		it('should maintain immutable values array', () => {
			const originalValues = DefaultDashStyle.values
			const valuesCopy = [...DefaultDashStyle.values]

			// Values should be the same reference (readonly)
			expect(DefaultDashStyle.values).toBe(originalValues)
			expect(DefaultDashStyle.values).toEqual(valuesCopy)
		})

		it('should maintain consistent ID', () => {
			const originalId = DefaultDashStyle.id

			// ID should never change
			expect(DefaultDashStyle.id).toBe(originalId)
			expect(DefaultDashStyle.id).toBe('tldraw:dash')
		})

		it('should handle concurrent validation correctly', () => {
			// Simulate concurrent validation calls
			const promises = Array.from({ length: 100 }, (_, i) =>
				Promise.resolve(DefaultDashStyle.validate(DefaultDashStyle.values[i % 4]))
			)

			return Promise.all(promises).then((results) => {
				results.forEach((result, i) => {
					expect(result).toBe(DefaultDashStyle.values[i % 4])
				})
			})
		})

		it('should maintain consistency across multiple instances', () => {
			// Even though there should only be one instance, test consistency
			expect(DefaultDashStyle.id).toBe('tldraw:dash')
			expect(DefaultDashStyle.values).toHaveLength(4)
			expect(DefaultDashStyle.values).toContain('draw')
		})
	})
})
