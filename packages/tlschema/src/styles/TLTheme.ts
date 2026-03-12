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
 * A theme definition containing a single color palette.
 * Light and dark modes are separate top-level themes rather than nested within one theme.
 *
 * @public
 */
export interface TLTheme {
	id: string
	/** Base font size in pixels. Shape font sizes are derived by multiplying this value. @defaultValue 16 */
	fontSize: number
	/** Base line height multiplier. @defaultValue 1.35 */
	lineHeight: number
	colors: TLThemeColors
}

/**
 * A map of named themes. Each key is a theme name and each value is a theme definition.
 *
 * @public
 */
export type TLThemes = Record<string, TLTheme>
