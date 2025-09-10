import { TLDefaultShape, TLGeoShapeGeoStyle, TLShapeId } from 'tldraw'
import { ISimpleGeoShapeType } from './SimpleGeoShapeType'
import { SimpleShape } from './SimpleShape'

export function convertSimpleIdToTldrawId(id: string): TLShapeId {
	return ('shape:' + id) as TLShapeId
}

export function convertSimpleTypeToTldrawType(
	type: SimpleShape['_type']
): TLGeoShapeGeoStyle | TLDefaultShape['type'] | 'unknown' {
	if (type in SIMPLE_TO_GEO_TYPES) {
		return convertSimpleGeoTypeToTldrawGeoGeoType(type as ISimpleGeoShapeType) as TLGeoShapeGeoStyle
	}
	return type as TLDefaultShape['type'] | 'unknown'
}

export function convertSimpleGeoTypeToTldrawGeoGeoType(
	type: ISimpleGeoShapeType
): TLGeoShapeGeoStyle {
	return SIMPLE_TO_GEO_TYPES[type]
}

const SIMPLE_TO_GEO_TYPES: Record<ISimpleGeoShapeType, TLGeoShapeGeoStyle> = {
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
