import { TLDefaultFillStyle } from 'tldraw'
import z from 'zod'

export const FocusedFillSchema = z.enum(['none', 'tint', 'background', 'solid', 'pattern'])

export type FocusedFill = z.infer<typeof FocusedFillSchema>

const FOCUSED_TO_SHAPE_FILLS: Record<FocusedFill, TLDefaultFillStyle> = {
	none: 'none',
	solid: 'lined-fill',
	background: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}

const SHAPE_TO_FOCUSED_FILLS: Record<TLDefaultFillStyle, FocusedFill> = {
	none: 'none',
	fill: 'solid',
	'lined-fill': 'solid',
	semi: 'background',
	solid: 'tint',
	pattern: 'pattern',
}

export function convertFocusedFillToTldrawFill(fill: FocusedFill): TLDefaultFillStyle {
	return FOCUSED_TO_SHAPE_FILLS[fill]
}

export function convertTldrawFillToFocusedFill(fill: TLDefaultFillStyle): FocusedFill {
	return SHAPE_TO_FOCUSED_FILLS[fill]
}
