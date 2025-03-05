import {
	assert,
	Box,
	createComputedCache,
	Editor,
	ElbowArrowSide,
	exhaustiveSwitchError,
	Mat,
	TLArrowBinding,
	TLArrowShape,
	TLShapeId,
	Vec,
	VecLike,
	VecModel,
} from '@tldraw/editor'
import { ArrowShapeOptions } from '../arrow-types'
import { ArrowShapeUtil } from '../ArrowShapeUtil'
import { getArrowBindings } from '../shared'
import { ElbowArrowSideAxes, ElbowArrowSideOpposites } from './constants'
import { ElbowArrowRoute, tryRouteArrow } from './elbowArrowRoutes'
import { ArrowNavigationGrid, getArrowNavigationGrid } from './getArrowNavigationGrid'
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

export interface ElbowArrowScale {
	x: 1 | -1
	y: 1 | -1
}

export interface ElbowArrowBoxes {
	/** The starting bounding box */
	A: Box
	/** The ending bounding box */
	B: Box
	/** The common bounding box of A and B */
	common: Box
}

// export interface ElbowArrowBoxExits {
// 	top: number | null
// 	bottom: number | null
// 	left: number | null
// 	right: number | null
// }

// export interface ElbowArrowExits {
// 	A: ElbowArrowBoxExits
// 	B: ElbowArrowBoxExits
// }

export interface ElbowArrowRange {
	min: number
	max: number
}

/**
 * An edge on a box.
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
	 * The center of the edge, constrained to within {@link cross}.
	 */
	crossCenter: number
	/**
	 * Whether the cross-axis range is shrunk from the original range to make space for the other shape.
	 */
	isPartial: boolean
}

/**
 * The usable range of the edges of a box. Each edge might be null if the edge is not usable for
 * entry/exit.
 */
export interface ElbowArrowBoxEdges {
	top: ElbowArrowEdge | null
	right: ElbowArrowEdge | null
	bottom: ElbowArrowEdge | null
	left: ElbowArrowEdge | null
}

export interface ElbowArrowEdges {
	A: ElbowArrowBoxEdges
	B: ElbowArrowBoxEdges
}

export interface ElbowArrowInfoWithoutRoute {
	/**
	 * The options for the arrow shape.
	 */
	options: ArrowShapeOptions
	/**
	 * The scale applied to some of the values in this object. We use the scale to flip the boxes so
	 * we only have to deal with cases where A is to the left of and above B.
	 */
	scale: ElbowArrowScale
	/** The original bounding boxes */
	original: ElbowArrowBoxes
	/** The bounding boxes, transformed by {@link scale}. */
	transformed: ElbowArrowBoxes
	/**
	 * The bounding boxes, expanded by {@link ArrowShapeOptions.expandElbowLegLength} & transformed
	 * by {@link scale}.
	 */
	expanded: ElbowArrowBoxes
	/**
	 * The horizontal position of A relative to B, after transforming by {@link scale}. Note that
	 * due to the transformation, a cannot be to the right of b.
	 */
	hPos: 'a-left-of-b' | 'a-overlaps-b' | 'a-contains-b' | 'a-inside-b' | 'a-matches-b'
	/**
	 * The vertical position of A relative to B, after transforming by {@link scale}. Note that
	 * due to the transformation, a cannot be below b.
	 */
	vPos: 'a-above-b' | 'a-overlaps-b' | 'a-contains-b' | 'a-inside-b' | 'a-matches-b'
	/**
	 * The usable edges of the boxes, after transforming by {@link scale}.
	 */
	edges: ElbowArrowEdges
	/**
	 * The gap between the right edge of A and the left edge of B, after transforming by {@link scale}.
	 */
	gapX: number
	/**
	 * The gap between the bottom edge of A and the top edge of B, after transforming by {@link scale}.
	 */
	gapY: number
	/**
	 * The X coordinate of the middle line between the two boxes, after transforming by
	 * {@link scale}. If the boxes are too close or overlap, this may be null.
	 */
	mx: number | null
	/**
	 * The Y coordinate of the middle line between the two boxes, after transforming by
	 * {@link scale}. If the boxes are too close or overlap, this may be null.
	 */
	my: number | null

	steve(): {
		grid: ArrowNavigationGrid
		path: Vec[] | null
	}
}

export interface ElbowArrowInfo extends ElbowArrowInfoWithoutRoute {
	route: ElbowArrowRoute | null
}

