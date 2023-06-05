import { setEnum } from '@tldraw/validate'
import { SetValue } from '../util-types'
import { TLBaseStyle } from './TLBaseStyle'

/** @public */
export const TL_ARROWHEAD_TYPES = new Set([
	'arrow',
	'triangle',
	'square',
	'dot',
	'pipe',
	'diamond',
	'inverted',
	'bar',
	'none',
] as const)

/** @public */
export type TLArrowheadType = SetValue<typeof TL_ARROWHEAD_TYPES>

/** @public */
export interface TLArrowheadStartStyle extends TLBaseStyle {
	id: TLArrowheadType
	type: 'arrowheadStart'
}

/** @public */
export interface TLArrowheadEndStyle extends TLBaseStyle {
	id: TLArrowheadType
	type: 'arrowheadEnd'
}

/** @internal */
export const arrowheadValidator = setEnum(TL_ARROWHEAD_TYPES)
