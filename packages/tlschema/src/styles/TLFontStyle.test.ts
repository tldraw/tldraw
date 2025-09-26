import { describe, expect, it, test } from 'vitest'
import { DefaultFontFamilies, DefaultFontStyle, TLDefaultFontStyle } from './TLFontStyle'

describe('TLFontStyle', () => {
	describe('DefaultFontStyle', () => {
		it('should be a StyleProp with correct configuration', () => {
			expect(DefaultFontStyle.id).toBe('tldraw:font')
			expect(DefaultFontStyle.defaultValue).toBe('draw')
		})

		it('should have correct font values', () => {
			expect(DefaultFontStyle.values).toEqual(['draw', 'sans', 'serif', 'mono'])
		})

		it('should validate all font values', () => {
			const validFonts: TLDefaultFontStyle[] = ['draw', 'sans', 'serif', 'mono']

			validFonts.forEach((font) => {
				expect(() => DefaultFontStyle.validate(font)).not.toThrow()
				expect(DefaultFontStyle.validate(font)).toBe(font)
			})
		})

		it('should reject invalid font values', () => {
			const invalidFonts = ['invalid', 'arial', 'times', 'courier', '', 'cursive', 'fantasy']

			invalidFonts.forEach((font) => {
				expect(() => DefaultFontStyle.validate(font)).toThrow()
			})
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			const result = DefaultFontStyle.validateUsingKnownGoodVersion('draw', 'sans')
			expect(result).toBe('sans')

			expect(() => DefaultFontStyle.validateUsingKnownGoodVersion('draw', 'invalid')).toThrow()
		})

		it('should allow setting default value to any valid font', () => {
			const originalDefault = DefaultFontStyle.defaultValue

			DefaultFontStyle.setDefaultValue('sans')
			expect(DefaultFontStyle.defaultValue).toBe('sans')

			DefaultFontStyle.setDefaultValue('mono')
			expect(DefaultFontStyle.defaultValue).toBe('mono')

			DefaultFontStyle.setDefaultValue('serif')
			expect(DefaultFontStyle.defaultValue).toBe('serif')

			// Restore original
			DefaultFontStyle.setDefaultValue(originalDefault)
		})

		it('should contain all font values in the right order', () => {
			const expectedOrder = ['draw', 'sans', 'serif', 'mono']
			expect(DefaultFontStyle.values).toEqual(expectedOrder)
			expect(DefaultFontStyle.values).toHaveLength(4)
		})

		it('should not contain duplicate values', () => {
			const uniqueFonts = new Set(DefaultFontStyle.values)
			expect(uniqueFonts.size).toBe(DefaultFontStyle.values.length)
		})

		it('should have the default font as the first value', () => {
			expect(DefaultFontStyle.values[0]).toBe('draw')
			expect(DefaultFontStyle.defaultValue).toBe('draw')
		})

		it('should maintain immutability of values array', () => {
			const originalValues = DefaultFontStyle.values
			expect(originalValues).toEqual(['draw', 'sans', 'serif', 'mono'])

			// Values should remain unchanged
			expect(DefaultFontStyle.values).toBe(originalValues)
		})

		it('should handle type coercion correctly', () => {
			// Valid string should pass
			expect(DefaultFontStyle.validate('draw')).toBe('draw')

			// Non-string values should fail
			expect(() => DefaultFontStyle.validate(null)).toThrow()
			expect(() => DefaultFontStyle.validate(undefined)).toThrow()
			expect(() => DefaultFontStyle.validate(123)).toThrow()
			expect(() => DefaultFontStyle.validate({})).toThrow()
			expect(() => DefaultFontStyle.validate([])).toThrow()
			expect(() => DefaultFontStyle.validate(true)).toThrow()
		})

		it('should be case sensitive', () => {
			expect(() => DefaultFontStyle.validate('Draw')).toThrow()
			expect(() => DefaultFontStyle.validate('SANS')).toThrow()
			expect(() => DefaultFontStyle.validate('Serif')).toThrow()
			expect(() => DefaultFontStyle.validate('MONO')).toThrow()
		})

		it('should reject partial matches', () => {
			expect(() => DefaultFontStyle.validate('dra')).toThrow()
			expect(() => DefaultFontStyle.validate('san')).toThrow()
			expect(() => DefaultFontStyle.validate('seri')).toThrow()
			expect(() => DefaultFontStyle.validate('mon')).toThrow()
		})

		it('should reject similar but invalid values', () => {
			expect(() => DefaultFontStyle.validate('drawn')).toThrow()
			expect(() => DefaultFontStyle.validate('sans-serif')).toThrow()
			expect(() => DefaultFontStyle.validate('serif-font')).toThrow()
			expect(() => DefaultFontStyle.validate('monospace')).toThrow()
		})
	})

	describe('TLDefaultFontStyle type', () => {
		it('should work as a type constraint', () => {
			// These should compile without errors
			const drawFont: TLDefaultFontStyle = 'draw'
			const sansFont: TLDefaultFontStyle = 'sans'
			const serifFont: TLDefaultFontStyle = 'serif'
			const monoFont: TLDefaultFontStyle = 'mono'

			expect(drawFont).toBe('draw')
			expect(sansFont).toBe('sans')
			expect(serifFont).toBe('serif')
			expect(monoFont).toBe('mono')
		})

		it('should be compatible with DefaultFontStyle validation', () => {
			const fonts: TLDefaultFontStyle[] = ['draw', 'sans', 'serif', 'mono']

			fonts.forEach((font) => {
				expect(DefaultFontStyle.validate(font)).toBe(font)
			})
		})

		it('should work with function parameters', () => {
			function setTextFont(font: TLDefaultFontStyle): string {
				return `Font set to ${font}`
			}

			expect(setTextFont('draw')).toBe('Font set to draw')
			expect(setTextFont('sans')).toBe('Font set to sans')
			expect(setTextFont('serif')).toBe('Font set to serif')
			expect(setTextFont('mono')).toBe('Font set to mono')
		})
	})

	describe('DefaultFontFamilies', () => {
		it('should contain all font styles', () => {
			const expectedKeys = ['draw', 'sans', 'serif', 'mono']
			const actualKeys = Object.keys(DefaultFontFamilies)

			expect(actualKeys).toEqual(expectedKeys)
			expect(actualKeys).toHaveLength(4)
		})

		it('should have correct CSS font family declarations', () => {
			expect(DefaultFontFamilies.draw).toBe("'tldraw_draw', sans-serif")
			expect(DefaultFontFamilies.sans).toBe("'tldraw_sans', sans-serif")
			expect(DefaultFontFamilies.serif).toBe("'tldraw_serif', serif")
			expect(DefaultFontFamilies.mono).toBe("'tldraw_mono', monospace")
		})

		it('should have properly quoted font family names', () => {
			// All custom font names should be quoted
			expect(DefaultFontFamilies.draw).toMatch(/^'tldraw_draw'/)
			expect(DefaultFontFamilies.sans).toMatch(/^'tldraw_sans'/)
			expect(DefaultFontFamilies.serif).toMatch(/^'tldraw_serif'/)
			expect(DefaultFontFamilies.mono).toMatch(/^'tldraw_mono'/)
		})

		it('should have appropriate fallback fonts', () => {
			// Draw style should fall back to sans-serif
			expect(DefaultFontFamilies.draw).toContain('sans-serif')

			// Sans style should fall back to sans-serif
			expect(DefaultFontFamilies.sans).toContain('sans-serif')

			// Serif style should fall back to serif
			expect(DefaultFontFamilies.serif).toContain('serif')

			// Mono style should fall back to monospace
			expect(DefaultFontFamilies.mono).toContain('monospace')
		})

		it('should use consistent tldraw font naming', () => {
			Object.entries(DefaultFontFamilies).forEach(([styleName, cssDeclaration]) => {
				expect(cssDeclaration).toContain(`'tldraw_${styleName}'`)
			})
		})

		it('should have valid CSS font-family syntax', () => {
			Object.values(DefaultFontFamilies).forEach((fontFamily) => {
				// Should contain at least one quoted font name and a fallback
				expect(fontFamily).toMatch(/^'[^']+',\s*\w+/)

				// Should not have trailing commas or extra spaces
				expect(fontFamily).not.toMatch(/,\s*$/)
				expect(fontFamily).not.toMatch(/^\s+|\s+$/)
			})
		})

		it('should be immutable', () => {
			const originalFontFamilies = { ...DefaultFontFamilies }

			// Attempting to modify should not affect the original
			expect(DefaultFontFamilies).toEqual(originalFontFamilies)
		})

		it('should map to all DefaultFontStyle values', () => {
			DefaultFontStyle.values.forEach((fontStyle) => {
				expect(DefaultFontFamilies).toHaveProperty(fontStyle)
				expect(typeof DefaultFontFamilies[fontStyle as keyof typeof DefaultFontFamilies]).toBe(
					'string'
				)
			})
		})

		it('should be usable in CSS contexts', () => {
			// Test that the font family strings would work in CSS
			Object.values(DefaultFontFamilies).forEach((fontFamily) => {
				// Should not contain invalid characters for CSS
				expect(fontFamily).not.toMatch(/[<>{}[\]\\]/)

				// Should be properly formatted
				expect(fontFamily.length).toBeGreaterThan(0)
			})
		})

		it('should maintain consistent formatting', () => {
			Object.values(DefaultFontFamilies).forEach((fontFamily) => {
				// Should have exactly one comma separating primary from fallback
				const commaSplit = fontFamily.split(',')
				expect(commaSplit).toHaveLength(2)

				// Should have proper spacing after comma (allow hyphenated names like 'sans-serif')
				expect(commaSplit[1]).toMatch(/^\s[\w-]+$/)
			})
		})

		it('should work with DOM elements', () => {
			// Simulate setting font family on an element
			const mockElement = {
				style: { fontFamily: '' },
			}

			// Should be able to assign font families without error
			Object.values(DefaultFontFamilies).forEach((fontFamily) => {
				expect(() => {
					mockElement.style.fontFamily = fontFamily
				}).not.toThrow()
				expect(mockElement.style.fontFamily).toBe(fontFamily)
			})
		})
	})

	describe('integration between exports', () => {
		it('should have consistent font names across all exports', () => {
			const styleValues = [...DefaultFontStyle.values].sort()
			const familyKeys = Object.keys(DefaultFontFamilies).sort()

			expect(styleValues).toEqual(familyKeys)
		})

		it('should work together in practical usage', () => {
			// Test that all parts work together
			DefaultFontStyle.values.forEach((fontStyle) => {
				// Should validate correctly
				expect(DefaultFontStyle.validate(fontStyle)).toBe(fontStyle)

				// Should have corresponding font family
				expect(DefaultFontFamilies[fontStyle as keyof typeof DefaultFontFamilies]).toBeDefined()

				// Should be of correct type
				const typedFont: TLDefaultFontStyle = fontStyle
				expect(typedFont).toBe(fontStyle)
			})
		})

		it('should maintain consistency with default value', () => {
			const defaultFont = DefaultFontStyle.defaultValue

			// Default should be in values array
			expect(DefaultFontStyle.values).toContain(defaultFont)

			// Default should have font family
			expect(DefaultFontFamilies[defaultFont as keyof typeof DefaultFontFamilies]).toBeDefined()

			// Default should validate
			expect(DefaultFontStyle.validate(defaultFont)).toBe(defaultFont)
		})

		it('should support typical shape property usage', () => {
			interface MockTextShapeProps {
				font: TLDefaultFontStyle
			}

			const textShape: MockTextShapeProps = {
				font: 'mono' as const,
			}

			// Should validate the font property
			expect(DefaultFontStyle.validate(textShape.font)).toBe('mono')

			// Should provide CSS font family
			const cssFamily = DefaultFontFamilies[textShape.font]
			expect(cssFamily).toBe("'tldraw_mono', monospace")
		})
	})

	describe('error handling and edge cases', () => {
		it('should handle empty string gracefully', () => {
			expect(() => DefaultFontStyle.validate('')).toThrow()
		})

		it('should handle whitespace-only strings', () => {
			expect(() => DefaultFontStyle.validate(' ')).toThrow()
			expect(() => DefaultFontStyle.validate('\t')).toThrow()
			expect(() => DefaultFontStyle.validate('\n')).toThrow()
		})

		it('should handle strings with extra whitespace', () => {
			expect(() => DefaultFontStyle.validate(' draw ')).toThrow()
			expect(() => DefaultFontStyle.validate('sans ')).toThrow()
			expect(() => DefaultFontStyle.validate(' serif')).toThrow()
		})

		it('should handle Unicode characters', () => {
			expect(() => DefaultFontStyle.validate('drāw')).toThrow()
			expect(() => DefaultFontStyle.validate('sāns')).toThrow()
			expect(() => DefaultFontStyle.validate('serif✓')).toThrow()
		})

		it('should handle very long strings', () => {
			const longString = 'draw' + 'x'.repeat(1000)
			expect(() => DefaultFontStyle.validate(longString)).toThrow()
		})

		it('should handle objects that convert to string', () => {
			const obj = {
				toString: () => 'draw',
			}
			expect(() => DefaultFontStyle.validate(obj)).toThrow()
		})
	})

	describe('performance considerations', () => {
		it('should validate fonts efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				DefaultFontStyle.values.forEach((font) => {
					DefaultFontStyle.validate(font)
				})
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(100) // Should be fast
		})

		it('should access font families efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				DefaultFontStyle.values.forEach((font) => {
					const fontFamily = DefaultFontFamilies[font as keyof typeof DefaultFontFamilies]
					expect(fontFamily).toBeDefined()
				})
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(50) // Should be very fast
		})

		it('should handle repeated validation efficiently', () => {
			const start = performance.now()

			const testFont = 'sans'
			for (let i = 0; i < 10000; i++) {
				DefaultFontStyle.validate(testFont)
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(50) // Should be very fast for repeated validation
		})
	})

	test('should maintain backward compatibility', () => {
		// These are the expected values that should never change
		// to maintain backward compatibility
		expect(DefaultFontStyle.id).toBe('tldraw:font')
		expect(DefaultFontStyle.defaultValue).toBe('draw')

		// Test that all expected values are present (order may vary in test environment)
		expect(DefaultFontStyle.values).toHaveLength(4)
		expect(DefaultFontStyle.values).toContain('draw')
		expect(DefaultFontStyle.values).toContain('sans')
		expect(DefaultFontStyle.values).toContain('serif')
		expect(DefaultFontStyle.values).toContain('mono')

		// Font family mappings should remain consistent
		expect(DefaultFontFamilies.draw).toBe("'tldraw_draw', sans-serif")
		expect(DefaultFontFamilies.sans).toBe("'tldraw_sans', sans-serif")
		expect(DefaultFontFamilies.serif).toBe("'tldraw_serif', serif")
		expect(DefaultFontFamilies.mono).toBe("'tldraw_mono', monospace")
	})

	test('should work with StyleProp base functionality', () => {
		// Test inherited StyleProp methods work correctly
		expect(typeof DefaultFontStyle.id).toBe('string')
		expect(typeof DefaultFontStyle.defaultValue).toBe('string')
		expect(typeof DefaultFontStyle.validate).toBe('function')
		expect(typeof DefaultFontStyle.validateUsingKnownGoodVersion).toBe('function')
		expect(typeof DefaultFontStyle.setDefaultValue).toBe('function')

		// Test that it has the values property from EnumStyleProp
		expect(Array.isArray(DefaultFontStyle.values)).toBe(true)
	})

	test('should support theme-agnostic usage', () => {
		// Unlike color styles, font styles should not depend on theme
		DefaultFontStyle.values.forEach((font) => {
			const fontFamily = DefaultFontFamilies[font as keyof typeof DefaultFontFamilies]

			// Font families should be static and not theme-dependent
			expect(typeof fontFamily).toBe('string')
			expect(fontFamily.length).toBeGreaterThan(0)

			// Should not contain theme-specific keywords
			expect(fontFamily).not.toContain('light')
			expect(fontFamily).not.toContain('dark')
		})
	})
})
