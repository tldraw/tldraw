import { TLDefaultFillStyle } from 'tldraw'
import { ISimpleFill } from './schema'

const SIMPLE_TO_SHAPE_FILLS: Record<ISimpleFill, TLDefaultFillStyle> = {
	none: 'none',
	solid: 'fill',
	semi: 'semi',
	tint: 'solid',
	pattern: 'pattern',
}

const SHAPE_TO_SIMPLE_FILLS: Record<TLDefaultFillStyle, ISimpleFill> = {
	none: 'none',
	fill: 'solid',
	semi: 'semi',
	solid: 'tint',
	pattern: 'pattern',
}

export function simpleFillToShapeFill(fill: ISimpleFill): TLDefaultFillStyle {
	return SIMPLE_TO_SHAPE_FILLS[fill]
}

export function shapeFillToSimpleFill(fill: TLDefaultFillStyle): ISimpleFill {
	return SHAPE_TO_SIMPLE_FILLS[fill]
}
