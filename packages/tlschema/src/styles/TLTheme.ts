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
 * A theme definition containing shared properties and color palettes for
 * both light and dark modes.
 *
 * @example
 * ```ts
 * const myTheme: TLThemeDefinition = {
 *   fontSize: 16,
 *   lineHeight: 1.35,
 *   strokeWidth: 2,
 *   colors: {
 *     light: { ... },
 *     dark: { ... },
 *   },
 * }
 * editor.updateTheme('custom', myTheme)
 * ```
 *
 * @public
 */
export interface TLThemeDefinition {
	/** Base font size in pixels. Shape font sizes are derived by multiplying this value. */
	fontSize: number
	/** Base line height multiplier. */
	lineHeight: number
	/** Base stroke width in pixels. Shape stroke widths are derived by multiplying this value. */
	strokeWidth: number
	colors: {
		light: TLThemeColors
		dark: TLThemeColors
	}
}

/**
 * A registry of available themes. Extend this interface via module
 * augmentation to register custom themes for type-safe theme IDs.
 *
 * @example
 * ```ts
 * declare module '@tldraw/tlschema' {
 *   interface TLThemes {
 *     corporate: TLThemeDefinition
 *   }
 * }
 * ```
 *
 * @public
 */
export interface TLThemes {
	default: TLThemeDefinition
}

/** @public */
export type TLThemeId = keyof TLThemes & string
