import {
	approximately,
	assert,
	Box,
	Editor,
	elbowArrowDebug,
	ElbowArrowSide,
	exhaustiveSwitchError,
	Geometry2d,
	invLerp,
	lerp,
	Mat,
	TLArrowBinding,
	TLArrowBindingProps,
	TLArrowShape,
	TLShapeId,
	Vec,
	VecLike,
	VecModel,
} from '@tldraw/editor'
import { ArrowShapeUtil } from '../ArrowShapeUtil'
import { BOUND_ARROW_OFFSET, STROKE_SIZES, TLArrowBindings } from '../shared'
import { ElbowArrowOptions, ElbowArrowSideAxes, ElbowArrowSideOpposites } from './definitions'
import { ElbowArrowRoute, tryRouteArrow } from './elbowArrowRoutes'
import { getArrowNavigationGrid } from './getArrowNavigationGrid'
import { getArrowPath } from './getArrowPath'
import {
	clampToRange,
	createRange,
	expandRange,
	isWithinRange,
	rangeSize,
	subtractRange,
} from './range'
import {
	routeArrowWithAutoEdgePicking,
	routeArrowWithPartialEdgePicking,
} from './routeArrowWithAutoEdgePicking'

/** @public */
export interface ElbowArrowScale {
	x: 1 | -1
	y: 1 | -1
}

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
	 * The co-ordinate of the edge, expanded by {@link ArrowShapeOptions.expandElbowLegLength}.
	 */
	expanded: number
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
	/** The bounding box transformed by {@link ElbowArrowInfoWithoutRoute.scale}. */
	transformed: Box
	/**
	 * The bounding box, expanded by {@link ArrowShapeOptions.expandElbowLegLength} & transformed
	 * by {@link ElbowArrowInfoWithoutRoute.scale}.
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
	 * The usable edges of the box, after transforming by {@link ElbowArrowInfoWithoutRoute.scale}.
	 */
	edges: ElbowArrowBoxEdges
	/**
	 * The geometry of the bound shape, in arrow space.
	 */
	geometry: Geometry2d | undefined
}

/** @public */
export interface ElbowArrowInfoWithoutRoute {
	/**
	 * The options used for this elbow arrow
	 */
	options: ElbowArrowOptions
	/**
	 * The scale applied to some of the values in this object. We use the scale to flip the boxes so
	 * we only have to deal with cases where A is to the left of and above B.
	 */
	scale: ElbowArrowScale

	/**
	 * If false, A is the start shape and B is the end shape. If true, A is the end shape and B is
	 * the start shape.
	 */
	swapOrder: boolean

	A: ElbowArrowTargetBox
	B: ElbowArrowTargetBox
	common: ElbowArrowBox

	/**
	 * The horizontal position of A relative to B, after transforming by {@link ElbowArrowInfoWithoutRoute.scale}. Note that
	 * due to the transformation, a cannot be to the right of b.
	 */
	hPos: 'a-left-of-b' | 'a-overlaps-b' | 'a-contains-b' | 'a-inside-b' | 'a-matches-b'
	/**
	 * The vertical position of A relative to B, after transforming by {@link ElbowArrowInfoWithoutRoute.scale}. Note that
	 * due to the transformation, a cannot be below b.
	 */
	vPos: 'a-above-b' | 'a-overlaps-b' | 'a-contains-b' | 'a-inside-b' | 'a-matches-b'
	/**
	 * The gap between the right edge of A and the left edge of B, after transforming by {@link ElbowArrowInfoWithoutRoute.scale}.
	 */
	gapX: number
	/**
	 * The gap between the bottom edge of A and the top edge of B, after transforming by {@link ElbowArrowInfoWithoutRoute.scale}.
	 */
	gapY: number
	/**
	 * The X coordinate of the middle line between the two boxes, after transforming by
	 * {@link ElbowArrowInfoWithoutRoute.scale}. If the boxes are too close or overlap, this may be null.
	 */
	midX: number | null
	/**
	 * The Y coordinate of the middle line between the two boxes, after transforming by
	 * {@link ElbowArrowInfoWithoutRoute.scale}. If the boxes are too close or overlap, this may be null.
	 */
	midY: number | null

