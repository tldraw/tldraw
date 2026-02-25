import { type TLDefaultColorThemeColor, type TLDefaultFillStyle } from '@tldraw/tlschema'

export const DEFAULT_FILL_COLOR_NAMES: Record<
	Exclude<TLDefaultFillStyle, 'none'>,
	keyof TLDefaultColorThemeColor
> = {
	semi: 'solid',
	solid: 'semi',
	pattern: 'pattern',
	fill: 'fill',
	'lined-fill': 'linedFill',
}
