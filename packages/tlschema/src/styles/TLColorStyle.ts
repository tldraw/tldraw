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
 */
export const DefaultColorStyle = StyleProp.defineEnum('tldraw:color', {
	defaultValue: 'black',
	values: defaultColorNames,
})

/**
 * An interface that can be extended via `declare module` to add custom color names
 * to tldraw's color system. Each key becomes a valid color name.
 *
 * @example
 * ```ts
 * declare module '@tldraw/tlschema' {
 *   interface TLCustomColorNames {
 *     pink: true
 *   }
 * }
 * ```
 *
 * @public
 */
export interface TLCustomColorNames {}

/**
 * @public
 */
export type TLDefaultColorStyle = (typeof defaultColorNames)[number] | keyof TLCustomColorNames

/**
 * @public
 */
export const DefaultLabelColorStyle = StyleProp.defineEnum('tldraw:labelcolor', {
	defaultValue: 'black',
	values: defaultColorNames,
})

/**
 * Register custom color names at runtime. This adds the colors to both
 * `DefaultColorStyle` and `DefaultLabelColorStyle` so they are available
 * for validation and in the style panel.
 *
 * Must be called before rendering any tldraw components.
 *
 * @example
 * ```ts
 * registerColors(['pink', 'teal'])
 * ```
 *
 * @public
 */
export function registerColors(colorNames: string[]): void {
	;(DefaultColorStyle as any).addValues(...colorNames)
	;(DefaultLabelColorStyle as any).addValues(...colorNames)
}
