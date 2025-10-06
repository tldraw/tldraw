import { Expand } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/**
 * Array of default color names available in tldraw's color palette.
 * These colors form the basis for the default color style system and are available
 * in both light and dark theme variants.
 *
 * @example
 * ```ts
 * import { defaultColorNames } from '@tldraw/tlschema'
 *
 * // Create a color picker with all default colors
 * const colorOptions = defaultColorNames.map(color => ({
 *   name: color,
 *   value: color
 * }))
 * ```
 *
 * @public
 */
export const defaultColorNames = [
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
] as const

/**
 * Defines the color variants available for each color in the default theme.
 * Each color has multiple variants for different use cases like fills, strokes,
 * patterns, and UI elements like frames and notes.
 *
 * @example
 * ```ts
 * import { TLDefaultColorThemeColor } from '@tldraw/tlschema'
 *
 * const blueColor: TLDefaultColorThemeColor = {
 *   solid: '#4465e9',
 *   semi: '#dce1f8',
 *   pattern: '#6681ee',
 *   fill: '#4465e9',
 *   // ... other variants
 * }
 * ```
 *
 * @public
 */
export interface TLDefaultColorThemeColor {
	solid: string
	semi: string
	pattern: string
	fill: string // usually same as solid
	frameHeadingStroke: string
	frameHeadingFill: string
	frameStroke: string
	frameFill: string
	frameText: string
	noteFill: string
	noteText: string
	highlightSrgb: string
	highlightP3: string
}

/**
 * Complete color theme definition containing all colors and their variants
 * for either light or dark mode. Includes base theme properties and all
 * default colors with their respective color variants.
 *
 * @example
 * ```ts
 * import { TLDefaultColorTheme } from '@tldraw/tlschema'
 *
 * const customTheme: TLDefaultColorTheme = {
 *   id: 'light',
 *   text: '#000000',
 *   background: '#ffffff',
 *   solid: '#fcfffe',
 *   black: { solid: '#000000', semi: '#cccccc', ... },
 *   // ... other colors
 * }
 * ```
 *
 * @public
 */
export type TLDefaultColorTheme = Expand<
	{
		id: 'light' | 'dark'
		text: string
		background: string
		solid: string
	} & Record<(typeof defaultColorNames)[number], TLDefaultColorThemeColor>
>

/**
 * Complete color palette containing both light and dark theme definitions.
 * This object provides the full color system used by tldraw's default themes,
 * including all color variants and theme-specific adjustments.
 *
 * @example
 * ```ts
 * import { DefaultColorThemePalette } from '@tldraw/tlschema'
 *
 * // Get the dark theme colors
 * const darkTheme = DefaultColorThemePalette.darkMode
 * const redColor = darkTheme.red.solid // '#e03131'
 *
 * // Access light theme colors
 * const lightTheme = DefaultColorThemePalette.lightMode
 * const blueColor = lightTheme.blue.fill // '#4465e9'
 * ```
 *
 * @public
 */
