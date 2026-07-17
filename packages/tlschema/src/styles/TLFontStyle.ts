import { StyleProp } from './StyleProp'
import { TLThemeFont, TLThemeFonts, TLThemes } from './TLTheme'

/**
 * Default font style property used by tldraw shapes for text styling.
 * Controls which typeface is used for text content within shapes.
 *
 * Available values:
 * - `draw` - Hand-drawn, sketchy font style
 * - `sans` - Clean sans-serif font
 * - `serif` - Traditional serif font
 * - `mono` - Monospace font for code-like text
 *
 * @example
 * ```ts
 * import { DefaultFontStyle } from '@tldraw/tlschema'
 *
 * // Use in shape props definition
 * interface MyTextShapeProps {
 *   font: typeof DefaultFontStyle
 *   // other props...
 * }
 *
 * // Create a text shape with monospace font
 * const textShape = {
 *   // ... other properties
 *   props: {
 *     font: 'mono' as const,
 *     // ... other props
 *   }
 * }
 * ```
 *
 * @public
 */
export const DefaultFontStyle = StyleProp.defineEnum('tldraw:font', {
	defaultValue: 'draw',
	values: ['draw', 'sans', 'serif', 'mono'],
})

/**
 * The names of all available font styles, derived from {@link TLThemeFonts}.
 * Extend {@link TLThemeFonts} to add custom font names.
 *
 * @example
 * ```ts
 * import { TLDefaultFontStyle } from '@tldraw/tlschema'
 *
 * // Valid font style values
 * const drawFont: TLDefaultFontStyle = 'draw'
 * const sansFont: TLDefaultFontStyle = 'sans'
 * const serifFont: TLDefaultFontStyle = 'serif'
 * const monoFont: TLDefaultFontStyle = 'mono'
 *
 * // Use in a function parameter
 * function setTextFont(font: TLDefaultFontStyle) {
 *   // Apply font style to text
 * }
 * ```
 *
 * @public
 */
export type TLDefaultFontStyle = keyof TLThemeFonts & string

/**
 * Mapping of font style names to their corresponding CSS font-family declarations.
 * These are the actual CSS font families used when rendering text with each font style.
 *
 * @example
 * ```ts
 * import { DefaultFontFamilies, TLDefaultFontStyle } from '@tldraw/tlschema'
 *
 * // Get CSS font family for a font style
 * const fontStyle: TLDefaultFontStyle = 'mono'
 * const cssFamily = DefaultFontFamilies[fontStyle] // "'tldraw_mono', monospace"
 *
 * // Apply to DOM element
 * element.style.fontFamily = DefaultFontFamilies.sans
 * ```
 *
 * @public
 */
export const DefaultFontFamilies = {
	draw: "'tldraw_draw', sans-serif",
	sans: "'tldraw_sans', sans-serif",
	serif: "'tldraw_serif', serif",
	mono: "'tldraw_mono', monospace",
}

/** @internal */
export function isFontEntry(value: unknown): value is TLThemeFont {
	return typeof value === 'object' && value !== null && 'fontFamily' in value
}

/**
 * Scan theme definitions and sync font registrations to match.
 * A font entry is any key in `TLThemeFonts` whose value is a {@link TLThemeFont}
 * object (i.e. has a `fontFamily` property).
 *
 * Fonts present in themes but not yet registered will be added.
 * Fonts currently registered but absent from all themes will be removed.
 *
 * @public
 */
export function registerFontsFromThemes(definitions: TLThemes): void {
	const fontNames = new Set<string>()
	for (const def of Object.values(definitions)) {
		if (!def.fonts) continue
		for (const [key, value] of Object.entries(def.fonts)) {
			if (isFontEntry(value)) {
				fontNames.add(key)
			}
		}
	}

	const toAdd = [...fontNames].filter((v) => !DefaultFontStyle.values.includes(v as any))
	if (toAdd.length > 0) {
		DefaultFontStyle.addValues(...(toAdd as any))
	}

	const toRemove = DefaultFontStyle.values.filter((v) => !fontNames.has(v as string))
	if (toRemove.length > 0) {
		DefaultFontStyle.removeValues(...toRemove)
	}

	if (process.env.NODE_ENV !== 'production') {
		for (const def of Object.values(definitions)) {
			for (const font of fontNames) {
				if (!def.fonts || !(font in def.fonts)) {
					console.warn(
						`Theme '${def.id}' is missing font '${font}'. Shapes using this font won't render correctly in this theme.`
					)
				}
			}
		}
	}
}
