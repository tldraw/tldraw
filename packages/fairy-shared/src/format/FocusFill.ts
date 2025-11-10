import { TLDefaultFillStyle } from '@tldraw/editor'
import z from 'zod'

export const FocusFillSchema = z.enum(['none', 'tint', 'background', 'solid', 'pattern'])

export type FocusFill = z.infer<typeof FocusFillSchema>

const FOCUS_TO_TLDRAW_FILLS: Record<FocusFill, TLDefaultFillStyle> = {
	none: 'none',
	solid: 'lined-fill',
	background: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}

const TLDRAW_TO_FOCUS_FILLS: Record<TLDefaultFillStyle, FocusFill> = {
	none: 'none',
	fill: 'solid',
	'lined-fill': 'solid',
	semi: 'background',
	solid: 'tint',
	pattern: 'pattern',
}

export function convertFocusFillToTldrawFill(fill: FocusFill): TLDefaultFillStyle {
	return FOCUS_TO_TLDRAW_FILLS[fill]
}

export function convertTldrawFillToFocusFill(fill: TLDefaultFillStyle): FocusFill {
	return TLDRAW_TO_FOCUS_FILLS[fill]
}
