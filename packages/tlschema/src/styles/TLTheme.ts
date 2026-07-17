import type { TLFontFace } from './TLFontFace'

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
export interface TLThemeDefaultColors {
	text: string
	background: string
	negativeSpace: string
	solid: string
	cursor: string
	noteBorder: string
	/** Snap indicator line color */
	snap: string
	/** Selection outline stroke */
	selectionStroke: string
	/** Selection handle fill (typically the background color) */
	selectionFill: string
	/** Brush rectangle fill */
	brushFill: string
	/** Brush rectangle stroke */
	brushStroke: string
	/** Selected contrast color (handle fills, etc.) */
	selectedContrast: string
	/** Laser pointer color */
	laser: string
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
 * A font definition within a theme. Maps a font style name to a CSS font-family
 * declaration and optional font face descriptors for loading.
 *
 * @example
 * ```ts
 * import { TLThemeFont } from '@tldraw/tlschema'
 *
 * const customSans: TLThemeFont = {
 *   fontFamily: "'Inter', sans-serif",
 *   faces: [
 *     { family: 'Inter', src: { url: 'https://example.com/Inter-Regular.woff2', format: 'woff2' }, weight: 'normal' },
 *     { family: 'Inter', src: { url: 'https://example.com/Inter-Bold.woff2', format: 'woff2' }, weight: 'bold' },
 *   ]
 * }
 * ```
 *
 * @public
 */
export interface TLThemeFont {
	/** CSS font-family declaration, e.g. `"'Inter', sans-serif"` */
	fontFamily: string
	/** Font face definitions for loading. Omit for system fonts that don't need loading. */
	faces?: TLFontFace[]
	/**
	 * Icon for the style panel. Accepts a string icon ID (resolved via `assetUrls.icons`)
	 * or a React element (`TLUiIconJsx`). Defaults to the built-in icon for known fonts,
	 * or `'font-draw'` for custom fonts.
	 */
	icon?: unknown
}

/**
 * The font palette for a theme. Contains named font definitions mapping font style
 * names to their CSS font-family strings and font face descriptors.
 *
 * Extend this interface via module augmentation to add custom fonts:
 *
 * @example
 * ```ts
 * declare module '@tldraw/tlschema' {
 *   interface TLThemeFonts {
 *     cursive: TLThemeFont
 *   }
 * }
 * ```
 *
 * @public
 */
export interface TLThemeFonts {
	draw: TLThemeFont
	sans: TLThemeFont
	serif: TLThemeFont
	mono: TLThemeFont
}

/**
 * Augment this interface to remove built-in palette colors from themes.
 * Each key you add will be omitted from {@link TLThemeColors}.
 *
 * @example
 * ```ts
 * declare module '@tldraw/tlschema' {
 *   interface TLRemovedDefaultThemeColors {
 *     'light-violet': true
 *     'light-blue': true
 *   }
 * }
 * ```
 *
 * @public
 */
// oxlint-disable-next-line typescript/no-empty-object-type
export interface TLRemovedDefaultThemeColors {}

/**
 * Keys in {@link TLThemeDefaultColors} that are required UI infrastructure colors
 * and cannot be removed via {@link TLRemovedDefaultThemeColors}.
 *
 * @public
 */
export type TLThemeUiColorKeys =
	| 'text'
	| 'background'
	| 'negativeSpace'
	| 'solid'
	| 'cursor'
	| 'noteBorder'
	| 'snap'
	| 'selectionStroke'
	| 'selectionFill'
	| 'brushFill'
	| 'brushStroke'
	| 'selectedContrast'
	| 'laser'

/**
 * A color palette for one color mode. UI colors are always required.
 * Palette colors removed via {@link TLRemovedDefaultThemeColors} are omitted.
 *
 * @public
 */
export type TLThemeColors = Pick<TLThemeDefaultColors, TLThemeUiColorKeys> &
	Omit<TLThemeDefaultColors, TLThemeUiColorKeys | keyof TLRemovedDefaultThemeColors>

/**
 * A theme definition containing shared properties and color/font palettes for
 * both light and dark modes.
 *
 * To remove palette colors from themes, augment {@link TLRemovedDefaultThemeColors}.
 * UI colors (`text`, `background`, `negativeSpace`, `solid`, `cursor`, `noteBorder`)
 * are always required.
 *
 * @example
 * ```ts
 * const myTheme: TLTheme = {
 *   id: 'custom',
 *   fontSize: 16,
 *   lineHeight: 1.35,
 *   strokeWidth: 2,
 *   fonts: DEFAULT_THEME.fonts,
 *   colors: {
 *     light: { ... },
 *     dark: { ... },
 *   },
 * }
 * editor.updateTheme(myTheme)
 * ```
 *
 * @public
 */
export interface TLTheme {
	/** Unique identifier for this theme. Used as the key in the theme registry. */
	id: TLThemeId
	/** Base font size in pixels. Shape font sizes are derived by multiplying this value. */
	fontSize: number
	/** Base line height multiplier. */
	lineHeight: number
	/** Base stroke width in pixels. Shape stroke widths are derived by multiplying this value. */
	strokeWidth: number
	/** Font definitions. Individual fonts may be absent if removed by a custom theme. */
	fonts: TLThemeFonts
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
 *     corporate: TLTheme
 *   }
 * }
 * ```
 *
 * @public
 */
export interface TLThemes {
	default: TLTheme
}

/** @public */
export type TLThemeId = keyof TLThemes & string
