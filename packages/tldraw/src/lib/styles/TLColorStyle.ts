import {
	DefaultColorStyle,
	StyleUtil,
	TLDefaultColorStyle,
	TLDefaultColorThemeColor,
	getColorValue,
	getDefaultColorTheme,
} from '@tldraw/editor'

/** @public */
export abstract class ColorStyleUtil<T> extends StyleUtil<T, 'tldraw:color2'> {
	static id = 'tldraw:color2'

	/**
	 * Get a CSS color value for the given color, variant, and optional theme.
	 * If no theme is provided, uses the current editor theme (light/dark mode).
	 */
	abstract toCssColor(colorValue: T, variant: string, theme?: 'light' | 'dark'): string
}

/** @public */
export interface DefaultColorStyleOptions {
	defaultColor: TLDefaultColorStyle
}

/** @public */
export class DefaultColorStyleUtil extends ColorStyleUtil<TLDefaultColorStyle> {
	static validator = DefaultColorStyle

	override options: DefaultColorStyleOptions = {
		defaultColor: 'black',
	}

	override getDefaultValue(): TLDefaultColorStyle {
		return this.options.defaultColor
	}

	override toCssColor(
		colorValue: TLDefaultColorStyle,
		variant: keyof TLDefaultColorThemeColor,
		theme?: 'light' | 'dark'
	): string {
		// Determine which theme to use
		const themeMode = theme ?? (this.editor.user.getIsDarkMode() ? 'dark' : 'light')
		const colorTheme = getDefaultColorTheme({ isDarkMode: themeMode === 'dark' })

		return getColorValue(colorTheme, colorValue, variant)
	}
}
