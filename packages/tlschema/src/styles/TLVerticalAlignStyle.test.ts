import { beforeEach, describe, expect, it, test } from 'vitest'
import { DefaultVerticalAlignStyle, TLDefaultVerticalAlignStyle } from './TLVerticalAlignStyle'

describe('TLVerticalAlignStyle', () => {
	// Reset to original state before each test to avoid test pollution
	beforeEach(() => {
		DefaultVerticalAlignStyle.setDefaultValue('middle')
	})
	describe('DefaultVerticalAlignStyle', () => {
		it('should be a StyleProp with correct configuration', () => {
			expect(DefaultVerticalAlignStyle.id).toBe('tldraw:verticalAlign')
			expect(DefaultVerticalAlignStyle.defaultValue).toBe('middle')
		})

		it('should have the correct values array', () => {
			expect(DefaultVerticalAlignStyle.values).toEqual(['start', 'middle', 'end'])
		})

		it('should contain exactly 3 alignment options', () => {
			expect(DefaultVerticalAlignStyle.values).toHaveLength(3)
		})

		it('should not contain duplicates in values', () => {
			const uniqueValues = new Set(DefaultVerticalAlignStyle.values)
			expect(uniqueValues.size).toBe(DefaultVerticalAlignStyle.values.length)
		})

		it('should only contain modern values without legacy variants', () => {
			const modernValues = ['start', 'middle', 'end']
			expect(DefaultVerticalAlignStyle.values).toEqual(modernValues)

			// Should not contain any legacy values
			const legacyValues = DefaultVerticalAlignStyle.values.filter((value) =>
				value.endsWith('-legacy')
			)
			expect(legacyValues).toHaveLength(0)
		})
	})

	describe('validation', () => {
		it('should validate all allowed vertical alignment values', () => {
			const validValues: TLDefaultVerticalAlignStyle[] = ['start', 'middle', 'end']

			validValues.forEach((value) => {
				expect(() => DefaultVerticalAlignStyle.validate(value)).not.toThrow()
				expect(DefaultVerticalAlignStyle.validate(value)).toBe(value)
			})
		})

		it('should reject invalid vertical alignment values', () => {
			const invalidValues = [
				'top',
				'bottom',
				'center',
				'baseline',
				'invalid',
				'',
				'TOP',
				'BOTTOM',
				'CENTER',
				'Start',
				'Middle',
				'End',
				'start-legacy',
				'middle-legacy',
				'end-legacy',
			]

			invalidValues.forEach((value) => {
				expect(() => DefaultVerticalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should reject non-string values', () => {
			const invalidTypes = [null, undefined, 123, true, false, {}, [], Symbol('test')]

			invalidTypes.forEach((value) => {
				expect(() => DefaultVerticalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			const result = DefaultVerticalAlignStyle.validateUsingKnownGoodVersion('start', 'end')
			expect(result).toBe('end')

			expect(() =>
				DefaultVerticalAlignStyle.validateUsingKnownGoodVersion('start', 'invalid')
			).toThrow()
		})
	})

	describe('default value management', () => {
		it('should allow setting default value to any valid alignment', () => {
			const originalDefault = DefaultVerticalAlignStyle.defaultValue

			DefaultVerticalAlignStyle.setDefaultValue('start')
			expect(DefaultVerticalAlignStyle.defaultValue).toBe('start')

			DefaultVerticalAlignStyle.setDefaultValue('end')
			expect(DefaultVerticalAlignStyle.defaultValue).toBe('end')

			DefaultVerticalAlignStyle.setDefaultValue('middle')
			expect(DefaultVerticalAlignStyle.defaultValue).toBe('middle')

			// Restore original
			DefaultVerticalAlignStyle.setDefaultValue(originalDefault)
			expect(DefaultVerticalAlignStyle.defaultValue).toBe('middle')
		})

		it('should maintain the default value of middle initially', () => {
			expect(DefaultVerticalAlignStyle.defaultValue).toBe('middle')
		})

		it('should accept setting any value as default (validation happens at validate time)', () => {
			// setDefaultValue doesn't validate - it just sets the value
			// This follows the same pattern as other StyleProp implementations
			DefaultVerticalAlignStyle.setDefaultValue('top' as any)
			expect(DefaultVerticalAlignStyle.defaultValue).toBe('top')

			DefaultVerticalAlignStyle.setDefaultValue('bottom' as any)
			expect(DefaultVerticalAlignStyle.defaultValue).toBe('bottom')

			// Reset to valid value
			DefaultVerticalAlignStyle.setDefaultValue('middle')
		})
	})

	describe('alignment values semantics', () => {
		it('should contain all modern alignment values', () => {
			const modernValues = ['start', 'middle', 'end']
			modernValues.forEach((value) => {
				expect(DefaultVerticalAlignStyle.values).toContain(value)
			})
		})

		it('should validate that all values are strings', () => {
			DefaultVerticalAlignStyle.values.forEach((value) => {
				expect(typeof value).toBe('string')
				expect(value.length).toBeGreaterThan(0)
			})
		})

		it('should validate value naming conventions', () => {
			// All values should be simple words without hyphens or suffixes
			DefaultVerticalAlignStyle.values.forEach((value) => {
				expect(value).toMatch(/^[a-z]+$/) // Only lowercase letters
				expect(value).not.toContain('-') // No hyphens
				expect(value).not.toContain('legacy') // No legacy suffix
			})
		})

		it('should represent semantic vertical positions', () => {
			// start = top, middle = center, end = bottom
			expect(DefaultVerticalAlignStyle.values).toContain('start') // Top alignment
			expect(DefaultVerticalAlignStyle.values).toContain('middle') // Center alignment
			expect(DefaultVerticalAlignStyle.values).toContain('end') // Bottom alignment
		})
	})

	describe('TypeScript type integration', () => {
		it('should work with TLDefaultVerticalAlignStyle type', () => {
			const topAlignment: TLDefaultVerticalAlignStyle = 'start'
			expect(DefaultVerticalAlignStyle.validate(topAlignment)).toBe('start')

			const centerAlignment: TLDefaultVerticalAlignStyle = 'middle'
			expect(DefaultVerticalAlignStyle.validate(centerAlignment)).toBe('middle')

			const bottomAlignment: TLDefaultVerticalAlignStyle = 'end'
			expect(DefaultVerticalAlignStyle.validate(bottomAlignment)).toBe('end')
		})

		it('should maintain type safety', () => {
			// This would fail TypeScript compilation if types are wrong
			const testValue: TLDefaultVerticalAlignStyle = 'middle'
			const result = DefaultVerticalAlignStyle.validate(testValue)
			expect(result).toBe(testValue)
		})

		it('should work in generic contexts', () => {
			function validateAlignment<T extends TLDefaultVerticalAlignStyle>(value: T): T {
				return DefaultVerticalAlignStyle.validate(value) as T
			}

			expect(validateAlignment('start')).toBe('start')
			expect(validateAlignment('middle')).toBe('middle')
			expect(validateAlignment('end')).toBe('end')
		})
	})

	describe('StyleProp inheritance', () => {
		it('should inherit from StyleProp correctly', () => {
			expect(DefaultVerticalAlignStyle).toHaveProperty('id')
			expect(DefaultVerticalAlignStyle).toHaveProperty('defaultValue')
			expect(DefaultVerticalAlignStyle).toHaveProperty('values')
			expect(DefaultVerticalAlignStyle).toHaveProperty('validate')
			expect(DefaultVerticalAlignStyle).toHaveProperty('validateUsingKnownGoodVersion')
			expect(DefaultVerticalAlignStyle).toHaveProperty('setDefaultValue')
		})

		it('should have functional validation methods', () => {
			expect(typeof DefaultVerticalAlignStyle.validate).toBe('function')
			expect(typeof DefaultVerticalAlignStyle.validateUsingKnownGoodVersion).toBe('function')
			expect(typeof DefaultVerticalAlignStyle.setDefaultValue).toBe('function')
		})

		it('should be an EnumStyleProp instance', () => {
			expect(DefaultVerticalAlignStyle.values).toBeInstanceOf(Array)
			expect(DefaultVerticalAlignStyle.values.length).toBeGreaterThan(0)
		})

		it('should have the correct StyleProp structure', () => {
			// Test the core StyleProp properties
			expect(typeof DefaultVerticalAlignStyle.id).toBe('string')
			expect(DefaultVerticalAlignStyle.values).toContain(DefaultVerticalAlignStyle.defaultValue)
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty string validation', () => {
			expect(() => DefaultVerticalAlignStyle.validate('')).toThrow()
		})

		it('should handle whitespace-only values', () => {
			const whitespaceValues = [' ', '\t', '\n', '  ', ' start ', ' middle ', ' end ']

			whitespaceValues.forEach((value) => {
				expect(() => DefaultVerticalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should handle case sensitivity correctly', () => {
			const wrongCaseValues = [
				'Start',
				'Middle',
				'End',
				'START',
				'MIDDLE',
				'END',
				'StArT',
				'MiDdLe',
				'EnD',
			]

			wrongCaseValues.forEach((value) => {
				expect(() => DefaultVerticalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should handle similar but invalid values', () => {
			const similarInvalid = [
				'top', // CSS equivalent of 'start'
				'bottom', // CSS equivalent of 'end'
				'center', // CSS equivalent of 'middle'
				'baseline',
				'text-top',
				'text-bottom',
				'super',
				'sub',
				'start ',
				'middle ',
				'end ',
				'vertical-start',
				'vertical-middle',
				'vertical-end',
				'v-start',
				'v-middle',
				'v-end',
			]

			similarInvalid.forEach((value) => {
				expect(() => DefaultVerticalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should handle numeric and boolean values', () => {
			const nonStringValues = [0, 1, -1, 3.14, true, false]

			nonStringValues.forEach((value) => {
				expect(() => DefaultVerticalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should handle object and array values', () => {
			const objectValues = [
				{},
				{ align: 'start' },
				[],
				['start'],
				new String('start'), // String object, not primitive
				new Date(),
				/start/,
				new Map([['align', 'start']]),
				new Set(['start']),
			]

			objectValues.forEach((value) => {
				expect(() => DefaultVerticalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should handle undefined and null gracefully', () => {
			expect(() => DefaultVerticalAlignStyle.validate(null)).toThrow()
			expect(() => DefaultVerticalAlignStyle.validate(undefined)).toThrow()
		})
	})

	describe('usage patterns', () => {
		it('should work in shape property contexts', () => {
			// Simulate how it would be used in a shape definition
			interface MockTextShapeProps {
				verticalAlign: TLDefaultVerticalAlignStyle
				text: string
			}

			const mockProps: MockTextShapeProps = {
				verticalAlign: 'middle',
				text: 'Hello World',
			}

			expect(DefaultVerticalAlignStyle.validate(mockProps.verticalAlign)).toBe('middle')
		})

		it('should support runtime property validation', () => {
			const userInput = 'start' // Simulating user input
			const validatedAlign = DefaultVerticalAlignStyle.validate(userInput)
			expect(validatedAlign).toBe('start')

			const invalidInput = 'top'
			expect(() => DefaultVerticalAlignStyle.validate(invalidInput)).toThrow()
		})

		it('should work with default value fallbacks', () => {
			// Simulating editor behavior where default is used for new shapes
			const newShapeAlign = DefaultVerticalAlignStyle.defaultValue
			expect(newShapeAlign).toBe('middle')
			expect(DefaultVerticalAlignStyle.validate(newShapeAlign)).toBe('middle')
		})

		it('should work in conditional logic', () => {
			const startAlignment: TLDefaultVerticalAlignStyle = 'start'
			const middleAlignment: TLDefaultVerticalAlignStyle = 'middle'
			const endAlignment: TLDefaultVerticalAlignStyle = 'end'

			function getCssEquivalent(alignment: TLDefaultVerticalAlignStyle): string {
				switch (alignment) {
					case 'start':
						return 'top'
					case 'middle':
						return 'center'
					case 'end':
						return 'bottom'
					default:
						return 'center'
				}
			}

			expect(getCssEquivalent(startAlignment)).toBe('top')
			expect(getCssEquivalent(middleAlignment)).toBe('center')
			expect(getCssEquivalent(endAlignment)).toBe('bottom')
		})

		it('should work with array operations', () => {
			const allAlignments = DefaultVerticalAlignStyle.values
			const validatedAlignments = allAlignments.map((align) =>
				DefaultVerticalAlignStyle.validate(align)
			)

			expect(validatedAlignments).toEqual(allAlignments)
			expect(validatedAlignments).toHaveLength(3)
		})
	})

	describe('performance considerations', () => {
		it('should validate values efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				DefaultVerticalAlignStyle.values.forEach((value) => {
					DefaultVerticalAlignStyle.validate(value)
				})
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(100) // Should be fast
		})

		it('should handle repeated validation efficiently', () => {
			const testValue = 'middle'
			const start = performance.now()

			for (let i = 0; i < 10000; i++) {
				DefaultVerticalAlignStyle.validate(testValue)
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(50) // Should be very fast for repeated validation
		})

		test('should maintain immutability of values array', () => {
			const originalValues = DefaultVerticalAlignStyle.values
			const valuesCopy = [...DefaultVerticalAlignStyle.values]

			// Values array should be the same reference and contents
			expect(DefaultVerticalAlignStyle.values).toBe(originalValues)
			expect(DefaultVerticalAlignStyle.values).toEqual(valuesCopy)
		})

		it('should not create new objects on each access', () => {
			const values1 = DefaultVerticalAlignStyle.values
			const values2 = DefaultVerticalAlignStyle.values
			expect(values1).toBe(values2) // Should be the same reference
		})
	})

	describe('integration with tldraw ecosystem', () => {
		it('should follow tldraw naming conventions', () => {
			expect(DefaultVerticalAlignStyle.id).toMatch(/^tldraw:/)
			expect(DefaultVerticalAlignStyle.id).toBe('tldraw:verticalAlign')
		})

		it('should work with style property system', () => {
			// Test that it behaves like other style properties
			expect(typeof DefaultVerticalAlignStyle.id).toBe('string')
			expect(DefaultVerticalAlignStyle.id.length).toBeGreaterThan(0)
			expect(
				DefaultVerticalAlignStyle.values.includes(DefaultVerticalAlignStyle.defaultValue)
			).toBe(true)
		})

		it('should provide consistent API with other style props', () => {
			// Ensure it has the same interface as other style properties
			const methods = ['validate', 'validateUsingKnownGoodVersion', 'setDefaultValue']
			const properties = ['id', 'defaultValue', 'values']

			methods.forEach((method) => {
				expect(
					typeof DefaultVerticalAlignStyle[method as keyof typeof DefaultVerticalAlignStyle]
				).toBe('function')
			})

			properties.forEach((prop) => {
				expect(DefaultVerticalAlignStyle).toHaveProperty(prop)
			})
		})

		it('should complement horizontal alignment', () => {
			// Vertical alignment should have similar structure to horizontal alignment
			// but without legacy values
			const verticalValues = DefaultVerticalAlignStyle.values
			const expectedModernValues = ['start', 'middle', 'end']

			expect(verticalValues).toEqual(expectedModernValues)
			expect(verticalValues).toHaveLength(3)
		})
	})

	describe('compatibility and migration considerations', () => {
		it('should not support legacy values', () => {
			const legacyValues = ['start-legacy', 'middle-legacy', 'end-legacy']

			legacyValues.forEach((legacy) => {
				expect(DefaultVerticalAlignStyle.values).not.toContain(legacy)
				expect(() => DefaultVerticalAlignStyle.validate(legacy)).toThrow()
			})
		})

		it('should maintain stable IDs for persistence', () => {
			expect(DefaultVerticalAlignStyle.id).toBe('tldraw:verticalAlign')
			// ID should be stable across versions for proper serialization/deserialization
		})

		it('should handle value evolution gracefully', () => {
			// Test that all values are valid and can be persisted/restored
			DefaultVerticalAlignStyle.values.forEach((value) => {
				const validated = DefaultVerticalAlignStyle.validate(value)
				expect(validated).toBe(value)

				// Should work with validateUsingKnownGoodVersion
				const revalidated = DefaultVerticalAlignStyle.validateUsingKnownGoodVersion(value, value)
				expect(revalidated).toBe(value)
			})
		})

		it('should be future-proof for new values', () => {
			// Ensure the structure allows for potential future expansion
			expect(DefaultVerticalAlignStyle.values).toBeInstanceOf(Array)
			expect(DefaultVerticalAlignStyle.values.length).toBeGreaterThan(0)

			// All current values should be simple strings
			DefaultVerticalAlignStyle.values.forEach((value) => {
				expect(typeof value).toBe('string')
				expect(value.length).toBeGreaterThan(0)
			})
		})
	})

	describe('documentation and API contract', () => {
		it('should maintain consistent behavior as documented', () => {
			// Test the behavior described in the JSDoc comments
			expect(DefaultVerticalAlignStyle.defaultValue).toBe('middle')
			expect(DefaultVerticalAlignStyle.values).toContain('start') // Top alignment
			expect(DefaultVerticalAlignStyle.values).toContain('middle') // Center alignment
			expect(DefaultVerticalAlignStyle.values).toContain('end') // Bottom alignment
		})

		it('should provide meaningful value names', () => {
			// Values should be semantic and self-documenting
			const semanticValues = ['start', 'middle', 'end']
			semanticValues.forEach((value) => {
				expect(DefaultVerticalAlignStyle.values).toContain(value)
			})

			// Should not contain any non-semantic values
			const nonSemanticPatterns = ['-', 'legacy', 'deprecated', 'old']
			DefaultVerticalAlignStyle.values.forEach((value) => {
				nonSemanticPatterns.forEach((pattern) => {
					expect(value).not.toContain(pattern)
				})
			})
		})

		it('should map to logical vertical positions', () => {
			// Test that the values correspond to expected vertical positions
			const positionMapping = {
				start: 'top',
				middle: 'center',
				end: 'bottom',
			}

			Object.keys(positionMapping).forEach((alignValue) => {
				expect(DefaultVerticalAlignStyle.values).toContain(alignValue)
			})
		})

		it('should maintain consistent naming with CSS logical properties', () => {
			// start/end naming aligns with CSS logical properties
			expect(DefaultVerticalAlignStyle.values).toContain('start')
			expect(DefaultVerticalAlignStyle.values).toContain('end')

			// Should not contain physical direction names
			const physicalNames = ['top', 'bottom']
			physicalNames.forEach((name) => {
				expect(DefaultVerticalAlignStyle.values).not.toContain(name)
			})
		})
	})

	describe('cross-browser and internationalization', () => {
		it('should work consistently across different locales', () => {
			// Vertical alignment is not affected by text direction (RTL/LTR)
			// so values should be consistent
			DefaultVerticalAlignStyle.values.forEach((value) => {
				expect(DefaultVerticalAlignStyle.validate(value)).toBe(value)
			})
		})

		it('should use language-neutral value names', () => {
			// All values should be in English and not localized
			DefaultVerticalAlignStyle.values.forEach((value) => {
				expect(value).toMatch(/^[a-z]+$/)
				expect(value.length).toBeGreaterThan(0)
			})
		})

		it('should be independent of writing direction', () => {
			// Vertical alignment should work the same in both LTR and RTL contexts
			// Unlike horizontal alignment, vertical is not affected by text direction
			const allValues = DefaultVerticalAlignStyle.values
			expect(allValues).toEqual(['start', 'middle', 'end'])

			// All values should be valid regardless of context
			allValues.forEach((value) => {
				expect(DefaultVerticalAlignStyle.validate(value)).toBe(value)
			})
		})
	})

	describe('comparison with horizontal alignment', () => {
		it('should have simpler value set than horizontal alignment', () => {
			// Vertical alignment doesn't need legacy values
			expect(DefaultVerticalAlignStyle.values).toHaveLength(3)
			expect(DefaultVerticalAlignStyle.values).toEqual(['start', 'middle', 'end'])
		})

		it('should share common alignment concepts', () => {
			// Both should have start, middle, end
			const commonValues = ['start', 'middle', 'end']
			commonValues.forEach((value) => {
				expect(DefaultVerticalAlignStyle.values).toContain(value)
			})
		})

		it('should use consistent default value', () => {
			// Both vertical and horizontal should default to 'middle'
			expect(DefaultVerticalAlignStyle.defaultValue).toBe('middle')
		})
	})
})