const elbowArrowInfoCache = createComputedCache(
	'elbow arrow info',
	(editor: Editor, arrow: TLArrowShape): ElbowArrowInfo | undefined => {
		if (!arrow.props.elbow) return undefined

		const options = editor.getShapeUtil<ArrowShapeUtil>(arrow.type).options

		const bindings = getArrowBindings(editor, arrow)
		const swapOrder = !arrow.props.elbow.start && arrow.props.elbow.end

		const startBinding = getBindingBounds(editor, bindings.start, arrow.props.start)
		const endBinding = getBindingBounds(editor, bindings.end, arrow.props.end)
		const { aBinding, bBinding } = swapOrder
			? { aBinding: endBinding, bBinding: startBinding }
			: { aBinding: startBinding, bBinding: endBinding }

		const { aSide, bSide } = swapOrder
			? { aSide: arrow.props.elbow.end, bSide: arrow.props.elbow.start }
			: { aSide: arrow.props.elbow.start, bSide: arrow.props.elbow.end }

		// const centerBounds = Box.FromPoints([startBounds.center, endBounds.center])

		const scale: ElbowArrowScale = { x: 1, y: 1 }
		if (aBinding.bounds.center.x > bBinding.bounds.center.x) {
			scale.x = -1
		}
		if (aBinding.bounds.center.y > bBinding.bounds.center.y) {
			scale.y = -1
		}

		const original = {
			A: aBinding.bounds,
			B: bBinding.bounds,
			common: Box.Common([aBinding.bounds, bBinding.bounds]),
		}
		const transformedA = transformBox(aBinding.bounds, scale)
		const transformedB = transformBox(bBinding.bounds, scale)
		const transformed = {
			A: transformedA,
			B: transformedB,
			common: Box.Common([transformedA, transformedB]),
		}

		const expandedA = aBinding.isPoint
			? transformedA.clone()
			: transformedA.clone().expandBy(options.expandElbowLegLength)
		const expandedB = bBinding.isPoint
			? transformedB.clone()
			: transformedB.clone().expandBy(options.expandElbowLegLength)
		const expanded = {
			A: expandedA,
			B: expandedB,
			common: Box.Common([expandedA, expandedB]),
		}

		let hPos: ElbowArrowInfo['hPos']
		let vPos: ElbowArrowInfo['vPos']

		if (transformed.A.maxX < transformed.B.minX) {
			hPos = 'a-left-of-b'
		} else if (transformed.A.maxX > transformed.B.maxX && transformed.A.minX < transformed.B.minX) {
			hPos = 'a-contains-b'
		} else if (
			transformed.B.maxX >= transformed.A.maxX &&
			transformed.B.minX <= transformed.A.minX
		) {
			hPos = 'a-inside-b'
		} else if (
			transformed.B.maxX >= transformed.A.maxX &&
			transformed.B.minX <= transformed.A.maxX
		) {
			hPos = 'a-overlaps-b'
		} else if (
			transformed.A.maxX === transformed.B.maxX &&
			transformed.A.minX === transformed.B.minX
		) {
			hPos = 'a-matches-b'
		} else {
			throw new Error(
				`Invalid horizontal position: A.maxX = ${transformed.A.maxX}, A.minX = ${transformed.A.minX}, B.maxX = ${transformed.B.maxX}, B.minX = ${transformed.B.minX}`
			)
		}

		if (transformed.A.maxY < transformed.B.minY) {
			vPos = 'a-above-b'
		} else if (transformed.A.maxY > transformed.B.maxY && transformed.A.minY < transformed.B.minY) {
			vPos = 'a-contains-b'
		} else if (
			transformed.B.maxY >= transformed.A.maxY &&
			transformed.B.minY <= transformed.A.minY
		) {
			vPos = 'a-inside-b'
		} else if (
			transformed.B.maxY >= transformed.A.maxY &&
			transformed.B.minY <= transformed.A.maxY
		) {
			vPos = 'a-overlaps-b'
		} else if (
			transformed.A.maxY === transformed.B.maxY &&
			transformed.A.minY === transformed.B.minY
		) {
			vPos = 'a-matches-b'
		} else {
			throw new Error(
				`Invalid vertical position: A.maxY = ${transformed.A.maxY}, A.minY = ${transformed.A.minY}, B.maxY = ${transformed.B.maxY}, B.minY = ${transformed.B.minY}`
			)
		}

		const gapX = transformed.B.minX - transformed.A.maxX
		const gapY = transformed.B.minY - transformed.A.maxY

		const mx = gapX > options.minElbowLegLength * 2 ? transformed.A.maxX + gapX / 2 : null
		const my = gapY > options.minElbowLegLength * 2 ? transformed.A.maxY + gapY / 2 : null

		const edges: ElbowArrowEdges = {
			A: {
				top: getUsableEdge(
					{ bounds: transformed.A, isPoint: aBinding.isPoint },
					{ bounds: transformed.B, isPoint: bBinding.isPoint },
					'top',
					options
				),
				right: getUsableEdge(
					{ bounds: transformed.A, isPoint: aBinding.isPoint },
					{ bounds: transformed.B, isPoint: bBinding.isPoint },
					'right',
					options
				),
				bottom: getUsableEdge(
					{ bounds: transformed.A, isPoint: aBinding.isPoint },
					{ bounds: transformed.B, isPoint: bBinding.isPoint },
					'bottom',
					options
				),
				left: getUsableEdge(
					{ bounds: transformed.A, isPoint: aBinding.isPoint },
					{ bounds: transformed.B, isPoint: bBinding.isPoint },
					'left',
					options
				),
			},
			B: {
				top: getUsableEdge(
					{ bounds: transformed.B, isPoint: bBinding.isPoint },
					{ bounds: transformed.A, isPoint: aBinding.isPoint },
					'top',
					options
				),
				right: getUsableEdge(
					{ bounds: transformed.B, isPoint: bBinding.isPoint },
					{ bounds: transformed.A, isPoint: aBinding.isPoint },
					'right',
					options
				),
				bottom: getUsableEdge(
					{ bounds: transformed.B, isPoint: bBinding.isPoint },
					{ bounds: transformed.A, isPoint: aBinding.isPoint },
					'bottom',
					options
				),
				left: getUsableEdge(
					{ bounds: transformed.B, isPoint: bBinding.isPoint },
					{ bounds: transformed.A, isPoint: aBinding.isPoint },
					'left',
					options
				),
			},
		}

		const steve = () => {
			const grid = getArrowNavigationGrid(aBinding.bounds, bBinding.bounds, options)
			const path = getArrowPath(grid, aSide ?? undefined, bSide ?? undefined)
			return { grid, path: path.error ? null : path.path }
		}

		const info: ElbowArrowInfoWithoutRoute = {
			options,
			scale,
			original,
			transformed,
			expanded,
			edges,
			hPos,
			vPos,
			gapX,
			gapY,
			mx,
			my,

			steve,
		}

		let route
		if (aSide && bSide) {
			route = tryRouteArrow(
				info,
				transformSide(aSide, info.scale),
				transformSide(bSide, info.scale)
			)
		}
		if (aSide && !bSide) {
			route = routeArrowWithPartialEdgePicking(info, transformSide(aSide, info.scale))
		}
		// assert(!(aSide && !bSide))
		if (!route) {
			route = routeArrowWithAutoEdgePicking(info)
		}
		if (route) {
			route = transformRoute(route, info.scale)
		}

		return { ...info, route }
	}
)

