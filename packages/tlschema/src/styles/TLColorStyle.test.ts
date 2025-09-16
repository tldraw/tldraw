import { describe, expect, it, test } from 'vitest'
import {
	defaultColorNames,
	DefaultColorStyle,
	DefaultColorThemePalette,
	DefaultLabelColorStyle,
	getColorValue,
	getDefaultColorTheme,
	isDefaultThemeColor,
	TLDefaultColorStyle,
	TLDefaultColorThemeColor,
} from './TLColorStyle'

describe('TLColorStyle', () => {
	describe('defaultColorNames', () => {
		it('should contain expected default colors', () => {
			expect(defaultColorNames).toEqual([
				'black',
				'grey',
				'light-violet',
				'violet',
				'blue',
				'light-blue',
				'yellow',
				'orange',
				'green',
				'light-green',
				'light-red',
				'red',
				'white',
			])
		})

		it('should be a readonly array', () => {
			expect(Array.isArray(defaultColorNames)).toBe(true)
			expect(defaultColorNames).toHaveLength(13)
		})

		it('should contain only string values', () => {
			defaultColorNames.forEach((color) => {
				expect(typeof color).toBe('string')
				expect(color.length).toBeGreaterThan(0)
			})
		})

		it('should not contain duplicates', () => {
			const uniqueColors = new Set(defaultColorNames)
			expect(uniqueColors.size).toBe(defaultColorNames.length)
		})

		it('should contain specific required colors', () => {
			const requiredColors = ['black', 'white', 'red', 'green', 'blue']
			requiredColors.forEach((color) => {
				expect(defaultColorNames).toContain(color)
			})
		})
	})

	describe('DefaultColorThemePalette', () => {
		it('should have lightMode and darkMode properties', () => {
			expect(DefaultColorThemePalette).toHaveProperty('lightMode')
			expect(DefaultColorThemePalette).toHaveProperty('darkMode')
		})

		it('should have correct theme IDs', () => {
			expect(DefaultColorThemePalette.lightMode.id).toBe('light')
			expect(DefaultColorThemePalette.darkMode.id).toBe('dark')
		})

		it('should have base theme properties for light mode', () => {
			const lightTheme = DefaultColorThemePalette.lightMode
			expect(typeof lightTheme.text).toBe('string')
			expect(typeof lightTheme.background).toBe('string')
			expect(typeof lightTheme.solid).toBe('string')
			expect(lightTheme.text).toBe('#000000')
			expect(lightTheme.background).toBe('#f9fafb')
			expect(lightTheme.solid).toBe('#fcfffe')
		})

		it('should have base theme properties for dark mode', () => {
			const darkTheme = DefaultColorThemePalette.darkMode
			expect(typeof darkTheme.text).toBe('string')
			expect(typeof darkTheme.background).toBe('string')
			expect(typeof darkTheme.solid).toBe('string')
			expect(darkTheme.text).toBe('hsl(210, 17%, 98%)')
			expect(darkTheme.background).toBe('hsl(240, 5%, 6.5%)')
			expect(darkTheme.solid).toBe('#010403')
		})

		it('should contain all default colors for both themes', () => {
			const lightTheme = DefaultColorThemePalette.lightMode
			const darkTheme = DefaultColorThemePalette.darkMode

			defaultColorNames.forEach((colorName) => {
				expect(lightTheme).toHaveProperty(colorName)
				expect(darkTheme).toHaveProperty(colorName)
			})
		})

		it('should have proper color theme structure for each color', () => {
			const lightTheme = DefaultColorThemePalette.lightMode
			const darkTheme = DefaultColorThemePalette.darkMode

			const requiredProperties: (keyof TLDefaultColorThemeColor)[] = [
				'solid',
				'semi',
				'pattern',
				'fill',
				'frameHeadingStroke',
				'frameHeadingFill',
				'frameStroke',
				'frameFill',
				'frameText',
				'noteFill',
				'noteText',
				'highlightSrgb',
				'highlightP3',
			]

			defaultColorNames.forEach((colorName) => {
				const lightColor = lightTheme[colorName]
				const darkColor = darkTheme[colorName]

				requiredProperties.forEach((prop) => {
					expect(lightColor).toHaveProperty(prop)
					expect(darkColor).toHaveProperty(prop)
					expect(typeof lightColor[prop]).toBe('string')
					expect(typeof darkColor[prop]).toBe('string')
					expect(lightColor[prop].length).toBeGreaterThan(0)
					expect(darkColor[prop].length).toBeGreaterThan(0)
				})
			})
		})

		it('should have different color values between light and dark themes', () => {
			// Most colors should be different between light and dark themes
			const lightTheme = DefaultColorThemePalette.lightMode
			const darkTheme = DefaultColorThemePalette.darkMode

			// Check colors that actually differ between themes
			// Note: Some colors like red have the same solid value in both themes
			expect(lightTheme.black.solid).not.toBe(darkTheme.black.solid)
			expect(lightTheme.white.solid).not.toBe(darkTheme.white.solid)
			expect(lightTheme.blue.frameText).not.toBe(darkTheme.blue.frameText)
		})

		it('should have valid CSS color format for color values', () => {
			const lightTheme = DefaultColorThemePalette.lightMode

			// Test a sample of colors for valid CSS format
			expect(lightTheme.red.solid).toMatch(/^#[0-9a-fA-F]{6}$/)
			expect(lightTheme.blue.fill).toMatch(/^#[0-9a-fA-F]{6}$/)
			expect(lightTheme.black.frameText).toMatch(/^#[0-9a-fA-F]{6}$/)
		})

		it('should have P3 color values in correct format', () => {
			const lightTheme = DefaultColorThemePalette.lightMode

			// P3 colors should have the color(display-p3 ...) format
			expect(lightTheme.red.highlightP3).toMatch(/^color\(display-p3/)
			expect(lightTheme.blue.highlightP3).toMatch(/^color\(display-p3/)
		})

		it('should have consistent fill and solid values where expected', () => {
			const lightTheme = DefaultColorThemePalette.lightMode

			// According to the interface comment, fill is usually same as solid
			defaultColorNames.forEach((colorName) => {
				const color = lightTheme[colorName]
				expect(color.fill).toBe(color.solid)
			})
		})
	})

	describe('getDefaultColorTheme', () => {
		it('should return light theme when isDarkMode is false', () => {
			const result = getDefaultColorTheme({ isDarkMode: false })
			expect(result).toBe(DefaultColorThemePalette.lightMode)
			expect(result.id).toBe('light')
		})

		it('should return dark theme when isDarkMode is true', () => {
			const result = getDefaultColorTheme({ isDarkMode: true })
			expect(result).toBe(DefaultColorThemePalette.darkMode)
			expect(result.id).toBe('dark')
		})

		it('should handle explicit boolean values', () => {
			const lightResult = getDefaultColorTheme({ isDarkMode: Boolean(false) })
			const darkResult = getDefaultColorTheme({ isDarkMode: Boolean(true) })

			expect(lightResult.id).toBe('light')
			expect(darkResult.id).toBe('dark')
		})

		it('should return the same reference as the palette objects', () => {
			const lightResult = getDefaultColorTheme({ isDarkMode: false })
			const darkResult = getDefaultColorTheme({ isDarkMode: true })

			expect(lightResult).toBe(DefaultColorThemePalette.lightMode)
			expect(darkResult).toBe(DefaultColorThemePalette.darkMode)
		})
	})

	describe('DefaultColorStyle', () => {
		it('should be a StyleProp with correct configuration', () => {
			expect(DefaultColorStyle.id).toBe('tldraw:color')
			expect(DefaultColorStyle.defaultValue).toBe('black')
		})

		it('should validate all default color names', () => {
			defaultColorNames.forEach((color) => {
				expect(() => DefaultColorStyle.validate(color)).not.toThrow()
				expect(DefaultColorStyle.validate(color)).toBe(color)
			})
		})

		it('should reject invalid color names', () => {
			const invalidColors = ['invalid', 'pink', 'purple', 'cyan', '']

			invalidColors.forEach((color) => {
				expect(() => DefaultColorStyle.validate(color)).toThrow()
			})
		})

		it('should have values property with all default colors', () => {
			expect(DefaultColorStyle.values).toEqual(defaultColorNames)
		})

		it('should allow setting default value to any valid color', () => {
			const originalDefault = DefaultColorStyle.defaultValue

			DefaultColorStyle.setDefaultValue('red')
			expect(DefaultColorStyle.defaultValue).toBe('red')

			DefaultColorStyle.setDefaultValue('blue')
			expect(DefaultColorStyle.defaultValue).toBe('blue')

			// Restore original
			DefaultColorStyle.setDefaultValue(originalDefault)
		})

		it('should work with validateUsingKnownGoodVersion', () => {
			const result = DefaultColorStyle.validateUsingKnownGoodVersion('red', 'blue')
			expect(result).toBe('blue')

			expect(() => DefaultColorStyle.validateUsingKnownGoodVersion('red', 'invalid')).toThrow()
		})
	})

	describe('DefaultLabelColorStyle', () => {
		it('should be a StyleProp with correct configuration', () => {
			expect(DefaultLabelColorStyle.id).toBe('tldraw:labelColor')
			expect(DefaultLabelColorStyle.defaultValue).toBe('black')
		})

		it('should validate all default color names', () => {
			defaultColorNames.forEach((color) => {
				expect(() => DefaultLabelColorStyle.validate(color)).not.toThrow()
				expect(DefaultLabelColorStyle.validate(color)).toBe(color)
			})
		})

		it('should reject invalid color names', () => {
			const invalidColors = ['invalid', 'pink', 'purple', 'cyan', '']

			invalidColors.forEach((color) => {
				expect(() => DefaultLabelColorStyle.validate(color)).toThrow()
			})
		})

		it('should have values property with all default colors', () => {
			expect(DefaultLabelColorStyle.values).toEqual(defaultColorNames)
		})

		it('should be separate from DefaultColorStyle', () => {
			expect(DefaultColorStyle.id).not.toBe(DefaultLabelColorStyle.id)
			expect(DefaultColorStyle).not.toBe(DefaultLabelColorStyle)
		})

		it('should allow different default values from DefaultColorStyle', () => {
			const originalColorDefault = DefaultColorStyle.defaultValue
			const originalLabelDefault = DefaultLabelColorStyle.defaultValue

			DefaultColorStyle.setDefaultValue('red')
			DefaultLabelColorStyle.setDefaultValue('blue')

			expect(DefaultColorStyle.defaultValue).toBe('red')
			expect(DefaultLabelColorStyle.defaultValue).toBe('blue')
			expect(DefaultColorStyle.defaultValue).not.toBe(DefaultLabelColorStyle.defaultValue)

			// Restore originals
			DefaultColorStyle.setDefaultValue(originalColorDefault)
			DefaultLabelColorStyle.setDefaultValue(originalLabelDefault)
		})
	})

	describe('isDefaultThemeColor', () => {
		it('should return true for all default color names', () => {
			defaultColorNames.forEach((color) => {
				expect(isDefaultThemeColor(color)).toBe(true)
			})
		})

		it('should return false for invalid color names', () => {
			const invalidColors = ['invalid', 'pink', 'purple', 'cyan', '', 'custom-color']

			invalidColors.forEach((color) => {
				expect(isDefaultThemeColor(color as TLDefaultColorStyle)).toBe(false)
			})
		})

		it('should return false for hex colors', () => {
			const hexColors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000']

			hexColors.forEach((color) => {
				expect(isDefaultThemeColor(color as TLDefaultColorStyle)).toBe(false)
			})
		})

		it('should return false for CSS color names not in defaults', () => {
			// Use CSS color names that are NOT in the default color list
			const cssColors = ['aqua', 'fuchsia', 'lime', 'navy', 'silver']

			cssColors.forEach((color) => {
				expect(isDefaultThemeColor(color as TLDefaultColorStyle)).toBe(false)
			})
		})

		it('should handle edge cases', () => {
			expect(isDefaultThemeColor(null as any)).toBe(false)
			expect(isDefaultThemeColor(undefined as any)).toBe(false)
			expect(isDefaultThemeColor(123 as any)).toBe(false)
			expect(isDefaultThemeColor({} as any)).toBe(false)
		})

		it('should be case sensitive', () => {
			expect(isDefaultThemeColor('Black' as TLDefaultColorStyle)).toBe(false)
			expect(isDefaultThemeColor('RED' as TLDefaultColorStyle)).toBe(false)
			expect(isDefaultThemeColor('Blue' as TLDefaultColorStyle)).toBe(false)
		})

		it('should work as a type guard', () => {
			const color: TLDefaultColorStyle = 'red'

			if (isDefaultThemeColor(color)) {
				// TypeScript should narrow the type here
				expect(defaultColorNames.includes(color)).toBe(true)
			}
		})
	})

	describe('getColorValue', () => {
		const lightTheme = DefaultColorThemePalette.lightMode
		const darkTheme = DefaultColorThemePalette.darkMode

		it('should return correct color values for default colors', () => {
			expect(getColorValue(lightTheme, 'red', 'solid')).toBe('#e03131')
			expect(getColorValue(lightTheme, 'blue', 'fill')).toBe('#4465e9')
			expect(getColorValue(lightTheme, 'black', 'solid')).toBe('#1d1d1d')
		})

		it('should work with different variants', () => {
			const variants: (keyof TLDefaultColorThemeColor)[] = [
				'solid',
				'semi',
				'pattern',
				'fill',
				'frameHeadingStroke',
				'frameHeadingFill',
				'frameStroke',
				'frameFill',
				'frameText',
				'noteFill',
				'noteText',
				'highlightSrgb',
				'highlightP3',
			]

			variants.forEach((variant) => {
				const result = getColorValue(lightTheme, 'red', variant)
				expect(typeof result).toBe('string')
				expect(result.length).toBeGreaterThan(0)
				expect(result).toBe(lightTheme.red[variant])
			})
		})

		it('should return different values for light and dark themes', () => {
			// Use colors/variants that actually differ between themes
			expect(getColorValue(lightTheme, 'black', 'solid')).not.toBe(
				getColorValue(darkTheme, 'black', 'solid')
			)
			expect(getColorValue(lightTheme, 'white', 'solid')).not.toBe(
				getColorValue(darkTheme, 'white', 'solid')
			)
		})

		it('should pass through non-default colors unchanged', () => {
			const customColors = ['#ff0000', '#00ff00', '#0000ff', 'custom-color', 'rgb(255, 0, 0)']

			customColors.forEach((color) => {
				expect(getColorValue(lightTheme, color as TLDefaultColorStyle, 'solid')).toBe(color)
				expect(getColorValue(darkTheme, color as TLDefaultColorStyle, 'fill')).toBe(color)
			})
		})

		it('should work with all default colors', () => {
			defaultColorNames.forEach((colorName) => {
				const lightResult = getColorValue(lightTheme, colorName, 'solid')
				const darkResult = getColorValue(darkTheme, colorName, 'solid')

				expect(typeof lightResult).toBe('string')
				expect(typeof darkResult).toBe('string')
				expect(lightResult).toBe(lightTheme[colorName].solid)
				expect(darkResult).toBe(darkTheme[colorName].solid)
			})
		})

		it('should handle edge cases gracefully', () => {
			// Test with empty string
			expect(getColorValue(lightTheme, '' as TLDefaultColorStyle, 'solid')).toBe('')

			// Test with null/undefined (they should pass through)
			expect(getColorValue(lightTheme, null as any, 'solid')).toBe(null)
			expect(getColorValue(lightTheme, undefined as any, 'solid')).toBe(undefined)
		})

		it('should work consistently across all variants for a color', () => {
			const color = 'blue'
			const variants: (keyof TLDefaultColorThemeColor)[] = [
				'solid',
				'semi',
				'pattern',
				'fill',
				'frameHeadingStroke',
				'frameHeadingFill',
				'frameStroke',
				'frameFill',
				'frameText',
				'noteFill',
				'noteText',
				'highlightSrgb',
				'highlightP3',
			]

			variants.forEach((variant) => {
				const lightResult = getColorValue(lightTheme, color, variant)
				const darkResult = getColorValue(darkTheme, color, variant)

				expect(lightResult).toBe(lightTheme[color][variant])
				expect(darkResult).toBe(darkTheme[color][variant])
			})
		})

		it('should maintain consistency with isDefaultThemeColor', () => {
			const testColors = [...defaultColorNames, '#ff0000', 'custom', 'invalid']

			testColors.forEach((color) => {
				const isDefault = isDefaultThemeColor(color as TLDefaultColorStyle)
				const result = getColorValue(lightTheme, color as TLDefaultColorStyle, 'solid')

				if (isDefault) {
					// Should return the theme color value
					expect(result).toBe(
						(lightTheme[color as keyof typeof lightTheme] as TLDefaultColorThemeColor).solid
					)
				} else {
					// Should pass through unchanged
					expect(result).toBe(color)
				}
			})
		})
	})

	describe('type safety and integration', () => {
		it('should have proper TypeScript types', () => {
			// Test that TLDefaultColorStyle is properly typed
			const validColor: TLDefaultColorStyle = 'red'
			expect(DefaultColorStyle.validate(validColor)).toBe('red')
		})

		it('should work with both color style props', () => {
			const colorValue: TLDefaultColorStyle = 'blue'
			const labelColorValue: TLDefaultColorStyle = 'white'

			expect(DefaultColorStyle.validate(colorValue)).toBe('blue')
			expect(DefaultLabelColorStyle.validate(labelColorValue)).toBe('white')
		})

		it('should integrate properly with theme system', () => {
			const theme = getDefaultColorTheme({ isDarkMode: false })
			const color: TLDefaultColorStyle = 'red'

			if (isDefaultThemeColor(color)) {
				const colorValue = getColorValue(theme, color, 'solid')
				expect(typeof colorValue).toBe('string')
				expect(colorValue).toBe(theme.red.solid)
			}
		})

		it('should maintain consistent behavior across all exports', () => {
			// Test that all parts work together correctly
			const theme = getDefaultColorTheme({ isDarkMode: false })

			defaultColorNames.forEach((colorName) => {
				// Should validate in both style props
				expect(DefaultColorStyle.validate(colorName)).toBe(colorName)
				expect(DefaultLabelColorStyle.validate(colorName)).toBe(colorName)

				// Should be recognized as default theme color
				expect(isDefaultThemeColor(colorName)).toBe(true)

				// Should resolve to theme color value
				const colorValue = getColorValue(theme, colorName, 'solid')
				expect(colorValue).toBe(theme[colorName].solid)
			})
		})
	})

	describe('error handling and edge cases', () => {
		it('should handle malformed theme objects gracefully', () => {
			// Create a partial theme for testing edge cases
			const partialTheme = {
				...DefaultColorThemePalette.lightMode,
				red: {
					...DefaultColorThemePalette.lightMode.red,
					solid: undefined,
				} as any,
			}

			// getColorValue should still work but return undefined for this case
			expect(getColorValue(partialTheme, 'red', 'solid')).toBe(undefined)
		})

		it('should handle very large color names', () => {
			const longColorName = 'a'.repeat(1000)
			expect(isDefaultThemeColor(longColorName as TLDefaultColorStyle)).toBe(false)
			expect(
				getColorValue(
					DefaultColorThemePalette.lightMode,
					longColorName as TLDefaultColorStyle,
					'solid'
				)
			).toBe(longColorName)
		})

		it('should handle special characters in color values', () => {
			const specialColors = ['color-with-dashes', 'color_with_underscores', 'color.with.dots']

			specialColors.forEach((color) => {
				expect(isDefaultThemeColor(color as TLDefaultColorStyle)).toBe(false)
				expect(
					getColorValue(DefaultColorThemePalette.lightMode, color as TLDefaultColorStyle, 'solid')
				).toBe(color)
			})
		})

		test('should maintain immutability of exported objects', () => {
			const originalLightTheme = DefaultColorThemePalette.lightMode
			const originalDarkTheme = DefaultColorThemePalette.darkMode
			const originalColorNames = defaultColorNames

			// These should be the same references
			expect(getDefaultColorTheme({ isDarkMode: false })).toBe(originalLightTheme)
			expect(getDefaultColorTheme({ isDarkMode: true })).toBe(originalDarkTheme)

			// Arrays should maintain their values
			expect(defaultColorNames).toEqual(originalColorNames)
			expect(DefaultColorStyle.values).toEqual(originalColorNames)
		})
	})

	describe('performance considerations', () => {
		it('should validate colors efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				defaultColorNames.forEach((color) => {
					DefaultColorStyle.validate(color)
					isDefaultThemeColor(color)
				})
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(100) // Should be fast
		})

		it('should resolve color values efficiently', () => {
			const theme = DefaultColorThemePalette.lightMode
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				defaultColorNames.forEach((color) => {
					getColorValue(theme, color, 'solid')
					getColorValue(theme, color, 'fill')
				})
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(50) // Should be very fast
		})

		it('should handle theme switching efficiently', () => {
			const start = performance.now()

			for (let i = 0; i < 1000; i++) {
				getDefaultColorTheme({ isDarkMode: i % 2 === 0 })
			}

			const end = performance.now()
			expect(end - start).toBeLessThan(10) // Should be extremely fast (just returns references)
		})
	})
})
