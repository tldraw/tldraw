import { StyleProp } from './StyleProp'
import { TLDefaultColor, TLThemeColors } from './TLTheme'

/**
 * The names of all available shape colors, derived from {@link TLThemeColors}.
 * Extend {@link TLThemeColors} to add custom color names.
 *
 * @public
 */
export type TLDefaultColorStyle = {
	[K in keyof TLThemeColors]: TLThemeColors[K] extends TLDefaultColor ? K : never
}[keyof TLThemeColors] &
	string

/**
 * Used only for initial values of the color style; the source of truth has moved to TLTheme.
 *
 * @internal
 */
const defaultColorNames: TLDefaultColorStyle[] = [
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
 * @public
 */
export const DefaultColorStyle = StyleProp.defineEnum('tldraw:color', {
	defaultValue: 'black',
	values: defaultColorNames,
})

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
 * registerCustomColors(['pink', 'teal'])
 * ```
 *
 * @public
 */
export function registerCustomColors(colorNames: TLDefaultColorStyle[]): void {
	DefaultColorStyle.addValues(...colorNames)
	DefaultLabelColorStyle.addValues(...colorNames)
}