export function getElbowArrowInfo(editor: Editor, shapeId: TLShapeId) {
	return elbowArrowInfoCache.get(editor, shapeId)
}

function getBindingBounds(editor: Editor, binding: TLArrowBinding | undefined, point: VecModel) {
	const defaultValue = Box.FromCenter(point, { x: 0, y: 0 })
	if (!binding) {
		return { bounds: defaultValue, isPoint: true }
	}

	const bounds = getShapeBoundsInArrowSpace(editor, binding.fromId, binding.toId)
	if (!bounds) {
		return { bounds: defaultValue, isPoint: true }
	}

	return { bounds, isPoint: false }
}

export function getShapeBoundsInArrowSpace(editor: Editor, arrowId: TLShapeId, shapeId: TLShapeId) {
	const shapeGeometry = editor.getShapeGeometry(shapeId)
	if (!shapeGeometry) {
		return null
	}

	const inverseArrowTransform = Mat.Inverse(editor.getShapePageTransform(arrowId))
	const shapeTransform = editor.getShapePageTransform(shapeId)
	const shapeToArrowTransform = Mat.Multiply(inverseArrowTransform, shapeTransform)

	const vertices = Mat.applyToPoints(shapeToArrowTransform, shapeGeometry.vertices)

	return Box.FromPoints(vertices)
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
	return { x: point.x * scale.x, y: point.y * scale.y }
}

export function transformRoute(route: ElbowArrowRoute, scale: ElbowArrowScale): ElbowArrowRoute {
	return {
		...route,
		path: route.path.map((r) => transformPoint(r, scale)),
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
	},
	bottom: {
		expand: 1,
		main: 'maxY',
		opposite: 'minY',
		crossMid: 'midX',
		crossMin: 'minX',
		crossMax: 'maxX',
		bRangeExpand: 'min',
	},
	left: {
		expand: -1,
		main: 'minX',
		opposite: 'maxX',
		crossMid: 'midY',
		crossMin: 'minY',
		crossMax: 'maxY',
		bRangeExpand: 'max',
	},
	right: {
		expand: 1,
		main: 'maxX',
		opposite: 'minX',
		crossMid: 'midY',
		crossMin: 'minY',
		crossMax: 'maxY',
		bRangeExpand: 'min',
	},
} as const

export function getUsableEdge(
	a: { bounds: Box; isPoint: boolean },
	b: { bounds: Box; isPoint: boolean },
	side: 'top' | 'right' | 'bottom' | 'left',
	options: ArrowShapeOptions
): ElbowArrowEdge | null {
	const props = sideProps[side]

	const aValue = a.bounds[props.main]
	const aExpanded = a.isPoint ? aValue : aValue + props.expand * options.expandElbowLegLength

	let aCrossRange = expandRange(
		createRange(a.bounds[props.crossMin], a.bounds[props.crossMax]),
		Math.abs(a.bounds[props.crossMin] - a.bounds[props.crossMax]) <
			options.minArrowDistanceFromCorner * 2
			? 0
			: -options.minArrowDistanceFromCorner
	)

	// this edge is too small to be useful:
	if (!aCrossRange) {
		return null
	}

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

	return {
		value: aValue,
		expanded: aExpanded,
		cross: aCrossRange,
		crossCenter: clampToRange(a.bounds[props.crossMid], aCrossRange),
		// crossCenter: lerp(aCrossRange.min, aCrossRange.max, 0.5),
		isPartial,
	}
}
