import { T } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './base-style'

/** @public */
export const TL_SPLINE_TYPES = new Set(['cubic', 'line'] as const)

/** @public */
export type TLSplineType = SetValue<typeof TL_SPLINE_TYPES>

/** @public */
export interface TLSplineTypeStyle extends TLBaseStyle {
	id: TLSplineType
	type: 'spline'
}

/** @internal */
export const splineValidator = T.setEnum(TL_SPLINE_TYPES)
