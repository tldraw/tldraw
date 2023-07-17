import { TLArrowShapeArrowheadStyle } from '@tldraw/tlschema'
import { VecLike } from '../../../../primitives/Vec2d'

export type ArrowPoint = {
	handle: VecLike
	point: VecLike
	arrowhead: TLArrowShapeArrowheadStyle
}

export interface ArcInfo {
	center: VecLike
	radius: number
	size: number
	length: number
	largeArcFlag: number
	sweepFlag: number
}

export type ArrowInfo =
	| {
			isStraight: false
			start: ArrowPoint
			end: ArrowPoint
			middle: VecLike
			handleArc: ArcInfo
			bodyArc: ArcInfo
			isValid: boolean
	  }
	| {
			isStraight: true
			start: ArrowPoint
			end: ArrowPoint
			middle: VecLike
			isValid: boolean
			length: number
	  }
