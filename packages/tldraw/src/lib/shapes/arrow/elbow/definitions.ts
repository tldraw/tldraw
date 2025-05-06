import { Box, ElbowArrowSnap, Geometry2d, TLShapeId, Vec, VecLike, VecModel } from '@tldraw/editor'

/** @public */
export type ElbowArrowSide = 'top' | 'right' | 'bottom' | 'left'

/** @internal */
export type ElbowArrowSideReason = 'manual' | 'auto'

/** @public */
export interface ElbowArrowRoute {
	name: string
	points: Vec[]
	distance: number
	/** @internal */
	aEdgePicking: ElbowArrowSideReason
	/** @internal */
	bEdgePicking: ElbowArrowSideReason
	skipPointsWhenDrawing: Set<Vec>
	midpointHandle: ElbowArrowMidpointHandle | null
}

/** @public */
export interface ElbowArrowMidpointHandle {
	axis: 'x' | 'y'
	segmentStart: VecLike
	segmentEnd: VecLike
	point: VecLike
}

export const ElbowArrowSides = ['right', 'bottom', 'left', 'top'] as const

/** @public */
export interface ElbowArrowOptions {
	expandElbowLegLength: number
	minExpandElbowLegLength: number
	minElbowLegLength: number
	elbowMidpoint: number
}

export const ElbowArrowSideDeltas = {
	top: { x: 0, y: -1 },
	right: { x: 1, y: 0 },
	bottom: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
} as const satisfies Record<ElbowArrowSide, VecModel>

export const ElbowArrowSideAxes = {
	left: 'x',
	right: 'x',
	top: 'y',
	bottom: 'y',
} as const satisfies Record<ElbowArrowSide, 'x' | 'y'>

export const ElbowArrowSideOpposites = {
	top: 'bottom',
	right: 'left',
	bottom: 'top',
	left: 'right',
} as const satisfies Record<ElbowArrowSide, ElbowArrowSide>

export const ElbowArrowAxes = {
	x: {
		v: (x: number, y: number) => new Vec(x, y),
		loEdge: 'left',
		hiEdge: 'right',
		crossMid: 'midY',
		gap: 'gapX',
		midRange: 'midXRange',
		self: 'x',
		cross: 'y',
		size: 'width',
	},
	y: {
		v: (y: number, x: number) => new Vec(x, y),
		loEdge: 'top',
		hiEdge: 'bottom',
		crossMid: 'midX',
		gap: 'gapY',
		midRange: 'midYRange',
		self: 'y',
		cross: 'x',
		size: 'height',
	},
} as const

export type ElbowArrowAxis = (typeof ElbowArrowAxes)[keyof typeof ElbowArrowAxes]

export type ElbowArrowSideWithAxis = ElbowArrowSide | 'x' | 'y'

/** @public */
export interface ElbowArrowBoxes {
	/** The starting bounding box */
	A: Box
	/** The ending bounding box */
	B: Box
	/** The common bounding box of A and B */
	common: Box
}

/** @public */
export interface ElbowArrowRange {
	min: number
	max: number
}

/**
 * An edge on a box.
 * @public
 */
export interface ElbowArrowEdge {
	/**
	 * The co-ordinate of the edge. An x-coordinate if left/right, a y-coordinate if top/bottom.
	 */
	value: number
	/**
	 * The co-ordinate of the edge, expanded by {@link ArrowShapeOptions.expandElbowLegLength}. May
	 * be null if the target is a point.
	 */
	expanded: number | null
	/**
	 * The usable range of the edge along its cross-axis. Y-coordinates if left/right, x-coordinated
	 * if top/bottom.
	 */
	cross: ElbowArrowRange
	/**
	 * The point of the target along the edge, constrained to within {@link ElbowArrowEdge.cross}.
	 */
	crossTarget: number
	/**
	 * Whether the cross-axis range is shrunk from the original range to make space for the other shape.
	 */
	isPartial: boolean
}

