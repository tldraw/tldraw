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
 * @public
 * @deprecated - use TLDefaultColor instead
 */
export type TLDefaultColorThemeColor = TLDefaultColor

/**
 * @public
 */
export const DefaultColorStyle = StyleProp.defineEnum('tldraw:color', {
	defaultValue: 'black',
	values: defaultColorNames,
})

/**
 * @public
 */
export type TLDefaultColorStyle = T.TypeOf<typeof DefaultColorStyle>

/**
 * @public
 */
export const DefaultLabelColorStyle = StyleProp.defineEnum('tldraw:labelcolor', {
	defaultValue: 'black',
	values: defaultColorNames,
})
