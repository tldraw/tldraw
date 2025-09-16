import { describe, expect, it, test } from 'vitest'
import {
	DefaultHorizontalAlignStyle,
	TLDefaultHorizontalAlignStyle,
} from './TLHorizontalAlignStyle'

describe('TLHorizontalAlignStyle', () => {
	describe('DefaultHorizontalAlignStyle', () => {
		it('should be a StyleProp with correct configuration', () => {
			expect(DefaultHorizontalAlignStyle.id).toBe('tldraw:horizontalAlign')
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('middle')
		})

		it('should have the correct values array', () => {
			expect(DefaultHorizontalAlignStyle.values).toEqual([
				'start',
				'middle',
				'end',
				'start-legacy',
				'end-legacy',
				'middle-legacy',
			])
		})

		it('should contain exactly 6 alignment options', () => {
			expect(DefaultHorizontalAlignStyle.values).toHaveLength(6)
		})

		it('should not contain duplicates in values', () => {
			const uniqueValues = new Set(DefaultHorizontalAlignStyle.values)
			expect(uniqueValues.size).toBe(DefaultHorizontalAlignStyle.values.length)
		})
	})

	describe('validation', () => {
		it('should validate all allowed horizontal alignment values', () => {
			const validValues: TLDefaultHorizontalAlignStyle[] = [
				'start',
				'middle',
				'end',
				'start-legacy',
				'end-legacy',
				'middle-legacy',
			]

			validValues.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).not.toThrow()
				expect(DefaultHorizontalAlignStyle.validate(value)).toBe(value)
			})
		})

		it('should reject invalid horizontal alignment values', () => {
			const invalidValues = [
				'left',
				'right',
				'center',
				'justify',
				'invalid',
				'',
				'LEFT',
				'RIGHT',
				'CENTER',
				'Start',
				'Middle',
				'End',
				'startlegacy',
				'endlegacy',
				'middlelegacy',
			]

			invalidValues.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should reject non-string values', () => {
			const invalidTypes = [null, undefined, 123, true, false, {}, [], Symbol('test')]

			invalidTypes.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			const result = DefaultHorizontalAlignStyle.validateUsingKnownGoodVersion('start', 'end')
			expect(result).toBe('end')

			expect(() =>
				DefaultHorizontalAlignStyle.validateUsingKnownGoodVersion('start', 'invalid')
			).toThrow()
		})
	})

	describe('default value management', () => {
		it('should allow setting default value to any valid alignment', () => {
			const originalDefault = DefaultHorizontalAlignStyle.defaultValue

			DefaultHorizontalAlignStyle.setDefaultValue('start')
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('start')

			DefaultHorizontalAlignStyle.setDefaultValue('end')
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('end')

			DefaultHorizontalAlignStyle.setDefaultValue('start-legacy')
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('start-legacy')

			// Restore original
			DefaultHorizontalAlignStyle.setDefaultValue(originalDefault)
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('middle')
		})

		it('should maintain the default value of middle initially', () => {
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('middle')
		})
	})

	describe('alignment values semantics', () => {
		it('should contain modern alignment values', () => {
			const modernValues = ['start', 'middle', 'end']
			modernValues.forEach((value) => {
				expect(DefaultHorizontalAlignStyle.values).toContain(value)
			})
		})

		it('should contain legacy alignment values', () => {
			const legacyValues = ['start-legacy', 'middle-legacy', 'end-legacy']
			legacyValues.forEach((value) => {
				expect(DefaultHorizontalAlignStyle.values).toContain(value)
			})
		})

		it('should differentiate between modern and legacy values', () => {
			const modernValues = ['start', 'middle', 'end']
			const legacyValues = ['start-legacy', 'middle-legacy', 'end-legacy']

			// Each modern value should have a corresponding legacy value
			modernValues.forEach((modern) => {
				const correspondingLegacy = `${modern}-legacy`
				expect(legacyValues).toContain(correspondingLegacy)
				expect(DefaultHorizontalAlignStyle.values).toContain(correspondingLegacy)
			})
		})

		it('should validate that all values are strings', () => {
			DefaultHorizontalAlignStyle.values.forEach((value) => {
				expect(typeof value).toBe('string')
				expect(value.length).toBeGreaterThan(0)
			})
		})

		it('should validate value naming conventions', () => {
			// Modern values should be simple words
			const modernValues = ['start', 'middle', 'end']
			modernValues.forEach((value) => {
				expect(DefaultHorizontalAlignStyle.values).toContain(value)
				expect(value).toMatch(/^[a-z]+$/) // Only lowercase letters
			})

			// Legacy values should end with '-legacy'
			const legacyValues = DefaultHorizontalAlignStyle.values.filter((value) =>
				value.endsWith('-legacy')
			)
			expect(legacyValues).toHaveLength(3)
			legacyValues.forEach((value) => {
				expect(value).toMatch(/^[a-z]+-legacy$/)
			})
		})
	})

	describe('TypeScript type integration', () => {
		it('should work with TLDefaultHorizontalAlignStyle type', () => {
			const validAlignment: TLDefaultHorizontalAlignStyle = 'start'
			expect(DefaultHorizontalAlignStyle.validate(validAlignment)).toBe('start')

			const centerAlignment: TLDefaultHorizontalAlignStyle = 'middle'
			expect(DefaultHorizontalAlignStyle.validate(centerAlignment)).toBe('middle')

			const endAlignment: TLDefaultHorizontalAlignStyle = 'end'
			expect(DefaultHorizontalAlignStyle.validate(endAlignment)).toBe('end')
		})

		it('should work with legacy alignments', () => {
			const legacyStart: TLDefaultHorizontalAlignStyle = 'start-legacy'
			const legacyMiddle: TLDefaultHorizontalAlignStyle = 'middle-legacy'
			const legacyEnd: TLDefaultHorizontalAlignStyle = 'end-legacy'

			expect(DefaultHorizontalAlignStyle.validate(legacyStart)).toBe('start-legacy')
			expect(DefaultHorizontalAlignStyle.validate(legacyMiddle)).toBe('middle-legacy')
			expect(DefaultHorizontalAlignStyle.validate(legacyEnd)).toBe('end-legacy')
		})

		it('should maintain type safety', () => {
			// This would fail TypeScript compilation if types are wrong
			const testValue: TLDefaultHorizontalAlignStyle = 'middle'
			const result = DefaultHorizontalAlignStyle.validate(testValue)
			expect(result).toBe(testValue)
		})
	})

	describe('StyleProp inheritance', () => {
		it('should inherit from StyleProp correctly', () => {
			expect(DefaultHorizontalAlignStyle).toHaveProperty('id')
			expect(DefaultHorizontalAlignStyle).toHaveProperty('defaultValue')
			expect(DefaultHorizontalAlignStyle).toHaveProperty('values')
			expect(DefaultHorizontalAlignStyle).toHaveProperty('validate')
			expect(DefaultHorizontalAlignStyle).toHaveProperty('validateUsingKnownGoodVersion')
			expect(DefaultHorizontalAlignStyle).toHaveProperty('setDefaultValue')
		})

		it('should have functional validation methods', () => {
			expect(typeof DefaultHorizontalAlignStyle.validate).toBe('function')
			expect(typeof DefaultHorizontalAlignStyle.validateUsingKnownGoodVersion).toBe('function')
			expect(typeof DefaultHorizontalAlignStyle.setDefaultValue).toBe('function')
		})

		it('should be an EnumStyleProp instance', () => {
			expect(DefaultHorizontalAlignStyle.values).toBeInstanceOf(Array)
			expect(DefaultHorizontalAlignStyle.values.length).toBeGreaterThan(0)
		})
	})

	describe('edge cases and error handling', () => {
		it('should handle empty string validation', () => {
			expect(() => DefaultHorizontalAlignStyle.validate('')).toThrow()
		})

		it('should handle whitespace-only values', () => {
			const whitespaceValues = [' ', '\t', '\n', '  ', ' start ', ' middle ', ' end ']

			whitespaceValues.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).toThrow()
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
				'Start-Legacy',
				'MIDDLE-LEGACY',
			]

			wrongCaseValues.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should handle similar but invalid values', () => {
			const similarInvalid = [
				'left', // CSS equivalent of 'start' in LTR
				'right', // CSS equivalent of 'end' in LTR
				'center', // CSS equivalent of 'middle'
				'justify',
				'start ',
				'middle ',
				'end ',
				'start-',
				'middle-',
				'end-',
				'-legacy',
				'legacy',
				'startlegacy', // Missing hyphen
				'middlelegacy', // Missing hyphen
				'endlegacy', // Missing hyphen
			]

			similarInvalid.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).toThrow()
			})
		})

		it('should handle numeric and boolean values', () => {
			const nonStringValues = [0, 1, -1, 3.14, true, false]

			nonStringValues.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).toThrow()
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
			]

			objectValues.forEach((value) => {
				expect(() => DefaultHorizontalAlignStyle.validate(value)).toThrow()
			})
		})
	})

	describe('usage patterns', () => {
		it('should work in shape property contexts', () => {
			// Simulate how it would be used in a shape definition
			interface MockTextShapeProps {
				align: TLDefaultHorizontalAlignStyle
				text: string
			}

			const mockProps: MockTextShapeProps = {
				align: 'middle',
				text: 'Hello World',
			}

			expect(DefaultHorizontalAlignStyle.validate(mockProps.align)).toBe('middle')
		})

		it('should support runtime property validation', () => {
			const userInput = 'start' // Simulating user input
			const validatedAlign = DefaultHorizontalAlignStyle.validate(userInput)
			expect(validatedAlign).toBe('start')

			const invalidInput = 'left'
			expect(() => DefaultHorizontalAlignStyle.validate(invalidInput)).toThrow()
		})

		it('should work with default value fallbacks', () => {
			// Simulating editor behavior where default is used for new shapes
			const newShapeAlign = DefaultHorizontalAlignStyle.defaultValue
			expect(newShapeAlign).toBe('middle')
			expect(DefaultHorizontalAlignStyle.validate(newShapeAlign)).toBe('middle')
		})
	})

	describe('performance considerations', () => {
		it('should validate values efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				DefaultHorizontalAlignStyle.values.forEach((value) => {
					DefaultHorizontalAlignStyle.validate(value)
				})
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(100) // Should be fast
		})

		it('should handle repeated validation efficiently', () => {
			const testValue = 'middle'
			const start = performance.now()

			for (let i = 0; i < 10000; i++) {
				DefaultHorizontalAlignStyle.validate(testValue)
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(50) // Should be very fast for repeated validation
		})

		test('should maintain immutability of values array', () => {
			const originalValues = DefaultHorizontalAlignStyle.values
			const valuesCopy = [...DefaultHorizontalAlignStyle.values]

			// Values array should be the same reference and contents
			expect(DefaultHorizontalAlignStyle.values).toBe(originalValues)
			expect(DefaultHorizontalAlignStyle.values).toEqual(valuesCopy)
		})
	})

	describe('integration with tldraw ecosystem', () => {
		it('should follow tldraw naming conventions', () => {
			expect(DefaultHorizontalAlignStyle.id).toMatch(/^tldraw:/)
			expect(DefaultHorizontalAlignStyle.id).toBe('tldraw:horizontalAlign')
		})

		it('should work with style property system', () => {
			// Test that it behaves like other style properties
			expect(typeof DefaultHorizontalAlignStyle.id).toBe('string')
			expect(DefaultHorizontalAlignStyle.id.length).toBeGreaterThan(0)
			expect(
				DefaultHorizontalAlignStyle.values.includes(DefaultHorizontalAlignStyle.defaultValue)
			).toBe(true)
		})

		it('should provide consistent API with other style props', () => {
			// Ensure it has the same interface as other style properties
			const methods = ['validate', 'validateUsingKnownGoodVersion', 'setDefaultValue']
			const properties = ['id', 'defaultValue', 'values']

			methods.forEach((method) => {
				expect(
					typeof DefaultHorizontalAlignStyle[method as keyof typeof DefaultHorizontalAlignStyle]
				).toBe('function')
			})

			properties.forEach((prop) => {
				expect(DefaultHorizontalAlignStyle).toHaveProperty(prop)
			})
		})
	})

	describe('compatibility and migration considerations', () => {
		it('should support both modern and legacy values for backward compatibility', () => {
			const modernToLegacyMapping: Record<string, string> = {
				start: 'start-legacy',
				middle: 'middle-legacy',
				end: 'end-legacy',
			}

			Object.entries(modernToLegacyMapping).forEach(([modern, legacy]) => {
				expect(DefaultHorizontalAlignStyle.values).toContain(modern)
				expect(DefaultHorizontalAlignStyle.values).toContain(legacy)
				expect(DefaultHorizontalAlignStyle.validate(modern)).toBe(modern)
				expect(DefaultHorizontalAlignStyle.validate(legacy)).toBe(legacy)
			})
		})

		it('should maintain stable IDs for persistence', () => {
			expect(DefaultHorizontalAlignStyle.id).toBe('tldraw:horizontalAlign')
			// ID should be stable across versions for proper serialization/deserialization
		})

		it('should handle value evolution gracefully', () => {
			// Test that all values are valid and can be persisted/restored
			DefaultHorizontalAlignStyle.values.forEach((value) => {
				const validated = DefaultHorizontalAlignStyle.validate(value)
				expect(validated).toBe(value)

				// Should work with validateUsingKnownGoodVersion
				const revalidated = DefaultHorizontalAlignStyle.validateUsingKnownGoodVersion(value, value)
				expect(revalidated).toBe(value)
			})
		})
	})

	describe('documentation and API contract', () => {
		it('should maintain consistent behavior as documented', () => {
			// Test the behavior described in the JSDoc comments
			expect(DefaultHorizontalAlignStyle.defaultValue).toBe('middle')
			expect(DefaultHorizontalAlignStyle.values).toContain('start')
			expect(DefaultHorizontalAlignStyle.values).toContain('middle')
			expect(DefaultHorizontalAlignStyle.values).toContain('end')
		})

		it('should provide meaningful value names', () => {
			// Values should be semantic and self-documenting
			const semanticValues = ['start', 'middle', 'end']
			semanticValues.forEach((value) => {
				expect(DefaultHorizontalAlignStyle.values).toContain(value)
			})

			// Legacy values should be clearly marked
			const legacyValues = DefaultHorizontalAlignStyle.values.filter((v) => v.includes('legacy'))
			expect(legacyValues).toHaveLength(3)
		})
	})
})