	/** @internal */
	steve(): {
		grid: any
		path: Vec[] | null
	}
}

/** @public */
export interface ElbowArrowInfo extends ElbowArrowInfoWithoutRoute {
	route: ElbowArrowRoute | null
}

export function getElbowArrowInfo(editor: Editor, arrow: TLArrowShape, bindings: TLArrowBindings) {
	const shapeOptions = editor.getShapeUtil<ArrowShapeUtil>(arrow.type).options
	const options: ElbowArrowOptions = {
		expandElbowLegLength: shapeOptions.expandElbowLegLength[arrow.props.size],
		minElbowLegLength: shapeOptions.minElbowLegLength[arrow.props.size],
		minArrowDistanceFromCorner: shapeOptions.minArrowDistanceFromCorner,
		shortestArrowMeasure: elbowArrowDebug.get().shortest,
	}

	const startBinding = getElbowArrowBindingInfo(editor, arrow, bindings.start, arrow.props.start)
	const endBinding = getElbowArrowBindingInfo(editor, arrow, bindings.end, arrow.props.end)

	const swapOrder = !!(!startBinding.side && endBinding.side)

	const { aBinding, bBinding } = swapOrder
		? { aBinding: endBinding, bBinding: startBinding }
		: { aBinding: startBinding, bBinding: endBinding }

	const scale: ElbowArrowScale = { x: 1, y: 1 }
	if (aBinding.bounds.center.x > bBinding.bounds.center.x) {
		scale.x = -1
	}
	if (aBinding.bounds.center.y > bBinding.bounds.center.y) {
		scale.y = -1
	}

	const transformedA = transformBox(aBinding.bounds, scale)
	const transformedB = transformBox(bBinding.bounds, scale)
	const transformedATarget = transformPoint(aBinding.target, scale)
	const transformedBTarget = transformPoint(bBinding.target, scale)

	const expandedA = aBinding.isPoint
		? transformedA.clone()
		: transformedA.clone().expandBy(options.expandElbowLegLength)
	const expandedB = bBinding.isPoint
		? transformedB.clone()
		: transformedB.clone().expandBy(options.expandElbowLegLength)

	const common: ElbowArrowBox = {
		original: Box.Common([aBinding.bounds, bBinding.bounds]),
		transformed: Box.Common([transformedA, transformedB]),
		expanded: Box.Common([expandedA, expandedB]),
	}

	let hPos: ElbowArrowInfo['hPos']
	let vPos: ElbowArrowInfo['vPos']

	if (transformedA.maxX < transformedB.minX) {
		hPos = 'a-left-of-b'
	} else if (transformedA.maxX > transformedB.maxX && transformedA.minX < transformedB.minX) {
		hPos = 'a-contains-b'
	} else if (transformedB.maxX >= transformedA.maxX && transformedB.minX <= transformedA.minX) {
		hPos = 'a-inside-b'
	} else if (transformedB.maxX >= transformedA.maxX && transformedB.minX <= transformedA.maxX) {
		hPos = 'a-overlaps-b'
	} else if (transformedA.maxX === transformedB.maxX && transformedA.minX === transformedB.minX) {
		hPos = 'a-matches-b'
	} else {
		throw new Error(
			`Invalid horizontal position: A.maxX = ${transformedA.maxX}, A.minX = ${transformedA.minX}, B.maxX = ${transformedB.maxX}, B.minX = ${transformedB.minX}`
		)
	}

	if (transformedA.maxY < transformedB.minY) {
		vPos = 'a-above-b'
	} else if (transformedA.maxY > transformedB.maxY && transformedA.minY < transformedB.minY) {
		vPos = 'a-contains-b'
	} else if (transformedB.maxY >= transformedA.maxY && transformedB.minY <= transformedA.minY) {
		vPos = 'a-inside-b'
	} else if (transformedB.maxY >= transformedA.maxY && transformedB.minY <= transformedA.maxY) {
		vPos = 'a-overlaps-b'
	} else if (transformedA.maxY === transformedB.maxY && transformedA.minY === transformedB.minY) {
		vPos = 'a-matches-b'
	} else {
		throw new Error(
			`Invalid vertical position: A.maxY = ${transformedA.maxY}, A.minY = ${transformedA.minY}, B.maxY = ${transformedB.maxY}, B.minY = ${transformedB.minY}`
		)
	}

	const gapX = transformedB.minX - transformedA.maxX
	const gapY = transformedB.minY - transformedA.maxY

	const mx = gapX > options.minElbowLegLength * 2 ? transformedA.maxX + gapX / 2 : null
	const my = gapY > options.minElbowLegLength * 2 ? transformedA.maxY + gapY / 2 : null

	const edgesA: ElbowArrowBoxEdges = {
		top: getUsableEdge(
			{ bounds: transformedA, target: transformedATarget, isPoint: aBinding.isPoint },
			{ bounds: transformedB, target: transformedBTarget, isPoint: bBinding.isPoint },
			'top',
			options
		),
		right: getUsableEdge(
			{ bounds: transformedA, target: transformedATarget, isPoint: aBinding.isPoint },
			{ bounds: transformedB, target: transformedBTarget, isPoint: bBinding.isPoint },
			'right',
			options
		),
		bottom: getUsableEdge(
			{ bounds: transformedA, target: transformedATarget, isPoint: aBinding.isPoint },
			{ bounds: transformedB, target: transformedBTarget, isPoint: bBinding.isPoint },
			'bottom',
			options
		),
		left: getUsableEdge(
			{ bounds: transformedA, target: transformedATarget, isPoint: aBinding.isPoint },
			{ bounds: transformedB, target: transformedBTarget, isPoint: bBinding.isPoint },
			'left',
			options
		),
	}

	const edgesB = {
		top: getUsableEdge(
			{ bounds: transformedB, target: transformedBTarget, isPoint: bBinding.isPoint },
			{ bounds: transformedA, target: transformedATarget, isPoint: aBinding.isPoint },
			'top',
			options
		),
		right: getUsableEdge(
			{ bounds: transformedB, target: transformedBTarget, isPoint: bBinding.isPoint },
			{ bounds: transformedA, target: transformedATarget, isPoint: aBinding.isPoint },
			'right',
			options
		),
		bottom: getUsableEdge(
			{ bounds: transformedB, target: transformedBTarget, isPoint: bBinding.isPoint },
			{ bounds: transformedA, target: transformedATarget, isPoint: aBinding.isPoint },
			'bottom',
			options
		),
		left: getUsableEdge(
			{ bounds: transformedB, target: transformedBTarget, isPoint: bBinding.isPoint },
			{ bounds: transformedA, target: transformedATarget, isPoint: aBinding.isPoint },
			'left',
			options
		),
	}

	const steve = () => {
		const grid = getArrowNavigationGrid(aBinding.bounds, bBinding.bounds, options)
		const path = getArrowPath(grid, aBinding.side ?? undefined, bBinding.side ?? undefined)
		return { grid, path: path.error ? null : path.path }
	}

	const info: ElbowArrowInfoWithoutRoute = {
		options,
		scale,
		swapOrder,
		A: {
			target: aBinding.target,
			isExact: aBinding.isExact,
			arrowheadOffset: aBinding.arrowheadOffset,
			original: aBinding.bounds,
			transformed: transformedA,
			expanded: expandedA,
			edges: edgesA,
			geometry: aBinding.geometry,
		},
		B: {
			target: bBinding.target,
			isExact: bBinding.isExact,
			arrowheadOffset: bBinding.arrowheadOffset,
			original: bBinding.bounds,
			transformed: transformedB,
			expanded: expandedB,
			edges: edgesB,
			geometry: bBinding.geometry,
		},
		common,
		hPos,
		vPos,
		gapX,
		gapY,
		midX: mx,
		midY: my,

		steve,
	}

	let route
	if (aBinding.side && bBinding.side) {
		route = tryRouteArrow(
			info,
			transformSide(aBinding.side, info.scale),
			transformSide(bBinding.side, info.scale)
		)
	}
	if (aBinding.side && !bBinding.side) {
		route = routeArrowWithPartialEdgePicking(info, transformSide(aBinding.side, info.scale))
	}
	if (!route) {
		route = routeArrowWithAutoEdgePicking(info)
	}
	if (route) {
		route = transformRoute(route, info.scale)

		castPathSegmentIntoGeometry('first', info.A, route)
		castPathSegmentIntoGeometry('last', info.B, route)

		if (swapOrder) route.points.reverse()
	}

	return { ...info, route }
}

