import { T } from '@tldraw/validate'
import { StyleProp } from './StyleProp'

/**
 * Defines the concrete pixel values for a size token. Each size token has multiple variants
 * that different shapes use depending on their needs.
 *
 * @public
 */
export interface TLSizeTokenDefinition {
	/** Stroke width used by geo, draw, arrow, line, and highlight shapes. */
	stroke: number
	/** Font size for standalone text (TextShapeUtil). */
	font: number
	/** Font size for labels inside shapes (geo, note). */
	labelFont: number
	/** Font size for arrow labels. */
	arrowLabelFont: number
}

/**
 * Empty interface for module augmentation. Extend this to add custom size tokens.
 *
 * @example
 * ```ts
 * declare module '@tldraw/tlschema' {
 *   interface TLSizeStyleExtensions {
 *     xs: true
 *     '2xl': true
 *   }
 * }
 * ```
 *
 * @public
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TLSizeStyleExtensions {}

/** @public */
export const defaultSizeNames = ['s', 'm', 'l', 'xl'] as const

/**
 * Default size style property used by tldraw shapes for scaling visual elements.
 * Controls the relative size of shape elements like stroke width, text size, and other proportional features.
 *
 * Available values:
 * - `s` - Small size
 * - `m` - Medium size (default)
 * - `l` - Large size
 * - `xl` - Extra large size
 *
 * @public
 */
export const DefaultSizeStyle = StyleProp.defineEnum('tldraw:size', {
	defaultValue: 'm',
	values: ['s', 'm', 'l', 'xl'],
})

/**
 * Type representing a default size style value.
 * This is a union type of all available size options, plus any extensions.
 *
 * @public
 */
export type TLDefaultSizeStyle = T.TypeOf<typeof DefaultSizeStyle> | keyof TLSizeStyleExtensions

/**
 * Default size token definitions mapping each built-in size to concrete pixel values.
 *
 * @public
 */
export const defaultSizeTokens: Record<(typeof defaultSizeNames)[number], TLSizeTokenDefinition> = {
	s: { stroke: 2, font: 18, labelFont: 18, arrowLabelFont: 18 },
	m: { stroke: 3.5, font: 24, labelFont: 22, arrowLabelFont: 20 },
	l: { stroke: 5, font: 36, labelFont: 26, arrowLabelFont: 24 },
	xl: { stroke: 10, font: 44, labelFont: 32, arrowLabelFont: 28 },
}
