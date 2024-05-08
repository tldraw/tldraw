import { VecLike } from '@tldraw/editor/src/lib/primitives/Vec'
import { TLArrowShapeArrowheadStyle } from '@tldraw/tlschema'
import { TLArrowBindings } from './shared'

/** @public */
export type TLArrowPoint = {
	handle: VecLike
	point: VecLike
	arrowhead: TLArrowShapeArrowheadStyle
}

/** @public */
export interface TLArcInfo {
	center: VecLike
	radius: number
	size: number
	length: number
	largeArcFlag: number
	sweepFlag: number
}

/** @public */
export type TLArrowInfo =
	| {
			bindings: TLArrowBindings
			isStraight: false
			start: TLArrowPoint
			end: TLArrowPoint
			middle: VecLike
			handleArc: TLArcInfo
			bodyArc: TLArcInfo
			isValid: boolean
	  }
	| {
			bindings: TLArrowBindings
			isStraight: true
			start: TLArrowPoint
			end: TLArrowPoint
			middle: VecLike
			isValid: boolean
			length: number
	  }
