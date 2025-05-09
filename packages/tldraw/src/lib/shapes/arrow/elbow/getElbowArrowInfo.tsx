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
	ElbowArrowTerminal,
} from './definitions'
import { createRange, expandRange, isWithinRange, rangeSize, subtractRange } from './range'
import { ElbowArrowWorkingInfo } from './routes/ElbowArrowWorkingInfo'
import {
	routeArrowWithAutoEdgePicking,
	routeArrowWithManualEdgePicking,
	routeArrowWithPartialEdgePicking,
} from './routes/routeArrowWithAutoEdgePicking'

export function getElbowArrowInfo(
	editor: Editor,
	arrow: TLArrowShape,
	bindings: TLArrowBindings
): ElbowArrowInfo {
	const shapeOptions = editor.getShapeUtil<ArrowShapeUtil>(arrow.type).options
	const options: ElbowArrowOptions = {
		elbowMidpoint: arrow.props.elbowMidPoint,
		expandElbowLegLength: shapeOptions.expandElbowLegLength[arrow.props.size] * arrow.props.scale,
		minElbowLegLength: shapeOptions.minElbowLegLength[arrow.props.size] * arrow.props.scale,
	}

	// Before we can do anything else, we need to find the start and end terminals of the arrow.
	// These contain the binding info, geometry, bounds, etc.
	let startTerminal = getElbowArrowTerminalInfo(editor, arrow, bindings.start, arrow.props.start)
	let endTerminal = getElbowArrowTerminalInfo(editor, arrow, bindings.end, arrow.props.end)
	// unclosed paths are weird - we handle them outside of the initial terminal info.
	startTerminal = adjustTerminalForUnclosedPathIfNeeded(startTerminal, endTerminal, options)
	endTerminal = adjustTerminalForUnclosedPathIfNeeded(endTerminal, startTerminal, options)

	// Ther terminal might include a "side" if the user has explicitly indicated what side the arrow
	// should come from. There are two terminals, and two cases for each terminal (explicit side or
	// not), for a total for 4 cases to handle. In order to keep things a bit simpler though, we
	// only handle 3 cases: if start no side and end has a side, we flip them around. From here on
	// out, we use A and B to refer to the terminals as they may be swapped.
	const swapOrder = !!(!startTerminal.side && endTerminal.side)

	let { aTerminal, bTerminal } = swapOrder
		? { aTerminal: endTerminal, bTerminal: startTerminal }
		: { aTerminal: startTerminal, bTerminal: endTerminal }

	// We model each edge that an arrow might enter/exit from separately. If an edge is blocked,
	// `getUsableEdge` might return null.
	let edgesA = {
		top: getUsableEdge(aTerminal, bTerminal, 'top', options),
		right: getUsableEdge(aTerminal, bTerminal, 'right', options),
		bottom: getUsableEdge(aTerminal, bTerminal, 'bottom', options),
		left: getUsableEdge(aTerminal, bTerminal, 'left', options),
	}

	let edgesB = {
		top: getUsableEdge(bTerminal, aTerminal, 'top', options),
		right: getUsableEdge(bTerminal, aTerminal, 'right', options),
		bottom: getUsableEdge(bTerminal, aTerminal, 'bottom', options),
		left: getUsableEdge(bTerminal, aTerminal, 'left', options),
	}

	// We we don't have a usable edge because it's blocked, we can convert some of the terminals to
	// points. Point terminals have less strict edge routing rules, but don't look as good
	// generally. For example, the arrow might go through the shape instead of around.
	const aIsUsable = hasUsableEdge(edgesA, aTerminal.side)
	const bIsUsable = hasUsableEdge(edgesB, bTerminal.side)
	let needsNewEdges = false
	if (!aIsUsable || !bIsUsable) {
		needsNewEdges = true
		if (!aIsUsable) {
			bTerminal = convertTerminalToPoint(bTerminal)
		}

		if (!bIsUsable) {
			aTerminal = convertTerminalToPoint(aTerminal)
		}

		if (bTerminal.bounds.containsPoint(aTerminal.target, options.expandElbowLegLength)) {
			bTerminal = convertTerminalToPoint(bTerminal)
		}

		if (aTerminal.bounds.containsPoint(bTerminal.target, options.expandElbowLegLength)) {
			aTerminal = convertTerminalToPoint(aTerminal)
		}
	}

	if (needsNewEdges) {
		edgesA = {
			top: getUsableEdge(aTerminal, bTerminal, 'top', options),
			right: getUsableEdge(aTerminal, bTerminal, 'right', options),
			bottom: getUsableEdge(aTerminal, bTerminal, 'bottom', options),
			left: getUsableEdge(aTerminal, bTerminal, 'left', options),
		}

		edgesB = {
			top: getUsableEdge(bTerminal, aTerminal, 'top', options),
			right: getUsableEdge(bTerminal, aTerminal, 'right', options),
			bottom: getUsableEdge(bTerminal, aTerminal, 'bottom', options),
			left: getUsableEdge(bTerminal, aTerminal, 'left', options),
		}
	}

	// We expand the bounds of the terminals so we can route arrows around them without the arrows
	// being too close to the shapes.
	const expandedA = aTerminal.isPoint
		? aTerminal.bounds
		: aTerminal.bounds.clone().expandBy(options.expandElbowLegLength)
	const expandedB = bTerminal.isPoint
		? bTerminal.bounds
		: bTerminal.bounds.clone().expandBy(options.expandElbowLegLength)

	const common: ElbowArrowBox = {
		original: Box.Common([aTerminal.bounds, bTerminal.bounds]),
		expanded: Box.Common([expandedA, expandedB]),
	}

	// Calculate the gaps between the two terminals. If gap is positive, B is to the right of A. If
	// it's negative, the opposite is true. If it's 0, there's no gap between the shapes in that
	// dimension.
	let gapX = bTerminal.bounds.minX - aTerminal.bounds.maxX
	if (gapX < 0) {
		gapX = aTerminal.bounds.minX - bTerminal.bounds.maxX
		if (gapX < 0) {
			gapX = 0
		}
		gapX = -gapX
	}
	let gapY = bTerminal.bounds.minY - aTerminal.bounds.maxY
	if (gapY < 0) {
		gapY = aTerminal.bounds.minY - bTerminal.bounds.maxY
		if (gapY < 0) {
			gapY = 0
		}
		gapY = -gapY
	}

	// The midpoint of the gap is a useful point to route arrows through, but the user can also drag
	// it to choose a new midpoint. First, we calculate some constraints we'll need to keep in mind
	// when figuring out the midpoint...
	const aMinLength = aTerminal.minEndSegmentLength * 3
	const bMinLength = bTerminal.minEndSegmentLength * 3
	const minLegDistanceNeeded =
		(aTerminal.isPoint ? aMinLength : options.minElbowLegLength) +
		(bTerminal.isPoint ? bMinLength : options.minElbowLegLength)

	// ...then, the possible range of the midpoint. This is also used when dragging the midpoint.
	let mxRange: null | { a: number; b: number } = null
	if (gapX > minLegDistanceNeeded) {
		mxRange = {
			a: aTerminal.isPoint ? aTerminal.bounds.maxX + aMinLength : expandedA.maxX,
			b: bTerminal.isPoint ? bTerminal.bounds.minX - bMinLength : expandedB.minX,
		}
	} else if (gapX < -minLegDistanceNeeded) {
		mxRange = {
			a: aTerminal.isPoint ? aTerminal.bounds.minX - aMinLength : expandedA.minX,
			b: bTerminal.isPoint ? bTerminal.bounds.maxX + bMinLength : expandedB.maxX,
		}
	}

	let myRange: null | { a: number; b: number } = null
	if (gapY > minLegDistanceNeeded) {
		myRange = {
			a: aTerminal.isPoint ? aTerminal.bounds.maxY + aMinLength : expandedA.maxY,
			b: bTerminal.isPoint ? bTerminal.bounds.minY - bMinLength : expandedB.minY,
		}
	} else if (gapY < -minLegDistanceNeeded) {
		myRange = {
			a: aTerminal.isPoint ? aTerminal.bounds.minY - aMinLength : expandedA.minY,
			b: bTerminal.isPoint ? bTerminal.bounds.maxY + bMinLength : expandedB.maxY,
		}
	}

	// and finally we take the range and the midpoint prop and calculate the actual position of the
	// midpoint. Note that the midpoint and midpoint range can be null if the gap is too small for a
	// midpoint line.
	const midpoint = swapOrder ? 1 - options.elbowMidpoint : options.elbowMidpoint
	const mx = mxRange ? lerp(mxRange.a, mxRange.b, midpoint) : null
	const my = myRange ? lerp(myRange.a, myRange.b, midpoint) : null

	// The info without route is given to the route-finding functions to route between the two
	// terminals.
	const info: ElbowArrowInfoWithoutRoute = {
		options,
		swapOrder,
		A: {
			isPoint: aTerminal.isPoint,
			target: aTerminal.target,
			isExact: aTerminal.isExact,
			arrowheadOffset: aTerminal.arrowheadOffset,
			minEndSegmentLength: aTerminal.minEndSegmentLength,
			original: aTerminal.bounds,
			expanded: expandedA,
			edges: edgesA,
			geometry: aTerminal.geometry,
		},
		B: {
			isPoint: bTerminal.isPoint,
			target: bTerminal.target,
			isExact: bTerminal.isExact,
			arrowheadOffset: bTerminal.arrowheadOffset,
			minEndSegmentLength: bTerminal.minEndSegmentLength,
			original: bTerminal.bounds,
			expanded: expandedB,
			edges: edgesB,
			geometry: bTerminal.geometry,
		},
		common,
		gapX,
		gapY,
		midX: mx,
		midY: my,
	}

	// We wrap the info in a working info object that lets us mutate and reset it as needed.
	const workingInfo = new ElbowArrowWorkingInfo(info)

	// Figure out the final sides to use for each terminal.
	const aSide = getSideToUse(aTerminal, bTerminal, info.A.edges)
	const bSide = getSideToUse(bTerminal, aTerminal, info.B.edges)

	// try to find a route with the specification we have:
	let route
	if (aSide && bSide) {
		route = routeArrowWithManualEdgePicking(workingInfo, aSide, bSide)
	} else if (aSide && !bSide) {
		route = routeArrowWithPartialEdgePicking(workingInfo, aSide)
	}
	if (!route) {
		route = routeArrowWithAutoEdgePicking(workingInfo, aSide || bSide ? 'fallback' : 'auto')
	}

	if (route) {
		// If we found a route, we need to fix it up. The route will only go to the bounding box of
		// the shape, so we need to cast the final segments into the actual geometry of the shape.
		castPathSegmentIntoGeometry('first', info.A, info.B, route)
		castPathSegmentIntoGeometry('last', info.B, info.A, route)
		// If we have tiny L-shaped arrows, the arrowheads look super janky. We fix those up by just
		// drawing a straight line instead.
		fixTinyEndNubs(route, aTerminal, bTerminal)

		// If we swapped the order way back of the start of things, we need to reverse the route so
		// it flows start -> end instead of A -> B.
		if (swapOrder) route.points.reverse()
	}

	return {
		...info,
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

/**
 * Take the route from `getElbowArrowInfo` (which represents the visible body of the arrow) and
 * convert it into a path we can use to show that paths to the handles, which may extend further
 * into the target shape geometries.
 * @returns
 */
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

/**
 * Take a normalizes anchor and return the side we think it's closest to.
 */
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

function getElbowArrowTerminalInfo(
	editor: Editor,
	arrow: TLArrowShape,
	binding: TLArrowBinding | undefined,
	point: VecModel
): ElbowArrowTerminal {
	const arrowStrokeSize = (STROKE_SIZES[arrow.props.size] * arrow.props.scale) / 2
	const minEndSegmentLength = arrowStrokeSize * arrow.props.scale * 3

	if (binding) {
		const target = editor.getShape(binding.toId)
		const geometry = getBindingGeometryInArrowSpace(editor, arrow, binding.toId, binding.props)
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

function getBindingGeometryInArrowSpace(
	editor: Editor,
	arrow: TLArrowShape,
	targetId: TLShapeId,
	bindingProps: TLArrowBindingProps
) {
	const hasArrowhead =
		bindingProps.terminal === 'start'
			? arrow.props.arrowheadStart !== 'none'
			: arrow.props.arrowheadEnd !== 'none'

	const targetGeometryInTargetSpace = editor.getShapeGeometry(
		targetId,
		hasArrowhead ? undefined : { context: '@tldraw/arrow-without-arrowhead' }
	)

	if (!targetGeometryInTargetSpace) {
		return null
	}

	const arrowTransform = editor.getShapePageTransform(arrow.id)
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
	a: ElbowArrowTerminal,
	b: ElbowArrowTerminal,
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
	binding: ElbowArrowTerminal,
	other: ElbowArrowTerminal,
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

function convertTerminalToPoint(terminal: ElbowArrowTerminal): ElbowArrowTerminal {
	if (terminal.isPoint) return terminal

	let side: ElbowArrowSideWithAxis | null = null
	let arrowheadOffset = 0
	if (terminal.snap === 'edge' || terminal.snap === 'edge-point') {
		arrowheadOffset = terminal.arrowheadOffset
		if (terminal.side === 'x' || terminal.side === 'left' || terminal.side === 'right') {
			side = 'x'
		}
		if (terminal.side === 'y' || terminal.side === 'top' || terminal.side === 'bottom') {
			side = 'y'
		}
	}

	return {
		targetShapeId: terminal.targetShapeId,
		side,
		bounds: new Box(terminal.target.x, terminal.target.y, 0, 0),
		geometry: terminal.geometry,
		target: terminal.target,
		arrowheadOffset,
		minEndSegmentLength: terminal.minEndSegmentLength,
		isExact: terminal.isExact,
		isPoint: true,
		snap: terminal.snap,
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
	route: ElbowArrowRoute
) {
	if (!target.geometry) return

	const point1 = segment === 'first' ? route.points[0] : route.points[route.points.length - 1]
	const point2 = segment === 'first' ? route.points[1] : route.points[route.points.length - 2]

	const pointToFindClosestIntersectionTo = target.geometry.isClosed ? point2 : target.target

	const initialDistance = Vec.ManhattanDist(point1, pointToFindClosestIntersectionTo)

	let nearestIntersectionToPoint2: VecLike | null = null
	let nearestDistanceToPoint2 = Infinity

	if (target.isExact) {
		nearestIntersectionToPoint2 = target.target
	} else if (target.geometry) {
		const intersections = target.geometry.intersectLineSegment(point2, target.target, {
			includeLabels: false,
			includeInternal: false,
		})
		if (
			target.geometry.hitTestPoint(
				target.target,
				Math.max(1, target.arrowheadOffset),
				true,
				Geometry2dFilters.EXCLUDE_NON_STANDARD
			)
		) {
			intersections.push(target.target)
		}
		for (const intersection of intersections) {
			const point2Distance = Vec.ManhattanDist(pointToFindClosestIntersectionTo, intersection)
			if (point2Distance < nearestDistanceToPoint2) {
				nearestDistanceToPoint2 = point2Distance
				nearestIntersectionToPoint2 = intersection
			}
		}
	}

	if (nearestIntersectionToPoint2) {
		let offset = target.arrowheadOffset

		const currentFinalSegmentLength = Vec.ManhattanDist(point2, nearestIntersectionToPoint2)
		const minLength = target.arrowheadOffset * 2
		if (currentFinalSegmentLength < minLength) {
			const targetLength = minLength - target.arrowheadOffset
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
	aTerminal: ElbowArrowTerminal,
	bTerminal: ElbowArrowTerminal
) {
	if (!route) return

	if (route.points.length >= 3) {
		const a = route.points[0]
		const b = route.points[1]
		const firstSegmentLength = Vec.ManhattanDist(a, b)
		if (firstSegmentLength < aTerminal.minEndSegmentLength) {
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
		if (lastSegmentLength < bTerminal.minEndSegmentLength) {
			route.points.splice(route.points.length - 2, 1)
			if (route.points.length >= 3) {
				const matchAxis = approximately(a.x, b.x) ? 'y' : 'x'
				route.points[route.points.length - 2][matchAxis] = a[matchAxis]
			}
		}
	}
}

function adjustTerminalForUnclosedPathIfNeeded(
	terminal: ElbowArrowTerminal,
	otherTerminal: ElbowArrowTerminal,
	options: ElbowArrowOptions
): ElbowArrowTerminal {
	if (!terminal.geometry || terminal.geometry.isClosed) return terminal
	const normalizedPointAlongPath = terminal.geometry.uninterpolateAlongEdge(
		terminal.target,
		Geometry2dFilters.EXCLUDE_NON_STANDARD
	)

	const prev = terminal.geometry.interpolateAlongEdge(
		normalizedPointAlongPath - 0.01 / terminal.geometry.length
	)
	const next = terminal.geometry.interpolateAlongEdge(
		normalizedPointAlongPath + 0.01 / terminal.geometry.length
	)

	const normal = next.sub(prev).per().uni()
	const axis = Math.abs(normal.x) > Math.abs(normal.y) ? ElbowArrowAxes.x : ElbowArrowAxes.y

	if (terminal.geometry.bounds.containsPoint(otherTerminal.target, options.expandElbowLegLength)) {
		terminal.side = axis.self
		return convertTerminalToPoint(terminal)
	}

	const min = axis.v(
		terminal.target[axis.self] - terminal.bounds[axis.size] * 2,
		terminal.target[axis.cross]
	)
	const max = axis.v(
		terminal.target[axis.self] + terminal.bounds[axis.size] * 2,
		terminal.target[axis.cross]
	)

	let furthestIntersectionTowardsMin: VecLike | null = null
	let furthestIntersectionTowardsMinDistance = 0
	let furthestIntersectionTowardsMax: VecLike | null = null
	let furthestIntersectionTowardsMaxDistance = 0
	let side: ElbowArrowSideWithAxis = axis.self

	for (const intersection of terminal.geometry.intersectLineSegment(
		min,
		max,
		Geometry2dFilters.EXCLUDE_NON_STANDARD
	)) {
		if (Math.abs(intersection[axis.self] - terminal.target[axis.self]) < 1) {
			continue
		}
		if (intersection[axis.self] < terminal.target[axis.self]) {
			if (
				Vec.ManhattanDist(intersection, terminal.target) > furthestIntersectionTowardsMinDistance
			) {
				furthestIntersectionTowardsMinDistance = Vec.ManhattanDist(intersection, terminal.target)
				furthestIntersectionTowardsMin = intersection
			}
		} else {
			if (
				Vec.ManhattanDist(intersection, terminal.target) > furthestIntersectionTowardsMaxDistance
			) {
				furthestIntersectionTowardsMaxDistance = Vec.ManhattanDist(intersection, terminal.target)
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

	terminal.side = side
	return terminal
}
