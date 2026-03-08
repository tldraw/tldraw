import { type TLDefaultColor, type TLDefaultFillStyle } from '@tldraw/tlschema'

export const DEFAULT_FILL_COLOR_NAMES: Record<
	Exclude<TLDefaultFillStyle, 'none' | 'semi'>,
	keyof TLDefaultColor
> = {
	solid: 'semi',
	pattern: 'pattern',
	fill: 'fill',
	'lined-fill': 'linedFill',
}
