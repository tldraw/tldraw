import { getColorValue } from '@tldraw/editor'
import {
	type TLDefaultColor,
	type TLDefaultColorStyle,
	type TLDefaultFillStyle,
	type TLThemeColors,
} from '@tldraw/tlschema'

export const DEFAULT_FILL_COLOR_NAMES: Record<
	Exclude<TLDefaultFillStyle, 'none' | 'semi'>,
	keyof TLDefaultColor
> = {
	solid: 'semi',
	pattern: 'pattern',
	fill: 'fill',
	'lined-fill': 'linedFill',
	inked: 'semi',
}

// 'black' is the theme's foreground color, so the outline flips to light in dark mode.
export function getStrokeColor(
	colors: TLThemeColors,
	color: TLDefaultColorStyle,
	fill: TLDefaultFillStyle
): string {
	return getColorValue(colors, fill === 'inked' ? 'black' : color, 'solid')
}
