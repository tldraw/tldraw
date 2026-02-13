import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

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
 * Empty interface for module augmentation. Extend this to add custom font tokens.
 *
 * @example
 * ```ts
 * declare module '@tldraw/tlschema' {
 *   interface TLFontStyleExtensions {
 *     comic: true
 *     handwriting: true
 *   }
 * }
 * ```
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TLFontStyleExtensions {}

/** @public */
export const defaultFontNames = ['draw', 'sans', 'serif', 'mono'] as const

/**
 * Type representing a default font style value.
 * This is a union type of all available font style options, plus any extensions.
 *
 * @public
 */
export type TLDefaultFontStyle = T.TypeOf<typeof DefaultFontStyle> | keyof TLFontStyleExtensions

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
