import { TLDefaultColor, TLDefaultColorStyle, TLTheme } from '@tldraw/tlschema'

/**
 * @public
 */
export const DEFAULT_LIGHT_THEME: TLTheme = {
	id: 'light',
	fontSize: 16,
	lineHeight: 1.35,
	strokeWidth: 2,
	colors: {
		text: '#000000',
		background: '#f9fafb',
		solid: '#fcfffe',
		cursor: 'black',
		black: {
			solid: '#1d1d1d',
			fill: '#1d1d1d',
			linedFill: '#363636',
			semi: '#e8e8e8',
			pattern: '#494949',
		},
		blue: {
			solid: '#4465e9',
			fill: '#4465e9',
			linedFill: '#6580ec',
			semi: '#dce1f8',
			pattern: '#6681ee',
		},
		green: {
			solid: '#099268',
			fill: '#099268',
			linedFill: '#0bad7c',
			semi: '#d3e9e3',
			pattern: '#39a785',
		},
		grey: {
			solid: '#9fa8b2',
			fill: '#9fa8b2',
			linedFill: '#bbc1c9',
			semi: '#eceef0',
			pattern: '#bcc3c9',
		},
		'light-blue': {
			solid: '#4ba1f1',
			fill: '#4ba1f1',
			linedFill: '#7abaf5',
			semi: '#ddedfa',
			pattern: '#6fbbf8',
		},
		'light-green': {
			solid: '#4cb05e',
			fill: '#4cb05e',
			linedFill: '#7ec88c',
			semi: '#dbf0e0',
			pattern: '#65cb78',
		},
		'light-red': {
			solid: '#f87777',
			fill: '#f87777',
			linedFill: '#f99a9a',
			semi: '#f4dadb',
			pattern: '#fe9e9e',
		},
		'light-violet': {
			solid: '#e085f4',
			fill: '#e085f4',
			linedFill: '#e9abf7',
			semi: '#f5eafa',
			pattern: '#e9acf8',
		},
		orange: {
			solid: '#e16919',
			fill: '#e16919',
			linedFill: '#ea8643',
			semi: '#f8e2d4',
			pattern: '#f78438',
		},
		red: {
			solid: '#e03131',
			fill: '#e03131',
			linedFill: '#e75f5f',
			semi: '#f4dadb',
			pattern: '#e55959',
		},
		violet: {
			solid: '#ae3ec9',
			fill: '#ae3ec9',
			linedFill: '#be68d4',
			semi: '#ecdcf2',
			pattern: '#bd63d3',
		},
		yellow: {
			solid: '#f1ac4b',
			fill: '#f1ac4b',
			linedFill: '#f5c27a',
			semi: '#f9f0e6',
			pattern: '#fecb92',
		},
		white: {
			solid: '#FFFFFF',
			fill: '#FFFFFF',
			linedFill: '#ffffff',
			semi: '#f5f5f5',
			pattern: '#f9f9f9',
		},
	},
}

/**
 * @public
 */
export const DEFAULT_DARK_THEME: TLTheme = {
	id: 'dark',
	fontSize: 16,
	lineHeight: 1.35,
	strokeWidth: 2,
	colors: {
		text: 'hsl(210, 17%, 98%)',
		background: 'hsl(240, 5%, 6.5%)',
		solid: '#010403',
		cursor: 'white',

		black: {
			solid: '#f2f2f2',
			fill: '#f2f2f2',
			linedFill: '#ffffff',
			semi: '#2c3036',
			pattern: '#989898',
		},
		blue: {
			solid: '#4f72fc', // 3c60f0
			fill: '#4f72fc',
			linedFill: '#3c5cdd',
			semi: '#262d40',
			pattern: '#3a4b9e',
		},
		green: {
			solid: '#099268',
			fill: '#099268',
			linedFill: '#087856',
			semi: '#253231',
			pattern: '#366a53',
		},
		grey: {
			solid: '#9398b0',
			fill: '#9398b0',
			linedFill: '#8388a5',
			semi: '#33373c',
			pattern: '#7c8187',
		},
		'light-blue': {
			solid: '#4dabf7',
			fill: '#4dabf7',
			linedFill: '#2793ec',
			semi: '#2a3642',
			pattern: '#4d7aa9',
		},
		'light-green': {
			solid: '#40c057',
			fill: '#40c057',
			linedFill: '#37a44b',
			semi: '#2a3830',
			pattern: '#4e874e',
		},
		'light-red': {
			solid: '#ff8787',
			fill: '#ff8787',
			linedFill: '#ff6666',
			semi: '#3c2b2b',
			pattern: '#a56767',
		},
		'light-violet': {
			solid: '#e599f7',
			fill: '#e599f7',
			linedFill: '#dc71f4',
			semi: '#383442',
			pattern: '#9770a9',
		},
		orange: {
			solid: '#f76707',
			fill: '#f76707',
			linedFill: '#f54900',
			semi: '#3b2e27',
			pattern: '#9f552d',
		},
		red: {
			solid: '#e03131',
			fill: '#e03131',
			linedFill: '#c31d1d',
			semi: '#382726',
			pattern: '#8f3734',
		},
		violet: {
			solid: '#ae3ec9',
			fill: '#ae3ec9',
			linedFill: '#8f2fa7',
			semi: '#342938',
			pattern: '#763a8b',
		},
		yellow: {
			solid: '#ffc034',
			fill: '#ffc034',
			linedFill: '#ffae00',
			semi: '#3b352b',
			pattern: '#fecb92',
		},
		white: {
			solid: '#f3f3f3',
			fill: '#f3f3f3',
			linedFill: '#f3f3f3',
			semi: '#f5f5f5',
			pattern: '#f9f9f9',
		},
	},
}

/**
 * Resolves a color style value to its actual CSS color string for a given theme and variant.
 * If the color is not a default theme color, returns the color value as-is.
 *
 * @param theme - The color theme to use for resolution
 * @param color - The color style value to resolve
 * @param variant - Which variant of the color to return (solid, fill, pattern, etc.)
 * @returns The CSS color string for the specified color and variant
 *
 * @example
 * ```ts
 * import { getColorValue } from 'tldraw'
 *
 * const theme = editor.getCurrentTheme()
 *
 * // Get the solid variant of red
 * const redSolid = getColorValue(theme, 'red', 'solid') // '#e03131'
 *
 * // Get the fill variant of blue
 * const blueFill = getColorValue(theme, 'blue', 'fill') // '#4465e9'
 *
 * // Custom color passes through unchanged
 * const customColor = getColorValue(theme, '#ff0000', 'solid') // '#ff0000'
 * ```
 *
 * @public
 */
export function getColorValue(
	theme: TLTheme,
	color: TLDefaultColorStyle | string,
	variant: keyof TLDefaultColor
): string {
	if (!(color in theme.colors)) {
		// If the color is not a key in the theme's colors, assume it's a custom color value and return it directly
		return color
	}
	return theme.colors[color as TLDefaultColorStyle][variant]
}
