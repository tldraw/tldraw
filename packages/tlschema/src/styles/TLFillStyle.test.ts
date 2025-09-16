import { describe, expect, it, test } from 'vitest'
import { DefaultFillStyle, TLDefaultFillStyle } from './TLFillStyle'

describe('TLFillStyle', () => {
	describe('DefaultFillStyle', () => {
		it('should be a StyleProp with correct configuration', () => {
			expect(DefaultFillStyle.id).toBe('tldraw:fill')
			expect(DefaultFillStyle.defaultValue).toBe('none')
		})

		it('should be an EnumStyleProp instance', () => {
			expect(DefaultFillStyle).toHaveProperty('values')
			expect(Array.isArray(DefaultFillStyle.values)).toBe(true)
		})

		it('should have correct enum values', () => {
			expect(DefaultFillStyle.values).toEqual(['none', 'semi', 'solid', 'pattern', 'fill'])
		})

		it('should have values property with all fill styles', () => {
			const expectedValues: TLDefaultFillStyle[] = ['none', 'semi', 'solid', 'pattern', 'fill']
			expect(DefaultFillStyle.values).toEqual(expectedValues)
			expect(DefaultFillStyle.values).toHaveLength(5)
		})

		it('should not contain duplicate values', () => {
			const uniqueValues = new Set(DefaultFillStyle.values)
			expect(uniqueValues.size).toBe(DefaultFillStyle.values.length)
		})

		it('should contain only string values', () => {
			DefaultFillStyle.values.forEach((fillStyle) => {
				expect(typeof fillStyle).toBe('string')
				expect(fillStyle.length).toBeGreaterThan(0)
			})
		})

		it('should contain all expected fill styles', () => {
			const requiredStyles: TLDefaultFillStyle[] = ['none', 'semi', 'solid', 'pattern', 'fill']
			requiredStyles.forEach((style) => {
				expect(DefaultFillStyle.values).toContain(style)
			})
		})

		it('should maintain readonly values array', () => {
			// Values should be immutable
			const originalValues = DefaultFillStyle.values
			expect(DefaultFillStyle.values).toBe(originalValues)
		})

		it('should have proper default value within allowed values', () => {
			expect(DefaultFillStyle.values).toContain(DefaultFillStyle.defaultValue)
		})

		it('should maintain consistent ordering of values', () => {
			// Test that the values are in the expected order
			const expectedOrder: TLDefaultFillStyle[] = ['none', 'semi', 'solid', 'pattern', 'fill']
			expect(DefaultFillStyle.values).toEqual(expectedOrder)
		})

		it('should have unique ID that follows tldraw convention', () => {
			expect(DefaultFillStyle.id).toMatch(/^tldraw:/)
			expect(DefaultFillStyle.id).toBe('tldraw:fill')
		})
	})

	describe('validation', () => {
		it('should validate all default fill style values', () => {
			const validFillStyles: TLDefaultFillStyle[] = ['none', 'semi', 'solid', 'pattern', 'fill']

			validFillStyles.forEach((fillStyle) => {
				expect(() => DefaultFillStyle.validate(fillStyle)).not.toThrow()
				expect(DefaultFillStyle.validate(fillStyle)).toBe(fillStyle)
			})
		})

		it('should validate none style', () => {
			expect(DefaultFillStyle.validate('none')).toBe('none')
		})

		it('should validate semi style', () => {
			expect(DefaultFillStyle.validate('semi')).toBe('semi')
		})

		it('should validate solid style', () => {
			expect(DefaultFillStyle.validate('solid')).toBe('solid')
		})

		it('should validate pattern style', () => {
			expect(DefaultFillStyle.validate('pattern')).toBe('pattern')
		})

		it('should validate fill style', () => {
			expect(DefaultFillStyle.validate('fill')).toBe('fill')
		})

		it('should reject invalid fill style values', () => {
			const invalidFillStyles = [
				'invalid',
				'transparent',
				'empty',
				'color',
				'',
				'NONE',
				'Solid',
				'semi-transparent',
				'gradient',
				'hatch',
				'crosshatch',
				'opaque',
				'hollow',
			]

			invalidFillStyles.forEach((invalidStyle) => {
				expect(() => DefaultFillStyle.validate(invalidStyle)).toThrow()
			})
		})

		it('should reject non-string values', () => {
			const nonStringValues = [
				123,
				null,
				undefined,
				{},
				[],
				true,
				false,
				Symbol('fill'),
				new Date(),
			]

			nonStringValues.forEach((invalidValue) => {
				expect(() => DefaultFillStyle.validate(invalidValue)).toThrow()
			})
		})

		it('should be case-sensitive', () => {
			const caseSensitiveInvalid = [
				'None',
				'NONE',
				'Semi',
				'SEMI',
				'Solid',
				'SOLID',
				'Pattern',
				'PATTERN',
				'Fill',
				'FILL',
			]

			caseSensitiveInvalid.forEach((invalidCase) => {
				expect(() => DefaultFillStyle.validate(invalidCase)).toThrow()
			})
		})

		it('should reject values with extra whitespace', () => {
			const whitespaceVariations = [
				' none',
				'none ',
				' none ',
				'	none',
				'none	',
				'\nnone',
				'none\n',
				' solid ',
				'	pattern	',
			]

			whitespaceVariations.forEach((whitespaceValue) => {
				expect(() => DefaultFillStyle.validate(whitespaceValue)).toThrow()
			})
		})

		it('should reject similar but incorrect values', () => {
			const similarInvalid = [
				'non',
				'nones',
				'semi-transparent',
				'semitransparent',
				'solids',
				'patterns',
				'fills',
				'unfilled',
				'filled',
			]

			similarInvalid.forEach((similar) => {
				expect(() => DefaultFillStyle.validate(similar)).toThrow()
			})
		})
	})

	describe('StyleProp instance methods', () => {
		it('should allow setting default value to any valid fill style', () => {
			const originalDefault = DefaultFillStyle.defaultValue

			DefaultFillStyle.setDefaultValue('solid')
			expect(DefaultFillStyle.defaultValue).toBe('solid')

			DefaultFillStyle.setDefaultValue('pattern')
			expect(DefaultFillStyle.defaultValue).toBe('pattern')

			DefaultFillStyle.setDefaultValue('semi')
			expect(DefaultFillStyle.defaultValue).toBe('semi')

			DefaultFillStyle.setDefaultValue('fill')
			expect(DefaultFillStyle.defaultValue).toBe('fill')

			// Restore original
			DefaultFillStyle.setDefaultValue(originalDefault)
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			const result = DefaultFillStyle.validateUsingKnownGoodVersion('none', 'solid')
			expect(result).toBe('solid')

			expect(() => DefaultFillStyle.validateUsingKnownGoodVersion('none', 'invalid')).toThrow()
		})

		it('should work with validateUsingKnownGoodVersion for all valid values', () => {
			const validStyles: TLDefaultFillStyle[] = ['none', 'semi', 'solid', 'pattern', 'fill']

			validStyles.forEach((prevStyle) => {
				validStyles.forEach((newStyle) => {
					const result = DefaultFillStyle.validateUsingKnownGoodVersion(prevStyle, newStyle)
					expect(result).toBe(newStyle)
				})
			})
		})

		it('should handle validateUsingKnownGoodVersion with invalid new values', () => {
			const invalidValues = ['invalid', 'transparent', '', null, 123]

			invalidValues.forEach((invalidValue) => {
				expect(() => DefaultFillStyle.validateUsingKnownGoodVersion('none', invalidValue)).toThrow()
			})
		})
	})

	describe('type safety and TypeScript integration', () => {
		it('should have proper TypeScript types', () => {
			// Test that TLDefaultFillStyle is properly typed
			const validFill: TLDefaultFillStyle = 'solid'
			expect(DefaultFillStyle.validate(validFill)).toBe('solid')
		})

		it('should work with all valid fill style types', () => {
			const fillStyles: TLDefaultFillStyle[] = ['none', 'semi', 'solid', 'pattern', 'fill']

			fillStyles.forEach((style) => {
				const fillValue: TLDefaultFillStyle = style
				expect(DefaultFillStyle.validate(fillValue)).toBe(style)
			})
		})

		it('should properly export TypeOf type', () => {
			// This tests that TLDefaultFillStyle is correctly derived from the StyleProp
			const fillValue: TLDefaultFillStyle = 'pattern'
			expect(typeof fillValue).toBe('string')
			expect(DefaultFillStyle.values).toContain(fillValue)
		})
	})

	describe('semantic meaning and usage', () => {
		it('should represent shape interior styling options', () => {
			// Test semantic understanding of each fill type
			expect(DefaultFillStyle.values).toContain('none') // No fill, transparent
			expect(DefaultFillStyle.values).toContain('semi') // Semi-transparent fill
			expect(DefaultFillStyle.values).toContain('solid') // Solid fill
			expect(DefaultFillStyle.values).toContain('pattern') // Crosshatch pattern
			expect(DefaultFillStyle.values).toContain('fill') // Alternative solid fill
		})

		it('should have none as default for transparent interior', () => {
			expect(DefaultFillStyle.defaultValue).toBe('none')
		})

		it('should provide multiple solid fill variants', () => {
			// Both 'solid' and 'fill' represent solid fills
			expect(DefaultFillStyle.values).toContain('solid')
			expect(DefaultFillStyle.values).toContain('fill')
		})

		it('should support semi-transparent styling', () => {
			expect(DefaultFillStyle.values).toContain('semi')
		})

		it('should support pattern-based fills', () => {
			expect(DefaultFillStyle.values).toContain('pattern')
		})
	})

	describe('integration with shape system', () => {
		it('should work in shape props context', () => {
			// Simulate how it would be used in a shape definition
			interface MockShapeProps {
				fill: TLDefaultFillStyle
				color: string
			}

			const shapeProps: MockShapeProps = {
				fill: 'solid',
				color: 'red',
			}

			expect(DefaultFillStyle.validate(shapeProps.fill)).toBe('solid')
		})

		it('should support all fill transitions', () => {
			const transitions: Array<[TLDefaultFillStyle, TLDefaultFillStyle]> = [
				['none', 'solid'],
				['solid', 'semi'],
				['semi', 'pattern'],
				['pattern', 'fill'],
				['fill', 'none'],
			]

			transitions.forEach(([from, to]) => {
				expect(DefaultFillStyle.validate(from)).toBe(from)
				expect(DefaultFillStyle.validate(to)).toBe(to)
			})
		})

		it('should work with shape creation patterns', () => {
			// Simulate creating shapes with different fill styles
			const createShape = (fill: TLDefaultFillStyle) => ({
				id: 'test-shape',
				props: { fill },
			})

			const shapes = DefaultFillStyle.values.map(createShape)

			shapes.forEach((shape) => {
				expect(DefaultFillStyle.validate(shape.props.fill)).toBe(shape.props.fill)
			})
		})
	})

	describe('error handling and edge cases', () => {
		it('should handle empty and whitespace-only strings', () => {
			const emptyValues = ['', ' ', '  ', '\t', '\n', '\r\n']

			emptyValues.forEach((empty) => {
				expect(() => DefaultFillStyle.validate(empty)).toThrow()
			})
		})

		it('should handle very long strings', () => {
			const longString = 'a'.repeat(1000)
			expect(() => DefaultFillStyle.validate(longString)).toThrow()
		})

		it('should handle special characters', () => {
			const specialChars = ['none-', 'solid+', 'semi!', 'pattern@', 'fill#', 'none.fill']

			specialChars.forEach((special) => {
				expect(() => DefaultFillStyle.validate(special)).toThrow()
			})
		})

		it('should handle numeric-like strings', () => {
			const numericStrings = ['0', '1', '2', '3', '4', '5']

			numericStrings.forEach((numeric) => {
				expect(() => DefaultFillStyle.validate(numeric)).toThrow()
			})
		})

		it('should handle Unicode characters', () => {
			const unicodeStrings = ['nönë', 'sölid', 'pättërn', '塗りつぶし', '📍']

			unicodeStrings.forEach((unicode) => {
				expect(() => DefaultFillStyle.validate(unicode)).toThrow()
			})
		})

		it('should maintain validation consistency', () => {
			// Test that validation is consistent across multiple calls
			const testValue = 'solid'

			for (let i = 0; i < 100; i++) {
				expect(DefaultFillStyle.validate(testValue)).toBe(testValue)
			}
		})
	})

	describe('performance considerations', () => {
		it('should validate fill styles efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				DefaultFillStyle.values.forEach((fillStyle) => {
					DefaultFillStyle.validate(fillStyle)
				})
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(100) // Should be fast
		})

		it('should handle repeated validation calls efficiently', () => {
			const testValue = 'solid'
			const start = performance.now()

			for (let i = 0; i < 10000; i++) {
				DefaultFillStyle.validate(testValue)
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(100) // Should validate efficiently
		})

		it('should handle validateUsingKnownGoodVersion efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				DefaultFillStyle.values.forEach((style) => {
					DefaultFillStyle.validateUsingKnownGoodVersion('none', style)
				})
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(100) // Should handle optimization efficiently
		})
	})

	describe('immutability and consistency', () => {
		it('should maintain immutable values array', () => {
			const originalValues = [...DefaultFillStyle.values]

			// Values should remain the same after any operations
			DefaultFillStyle.validate('solid')
			DefaultFillStyle.setDefaultValue('pattern')
			DefaultFillStyle.setDefaultValue('none') // Reset

			expect(DefaultFillStyle.values).toEqual(originalValues)
		})

		it('should preserve reference equality for values', () => {
			const valuesRef1 = DefaultFillStyle.values
			const valuesRef2 = DefaultFillStyle.values

			expect(valuesRef1).toBe(valuesRef2) // Same reference
		})

		it('should maintain consistent ID', () => {
			const originalId = DefaultFillStyle.id

			// ID should never change
			DefaultFillStyle.validate('solid')
			DefaultFillStyle.setDefaultValue('pattern')

			expect(DefaultFillStyle.id).toBe(originalId)
		})

		it('should handle concurrent access patterns', () => {
			// Simulate concurrent validation calls
			const promises = Array.from({ length: 100 }, (_, i) =>
				Promise.resolve(DefaultFillStyle.validate(DefaultFillStyle.values[i % 5]))
			)

			return Promise.all(promises).then((results) => {
				results.forEach((result, i) => {
					expect(result).toBe(DefaultFillStyle.values[i % 5])
				})
			})
		})
	})

	test('should work in real-world tldraw shape usage patterns', () => {
		// Test pattern similar to how it's used in actual tldraw shapes
		interface GeoShapeProps {
			fill: TLDefaultFillStyle
			color: string
			size: string
		}

		const createGeoShape = (fill: TLDefaultFillStyle): { props: GeoShapeProps } => ({
			props: {
				fill,
				color: 'black',
				size: 'm',
			},
		})

		// Test creating shapes with all fill types
		const shapes = DefaultFillStyle.values.map(createGeoShape)

		shapes.forEach((shape, index) => {
			const expectedFill = DefaultFillStyle.values[index]
			expect(DefaultFillStyle.validate(shape.props.fill)).toBe(expectedFill)
		})

		// Test updating shape fill
		const shape = createGeoShape('none')
		expect(DefaultFillStyle.validate(shape.props.fill)).toBe('none')

		shape.props.fill = 'solid'
		expect(DefaultFillStyle.validate(shape.props.fill)).toBe('solid')
	})

	test('should maintain backwards compatibility', () => {
		// Ensure we start with the original default value
		DefaultFillStyle.setDefaultValue('none')

		// Test that the current values maintain expected backwards compatibility
		const legacyExpectedValues: TLDefaultFillStyle[] = ['none', 'semi', 'solid', 'pattern', 'fill']

		expect(DefaultFillStyle.values).toEqual(legacyExpectedValues)
		expect(DefaultFillStyle.defaultValue).toBe('none')
		expect(DefaultFillStyle.id).toBe('tldraw:fill')

		// All legacy values should still validate
		legacyExpectedValues.forEach((legacyValue) => {
			expect(DefaultFillStyle.validate(legacyValue)).toBe(legacyValue)
		})
	})
})
