import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './base-style'

/** @public */
export const TL_GEO_TYPES = new Set([
	'rectangle',
	'ellipse',
	'triangle',
	'diamond',
	'pentagon',
	'hexagon',
	'octagon',
	'star',
	'rhombus',
	'rhombus-2',
	'oval',
	'trapezoid',
	'arrow-right',
	'arrow-left',
	'arrow-up',
	'arrow-down',
	'x-box',
	'check-box',
] as const)

/** @public */
export type TLGeoType = SetValue<typeof TL_GEO_TYPES>

/** @public */
export interface TLGeoStyle extends TLBaseStyle {
	id: TLGeoType
	type: 'geo'
}

/** @internal */
export const geoValidator = T.setEnum(TL_GEO_TYPES)