export function getRouteHandlePath(info: ElbowArrowInfo, route: ElbowArrowRoute): ElbowArrowRoute {
	const startTarget = info.swapOrder ? info.B.target : info.A.target
	const endTarget = info.swapOrder ? info.A.target : info.B.target

	const firstSegmentLength = Vec.ManhattanDist(route.points[0], route.points[1])
	const lastSegmentLength = Vec.ManhattanDist(
		route.points[route.points.length - 2],
		route.points[route.points.length - 1]
	)

	const newFirstSegmentLength = Vec.ManhattanDist(startTarget, route.points[1])
	const newLastSegmentLength = Vec.ManhattanDist(route.points[route.points.length - 2], endTarget)

	const firstSegmentLengthChange = firstSegmentLength - newFirstSegmentLength
	const lastSegmentLengthChange = lastSegmentLength - newLastSegmentLength

	const newPoints = route.points.slice()
	newPoints[0] = startTarget
	newPoints[newPoints.length - 1] = endTarget

	return {
		name: route.name,
		distance: route.distance + firstSegmentLengthChange + lastSegmentLengthChange,
		points: newPoints,
		aEdgePicking: route.aEdgePicking,
		bEdgePicking: route.bEdgePicking,
	}
}

export function getEdgeFromNormalizedAnchor(normalizedAnchor: VecLike) {
	if (approximately(normalizedAnchor.x, 0.5) && approximately(normalizedAnchor.y, 0.5)) {
		return null
	}

	if (Math.abs(normalizedAnchor.x - 0.5) > Math.abs(normalizedAnchor.y - 0.5)) {
		return normalizedAnchor.x < 0.5 ? 'left' : 'right'
	}

	return normalizedAnchor.y < 0.5 ? 'top' : 'bottom'
}