/**
 * The usable range of the edges of a box. Each edge might be null if the edge is not usable for
 * entry/exit.
 * @public
 */
export interface ElbowArrowBoxEdges {
	top: ElbowArrowEdge | null
	right: ElbowArrowEdge | null
	bottom: ElbowArrowEdge | null
	left: ElbowArrowEdge | null
}

/**
 * @public
 */
export interface ElbowArrowBox {
	/** The original bounding box */
	original: Box
	/**
	 * The bounding box, expanded by {@link ArrowShapeOptions.expandElbowLegLength}.
	 */
	expanded: Box
}

/**
 * @public
 */
export interface ElbowArrowTargetBox extends ElbowArrowBox {
	/** What specific point in the box are we aiming for? */
	target: Vec
	/**
	 * If true, the arrow should end at `target`. If false, the arrow should end at the edge of the
	 * shape, pointing at `target`.
	 */
	isExact: boolean
	/**
	 * How far away from this box should the arrow terminate to leave space for the arrowhead?
	 */
	arrowheadOffset: number
	/**
	 * The minimum length of the segment of the arrow that actually reaches the target - and has the
	 * arrowhead on it.
	 */
	minEndSegmentLength: number
	/**
	 * The usable edges of the box.
	 */
	edges: ElbowArrowBoxEdges
	/**
	 * The geometry of the bound shape, in arrow space.
	 */
	geometry: Geometry2d | null
	isPoint: boolean
}

/** @public */
export interface ElbowArrowInfoWithoutRoute {
	/**
	 * The options used for this elbow arrow
	 */
	options: ElbowArrowOptions

	A: ElbowArrowTargetBox
	B: ElbowArrowTargetBox
	common: ElbowArrowBox

	/**
	 * The gap between the right edge of A and the left edge of B.
	 */
	gapX: number
	/**
	 * The gap between the bottom edge of A and the top edge of B.
	 */
	gapY: number
	/**
	 * The X coordinate of the middle line between the two boxes. If the boxes are too close or
	 * overlap, this may be null.
	 */
	midX: number | null
	/**
	 * The Y coordinate of the middle line between the two boxes. If the boxes are too close or
	 * overlap, this may be null.
	 */
	midY: number | null
}

/** @public */
export interface ElbowArrowInfo extends ElbowArrowInfoWithoutRoute {
	/**
	 * If false, A is the start shape and B is the end shape. If true, A is the end shape and B is
	 * the start shape.
	 */
	swapOrder: boolean

	/**
	 * The route of the arrow.
	 */
	route: ElbowArrowRoute | null

	midXRange: { lo: number; hi: number } | null
	midYRange: { lo: number; hi: number } | null
}

export interface ElbowArrowBinding {
	/**
	 * The id of the shape we're binding to, if any.
	 */
	targetShapeId: TLShapeId | null
	/**
	 * The side of the box that the arrow should enter from.
	 */
	side: ElbowArrowSideWithAxis | null
	/**
	 * The bounding box of the shape. May have width/height of 0 if the shape is a point.
	 */
	bounds: Box
	/**
	 * The geometry of the we're binding to, if it exists.
	 */
	geometry: Geometry2d | null
	/**
	 * The target point of the arrow.
	 */
	target: Vec
	/**
	 * How far away from the target should the arrow terminate to leave space for the arrowhead?
	 */
	arrowheadOffset: number
	/**
	 * The minimum length of the segment of the arrow that actually reaches the target - and has the
	 * arrowhead on it.
	 */
	minEndSegmentLength: number
	/**
	 * Whether the target is an exact point. within a shape's geometry.
	 */
	isExact: boolean
	/**
	 * Whether the target is a point, rather than a bounding box
	 */
	isPoint: boolean
	/**
	 * How did this binding get snapped to the target shape?
	 */
	snap: ElbowArrowSnap
}
