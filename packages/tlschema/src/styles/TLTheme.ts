/**
 * Defines the color variants available for each color in the default theme.
 * Each color has multiple variants for different use cases like fills, strokes,
 * patterns, and UI elements like frames and notes.
 *
 * @example
 * ```ts
 * import { TLDefaultColor } from '@tldraw/tlschema'
 *
 * const blueColor: TLDefaultColor = {
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
export interface TLDefaultColor {
	solid: string
	semi: string
	pattern: string
	fill: string // usually same as solid
	linedFill: string // usually slightly lighter than fill
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
 * The color palette for a theme. Contains base UI colors (as strings) and
 * named shape colors (as {@link TLDefaultColor} objects).
 *
 * Extend this interface via module augmentation to add custom colors:
 *
 * @example
 * ```ts
 * declare module '@tldraw/tlschema' {
 *   interface TLThemeColors {
 *     pink: TLDefaultColor
 *   }
 * }
 * ```
 *
 * @public
 */
export interface TLThemeColors {
	text: string
	background: string
	solid: string
	cursor: string
	noteBorder: string
	black: TLDefaultColor
	grey: TLDefaultColor
	'light-violet': TLDefaultColor
	violet: TLDefaultColor
	blue: TLDefaultColor
	'light-blue': TLDefaultColor
	yellow: TLDefaultColor
	orange: TLDefaultColor
	green: TLDefaultColor
	'light-green': TLDefaultColor
	'light-red': TLDefaultColor
	red: TLDefaultColor
	white: TLDefaultColor
}

/**
 * A resolved theme — the flat, ready-to-use object that consumers read at runtime.
 * Produced by resolving a {@link TLThemeDefinition} for a specific color mode.
 *
 * @public
 */
export interface TLTheme {
	id: string
	/** Base font size in pixels. Shape font sizes are derived by multiplying this value. @defaultValue 16 */
	fontSize: number
	/** Base line height multiplier. @defaultValue 1.35 */
	lineHeight: number
	/** Base stroke width in pixels. Shape stroke widths are derived by multiplying this value. @defaultValue 2 */
	strokeWidth: number
	colors: TLThemeColors
}

/**
 * A theme definition containing shared properties and color palettes for
 * both light and dark modes.
 *
 * @example
 * ```ts
 * const myTheme: TLThemeDefinition = {
 *   fontSize: 18,
 *   colors: {
 *     light: { ... },
 *     dark: { ... },
 *   },
 * }
 * editor.setThemeDefinition('custom', myTheme)
 * ```
 *
 * @public
 */
export interface TLThemeDefinition {
	/** Base font size in pixels. Shape font sizes are derived by multiplying this value. @defaultValue 16 */
	fontSize?: number
	/** Base line height multiplier. @defaultValue 1.35 */
	lineHeight?: number
	/** Base stroke width in pixels. Shape stroke widths are derived by multiplying this value. @defaultValue 2 */
	strokeWidth?: number
	colors: {
		light: TLThemeColors
		dark: TLThemeColors
	}
}
