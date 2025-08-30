import { TLDefaultShape, TLGeoShapeGeoStyle } from 'tldraw'
import { z } from 'zod'
import { ISimpleShape } from './SimpleShape'

export const SimpleGeoShapeType = z.enum([
	'rectangle',
	'ellipse',
	'triangle',
	'diamond',
	'hexagon',
	'pill',
	'cloud',
	'x-box',
	'check-box',
	'heart',
	'pentagon',
	'octagon',
	'star',
	'parallelogram-right',
	'parallelogram-left',
	'trapezoid',
	'fat-arrow-right',
	'fat-arrow-left',
	'fat-arrow-up',
	'fat-arrow-down',
])

export type ISimpleGeoShapeType = z.infer<typeof SimpleGeoShapeType>

const SIMPLE_TO_GEO_SHAPE_TYPES: Record<ISimpleGeoShapeType, TLGeoShapeGeoStyle> = {
	rectangle: 'rectangle',
	ellipse: 'ellipse',
	triangle: 'triangle',
	diamond: 'diamond',
	hexagon: 'hexagon',
	pill: 'oval',
	cloud: 'cloud',
	'x-box': 'x-box',
	'check-box': 'check-box',
	heart: 'heart',
	pentagon: 'pentagon',
	octagon: 'octagon',
	star: 'star',
	'parallelogram-right': 'rhombus',
	'parallelogram-left': 'rhombus-2',
	trapezoid: 'trapezoid',
	'fat-arrow-right': 'arrow-right',
	'fat-arrow-left': 'arrow-left',
	'fat-arrow-up': 'arrow-up',
	'fat-arrow-down': 'arrow-down',
} as const

const GEO_TO_SIMPLE_SHAPE_TYPES: Record<TLGeoShapeGeoStyle, ISimpleGeoShapeType> = {
	rectangle: 'rectangle',
	ellipse: 'ellipse',
	triangle: 'triangle',
	diamond: 'diamond',
	hexagon: 'hexagon',
	oval: 'pill',
	cloud: 'cloud',
	'x-box': 'x-box',
	'check-box': 'check-box',
	heart: 'heart',
	pentagon: 'pentagon',
	octagon: 'octagon',
	star: 'star',
	rhombus: 'parallelogram-right',
	'rhombus-2': 'parallelogram-left',
	trapezoid: 'trapezoid',
	'arrow-right': 'fat-arrow-right',
	'arrow-left': 'fat-arrow-left',
	'arrow-up': 'fat-arrow-up',
	'arrow-down': 'fat-arrow-down',
} as const

export function convertSimpleGeoShapeTypeToTldrawGeoShapeGeoStyle(
	type: ISimpleGeoShapeType
): TLGeoShapeGeoStyle {
	return SIMPLE_TO_GEO_SHAPE_TYPES[type]
}

export function convertTldrawGeoShapeGeoStlyeToSimpleGeoShapeType(
	type: TLGeoShapeGeoStyle
): ISimpleGeoShapeType {
	return GEO_TO_SIMPLE_SHAPE_TYPES[type]
}

export function convertSimpleGeoShapeTypeToTldrawGeoShapeGeoStyleOrUnknownIfNeeded(
	type: ISimpleShape['_type']
): TLGeoShapeGeoStyle | TLDefaultShape['type'] | 'unknown' {
	if (type in SIMPLE_TO_GEO_SHAPE_TYPES) {
		return convertSimpleGeoShapeTypeToTldrawGeoShapeGeoStyle(
			type as ISimpleGeoShapeType
		) as TLGeoShapeGeoStyle
	}
	return type as TLDefaultShape['type'] | 'unknown'
}

export function convertTldrawGeoShapeGeoStyleOrUnknownToSimpleGeoShapeTypeIfNeeded(
	type: TLGeoShapeGeoStyle | TLDefaultShape['type'] | 'unknown'
): ISimpleShape['_type'] {
	if (type in GEO_TO_SIMPLE_SHAPE_TYPES) {
		return convertTldrawGeoShapeGeoStlyeToSimpleGeoShapeType(
			type as TLGeoShapeGeoStyle
		) as ISimpleGeoShapeType
	}
	return type as ISimpleShape['_type']
}
