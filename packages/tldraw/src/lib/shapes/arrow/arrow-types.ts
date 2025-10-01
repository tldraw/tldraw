import { Editor, TLArrowShapeArrowheadStyle, TLDefaultSizeStyle, VecLike } from '@tldraw/editor'
import { ElbowArrowInfo, ElbowArrowRoute } from './elbow/definitions'
import { TLArrowBindings } from './shared'

/**
 * Options for the arrow shape.
 *
 * @example
 * ```tsx
 * const shapeUtils = [
 *   ArrowShapeUtil.configure({ arcArrowCenterSnapDistance: 0 }),
 * ]
 *
 * function MyApp() {
 *   return <Tldraw shapeUtils={shapeUtils} />
 * }
 * ```
 *
 * @public
 */
export interface ArrowShapeOptions {
	/**
	 * How far should elbow arrows expand from the shapes they're targeting?
	 */
	readonly expandElbowLegLength: Record<TLDefaultSizeStyle, number>
	/**
	 * The minimum length of an elbow arrow's leg.
	 */
	readonly minElbowLegLength: Record<TLDefaultSizeStyle, number>
	/**
	 * The minimum distance, in screen pixels, between two handles on an elbow arrow. If two handles
	 * would be closer than this distance, they're both hidden.
	 */
	readonly minElbowHandleDistance: number

	/**
	 * The distance, in screen pixels, at which we snap to the center of a target shape when drawing
	 * an arc arrow. Set to 0 to disable.
	 */
	readonly arcArrowCenterSnapDistance: number
	/**
	 * The distance, in screen pixels, at which we snap to the center of a target shape when drawing
	 * an elbow arrow. Set to 0 to disable.
	 */
	readonly elbowArrowCenterSnapDistance: number
	/**
	 * The distance, in screen pixels, at which we snap to the edge of a target shape when drawing
	 * an elbow arrow. Set to 0 to disable.
	 */
	readonly elbowArrowEdgeSnapDistance: number
	/**
	 * The distance, in screen pixels, at which we snap to one of the 4 directional points (top,
	 * right, bottom, left) of a target shape when drawing an elbow arrow. Set to 0 to disable.
	 */
	readonly elbowArrowPointSnapDistance: number
	/**
	 * The distance, in screen pixels, at which we snap to the axis passing through the center of a
	 * shape when drawing an elbow arrow. Set to 0 to disable.
	 */
	readonly elbowArrowAxisSnapDistance: number

	/**
	 * The distance, in screen pixels, at which we snap an arrow label to center of the arrow when
	 * dragging it. Set to 0 to disable.
	 */
	readonly labelCenterSnapDistance: number
	/**
	 * The distance, in screen pixels, at which we snap an elbow arrow midpoint handle to the
	 * midpoint between two shapes. Set to 0 to disable.
	 */
	readonly elbowMidpointSnapDistance: number
	/**
	 * The minimum length, in screen pixels, of an elbow arrows midpoint segment before we show the
	 * handle for dragging that segment.
	 */
	readonly elbowMinSegmentLengthToShowMidpointHandle: number

	/**
	 * When hovering over a shape using the arrow tool, how long should we wait before we assume the
	 * user is targeting precisely instead of imprecisely.
	 */
	readonly hoverPreciseTimeout: number
	/**
	 * When pointing at a shape using the arrow tool or dragging an arrow terminal handle, how long
	 * should we wait before we assume the user is targeting precisely instead of imprecisely.
	 */
	readonly pointingPreciseTimeout: number

	/**
	 * When creating an arrow, should it stop exactly at the pointer, or should
	 * it stop at the edge of the target shape.
	 */
	shouldBeExact(editor: Editor, isPrecise: boolean): boolean
	/**
	 * When creating an arrow, should it bind to the target shape.
	 */
	shouldIgnoreTargets(editor: Editor): boolean
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
