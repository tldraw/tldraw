import {
	approximately,
	assert,
	Box,
	Editor,
	exhaustiveSwitchError,
	Geometry2dFilters,
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
import {
	ElbowArrowAxes,
	ElbowArrowBinding,
	ElbowArrowBox,
	ElbowArrowBoxEdges,
	ElbowArrowEdge,
	ElbowArrowInfo,
	ElbowArrowInfoWithoutRoute,
	ElbowArrowOptions,
	ElbowArrowRoute,
	ElbowArrowSide,
	ElbowArrowSideWithAxis,
	ElbowArrowTargetBox,
} from './definitions'
import { createRange, expandRange, isWithinRange, rangeSize, subtractRange } from './range'
import { tryRouteArrow } from './routes/elbowArrowRoutes'
import { ElbowArrowWorkingInfo } from './routes/ElbowArrowWorkingInfo'
import {
	routeArrowWithAutoEdgePicking,
	routeArrowWithPartialEdgePicking,
} from './routes/routeArrowWithAutoEdgePicking'

export function getElbowArrowInfo(
	editor: Editor,
	arrow: TLArrowShape,
	bindings: TLArrowBindings
): ElbowArrowInfo {
	const shapeOptions = editor.getShapeUtil<ArrowShapeUtil>(arrow.type).options
	const options: ElbowArrowOptions = {
		elbowMidpoint: arrow.props.elbowMidPoint * arrow.props.scale,
		expandElbowLegLength: shapeOptions.expandElbowLegLength[arrow.props.size] * arrow.props.scale,
		minElbowLegLength: shapeOptions.minElbowLegLength[arrow.props.size] * arrow.props.scale,
	}

	const startBinding = getElbowArrowBindingInfo(editor, arrow, bindings.start, arrow.props.start)
	const endBinding = getElbowArrowBindingInfo(editor, arrow, bindings.end, arrow.props.end)
	adjustBindingForUnclosedPathIfNeeded(startBinding)
	adjustBindingForUnclosedPathIfNeeded(endBinding)

	const swapOrder = !!(!startBinding.side && endBinding.side)

	let { aBinding, bBinding } = swapOrder
		? { aBinding: endBinding, bBinding: startBinding }
		: { aBinding: startBinding, bBinding: endBinding }

	let edgesA = {
		top: getUsableEdge(aBinding, bBinding, 'top', options),
		right: getUsableEdge(aBinding, bBinding, 'right', options),
		bottom: getUsableEdge(aBinding, bBinding, 'bottom', options),
		left: getUsableEdge(aBinding, bBinding, 'left', options),
	}

	let edgesB = {
		top: getUsableEdge(bBinding, aBinding, 'top', options),
		right: getUsableEdge(bBinding, aBinding, 'right', options),
		bottom: getUsableEdge(bBinding, aBinding, 'bottom', options),
		left: getUsableEdge(bBinding, aBinding, 'left', options),
	}

	const aIsUsable = hasUsableEdge(edgesA, aBinding.side)
	const bIsUsable = hasUsableEdge(edgesB, bBinding.side)
	let needsNewEdges = false

	if (!aIsUsable || !bIsUsable) {
		needsNewEdges = true
		if (!aIsUsable) {
			bBinding = convertBindingToPoint(bBinding)
		}

		if (!bIsUsable) {
			aBinding = convertBindingToPoint(aBinding)
		}

		if (bBinding.bounds.containsPoint(aBinding.target, options.expandElbowLegLength)) {
			bBinding = convertBindingToPoint(bBinding)
		}

		if (aBinding.bounds.containsPoint(bBinding.target, options.expandElbowLegLength)) {
			aBinding = convertBindingToPoint(aBinding)
		}
	}

	if (needsNewEdges) {
		edgesA = {
			top: getUsableEdge(aBinding, bBinding, 'top', options),
			right: getUsableEdge(aBinding, bBinding, 'right', options),
			bottom: getUsableEdge(aBinding, bBinding, 'bottom', options),
			left: getUsableEdge(aBinding, bBinding, 'left', options),
		}

		edgesB = {
			top: getUsableEdge(bBinding, aBinding, 'top', options),
			right: getUsableEdge(bBinding, aBinding, 'right', options),
			bottom: getUsableEdge(bBinding, aBinding, 'bottom', options),
			left: getUsableEdge(bBinding, aBinding, 'left', options),
		}
	}

	const expandedA = aBinding.isPoint
		? aBinding.bounds
		: aBinding.bounds.clone().expandBy(options.expandElbowLegLength)
	const expandedB = bBinding.isPoint
		? bBinding.bounds
		: bBinding.bounds.clone().expandBy(options.expandElbowLegLength)

	const common: ElbowArrowBox = {
		original: Box.Common([aBinding.bounds, bBinding.bounds]),
		expanded: Box.Common([expandedA, expandedB]),
	}

	let gapX = bBinding.bounds.minX - aBinding.bounds.maxX
	if (gapX < 0) {
		gapX = aBinding.bounds.minX - bBinding.bounds.maxX
		if (gapX < 0) {
			gapX = 0
		}
		gapX = -gapX
	}
	let gapY = bBinding.bounds.minY - aBinding.bounds.maxY
	if (gapY < 0) {
		gapY = aBinding.bounds.minY - bBinding.bounds.maxY
		if (gapY < 0) {
			gapY = 0
		}
		gapY = -gapY
	}

	let mxRange: null | { a: number; b: number } = null
	const aMinLength = aBinding.minEndSegmentLength * 3
	const bMinLength = bBinding.minEndSegmentLength * 3
	const minLegDistanceNeeded =
		(aBinding.isPoint ? aMinLength : options.minElbowLegLength) +
		(bBinding.isPoint ? bMinLength : options.minElbowLegLength)
	if (gapX > minLegDistanceNeeded) {
		mxRange = {
			a: aBinding.isPoint ? aBinding.bounds.maxX + aMinLength : expandedA.maxX,
			b: bBinding.isPoint ? bBinding.bounds.minX - bMinLength : expandedB.minX,
		}
	} else if (gapX < -minLegDistanceNeeded) {
		mxRange = {
			a: aBinding.isPoint ? aBinding.bounds.minX - aMinLength : expandedA.minX,
			b: bBinding.isPoint ? bBinding.bounds.maxX + bMinLength : expandedB.maxX,
		}
	}

	let myRange: null | { a: number; b: number } = null
	if (gapY > minLegDistanceNeeded) {
		myRange = {
			a: aBinding.isPoint ? aBinding.bounds.maxY + aMinLength : expandedA.maxY,
			b: bBinding.isPoint ? bBinding.bounds.minY - bMinLength : expandedB.minY,
		}
	} else if (gapY < -minLegDistanceNeeded) {
		myRange = {
			a: aBinding.isPoint ? aBinding.bounds.minY - aMinLength : expandedA.minY,
			b: bBinding.isPoint ? bBinding.bounds.maxY + bMinLength : expandedB.maxY,
		}
	}

	const midpoint = swapOrder ? 1 - options.elbowMidpoint : options.elbowMidpoint
	const mx = mxRange ? lerp(mxRange.a, mxRange.b, midpoint) : null
	const my = myRange ? lerp(myRange.a, myRange.b, midpoint) : null

	const info: ElbowArrowInfoWithoutRoute = {
		options,
		A: {
			isPoint: aBinding.isPoint,
			target: aBinding.target,
			isExact: aBinding.isExact,
			arrowheadOffset: aBinding.arrowheadOffset,
			minEndSegmentLength: aBinding.minEndSegmentLength,
			original: aBinding.bounds,
			expanded: expandedA,
			edges: edgesA,
			geometry: aBinding.geometry,
		},
		B: {
			isPoint: bBinding.isPoint,
			target: bBinding.target,
			isExact: bBinding.isExact,
			arrowheadOffset: bBinding.arrowheadOffset,
			minEndSegmentLength: bBinding.minEndSegmentLength,
			original: bBinding.bounds,
			expanded: expandedB,
			edges: edgesB,
			geometry: bBinding.geometry,
		},
		common,
		gapX,
		gapY,
		midX: mx,
		midY: my,
	}

	const workingInfo = new ElbowArrowWorkingInfo(info)
	const aSide = getSideToUse(aBinding, bBinding, info.A.edges)
	const bSide = getSideToUse(bBinding, aBinding, info.B.edges)

	let route
	if (aSide && bSide) {
		route = tryRouteArrow(workingInfo, aSide, bSide)
	} else if (aSide && !bSide) {
		route = routeArrowWithPartialEdgePicking(workingInfo, aSide)
	} else {
		route = routeArrowWithAutoEdgePicking(workingInfo)
	}

	if (route) {
		castPathSegmentIntoGeometry('first', info.A, info.B, route, options)
		castPathSegmentIntoGeometry('last', info.B, info.A, route, options)
		fixTinyEndNubs(route, aBinding, bBinding)

		if (swapOrder) route.points.reverse()
	}

	return {
		...info,
		swapOrder,
		route,
		midXRange: mxRange
			? swapOrder
				? { lo: mxRange.b, hi: mxRange.a }
				: { lo: mxRange.a, hi: mxRange.b }
			: null,
		midYRange: myRange
			? swapOrder
				? { lo: myRange.b, hi: myRange.a }
				: { lo: myRange.a, hi: myRange.b }
			: null,
	}
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

	const newPoints = [startTarget, ...route.points, endTarget]

	return {
		name: route.name,
		distance: route.distance + firstSegmentLengthChange + lastSegmentLengthChange,
		points: newPoints.filter((p) => !route.skipPointsWhenDrawing.has(p)),
		aEdgePicking: route.aEdgePicking,
		bEdgePicking: route.bEdgePicking,
		skipPointsWhenDrawing: route.skipPointsWhenDrawing,
		midpointHandle: route.midpointHandle,
	}
}

export function getEdgeFromNormalizedAnchor(normalizedAnchor: VecLike) {
	if (approximately(normalizedAnchor.x, 0.5) && approximately(normalizedAnchor.y, 0.5)) {
		return null
	}

	if (
		Math.abs(normalizedAnchor.x - 0.5) >
		// slightly bias towards x arrows to prevent flickering when the anchor is right on the line
		// between the two directions
		Math.abs(normalizedAnchor.y - 0.5) - 0.0001
	) {
		return normalizedAnchor.x < 0.5 ? 'left' : 'right'
	}

	return normalizedAnchor.y < 0.5 ? 'top' : 'bottom'
}

function getElbowArrowBindingInfo(
	editor: Editor,
	arrow: TLArrowShape,
	binding: TLArrowBinding | undefined,
	point: VecModel
): ElbowArrowBinding {
	const arrowStrokeSize = (STROKE_SIZES[arrow.props.size] * arrow.props.scale) / 2
	const minEndSegmentLength = arrowStrokeSize * arrow.props.scale * 3

	if (binding) {
		const target = editor.getShape(binding.toId)
		const geometry = getBindingGeometryInArrowSpace(editor, arrow.id, binding.toId, binding.props)
		if (geometry && target) {
			let arrowheadOffset = 0
			const arrowheadProp = binding.props.terminal === 'start' ? 'arrowheadStart' : 'arrowheadEnd'
			if (arrow.props[arrowheadProp] !== 'none') {
				const targetScale = 'scale' in target.props ? target.props.scale : 1
				const targetStrokeSize =
					'size' in target.props ? ((STROKE_SIZES[target.props.size] ?? 0) * targetScale) / 2 : 0

				arrowheadOffset =
					arrowStrokeSize + targetStrokeSize + BOUND_ARROW_OFFSET * arrow.props.scale
			}

			let side: ElbowArrowSideWithAxis | null = null
			const targetPoint = geometry.target
			if (binding.props.isPrecise) {
				side = getEdgeFromNormalizedAnchor(
					Vec.RotWith(
						binding.props.normalizedAnchor,
						{ x: 0.5, y: 0.5 },
						geometry.shapeToArrowTransform.rotation()
					)
				)
			}

			return {
				targetShapeId: binding.toId,
				isPoint: false,
				isExact: binding.props.isExact,
				bounds: geometry.bounds,
				geometry: geometry.geometry,
				target: targetPoint,
				arrowheadOffset,
				minEndSegmentLength,
				side,
				snap: binding.props.snap,
			}
		}
	}

	return {
		targetShapeId: null,
		bounds: Box.FromCenter(point, { x: 0, y: 0 }),
		geometry: null,
		isExact: false,
		isPoint: true,
		target: Vec.From(point),
		arrowheadOffset: 0,
		minEndSegmentLength,
		side: null,
		snap: 'none',
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
	a: ElbowArrowBinding,
	b: ElbowArrowBinding,
	side: 'top' | 'right' | 'bottom' | 'left',
	options: ElbowArrowOptions
): ElbowArrowEdge | null {
	const props = sideProps[side]

	// if a shape is bound to itself, by default we'd end up routing the arrow _within_ the shape -
	// as if it were a point-to-point arrow. if one of the bindings is specifically to the edge
	// though, we route it externally instead.
	const isSelfBoundAndShouldRouteExternal =
		a.targetShapeId === b.targetShapeId &&
		a.targetShapeId !== null &&
		(a.snap === 'edge' || a.snap === 'edge-point') &&
		(b.snap === 'edge' || b.snap === 'edge-point')

	const aValue = a.bounds[props.main]
	const aExpanded = a.isPoint ? null : aValue + props.expand * options.expandElbowLegLength

	const originalACrossRange = createRange(a.bounds[props.crossMin], a.bounds[props.crossMax])
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
	if (
		isWithinRange(aValue, bRange) &&
		!a.isPoint &&
		!b.isPoint &&
		!isSelfBoundAndShouldRouteExternal
	) {
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

	if (!isWithinRange(a.target[props.crossAxis], aCrossRange)) {
		return null
	}
	const crossTarget = a.target[props.crossAxis]

	return {
		value: aValue,
		expanded: aExpanded,
		cross: aCrossRange,
		crossTarget,
		isPartial,
	}
}

function hasUsableEdge(edges: ElbowArrowBoxEdges, side: ElbowArrowSideWithAxis | null) {
	if (side === null) {
		return !!(edges.bottom || edges.left || edges.right || edges.top)
	}

	if (side === 'x') {
		return !!edges.left || !!edges.right
	}

	if (side === 'y') {
		return !!edges.top || !!edges.bottom
	}

	return !!edges[side]
}

function getSideToUse(
	binding: ElbowArrowBinding,
	other: ElbowArrowBinding,
	edges: ElbowArrowBoxEdges | null
): ElbowArrowSide | null {
	switch (binding.side) {
		case null:
			return null
		case 'x':
			if (binding.bounds.center.x > other.bounds.center.x && edges?.left) {
				return 'left'
			} else if (edges?.right) {
				return 'right'
			}
			return null
		case 'y':
			if (binding.bounds.center.y > other.bounds.center.y && edges?.top) {
				return 'top'
			} else if (edges?.bottom) {
				return 'bottom'
			}
			return null
		default:
			return binding.side
	}
}

function convertBindingToPoint(binding: ElbowArrowBinding): ElbowArrowBinding {
	if (binding.isPoint) return binding

	let side: ElbowArrowSideWithAxis | null = null
	let arrowheadOffset = 0
	if (binding.snap === 'edge' || binding.snap === 'edge-point') {
		arrowheadOffset = binding.arrowheadOffset
		if (binding.side === 'x' || binding.side === 'left' || binding.side === 'right') {
			side = 'x'
		}
		if (binding.side === 'y' || binding.side === 'top' || binding.side === 'bottom') {
			side = 'y'
		}
	}

	return {
		targetShapeId: binding.targetShapeId,
		side,
		bounds: new Box(binding.target.x, binding.target.y, 0, 0),
		geometry: binding.geometry,
		target: binding.target,
		arrowheadOffset,
		minEndSegmentLength: binding.minEndSegmentLength,
		isExact: binding.isExact,
		isPoint: true,
		snap: binding.snap,
	}
}

/**
 * Make sure the first path segments goes fully into the target, and doesn't just point to its
 * bounding box. This modifies the route in-place.
 */
function castPathSegmentIntoGeometry(
	segment: 'first' | 'last',
	target: ElbowArrowTargetBox,
	other: ElbowArrowTargetBox,
	route: ElbowArrowRoute,
	options: ElbowArrowOptions
) {
	if (!target.geometry) return

	const point1 = segment === 'first' ? route.points[0] : route.points[route.points.length - 1]
	const point2 = segment === 'first' ? route.points[1] : route.points[route.points.length - 2]

	// const farPoint = Vec.Nudge(
	// 	point1,
	// 	point2,
	// 	-Math.max(target.geometry.bounds.width, target.geometry.bounds.height)
	// )
	const farPoint = target.target

	const initialDistance = Vec.ManhattanDist(point1, point2)

	let nearestIntersectionToPoint2: VecLike | null = null
	let nearestDistanceToPoint2 = Infinity

	if (
		target.isExact
		// || target.geometry.hitTestPoint(point1, 0, true, Geometry2dFilters.EXCLUDE_NON_STANDARD)
	) {
		nearestIntersectionToPoint2 = target.target
	} else if (target.geometry) {
		const intersections = target.geometry.intersectLineSegment(point2, farPoint, {
			includeLabels: false,
			includeInternal: false,
		})
		if (
			target.geometry.hitTestPoint(
				farPoint,
				Math.max(1, target.arrowheadOffset),
				true,
				Geometry2dFilters.EXCLUDE_NON_STANDARD
			)
		) {
			intersections.push(farPoint)
		}
		for (const intersection of intersections) {
			const point2Distance = Vec.ManhattanDist(point2, intersection)
			if (point2Distance < nearestDistanceToPoint2) {
				nearestDistanceToPoint2 = point2Distance
				nearestIntersectionToPoint2 = intersection
			}
		}
	}

	if (nearestIntersectionToPoint2) {
		let offset = target.arrowheadOffset

		const currentFinalSegmentLength = Vec.ManhattanDist(point2, nearestIntersectionToPoint2)
		if (currentFinalSegmentLength < options.minElbowLegLength) {
			const targetLength = options.minElbowLegLength - target.arrowheadOffset
			offset = currentFinalSegmentLength - targetLength
		}
		if (offset < target.minEndSegmentLength) {
			if (target.geometry.bounds.containsPoint(other.target)) {
				offset = Math.max(0, offset)
			} else {
				offset = -target.arrowheadOffset
			}
		}

		let nudgedPoint = nearestIntersectionToPoint2
		let shouldAddExtraPointForNudge = false
		if (!target.isExact && offset !== 0) {
			const nudged = Vec.Nudge(nearestIntersectionToPoint2, point2, offset)
			nudgedPoint = nudged
			if (
				offset < 0 &&
				!target.geometry.hitTestPoint(nudged, 0, true, Geometry2dFilters.EXCLUDE_NON_STANDARD)
			) {
				// point has been nudged _out_ of the shape so lets not actually apply the nudge
				nudgedPoint = nearestIntersectionToPoint2
			} else {
				if (offset < 0) {
					shouldAddExtraPointForNudge = true
				}
				nudgedPoint = nudged
			}
		}

		const newDistance = Vec.ManhattanDist(point2, nudgedPoint)
		route.distance += newDistance - initialDistance
		point1.x = nudgedPoint.x
		point1.y = nudgedPoint.y

		if (shouldAddExtraPointForNudge) {
			const midPoint = Vec.Lrp(point2, point1, 0.5)
			route.skipPointsWhenDrawing.add(midPoint)
			route.points.splice(segment === 'first' ? 1 : route.points.length - 1, 0, midPoint)
		}
	}
}

function fixTinyEndNubs(
	route: ElbowArrowRoute,
	aBinding: ElbowArrowBinding,
	bBinding: ElbowArrowBinding
) {
	if (!route) return

	if (route.points.length >= 3) {
		const a = route.points[0]
		const b = route.points[1]
		const firstSegmentLength = Vec.ManhattanDist(a, b)
		if (firstSegmentLength < aBinding.minEndSegmentLength) {
			route.points.splice(1, 1)
			if (route.points.length >= 3) {
				const matchAxis = approximately(a.x, b.x) ? 'y' : 'x'
				route.points[1][matchAxis] = a[matchAxis]
			}
		}
	}

	if (route.points.length >= 3) {
		const a = route.points[route.points.length - 1]
		const b = route.points[route.points.length - 2]
		const lastSegmentLength = Vec.ManhattanDist(a, b)
		if (lastSegmentLength < bBinding.minEndSegmentLength) {
			route.points.splice(route.points.length - 2, 1)
			if (route.points.length >= 3) {
				const matchAxis = approximately(a.x, b.x) ? 'y' : 'x'
				route.points[route.points.length - 2][matchAxis] = a[matchAxis]
			}
		}
	}
}

function adjustBindingForUnclosedPathIfNeeded(binding: ElbowArrowBinding) {
	if (!binding.geometry || binding.geometry.isClosed) return binding

	const normalizedPointAlongPath = binding.geometry.uninterpolateAlongEdge(
		binding.target,
		Geometry2dFilters.EXCLUDE_NON_STANDARD
	)

	const next = binding.geometry.interpolateAlongEdge(
		normalizedPointAlongPath + 1 / binding.geometry.length
	)

	const normal = next.sub(binding.target).per().uni()
	const axis = Math.abs(normal.x) > Math.abs(normal.y) ? ElbowArrowAxes.x : ElbowArrowAxes.y

	const min = axis.v(
		binding.target[axis.self] - binding.bounds[axis.size] * 2,
		binding.target[axis.cross]
	)
	const max = axis.v(
		binding.target[axis.self] + binding.bounds[axis.size] * 2,
		binding.target[axis.cross]
	)

	let furthestIntersectionTowardsMin: VecLike | null = null
	let furthestIntersectionTowardsMinDistance = 0
	let furthestIntersectionTowardsMax: VecLike | null = null
	let furthestIntersectionTowardsMaxDistance = 0
	let side: ElbowArrowSideWithAxis = axis.self

	for (const intersection of binding.geometry.intersectLineSegment(
		min,
		max,
		Geometry2dFilters.EXCLUDE_NON_STANDARD
	)) {
		if (Math.abs(intersection[axis.self] - binding.target[axis.self]) < 1) {
			continue
		}
		if (intersection[axis.self] < binding.target[axis.self]) {
			if (
				Vec.ManhattanDist(intersection, binding.target) > furthestIntersectionTowardsMinDistance
			) {
				furthestIntersectionTowardsMinDistance = Vec.ManhattanDist(intersection, binding.target)
				furthestIntersectionTowardsMin = intersection
			}
		} else {
			if (
				Vec.ManhattanDist(intersection, binding.target) > furthestIntersectionTowardsMaxDistance
			) {
				furthestIntersectionTowardsMaxDistance = Vec.ManhattanDist(intersection, binding.target)
				furthestIntersectionTowardsMax = intersection
			}
		}
	}

	if (furthestIntersectionTowardsMin && furthestIntersectionTowardsMax) {
		if (furthestIntersectionTowardsMinDistance > furthestIntersectionTowardsMaxDistance) {
			side = axis.hiEdge
		} else {
			side = axis.loEdge
		}
	} else if (furthestIntersectionTowardsMin && !furthestIntersectionTowardsMax) {
		side = axis.hiEdge
	} else if (!furthestIntersectionTowardsMin && furthestIntersectionTowardsMax) {
		side = axis.loEdge
	}

	console.log('pick side', side)

	binding.side = side
}
