import { StyleProp } from './StyleProp'
import { TLDefaultColor, TLThemeColors, TLTheme } from './TLTheme'

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
export const DefaultLabelColorStyle = StyleProp.defineEnum('tldraw:labelColor', {
	defaultValue: 'black',
	values: defaultColorNames,
})

/**
 * Scan theme definitions and register any custom color names found.
 * A color entry is any key in `TLThemeColors` whose value is an object
 * (i.e. a {@link TLDefaultColor}), as opposed to utility strings like
 * `background` or `text`.
 *
 * @public
 */
export function registerColorsFromThemes(
	definitions: Record<string, TLTheme> | undefined
): void {
	if (!definitions) return
	const colorNames = new Set<TLDefaultColorStyle>()
	for (const def of Object.values(definitions)) {
		for (const colorPalette of [def.colors.light, def.colors.dark]) {
			for (const [key, value] of Object.entries(colorPalette)) {
				if (typeof value === 'object' && value !== null) {
					colorNames.add(key as TLDefaultColorStyle)
				}
			}
		}
	}
	if (colorNames.size > 0) {
		DefaultColorStyle.addValues(...colorNames)
		DefaultLabelColorStyle.addValues(...colorNames)
	}

	if (process.env.NODE_ENV !== 'production') {
		for (const [name, def] of Object.entries(definitions)) {
			for (const color of colorNames) {
				if (!(color in def.colors.light)) {
					console.warn(
						`Theme '${name}' light palette is missing color '${color}'. Shapes using this color won't render correctly.`
					)
				}
				if (!(color in def.colors.dark)) {
					console.warn(
						`Theme '${name}' dark palette is missing color '${color}'. Shapes using this color won't render correctly.`
					)
				}
			}
		}
	}
}
