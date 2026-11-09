import {
	type TLDefaultColor,
	type TLDefaultColorStyle,
	type TLDefaultFillStyle,
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

/** The `inked` fill draws its outline in the foreground color rather than the shape's color. */
export function getStrokeColorForFill(
	color: TLDefaultColorStyle,
	fill: TLDefaultFillStyle
): TLDefaultColorStyle {
	return fill === 'inked' ? 'black' : color
}