function getElbowArrowBindingInfo(
	editor: Editor,
	arrow: TLArrowShape,
	binding: TLArrowBinding | undefined,
	point: VecModel
) {
	if (binding) {
		const target = editor.getShape(binding.toId)
		const geometry = getBindingGeometryInArrowSpace(editor, arrow.id, binding.toId, binding.props)
		if (geometry && target) {
			let arrowheadOffset = 0
			const arrowheadProp = binding.props.terminal === 'start' ? 'arrowheadStart' : 'arrowheadEnd'
			if (arrow.props[arrowheadProp] !== 'none') {
				const arrowStrokeSize = (STROKE_SIZES[arrow.props.size] * arrow.props.scale) / 2
				const targetScale = 'scale' in target.props ? target.props.scale : 1
				const targetStrokeSize =
					'size' in target.props ? ((STROKE_SIZES[target.props.size] ?? 0) * targetScale) / 2 : 0

				arrowheadOffset =
					arrowStrokeSize + targetStrokeSize + BOUND_ARROW_OFFSET * arrow.props.scale
			}

			const impreciseEdgePickingMode = elbowArrowDebug.get().impreciseEdgePicking
			let side: ElbowArrowSide | null = null
			let targetPoint = geometry.target
			if (binding.props.isPrecise) {
				side = getEdgeFromNormalizedAnchor(
					Vec.RotWith(
						binding.props.normalizedAnchor,
						{ x: 0.5, y: 0.5 },
						geometry.shapeToArrowTransform.rotation()
					)
				)
				if (
					elbowArrowDebug.get().hintBinding === 'center' &&
					(binding.props.snap === 'point' || binding.props.snap === 'axis')
				) {
					targetPoint = geometry.center
				}
			} else if (impreciseEdgePickingMode === 'velocity') {
				side = binding.props.entrySide
			}

			return {
				isPoint: false,
				isExact: binding.props.isExact,
				bounds: geometry.bounds,
				geometry: geometry.geometry,
				target: targetPoint,
				arrowheadOffset,
				side,
			}
		}
	}

	return {
		bounds: Box.FromCenter(point, { x: 0, y: 0 }),
		geometries: [],
		isExact: false,
		isPoint: true,
		target: Vec.From(point),
		arrowheadOffset: 0,
		side: null,
	}
}

