import { TLArrowShapeArrowheadStyle, Vec, VecLike } from '@tldraw/editor'
import { TLArrowBindings } from './shared'

/** @public */
export interface TLArrowPoint {
	handle: Vec
	point: Vec
	arrowhead: TLArrowShapeArrowheadStyle
	intersection?: { point: Vec; segment: Vec[] }
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
