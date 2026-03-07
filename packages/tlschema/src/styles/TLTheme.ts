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
 * A theme definition containing a single color palette.
 * Light and dark modes are separate top-level themes rather than nested within one theme.
 *
 * @public
 */
export interface TLTheme {
	colors: TLThemeColorPalette
	/**
	 * The visual appearance mode for this theme. Determines which CSS color mode
	 * is applied (e.g. cursor colors, selection colors, and other UI chrome).
	 *
	 * If not specified, the appearance is inferred from the theme key:
	 * `'dark'` maps to dark appearance, everything else maps to light.
	 */
	appearance?: 'light' | 'dark'
}

/**
 * A map of named themes. Each key is a theme name and each value is a theme definition.
 *
 * @public
 */
export type TLThemes = Record<string, TLTheme>