export function getBindingGeometryInArrowSpace(
	editor: Editor,
	arrowId: TLShapeId,
	targetId: TLShapeId,
	bindingProps: TLArrowBindingProps
) {
	const targetGeometryInTargetSpace = editor.getShapeGeometry(targetId)
	if (!targetGeometryInTargetSpace) {
		return null
	}

	const arrowTransform = editor.getShapePageTransform(arrowId)
	const shapeTransform = editor.getShapePageTransform(targetId)
	const shapeToArrowTransform = arrowTransform.clone().invert().multiply(shapeTransform)

	const targetGeometryInArrowSpace = targetGeometryInTargetSpace.transform(shapeToArrowTransform)

	const center = { x: 0.5, y: 0.5 }
	const normalizedAnchor = bindingProps.isPrecise ? bindingProps.normalizedAnchor : center

	const targetInShapeSpace = {
		x: lerp(
			targetGeometryInTargetSpace.bounds.minX,
			targetGeometryInTargetSpace.bounds.maxX,
			normalizedAnchor.x
		),
		y: lerp(
			targetGeometryInTargetSpace.bounds.minY,
			targetGeometryInTargetSpace.bounds.maxY,
			normalizedAnchor.y
		),
	}
	const centerInShapeSpace = {
		x: lerp(
			targetGeometryInTargetSpace.bounds.minX,
			targetGeometryInTargetSpace.bounds.maxX,
			center.x
		),
		y: lerp(
			targetGeometryInTargetSpace.bounds.minY,
			targetGeometryInTargetSpace.bounds.maxY,
			center.y
		),
	}

	const targetInArrowSpace = Mat.applyToPoint(shapeToArrowTransform, targetInShapeSpace)
	const centerInArrowSpace = Mat.applyToPoint(shapeToArrowTransform, centerInShapeSpace)

	return {
		bounds: targetGeometryInArrowSpace.bounds,
		geometry: targetGeometryInArrowSpace,
		target: targetInArrowSpace,
		center: centerInArrowSpace,
		shapeToArrowTransform,
	}
}

export function transformBox(box: Box, scale: ElbowArrowScale) {
	return new Box(
		box.x * scale.x - (scale.x === 1 ? 0 : box.width),
		box.y * scale.y - (scale.y === 1 ? 0 : box.height),
		box.width,
		box.height
	)
}

export function transformPoint(point: VecLike, scale: ElbowArrowScale) {
	return new Vec(point.x * scale.x, point.y * scale.y)
}

export function transformRoute(route: ElbowArrowRoute, scale: ElbowArrowScale): ElbowArrowRoute {
	return {
		...route,
		points: route.points.map((r) => transformPoint(r, scale)),
	}
}

export function transformSide(side: ElbowArrowSide, scale: ElbowArrowScale) {
	return scale[ElbowArrowSideAxes[side]] === 1 ? side : ElbowArrowSideOpposites[side]
}

const sideProps = {
	top: {
		expand: -1,
		main: 'minY',
		opposite: 'maxY',
		crossMid: 'midX',
		crossMin: 'minX',
		crossMax: 'maxX',
		bRangeExpand: 'max',
		crossAxis: 'x',
	},
	bottom: {
		expand: 1,
		main: 'maxY',
		opposite: 'minY',
		crossMid: 'midX',
		crossMin: 'minX',
		crossMax: 'maxX',
		bRangeExpand: 'min',
		crossAxis: 'x',
	},
	left: {
		expand: -1,
		main: 'minX',
		opposite: 'maxX',
		crossMid: 'midY',
		crossMin: 'minY',
		crossMax: 'maxY',
		bRangeExpand: 'max',
		crossAxis: 'y',
	},
	right: {
		expand: 1,
		main: 'maxX',
		opposite: 'minX',
		crossMid: 'midY',
		crossMin: 'minY',
		crossMax: 'maxY',
		bRangeExpand: 'min',
		crossAxis: 'y',
	},
} as const

