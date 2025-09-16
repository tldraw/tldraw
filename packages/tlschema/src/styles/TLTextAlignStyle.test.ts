import { describe, expect, it, test } from 'vitest'
import { DefaultTextAlignStyle, TLDefaultTextAlignStyle } from './TLTextAlignStyle'

describe('TLTextAlignStyle', () => {
	describe('DefaultTextAlignStyle', () => {
		it('should be a StyleProp with correct configuration', () => {
			expect(DefaultTextAlignStyle.id).toBe('tldraw:textAlign')
			expect(DefaultTextAlignStyle.defaultValue).toBe('start')
		})

		it('should have values property with all text alignment options', () => {
			expect(DefaultTextAlignStyle.values).toEqual(['start', 'middle', 'end'])
		})

		it('should validate all valid text alignment values', () => {
			const validAlignments = ['start', 'middle', 'end']

			validAlignments.forEach((alignment) => {
				expect(() => DefaultTextAlignStyle.validate(alignment)).not.toThrow()
				expect(DefaultTextAlignStyle.validate(alignment)).toBe(alignment)
			})
		})

		it('should reject invalid text alignment values', () => {
			const invalidAlignments = [
				'left',
				'center',
				'right',
				'justify',
				'invalid',
				'',
				'Start',
				'MIDDLE',
				'End',
			]

			invalidAlignments.forEach((alignment) => {
				expect(() => DefaultTextAlignStyle.validate(alignment)).toThrow()
			})
		})

		it('should have start as default value', () => {
			expect(DefaultTextAlignStyle.defaultValue).toBe('start')
		})

		it('should allow setting default value to any valid alignment', () => {
			const originalDefault = DefaultTextAlignStyle.defaultValue

			DefaultTextAlignStyle.setDefaultValue('middle')
			expect(DefaultTextAlignStyle.defaultValue).toBe('middle')

			DefaultTextAlignStyle.setDefaultValue('end')
			expect(DefaultTextAlignStyle.defaultValue).toBe('end')

			DefaultTextAlignStyle.setDefaultValue('start')
			expect(DefaultTextAlignStyle.defaultValue).toBe('start')

			// Restore original default
			DefaultTextAlignStyle.setDefaultValue(originalDefault)
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			const result = DefaultTextAlignStyle.validateUsingKnownGoodVersion('start', 'middle')
			expect(result).toBe('middle')

			const result2 = DefaultTextAlignStyle.validateUsingKnownGoodVersion('middle', 'end')
			expect(result2).toBe('end')

			expect(() =>
				DefaultTextAlignStyle.validateUsingKnownGoodVersion('start', 'invalid')
			).toThrow()
		})

		it('should be an EnumStyleProp instance', () => {
			// Should inherit from StyleProp and have values property
			expect(typeof DefaultTextAlignStyle.validate).toBe('function')
			expect(typeof DefaultTextAlignStyle.validateUsingKnownGoodVersion).toBe('function')
			expect(typeof DefaultTextAlignStyle.setDefaultValue).toBe('function')
			expect(Array.isArray(DefaultTextAlignStyle.values)).toBe(true)
		})

		it('should have readonly values array', () => {
			const originalValues = DefaultTextAlignStyle.values
			expect(originalValues).toEqual(['start', 'middle', 'end'])
			expect(originalValues).toHaveLength(3)
		})

		it('should contain only string values', () => {
			DefaultTextAlignStyle.values.forEach((alignment) => {
				expect(typeof alignment).toBe('string')
				expect(alignment.length).toBeGreaterThan(0)
			})
		})

		it('should not contain duplicates', () => {
			const uniqueAlignments = new Set(DefaultTextAlignStyle.values)
			expect(uniqueAlignments.size).toBe(DefaultTextAlignStyle.values.length)
		})

		it('should contain all expected alignment values', () => {
			const expectedAlignments = ['start', 'middle', 'end']
			expectedAlignments.forEach((alignment) => {
				expect(DefaultTextAlignStyle.values).toContain(alignment)
			})
		})
	})

	describe('TLDefaultTextAlignStyle type', () => {
		it('should accept all valid alignment values', () => {
			// These are compile-time type checks that verify the type union
			const startAlign: TLDefaultTextAlignStyle = 'start'
			const middleAlign: TLDefaultTextAlignStyle = 'middle'
			const endAlign: TLDefaultTextAlignStyle = 'end'

			expect(startAlign).toBe('start')
			expect(middleAlign).toBe('middle')
			expect(endAlign).toBe('end')
		})

		it('should work with DefaultTextAlignStyle validation', () => {
			const validAlignments: TLDefaultTextAlignStyle[] = ['start', 'middle', 'end']

			validAlignments.forEach((alignment) => {
				expect(DefaultTextAlignStyle.validate(alignment)).toBe(alignment)
			})
		})

		it('should maintain type safety', () => {
			// Test that the type matches the actual values
			const alignmentValue: TLDefaultTextAlignStyle = 'start'
			expect(DefaultTextAlignStyle.values.includes(alignmentValue)).toBe(true)
		})
	})

	describe('text alignment semantics', () => {
		it('should use logical alignment values', () => {
			// start/end are logical (LTR/RTL aware) rather than left/right
			expect(DefaultTextAlignStyle.values).toContain('start')
			expect(DefaultTextAlignStyle.values).toContain('end')
			expect(DefaultTextAlignStyle.values).not.toContain('left')
			expect(DefaultTextAlignStyle.values).not.toContain('right')
		})

		it('should include middle for center alignment', () => {
			expect(DefaultTextAlignStyle.values).toContain('middle')
			expect(DefaultTextAlignStyle.values).not.toContain('center')
		})

		it('should not include justify alignment', () => {
			expect(DefaultTextAlignStyle.values).not.toContain('justify')
		})

		it('should default to start alignment', () => {
			// start is the most commonly used default for text alignment
			expect(DefaultTextAlignStyle.defaultValue).toBe('start')
		})
	})

	describe('integration patterns', () => {
		it('should work in shape props patterns', () => {
			// Simulate how text align style might be used in shape props
			const shapeProps = {
				textAlign: DefaultTextAlignStyle,
				// other props would go here
			}

			expect(shapeProps.textAlign.validate('start')).toBe('start')
			expect(shapeProps.textAlign.validate('middle')).toBe('middle')
			expect(shapeProps.textAlign.validate('end')).toBe('end')
		})

		it('should support style inheritance patterns', () => {
			// Test that different text shapes could have different default alignments
			const originalDefault = DefaultTextAlignStyle.defaultValue

			// Simulate setting different defaults for different contexts
			DefaultTextAlignStyle.setDefaultValue('middle')
			expect(DefaultTextAlignStyle.defaultValue).toBe('middle')

			DefaultTextAlignStyle.setDefaultValue('end')
			expect(DefaultTextAlignStyle.defaultValue).toBe('end')

			// Restore original
			DefaultTextAlignStyle.setDefaultValue(originalDefault)
		})

		it('should work with text editing scenarios', () => {
			// Test scenarios that might occur during text editing
			const alignments: TLDefaultTextAlignStyle[] = ['start', 'middle', 'end']

			alignments.forEach((from) => {
				alignments.forEach((to) => {
					const result = DefaultTextAlignStyle.validateUsingKnownGoodVersion(from, to)
					expect(result).toBe(to)
				})
			})
		})
	})

	describe('error handling and edge cases', () => {
		it('should handle validation errors gracefully', () => {
			expect(() => DefaultTextAlignStyle.validate(null)).toThrow()
			expect(() => DefaultTextAlignStyle.validate(undefined)).toThrow()
			expect(() => DefaultTextAlignStyle.validate(123)).toThrow()
			expect(() => DefaultTextAlignStyle.validate({})).toThrow()
			expect(() => DefaultTextAlignStyle.validate([])).toThrow()
		})

		it('should handle case sensitivity correctly', () => {
			// Should be case sensitive
			expect(() => DefaultTextAlignStyle.validate('Start')).toThrow()
			expect(() => DefaultTextAlignStyle.validate('MIDDLE')).toThrow()
			expect(() => DefaultTextAlignStyle.validate('End')).toThrow()
			expect(() => DefaultTextAlignStyle.validate('START')).toThrow()
		})

		it('should reject empty and whitespace strings', () => {
			const invalidStrings = ['', ' ', '\t', '\n', '  ', ' start ', ' middle']

			invalidStrings.forEach((str) => {
				expect(() => DefaultTextAlignStyle.validate(str)).toThrow()
			})
		})

		it('should reject common CSS text-align values that are not supported', () => {
			const unsupportedAlignments = [
				'left',
				'right',
				'center',
				'justify',
				'inherit',
				'initial',
				'unset',
			]

			unsupportedAlignments.forEach((alignment) => {
				expect(() => DefaultTextAlignStyle.validate(alignment)).toThrow()
			})
		})

		it('should handle unicode and special characters', () => {
			const specialStrings = ['start🎯', '→middle', 'end←', 'стрт', 'میانه']

			specialStrings.forEach((str) => {
				expect(() => DefaultTextAlignStyle.validate(str)).toThrow()
			})
		})

		test('should maintain immutability of values array', () => {
			const originalValues = DefaultTextAlignStyle.values
			const valuesCopy = [...originalValues]

			// Values should be the same reference and content
			expect(DefaultTextAlignStyle.values).toBe(originalValues)
			expect(DefaultTextAlignStyle.values).toEqual(valuesCopy)
		})
	})

	describe('performance considerations', () => {
		it('should validate text alignment values efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				DefaultTextAlignStyle.values.forEach((alignment) => {
					DefaultTextAlignStyle.validate(alignment)
				})
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(100) // Should validate quickly
		})

		it('should handle validateUsingKnownGoodVersion efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				DefaultTextAlignStyle.validateUsingKnownGoodVersion('start', 'middle')
				DefaultTextAlignStyle.validateUsingKnownGoodVersion('middle', 'end')
				DefaultTextAlignStyle.validateUsingKnownGoodVersion('end', 'start')
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(50) // Should be very fast
		})

		it('should create multiple instances efficiently', () => {
			// Test that accessing the values and methods is efficient
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				const values = DefaultTextAlignStyle.values
				const defaultVal = DefaultTextAlignStyle.defaultValue
				const id = DefaultTextAlignStyle.id
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(10) // Should be extremely fast
		})
	})

	describe('real-world usage scenarios', () => {
		it('should handle text shape alignment use cases', () => {
			// Simulate common text shape alignment scenarios
			const textShapeScenarios = [
				{ alignment: 'start', description: 'Left-aligned text in LTR' },
				{ alignment: 'middle', description: 'Center-aligned text' },
				{ alignment: 'end', description: 'Right-aligned text in LTR' },
			] as const

			textShapeScenarios.forEach(({ alignment, description }) => {
				expect(() => DefaultTextAlignStyle.validate(alignment)).not.toThrow()
				expect(DefaultTextAlignStyle.validate(alignment)).toBe(alignment)
			})
		})

		it('should work with note and label alignment', () => {
			// Test alignments that might be commonly used in notes and labels
			const noteAlignments: TLDefaultTextAlignStyle[] = ['start', 'middle']
			const labelAlignments: TLDefaultTextAlignStyle[] = ['middle', 'end']
			const allAlignments = [...noteAlignments, ...labelAlignments]

			allAlignments.forEach((alignment) => {
				expect(DefaultTextAlignStyle.validate(alignment)).toBe(alignment)
			})
		})

		it('should support alignment switching workflows', () => {
			// Simulate user switching between alignments
			const originalDefault = DefaultTextAlignStyle.defaultValue
			const alignmentSequence: TLDefaultTextAlignStyle[] = ['start', 'middle', 'end', 'start']

			alignmentSequence.forEach((alignment) => {
				DefaultTextAlignStyle.setDefaultValue(alignment)
				expect(DefaultTextAlignStyle.defaultValue).toBe(alignment)
				expect(DefaultTextAlignStyle.validate(alignment)).toBe(alignment)
			})

			// Restore original
			DefaultTextAlignStyle.setDefaultValue(originalDefault)
		})

		it('should handle RTL and LTR context appropriately', () => {
			// start and end are logical values that adapt to text direction
			// This tests that we're using the correct semantic values
			expect(DefaultTextAlignStyle.values).toContain('start') // logical start
			expect(DefaultTextAlignStyle.values).toContain('end') // logical end
			expect(DefaultTextAlignStyle.values).not.toContain('left') // physical direction
			expect(DefaultTextAlignStyle.values).not.toContain('right') // physical direction
		})

		test('should integrate well with editor state management', () => {
			// Test that the style prop behaves correctly in state transitions
			const transitions = [
				{ from: 'start', to: 'middle' },
				{ from: 'middle', to: 'end' },
				{ from: 'end', to: 'start' },
				{ from: 'start', to: 'end' }, // skip middle
			] as const

			transitions.forEach(({ from, to }) => {
				const result = DefaultTextAlignStyle.validateUsingKnownGoodVersion(from, to)
				expect(result).toBe(to)
			})
		})
	})

	describe('consistency with CSS text-align mapping', () => {
		it('should use values that map logically to CSS text-align', () => {
			// start -> text-align: start (or left in LTR)
			// middle -> text-align: center
			// end -> text-align: end (or right in LTR)

			const cssMapping = {
				start: 'start', // CSS text-align: start
				middle: 'center', // CSS text-align: center
				end: 'end', // CSS text-align: end
			}

			Object.keys(cssMapping).forEach((tldrawValue) => {
				expect(DefaultTextAlignStyle.values).toContain(tldrawValue)
			})
		})

		it('should maintain semantic meaning over physical directions', () => {
			// Using start/end instead of left/right makes the API more
			// internationally friendly and RTL-aware
			expect(DefaultTextAlignStyle.values).not.toContain('left')
			expect(DefaultTextAlignStyle.values).not.toContain('right')
			expect(DefaultTextAlignStyle.values).toContain('start')
			expect(DefaultTextAlignStyle.values).toContain('end')
		})
	})
})
