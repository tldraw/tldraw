import {
	approximately,
	assert,
	Box,
	Editor,
	elbowArrowDebug,
	ElbowArrowSide,
	exhaustiveSwitchError,
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
import {
	ElbowArrowBinding,
	ElbowArrowBox,
	ElbowArrowBoxEdges,
	ElbowArrowEdge,
	ElbowArrowInfo,
	ElbowArrowInfoWithoutRoute,
	ElbowArrowOptions,
	ElbowArrowRoute,
	ElbowArrowSideWithAxis,
	ElbowArrowTargetBox,
} from './definitions'
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
import { tryRouteArrow } from './routes/elbowArrowRoutes'
import { ElbowArrowWorkingInfo } from './routes/ElbowArrowWorkingInfo'
import {
	routeArrowWithAutoEdgePicking,
	routeArrowWithPartialEdgePicking,
} from './routes/routeArrowWithAutoEdgePicking'

export function getElbowArrowInfo(editor: Editor, arrow: TLArrowShape, bindings: TLArrowBindings) {
	const shapeOptions = editor.getShapeUtil<ArrowShapeUtil>(arrow.type).options
	const options: ElbowArrowOptions = {
		elbowMidpoint: elbowArrowDebug.get().customMidpoint ? arrow.props.elbowMid : { x: 0.5, y: 0.5 },
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

	const { info, route } = routeArrow(aBinding, bBinding, options)

	if (route) {
		castPathSegmentIntoGeometry('first', info.A, info.B, route, options)
		castPathSegmentIntoGeometry('last', info.B, info.A, route, options)
		fixTinyEndNubs(route, aBinding, bBinding)

		if (swapOrder) route.points.reverse()
	}

	const steve = () => {
		const grid = getArrowNavigationGrid(aBinding.bounds, bBinding.bounds, options)
		const path = getArrowPath(
			grid,
			getSideToUse(aBinding, bBinding, info.A.edges) ?? undefined,
			getSideToUse(bBinding, aBinding, info.B.edges) ?? undefined
		)
		return { grid, path: path.error ? null : path.path }
	}

	return { ...info, swapOrder, steve, route }
}

function routeArrow(
	aBinding: ElbowArrowBinding,
	bBinding: ElbowArrowBinding,
	options: ElbowArrowOptions
) {
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

		if (bBinding.bounds.containsPoint(aBinding.target, options.expandElbowLegLength + 1)) {
			bBinding = convertBindingToPoint(bBinding)
		}

		if (aBinding.bounds.containsPoint(bBinding.target, options.expandElbowLegLength + 1)) {
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

	let mx: number | null = null
	if (gapX > 0 && (aBinding.isPoint || bBinding.isPoint)) {
		mx = lerp(aBinding.bounds.maxX, bBinding.bounds.minX, options.elbowMidpoint.x)
	} else if (gapX < 0 && (aBinding.isPoint || bBinding.isPoint)) {
		mx = lerp(aBinding.bounds.minX, bBinding.bounds.maxX, options.elbowMidpoint.x)
	} else if (gapX > options.minElbowLegLength * 2) {
		mx = lerp(expandedA.maxX, expandedB.minX, options.elbowMidpoint.x)
	} else if (gapX < -options.minElbowLegLength * 2) {
		mx = lerp(expandedA.minX, expandedB.maxX, 1 - options.elbowMidpoint.x)
	}

	let my: number | null = null
	if (gapY > 0 && (aBinding.isPoint || bBinding.isPoint)) {
		my = lerp(aBinding.bounds.maxY, bBinding.bounds.minY, options.elbowMidpoint.y)
	} else if (gapY < 0 && (aBinding.isPoint || bBinding.isPoint)) {
		my = lerp(aBinding.bounds.minY, bBinding.bounds.maxY, options.elbowMidpoint.y)
	} else if (gapY > options.minElbowLegLength * 2) {
		my = lerp(expandedA.maxY, expandedB.minY, options.elbowMidpoint.y)
	} else if (gapY < -options.minElbowLegLength * 2) {
		my = lerp(expandedA.minY, expandedB.maxY, 1 - options.elbowMidpoint.y)
	}

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

	return { info, route }
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

			const impreciseEdgePickingMode = elbowArrowDebug.get().impreciseEdgePicking
			let side: ElbowArrowSideWithAxis | null = null
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
				if (elbowArrowDebug.get().preciseEdgePicking.snapAxis && binding.props.snap === 'axis') {
					side = side === 'left' || side === 'right' ? 'x' : 'y'
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
				minEndSegmentLength,
				side,
				snap: binding.props.snap,
			}
		}
	}

	return {
		bounds: Box.FromCenter(point, { x: 0, y: 0 }),
		geometry: null,
		isExact: false,
		isPoint: true,
		target: Vec.From(point),
		arrowheadOffset: 0,
		minEndSegmentLength,
		side: null,
		snap: null,
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
	a: { bounds: Box; target: Vec; isPoint: boolean },
	b: { bounds: Box; target: Vec; isPoint: boolean },
	side: 'top' | 'right' | 'bottom' | 'left',
	options: ElbowArrowOptions
): ElbowArrowEdge | null {
	const props = sideProps[side]

	const aValue = a.bounds[props.main]
	const aExpanded = a.isPoint ? null : aValue + props.expand * options.expandElbowLegLength

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
	if (binding.snap === 'axis' || binding.snap === 'edge' || binding.snap === 'point') {
		arrowheadOffset = binding.arrowheadOffset
		if (binding.side === 'x' || binding.side === 'left' || binding.side === 'right') {
			side = 'x'
		}
		if (binding.side === 'y' || binding.side === 'top' || binding.side === 'bottom') {
			side = 'y'
		}
	}

	return {
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
	if (target.arrowheadOffset === 0) return

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
		let offset = target.arrowheadOffset

		const currentFinalSegmentLength = Vec.ManhattanDist(point2, nearestIntersection)
		if (currentFinalSegmentLength < options.minElbowLegLength) {
			const targetLength = options.minElbowLegLength - target.arrowheadOffset
			offset = currentFinalSegmentLength - targetLength
		}
		if (offset < target.minEndSegmentLength) {
			if (target.geometry?.bounds.containsPoint(other.target)) {
				offset = Math.max(0, offset)
			} else {
				offset = -target.arrowheadOffset
			}
		}

		if (!target.isExact && offset !== 0) {
			nearestIntersection = Vec.Nudge(nearestIntersection, point2, offset)
		}

		const newDistance = Vec.ManhattanDist(point2, nearestIntersection)
		route.distance += newDistance - initialDistance
		point1.x = nearestIntersection.x
		point1.y = nearestIntersection.y

		if (offset < 0) {
			route.points.splice(
				segment === 'first' ? 1 : route.points.length - 1,
				0,
				Vec.Lrp(point2, point1, 0.5)
			)
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
		const firstSegmentLength = Vec.ManhattanDist(route.points[0], route.points[1])
		if (firstSegmentLength < aBinding.minEndSegmentLength) {
			route.points[1] = Vec.Nudge(route.points[0], route.points[2], aBinding.minEndSegmentLength)
		}
	}

	if (route.points.length >= 3) {
		const lastSegmentLength = Vec.ManhattanDist(
			route.points[route.points.length - 2],
			route.points[route.points.length - 1]
		)
		if (lastSegmentLength < bBinding.minEndSegmentLength) {
			route.points[route.points.length - 2] = Vec.Nudge(
				route.points[route.points.length - 1],
				route.points[route.points.length - 3],
				bBinding.minEndSegmentLength
			)
		}
	}
}
