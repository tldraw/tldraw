import { TLDefaultFillStyle } from 'tldraw'
import z from 'zod'

export const SimpleFillSchema = z.enum(['none', 'tint', 'background', 'solid', 'pattern'])

export type SimpleFill = z.infer<typeof SimpleFillSchema>

const SIMPLE_TO_SHAPE_FILLS: Record<SimpleFill, TLDefaultFillStyle> = {
	none: 'none',
	solid: 'fill',
	background: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}

const SHAPE_TO_SIMPLE_FILLS: Record<TLDefaultFillStyle, SimpleFill> = {
	none: 'none',
	fill: 'solid',
	semi: 'background',
	solid: 'tint',
	pattern: 'pattern',
}

export function convertSimpleFillToTldrawFill(fill: SimpleFill): TLDefaultFillStyle {
	return SIMPLE_TO_SHAPE_FILLS[fill]
}

export function convertTldrawFillToSimpleFill(fill: TLDefaultFillStyle): SimpleFill {
	return SHAPE_TO_SIMPLE_FILLS[fill]
}
