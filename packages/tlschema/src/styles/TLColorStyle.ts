import { StyleProp } from './StyleProp'
import { TLDefaultColor, TLThemeDefaultColors, TLThemes } from './TLTheme'

/**
 * The names of all available shape colors, derived from {@link TLThemeDefaultColors}.
 * Extend {@link TLThemeDefaultColors} to add custom color names.
 *
 * @public
 */
export type TLDefaultColorStyle = {
	[K in keyof TLThemeDefaultColors]: TLThemeDefaultColors[K] extends TLDefaultColor ? K : never
}[keyof TLThemeDefaultColors] &
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
 * Scan theme definitions and sync color registrations to match.
 * A color entry is any key in `TLThemeColors` whose value is an object
 * (i.e. a {@link TLDefaultColor}), as opposed to utility strings like
 * `background` or `text`.
 *
 * Colors present in themes but not yet registered will be added.
 * Colors currently registered but absent from all themes will be removed.
 *
 * @public
 */
export function registerColorsFromThemes(definitions: TLThemes): void {
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

	const toRemove = DefaultColorStyle.values.filter((v) => !colorNames.has(v as TLDefaultColorStyle))
	if (toRemove.length > 0) {
		DefaultColorStyle.removeValues(...toRemove)
		DefaultLabelColorStyle.removeValues(...toRemove)
	}

	if (process.env.NODE_ENV !== 'production') {
		for (const def of Object.values(definitions)) {
			for (const color of colorNames) {
				if (!(color in def.colors.light)) {
					console.warn(
						`Theme '${def.id}' light palette is missing color '${color}'. Shapes using this color won't render correctly.`
					)
				}
				if (!(color in def.colors.dark)) {
					console.warn(
						`Theme '${def.id}' dark palette is missing color '${color}'. Shapes using this color won't render correctly.`
					)
				}
			}
		}
	}
}
