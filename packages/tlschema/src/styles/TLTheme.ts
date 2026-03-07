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
		cursor: string
		noteBorder: string
	} & Record<(typeof defaultColorNames)[number], TLDefaultColorThemeColor>
>

/**
 * A theme definition containing a single color palette.
 * Light and dark modes are separate top-level themes rather than nested within one theme.
 *
 * @public
 */
export interface TLTheme {
	id: string
	colors: TLThemeColorPalette
}

/**
 * A map of named themes. Each key is a theme name and each value is a theme definition.
 *
 * @public
 */
export type TLThemes = Record<string, TLTheme>