export const DefaultColorThemePalette: {
	lightMode: TLDefaultColorTheme
	darkMode: TLDefaultColorTheme
} = {
	lightMode: {
		id: 'light',
		text: '#000000',
		background: '#f9fafb',
		solid: '#fcfffe',
		black: {
			solid: '#1d1d1d',
			fill: '#1d1d1d',
			frameHeadingStroke: '#717171',
			frameHeadingFill: '#ffffff',
			frameStroke: '#717171',
			frameFill: '#ffffff',
			frameText: '#000000',
			noteFill: '#FCE19C',
			noteText: '#000000',
			semi: '#e8e8e8',
			pattern: '#494949',
			highlightSrgb: '#fddd00',
			highlightP3: 'color(display-p3 0.972 0.8205 0.05)',
		},
		blue: {
			solid: '#4465e9',
			fill: '#4465e9',
			frameHeadingStroke: '#6681ec',
			frameHeadingFill: '#f9fafe',
			frameStroke: '#6681ec',
			frameFill: '#f9fafe',
			frameText: '#000000',
			noteFill: '#8AA3FF',
			noteText: '#000000',
			semi: '#dce1f8',
			pattern: '#6681ee',
			highlightSrgb: '#10acff',
			highlightP3: 'color(display-p3 0.308 0.6632 0.9996)',
		},
		green: {
			solid: '#099268',
			fill: '#099268',
			frameHeadingStroke: '#37a684',
			frameHeadingFill: '#f8fcfa',
			frameStroke: '#37a684',
			frameFill: '#f8fcfa',
			frameText: '#000000',
			noteFill: '#6FC896',
			noteText: '#000000',
			semi: '#d3e9e3',
			pattern: '#39a785',
			highlightSrgb: '#00ffc8',
			highlightP3: 'color(display-p3 0.2536 0.984 0.7981)',
		},
		grey: {
			solid: '#9fa8b2',
			fill: '#9fa8b2',
			frameHeadingStroke: '#aaaaab',
			frameHeadingFill: '#fbfcfc',
			frameStroke: '#aaaaab',
			frameFill: '#fcfcfd',
			frameText: '#000000',
			noteFill: '#C0CAD3',
			noteText: '#000000',
			semi: '#eceef0',
			pattern: '#bcc3c9',
			highlightSrgb: '#cbe7f1',
			highlightP3: 'color(display-p3 0.8163 0.9023 0.9416)',
		},
		'light-blue': {
			solid: '#4ba1f1',
			fill: '#4ba1f1',
			frameHeadingStroke: '#6cb2f3',
			frameHeadingFill: '#f8fbfe',
			frameStroke: '#6cb2f3',
			frameFill: '#fafcff',
			frameText: '#000000',
			noteFill: '#9BC4FD',
			noteText: '#000000',
			semi: '#ddedfa',
			pattern: '#6fbbf8',
			highlightSrgb: '#00f4ff',
			highlightP3: 'color(display-p3 0.1512 0.9414 0.9996)',
		},
		'light-green': {
			solid: '#4cb05e',
			fill: '#4cb05e',
			frameHeadingStroke: '#6dbe7c',
			frameHeadingFill: '#f8fcf9',
			frameStroke: '#6dbe7c',
			frameFill: '#fafdfa',
			frameText: '#000000',
			noteFill: '#98D08A',
			noteText: '#000000',
			semi: '#dbf0e0',
			pattern: '#65cb78',
			highlightSrgb: '#65f641',
			highlightP3: 'color(display-p3 0.563 0.9495 0.3857)',
		},
		'light-red': {
			solid: '#f87777',
			fill: '#f87777',
			frameHeadingStroke: '#f89090',
			frameHeadingFill: '#fffafa',
			frameStroke: '#f89090',
			frameFill: '#fffbfb',
			frameText: '#000000',
			noteFill: '#F7A5A1',
			noteText: '#000000',
			semi: '#f4dadb',
			pattern: '#fe9e9e',
			highlightSrgb: '#ff7fa3',
			highlightP3: 'color(display-p3 0.9988 0.5301 0.6397)',
		},
		'light-violet': {
			solid: '#e085f4',
			fill: '#e085f4',
			frameHeadingStroke: '#e59bf5',
			frameHeadingFill: '#fefaff',
			frameStroke: '#e59bf5',
			frameFill: '#fefbff',
			frameText: '#000000',
			noteFill: '#DFB0F9',
			noteText: '#000000',
			semi: '#f5eafa',
			pattern: '#e9acf8',
			highlightSrgb: '#ff88ff',
			highlightP3: 'color(display-p3 0.9676 0.5652 0.9999)',
		},
		orange: {
			solid: '#e16919',
			fill: '#e16919',
			frameHeadingStroke: '#e68544',
			frameHeadingFill: '#fef9f6',
			frameStroke: '#e68544',
			frameFill: '#fef9f6',
			frameText: '#000000',
			noteFill: '#FAA475',
			noteText: '#000000',
			semi: '#f8e2d4',
			pattern: '#f78438',
			highlightSrgb: '#ffa500',
			highlightP3: 'color(display-p3 0.9988 0.6905 0.266)',
		},
		red: {
			solid: '#e03131',
			fill: '#e03131',
			frameHeadingStroke: '#e55757',
			frameHeadingFill: '#fef7f7',
			frameStroke: '#e55757',
			frameFill: '#fef9f9',
			frameText: '#000000',
			noteFill: '#FC8282',
			noteText: '#000000',
			semi: '#f4dadb',
			pattern: '#e55959',
			highlightSrgb: '#ff636e',
			highlightP3: 'color(display-p3 0.9992 0.4376 0.45)',
		},
		violet: {
			solid: '#ae3ec9',
			fill: '#ae3ec9',
			frameHeadingStroke: '#bc62d3',
			frameHeadingFill: '#fcf7fd',
			frameStroke: '#bc62d3',
			frameFill: '#fdf9fd',
			frameText: '#000000',
			noteFill: '#DB91FD',
			noteText: '#000000',
			semi: '#ecdcf2',
			pattern: '#bd63d3',
			highlightSrgb: '#c77cff',
			highlightP3: 'color(display-p3 0.7469 0.5089 0.9995)',
		},
		yellow: {
			solid: '#f1ac4b',
			fill: '#f1ac4b',
			frameHeadingStroke: '#f3bb6c',
			frameHeadingFill: '#fefcf8',
			frameStroke: '#f3bb6c',
			frameFill: '#fffdfa',
			frameText: '#000000',
			noteFill: '#FED49A',
			noteText: '#000000',
			semi: '#f9f0e6',
			pattern: '#fecb92',
			highlightSrgb: '#fddd00',
			highlightP3: 'color(display-p3 0.972 0.8705 0.05)',
		},
		white: {
			solid: '#FFFFFF',
			fill: '#FFFFFF',
			semi: '#f5f5f5',
			pattern: '#f9f9f9',
			frameHeadingStroke: '#7d7d7d',
			frameHeadingFill: '#ffffff',
			frameStroke: '#7d7d7d',
			frameFill: '#ffffff',
			frameText: '#000000',
			noteFill: '#FFFFFF',
			noteText: '#000000',
			highlightSrgb: '#ffffff',
			highlightP3: 'color(display-p3 1 1 1)',
		},
	},
	darkMode: {
		id: 'dark',
		text: 'hsl(210, 17%, 98%)',
		background: 'hsl(240, 5%, 6.5%)',
		solid: '#010403',

		black: {
			solid: '#f2f2f2',
			fill: '#f2f2f2',
			frameHeadingStroke: '#5c5c5c',
			frameHeadingFill: '#252525',
			frameStroke: '#5c5c5c',
			frameFill: '#0c0c0c',
			frameText: '#f2f2f2',
			noteFill: '#2c2c2c',
			noteText: '#f2f2f2',
			semi: '#2c3036',
			pattern: '#989898',
			highlightSrgb: '#d2b700',
			highlightP3: 'color(display-p3 0.8078 0.6225 0.0312)',
		},
		blue: {
			solid: '#4f72fc', // 3c60f0
			fill: '#4f72fc',
			frameHeadingStroke: '#384994',
			frameHeadingFill: '#1C2036',
			frameStroke: '#384994',
			frameFill: '#11141f',
			frameText: '#f2f2f2',
			noteFill: '#2A3F98',
			noteText: '#f2f2f2',
			semi: '#262d40',
			pattern: '#3a4b9e',
			highlightSrgb: '#0079d2',
			highlightP3: 'color(display-p3 0.0032 0.4655 0.7991)',
		},
		green: {
			solid: '#099268',
			fill: '#099268',
			frameHeadingStroke: '#10513C',
			frameHeadingFill: '#14241f',
			frameStroke: '#10513C',
			frameFill: '#0E1614',
			frameText: '#f2f2f2',
			noteFill: '#014429',
			noteText: '#f2f2f2',
			semi: '#253231',
			pattern: '#366a53',
			highlightSrgb: '#009774',
			highlightP3: 'color(display-p3 0.0085 0.582 0.4604)',
		},
		grey: {
			solid: '#9398b0',
			fill: '#9398b0',
			frameHeadingStroke: '#42474D',
			frameHeadingFill: '#23262A',
			frameStroke: '#42474D',
			frameFill: '#151719',
			frameText: '#f2f2f2',
			noteFill: '#56595F',
			noteText: '#f2f2f2',
			semi: '#33373c',
			pattern: '#7c8187',
			highlightSrgb: '#9cb4cb',
			highlightP3: 'color(display-p3 0.6299 0.7012 0.7856)',
		},
		'light-blue': {
			solid: '#4dabf7',
			fill: '#4dabf7',
			frameHeadingStroke: '#075797',
			frameHeadingFill: '#142839',
			frameStroke: '#075797',
			frameFill: '#0B1823',
			frameText: '#f2f2f2',
			noteFill: '#1F5495',
			noteText: '#f2f2f2',
			semi: '#2a3642',
			pattern: '#4d7aa9',
			highlightSrgb: '#00bdc8',
			highlightP3: 'color(display-p3 0.0023 0.7259 0.7735)',
		},
		'light-green': {
			solid: '#40c057',
			fill: '#40c057',
			frameHeadingStroke: '#1C5427',
			frameHeadingFill: '#18251A',
			frameStroke: '#1C5427',
			frameFill: '#0F1911',
			frameText: '#f2f2f2',
			noteFill: '#21581D',
			noteText: '#f2f2f2',
			semi: '#2a3830',
			pattern: '#4e874e',
			highlightSrgb: '#00a000',
			highlightP3: 'color(display-p3 0.2711 0.6172 0.0195)',
		},
		'light-red': {
			solid: '#ff8787',
			fill: '#ff8787',
			frameHeadingStroke: '#6f3232', // Darker and desaturated variant of solid
			frameHeadingFill: '#341818', // Deep, muted dark red
			frameStroke: '#6f3232', // Matches headingStroke
			frameFill: '#181212', // Darker, muted background shade
			frameText: '#f2f2f2', // Consistent bright text color
			noteFill: '#7a3333', // Medium-dark, muted variant of solid
			noteText: '#f2f2f2',
			semi: '#3c2b2b', // Subdued, darker neutral-red tone
			pattern: '#a56767', // Existing pattern shade retained
			highlightSrgb: '#db005b',
			highlightP3: 'color(display-p3 0.7849 0.0585 0.3589)',
		},
		'light-violet': {
			solid: '#e599f7',
			fill: '#e599f7',
			frameHeadingStroke: '#6c367a',
			frameHeadingFill: '#2D2230',
			frameStroke: '#6c367a',
			frameFill: '#1C151E',
			frameText: '#f2f2f2',
			noteFill: '#762F8E',
			noteText: '#f2f2f2',
			semi: '#383442',
			pattern: '#9770a9',
			highlightSrgb: '#c400c7',
			highlightP3: 'color(display-p3 0.7024 0.0403 0.753)',
		},
		orange: {
			solid: '#f76707',
			fill: '#f76707',
			frameHeadingStroke: '#773a0e', // Darker, muted version of solid
			frameHeadingFill: '#2f1d13', // Deep, warm, muted background
			frameStroke: '#773a0e', // Matches headingStroke
			frameFill: '#1c1512', // Darker, richer muted background
			frameText: '#f2f2f2', // Bright text for contrast
			noteFill: '#7c3905', // Muted dark variant for note fill
			noteText: '#f2f2f2',
			semi: '#3b2e27', // Muted neutral-orange tone
			pattern: '#9f552d', // Retained existing shade
			highlightSrgb: '#d07a00',
			highlightP3: 'color(display-p3 0.7699 0.4937 0.0085)',
		},
		red: {
			solid: '#e03131',
			fill: '#e03131',
			frameHeadingStroke: '#701e1e', // Darker, muted variation of solid
			frameHeadingFill: '#301616', // Deep, muted reddish backdrop
			frameStroke: '#701e1e', // Matches headingStroke
			frameFill: '#1b1313', // Rich, dark muted background
			frameText: '#f2f2f2', // Bright text for readability
			noteFill: '#7e201f', // Muted dark variant for note fill
			noteText: '#f2f2f2',
			semi: '#382726', // Dark neutral-red tone
			pattern: '#8f3734', // Existing pattern color retained
			highlightSrgb: '#de002c',
			highlightP3: 'color(display-p3 0.7978 0.0509 0.2035)',
		},
		violet: {
			solid: '#ae3ec9',
			fill: '#ae3ec9',
			frameHeadingStroke: '#6d1583', // Darker, muted variation of solid
			frameHeadingFill: '#27152e', // Deep, rich muted violet backdrop
			frameStroke: '#6d1583', // Matches headingStroke
			frameFill: '#1b0f21', // Darker muted violet background
			frameText: '#f2f2f2', // Consistent bright text color
			noteFill: '#5f1c70', // Muted dark variant for note fill
			noteText: '#f2f2f2',
			semi: '#342938', // Dark neutral-violet tone
			pattern: '#763a8b', // Retained existing pattern color
			highlightSrgb: '#9e00ee',
			highlightP3: 'color(display-p3 0.5651 0.0079 0.8986)',
		},
		yellow: {
			solid: '#ffc034',
			fill: '#ffc034',
			frameHeadingStroke: '#684e12', // Darker, muted variant of solid
			frameHeadingFill: '#2a2113', // Rich, muted dark-yellow background
			frameStroke: '#684e12', // Matches headingStroke
			frameFill: '#1e1911', // Darker muted shade for background fill
			frameText: '#f2f2f2', // Bright text color for readability
			noteFill: '#8a5e1c', // Muted, dark complementary variant
			noteText: '#f2f2f2',
			semi: '#3b352b', // Dark muted neutral-yellow tone
			pattern: '#fecb92', // Existing shade retained
			highlightSrgb: '#d2b700',
			highlightP3: 'color(display-p3 0.8078 0.7225 0.0312)',
		},
		white: {
			solid: '#f3f3f3',
			fill: '#f3f3f3',
			semi: '#f5f5f5',
			pattern: '#f9f9f9',
			frameHeadingStroke: '#ffffff',
			frameHeadingFill: '#ffffff',
			frameStroke: '#ffffff',
			frameFill: '#ffffff',
			frameText: '#000000',
			noteFill: '#eaeaea',
			noteText: '#1d1d1d',
			highlightSrgb: '#ffffff',
			highlightP3: 'color(display-p3 1 1 1)',
		},
	},
}