export function getUsableEdge(
	a: { bounds: Box; target: Vec; isPoint: boolean },
	b: { bounds: Box; target: Vec; isPoint: boolean },
	side: 'top' | 'right' | 'bottom' | 'left',
	options: ElbowArrowOptions
): ElbowArrowEdge | null {
	const props = sideProps[side]

	const aValue = a.bounds[props.main]
	const aExpanded = a.isPoint ? aValue : aValue + props.expand * options.expandElbowLegLength

	const originalACrossRange = expandRange(
		createRange(a.bounds[props.crossMin], a.bounds[props.crossMax]),
		Math.abs(a.bounds[props.crossMin] - a.bounds[props.crossMax]) <
			options.minArrowDistanceFromCorner * 2
			? 0
			: -options.minArrowDistanceFromCorner
	)
	let aCrossRange = originalACrossRange

	// this edge is too small to be useful:
	if (!aCrossRange) {
		return null
	}

	assert(originalACrossRange)
	const bRange = createRange(b.bounds[props.main], b.bounds[props.opposite])
	if (!b.isPoint) {
		bRange[props.bRangeExpand] -= options.minElbowLegLength * 2 * props.expand
	}

	const bCrossRange = expandRange(
		createRange(b.bounds[props.crossMin], b.bounds[props.crossMax]),
		options.expandElbowLegLength
	)
	assert(bRange && bCrossRange)

	let isPartial = false
	if (isWithinRange(aValue, bRange) && !a.isPoint && !b.isPoint) {
		const subtracted = subtractRange(aCrossRange, bCrossRange)
		switch (subtracted.length) {
			case 0:
				return null
			case 1:
				isPartial = subtracted[0] !== aCrossRange
				aCrossRange = subtracted[0]
				break
			case 2:
				isPartial = true
				aCrossRange =
					rangeSize(subtracted[0]) > rangeSize(subtracted[1]) ? subtracted[0] : subtracted[1]
				break
			default:
				exhaustiveSwitchError(subtracted)
		}
	}

	let crossTarget
	switch (elbowArrowDebug.get().targetStyle) {
		case 'push':
			crossTarget = clampToRange(a.target[props.crossAxis], aCrossRange)
			break
		case 'center':
			crossTarget = lerp(
				aCrossRange.min,
				aCrossRange.max,
				invLerp(originalACrossRange.min, originalACrossRange.max, a.target[props.crossAxis])
			)
			break
		case 'remove':
			if (!isWithinRange(a.target[props.crossAxis], aCrossRange)) {
				return null
			}
			crossTarget = a.target[props.crossAxis]
			break
	}

	return {
		value: aValue,
		expanded: aExpanded,
		cross: aCrossRange,
		// crossTarget: clampToRange(a.bounds[props.crossMid], aCrossRange),
		// crossTarget: lerp(aCrossRange.min, aCrossRange.max, 0.5),
		crossTarget,
		isPartial,
	}
}

/**
 * Make sure the first path segments goes fully into the target, and doesn't just point to its
 * bounding box. This modifies the route in-place.
 */
function castPathSegmentIntoGeometry(
	segment: 'first' | 'last',
	target: ElbowArrowTargetBox,
	route: ElbowArrowRoute
) {
	const point1 = segment === 'first' ? route.points[0] : route.points[route.points.length - 1]
	const point2 = segment === 'first' ? route.points[1] : route.points[route.points.length - 2]

	const farPoint = Vec.Nudge(
		point1,
		point2,
		-Math.max(target.original.width, target.original.height)
	)

	const initialDistance = Vec.ManhattanDist(point1, point2)

	let nearestIntersection: VecLike | null = null
	let nearestDistance = Infinity

	if (target.isExact) {
		nearestIntersection = target.target
	} else if (target.geometry) {
		for (const intersection of target.geometry.intersectLineSegment(point2, farPoint, {
			includeLabels: false,
			includeInternal: false,
		})) {
			const distance = Vec.ManhattanDist(point1, intersection)
			if (distance < nearestDistance) {
				nearestDistance = distance
				nearestIntersection = intersection
			}
		}
	}

	if (nearestIntersection) {
		if (!target.isExact && target.arrowheadOffset !== 0) {
			nearestIntersection = Vec.Nudge(nearestIntersection, point2, target.arrowheadOffset)
		}

		const newDistance = Vec.ManhattanDist(point2, nearestIntersection)
		route.distance += newDistance - initialDistance
		point1.x = nearestIntersection.x
		point1.y = nearestIntersection.y
	}
}
