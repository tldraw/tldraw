import { TLArrowShapeArrowheadStyle, TLDefaultSizeStyle, VecLike } from '@tldraw/editor'
import { ElbowArrowInfo, ElbowArrowRoute } from './elbow/definitions'
import { TLArrowBindings } from './shared'

/** @public */
export interface ArrowShapeOptions {
	readonly expandElbowLegLength: Record<TLDefaultSizeStyle, number>
	readonly minElbowLegLength: Record<TLDefaultSizeStyle, number>
	readonly minHandleDistance: number

	readonly bendyArrowCenterSnapDistance: number
	readonly elbowArrowCenterSnapDistance: number
	readonly elbowArrowEdgeSnapDistance: number
	readonly elbowArrowPointSnapDistance: number
	readonly elbowArrowAxisSnapDistance: number

	readonly labelCenterSnapDistance: number
	readonly elbowMidpointSnapDistance: number

	readonly hoverPreciseTimeout: number
	readonly pointingPreciseTimeout: number
}

/** @public */
export interface TLArrowPoint {
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
export interface TLArcArrowInfo {
	bindings: TLArrowBindings
	type: 'arc'
	start: TLArrowPoint
	end: TLArrowPoint
	middle: VecLike
	handleArc: TLArcInfo
	bodyArc: TLArcInfo
	isValid: boolean
}

/** @public */
export interface TLStraightArrowInfo {
	bindings: TLArrowBindings
	type: 'straight'
	start: TLArrowPoint
	end: TLArrowPoint
	middle: VecLike
	isValid: boolean
	length: number
}

/** @public */
export interface TLElbowArrowInfo {
	type: 'elbow'
	bindings: TLArrowBindings
	start: TLArrowPoint
	end: TLArrowPoint
	elbow: ElbowArrowInfo
	route: ElbowArrowRoute
	isValid: boolean
}

/** @public */
export type TLArrowInfo = TLArcArrowInfo | TLStraightArrowInfo | TLElbowArrowInfo