/**
 * Returns the appropriate default color theme based on the dark mode preference.
 *
 * @param opts - Configuration options
 *   - isDarkMode - Whether to return the dark theme (true) or light theme (false)
 * @returns The corresponding TLDefaultColorTheme (light or dark)
 *
 * @example
 * ```ts
 * import { getDefaultColorTheme } from '@tldraw/tlschema'
 *
 * // Get light theme
 * const lightTheme = getDefaultColorTheme({ isDarkMode: false })
 *
 * // Get dark theme
 * const darkTheme = getDefaultColorTheme({ isDarkMode: true })
 *
 * // Use with editor
 * const theme = getDefaultColorTheme({ isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches })
 * ```
 *
 * @public
 */
export function getDefaultColorTheme(opts: { isDarkMode: boolean }): TLDefaultColorTheme {
	return opts.isDarkMode ? DefaultColorThemePalette.darkMode : DefaultColorThemePalette.lightMode
}

/**
 * Default color style property used by tldraw shapes for their primary color.
 * This style prop allows shapes to use any of the default color names and
 * automatically saves the last used value for new shapes.
 *
 * @example
 * ```ts
 * import { DefaultColorStyle } from '@tldraw/tlschema'
 *
 * // Use in shape props definition
 * interface MyShapeProps {
 *   color: typeof DefaultColorStyle
 *   // other props...
 * }
 *
 * // Set color on a shape
 * const shape = {
 *   // ... other properties
 *   props: {
 *     color: 'red' as const,
 *     // ... other props
 *   }
 * }
 * ```
 *
 * @public
 */
