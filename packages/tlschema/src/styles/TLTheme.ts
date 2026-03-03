import { Expand } from '@tldraw/utils'
import { defaultColorNames, TLDefaultColorThemeColor } from './TLColorStyle'

/**
 * A color palette for a single mode (light or dark) within a theme.
 * Contains base theme properties and all default colors with their variants.
 *
 * @public
 */
export type TLThemeColorPalette = Expand<
	{
		text: string
		background: string
		solid: string
	} & Record<(typeof defaultColorNames)[number], TLDefaultColorThemeColor>
>

/**
 * A theme definition containing color palettes for both light and dark modes.
 *
 * @public
 */
export interface TLTheme {
	color: {
		light: TLThemeColorPalette
		dark: TLThemeColorPalette
	}
}

/**
 * A map of named themes. Each key is a theme name and each value is a theme definition.
 *
 * @public
 */
export type TLThemes = Record<string, TLTheme>
