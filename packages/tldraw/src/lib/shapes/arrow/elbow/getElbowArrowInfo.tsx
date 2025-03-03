import {
	assert,
	Box,
	createComputedCache,
	Editor,
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
import { routeArrowWithAutoEdgePicking } from './routeArrowWithAutoEdgePicking'

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
	route: VecLike[] | null
}

const elbowArrowInfoCache = createComputedCache(
	'elbow arrow info',
	(editor: Editor, arrow: TLArrowShape): ElbowArrowInfo | undefined => {
		if (!arrow.props.elbow) return undefined

		const options = editor.getShapeUtil<ArrowShapeUtil>(arrow.type).options

		const bindings = getArrowBindings(editor, arrow)

		const A = getBindingBounds(editor, bindings.start, arrow.props.start)
		const B = getBindingBounds(editor, bindings.end, arrow.props.end)
		// const centerBounds = Box.FromPoints([startBounds.center, endBounds.center])

		const scale: ElbowArrowScale = { x: 1, y: 1 }
		if (A.center.x > B.center.x) {
			scale.x = -1
		}
		if (A.center.y > B.center.y) {
			scale.y = -1
		}

		const original = { A, B, common: Box.Common([A, B]) }
		const transformedA = transformBox(A, scale)
		const transformedB = transformBox(B, scale)
		const transformed = {
			A: transformedA,
			B: transformedB,
			common: Box.Common([transformedA, transformedB]),
		}
		const expanded = {
			A: transformedA.clone().expandBy(options.expandElbowLegLength),
			B: transformedB.clone().expandBy(options.expandElbowLegLength),
			common: transformed.common.clone().expandBy(options.expandElbowLegLength),
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
				top: getUsableEdge(transformed.A, transformed.B, 'top', options),
				right: getUsableEdge(transformed.A, transformed.B, 'right', options),
				bottom: getUsableEdge(transformed.A, transformed.B, 'bottom', options),
				left: getUsableEdge(transformed.A, transformed.B, 'left', options),
			},
			B: {
				top: getUsableEdge(transformed.B, transformed.A, 'top', options),
				right: getUsableEdge(transformed.B, transformed.A, 'right', options),
				bottom: getUsableEdge(transformed.B, transformed.A, 'bottom', options),
				left: getUsableEdge(transformed.B, transformed.A, 'left', options),
			},
		}

		const steve = () => {
			const grid = getArrowNavigationGrid(A, B, options)
			const path = getArrowPath(grid, 'right', 'left')
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

		let route = routeArrowWithAutoEdgePicking(info)
		if (route) route = route.map((r) => transformPoint(r, info.scale))

		return { ...info, route }
	}
)

export function getElbowArrowInfo(editor: Editor, shapeId: TLShapeId) {
	return elbowArrowInfoCache.get(editor, shapeId)
}

function getBindingBounds(editor: Editor, binding: TLArrowBinding | undefined, point: VecModel) {
	const defaultValue = Box.FromCenter(point, { x: 1, y: 1 })
	if (!binding) {
		return defaultValue
	}

	const shapeGeometry = editor.getShapeGeometry(binding.toId)
	if (!shapeGeometry) {
		return defaultValue
	}

	const arrowTransform = editor.getShapePageTransform(binding.fromId)
	const shapeTransform = editor.getShapePageTransform(binding.toId)
	const shapeToArrowTransform = shapeTransform.clone().multiply(Mat.Inverse(arrowTransform))

	const vertices = shapeToArrowTransform.applyToPoints(shapeGeometry.vertices)
	const bounds = Box.FromPoints(vertices)

	return bounds
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
	a: Box,
	b: Box,
	side: 'top' | 'right' | 'bottom' | 'left',
	options: ArrowShapeOptions
): ElbowArrowEdge | null {
	const props = sideProps[side]

	const aValue = a[props.main]
	const aExpanded = aValue + props.expand * options.expandElbowLegLength

	let aCrossRange = expandRange(
		createRange(a[props.crossMin], a[props.crossMax]),
		Math.abs(a[props.crossMin] - a[props.crossMax]) < options.minArrowDistanceFromCorner * 2
			? 0
			: -options.minArrowDistanceFromCorner
	)

	// this edge is too small to be useful:
	if (!aCrossRange) {
		return null
	}

	const bRange = createRange(b[props.main], b[props.opposite])
	bRange[props.bRangeExpand] -= options.minElbowLegLength * 2 * props.expand

	const bCrossRange = expandRange(
		createRange(b[props.crossMin], b[props.crossMax]),
		options.expandElbowLegLength
	)
	assert(bRange && bCrossRange)

	let isPartial = false
	if (isWithinRange(aValue, bRange)) {
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
		crossCenter: clampToRange(a[props.crossMid], aCrossRange),
		isPartial,
	}
}