export const DefaultColorStyle = StyleProp.defineEnum('tldraw:color', {
	defaultValue: 'black',
	values: defaultColorNames,
})

/**
 * Default label color style property used for text labels on shapes.
 * This is separate from the main color style to allow different colors
 * for shape fills/strokes versus their text labels.
 *
 * @example
 * ```ts
 * import { DefaultLabelColorStyle } from '@tldraw/tlschema'
 *
 * // Use in shape props definition
 * interface MyShapeProps {
 *   labelColor: typeof DefaultLabelColorStyle
 *   // other props...
 * }
 *
 * // Create a shape with different fill and label colors
 * const shape = {
 *   // ... other properties
 *   props: {
 *     color: 'blue' as const,
 *     labelColor: 'white' as const,
 *     // ... other props
 *   }
 * }
 * ```
 *
 * @public
 */
export const DefaultLabelColorStyle = StyleProp.defineEnum('tldraw:labelColor', {
	defaultValue: 'black',
	values: defaultColorNames,
})

/**
 * Type representing a default color style value.
 * This is a union type of all available default color names.
 *
 * @example
 * ```ts
 * import { TLDefaultColorStyle } from '@tldraw/tlschema'
 *
 * // Valid color values
 * const redColor: TLDefaultColorStyle = 'red'
 * const blueColor: TLDefaultColorStyle = 'blue'
 *
 * // Type guard usage
 * function isValidColor(color: string): color is TLDefaultColorStyle {
 *   return ['black', 'red', 'blue'].includes(color as TLDefaultColorStyle)
 * }
 * ```
 *
 * @public
 */
