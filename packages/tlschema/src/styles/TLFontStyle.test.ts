import { describe, expect, it, test } from 'vitest'
import { DefaultFontFamilies, DefaultFontStyle, TLDefaultFontStyle } from './TLFontStyle'

describe('TLFontStyle', () => {
	describe('DefaultFontStyle', () => {
		it('should validate all valid font values', () => {
			const validFonts: TLDefaultFontStyle[] = ['draw', 'sans', 'serif', 'mono']
			validFonts.forEach((font) => {
				expect(DefaultFontStyle.validate(font)).toBe(font)
			})
		})

		it('should reject invalid font values', () => {
			const invalidFonts = ['invalid', 'arial', '', 'Draw', 'SANS']
			invalidFonts.forEach((font) => {
				expect(() => DefaultFontStyle.validate(font)).toThrow()
			})
		})
	})

	describe('DefaultFontFamilies', () => {
		it('should have correct CSS font family declarations', () => {
			expect(DefaultFontFamilies.draw).toBe("'tldraw_draw', sans-serif")
			expect(DefaultFontFamilies.sans).toBe("'tldraw_sans', sans-serif")
			expect(DefaultFontFamilies.serif).toBe("'tldraw_serif', serif")
			expect(DefaultFontFamilies.mono).toBe("'tldraw_mono', monospace")
		})

		it('should map to all DefaultFontStyle values', () => {
			DefaultFontStyle.values.forEach((fontStyle) => {
				expect(DefaultFontFamilies).toHaveProperty(fontStyle)
				expect(typeof DefaultFontFamilies[fontStyle as keyof typeof DefaultFontFamilies]).toBe(
					'string'
				)
			})
		})
	})

	describe('integration', () => {
		it('should have consistent font names across exports', () => {
			const styleValues = [...DefaultFontStyle.values].sort()
			const familyKeys = Object.keys(DefaultFontFamilies).sort()
			expect(styleValues).toEqual(familyKeys)
		})
	})

	test('should maintain backward compatibility', () => {
		expect(DefaultFontStyle.id).toBe('tldraw:font')
		expect(DefaultFontStyle.defaultValue).toBe('draw')
		expect(DefaultFontStyle.values).toEqual(['draw', 'sans', 'serif', 'mono'])

		// Font family mappings should remain consistent
		expect(DefaultFontFamilies.draw).toBe("'tldraw_draw', sans-serif")
		expect(DefaultFontFamilies.sans).toBe("'tldraw_sans', sans-serif")
		expect(DefaultFontFamilies.serif).toBe("'tldraw_serif', serif")
		expect(DefaultFontFamilies.mono).toBe("'tldraw_mono', monospace")
	})
})