export type TLDefaultColorStyle = T.TypeOf<typeof DefaultColorStyle>

const defaultColorNamesSet = new Set(defaultColorNames)

/**
 * Type guard to check if a color value is one of the default theme colors.
 * Useful for determining if a color can be looked up in the theme palette.
 *
 * @param color - The color value to check
 * @returns True if the color is a default theme color, false otherwise
 *
 * @example
 * ```ts
 * import { isDefaultThemeColor, TLDefaultColorStyle } from '@tldraw/tlschema'
 *
 * const color: TLDefaultColorStyle = 'red'
 *
 * if (isDefaultThemeColor(color)) {
 *   // color is guaranteed to be a default theme color
 *   console.log(`${color} is a default theme color`)
 * } else {
 *   // color might be a custom hex value or other format
 *   console.log(`${color} is a custom color`)
 * }
 * ```
 *
 * @public
 */
export function isDefaultThemeColor(
	color: TLDefaultColorStyle
): color is (typeof defaultColorNames)[number] {
	return defaultColorNamesSet.has(color as (typeof defaultColorNames)[number])
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
 * import { getColorValue, getDefaultColorTheme } from '@tldraw/tlschema'
 *
 * const theme = getDefaultColorTheme({ isDarkMode: false })
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
	theme: TLDefaultColorTheme,
	color: TLDefaultColorStyle,
	variant: keyof TLDefaultColorThemeColor
): string {
	if (!isDefaultThemeColor(color)) {
		return color
	}

	return theme[color][variant]
}
