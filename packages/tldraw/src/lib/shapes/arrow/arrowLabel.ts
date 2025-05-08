import {
	Arc2d,
	Box,
	Circle2d,
	Edge2d,
	Editor,
	Geometry2d,
	Group2d,
	Polygon2d,
	Polyline2d,
	TLArrowShape,
	Vec,
	VecLike,
	clamp,
	createComputedCache,
	exhaustiveSwitchError,
} from '@tldraw/editor'
import {
	ARROW_LABEL_FONT_SIZES,
	ARROW_LABEL_PADDING,
	FONT_FAMILIES,
	LABEL_TO_ARROW_PADDING,
	STROKE_SIZES,
	TEXT_PROPS,
} from '../shared/default-shape-constants'
import { TLArrowInfo } from './arrow-types'
import { getArrowInfo } from './shared'

export const arrowBodyGeometryCache = createComputedCache(
	'arrow body geometry',
	(editor: Editor, shape: TLArrowShape) => {
		const info = getArrowInfo(editor, shape)!
		switch (info.type) {
			case 'straight':
				return new Edge2d({
					start: Vec.From(info.start.point),
					end: Vec.From(info.end.point),
				})
			case 'arc':
				return new Arc2d({
					center: Vec.Cast(info.handleArc.center),
					start: Vec.Cast(info.start.point),
					end: Vec.Cast(info.end.point),
					sweepFlag: info.bodyArc.sweepFlag,
					largeArcFlag: info.bodyArc.largeArcFlag,
				})
			case 'elbow':
				return new Polyline2d({ points: info.route.points })
			default:
				exhaustiveSwitchError(info, 'type')
		}
	}
)

const labelSizeCache = createComputedCache(
	'arrow label size',
	(editor: Editor, shape: TLArrowShape) => {
		editor.fonts.trackFontsForShape(shape)
		let width = 0
		let height = 0

		const bodyGeom = arrowBodyGeometryCache.get(editor, shape.id)!
		// We use 'i' as a default label to measure against as a minimum width.
		const text = shape.props.text || 'i'

		const bodyBounds = bodyGeom.bounds

		const fontSize = getArrowLabelFontSize(shape)

		// First we measure the text with no constraints
		const { w, h } = editor.textMeasure.measureText(text, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[shape.props.font],
			fontSize,
			maxWidth: null,
		})

		width = w
		height = h

		let shouldSquish = false

		// If the text is wider than the body, we need to squish it
		const info = getArrowInfo(editor, shape)!
		const labelToArrowPadding = getLabelToArrowPadding(shape)
		const margin =
			info.type === 'elbow'
				? Math.max(info.elbow.A.arrowheadOffset + labelToArrowPadding, 32) +
					Math.max(info.elbow.B.arrowheadOffset + labelToArrowPadding, 32)
				: 64

		if (bodyBounds.width > bodyBounds.height) {
			width = Math.max(Math.min(w, margin), Math.min(bodyBounds.width - margin, w))
			shouldSquish = true
		} else if (width > 16 * fontSize) {
			width = 16 * fontSize
			shouldSquish = true
		}

		if (shouldSquish) {
			const { w: squishedWidth, h: squishedHeight } = editor.textMeasure.measureText(text, {
				...TEXT_PROPS,
				fontFamily: FONT_FAMILIES[shape.props.font],
				fontSize,
				maxWidth: width,
			})

			width = squishedWidth
			height = squishedHeight
		}

		return new Vec(width, height).addScalar(ARROW_LABEL_PADDING * 2 * shape.props.scale)
	},
	{ areRecordsEqual: (a, b) => a.props === b.props }
)

function getArrowLabelSize(editor: Editor, shape: TLArrowShape) {
	return labelSizeCache.get(editor, shape.id) ?? new Vec(0, 0)
}

function getLabelToArrowPadding(shape: TLArrowShape) {
	const strokeWidth = STROKE_SIZES[shape.props.size]
	const labelToArrowPadding =
		(LABEL_TO_ARROW_PADDING +
			(strokeWidth - STROKE_SIZES.s) * 2 +
			(strokeWidth === STROKE_SIZES.xl ? 20 : 0)) *
		shape.props.scale

	return labelToArrowPadding
}

/**
 * Return the range of possible label positions for an arrow. The full possible range is 0 to 1, but
 * as the label itself takes up space the usable range is smaller.
 */
function getArrowLabelRange(editor: Editor, shape: TLArrowShape, info: TLArrowInfo) {
	const bodyGeom = arrowBodyGeometryCache.get(editor, shape.id)!
	const dbgPoints: VecLike[] = []
	const dbg: Geometry2d[] = [new Group2d({ children: [bodyGeom], debugColor: 'lime' })]

	const labelSize = getArrowLabelSize(editor, shape)
	const labelToArrowPadding = getLabelToArrowPadding(shape)
	const paddingRelative = labelToArrowPadding / bodyGeom.length

	// we can calculate the range by sticking the center of the label at the very start/end of the
	// arrow, and seeing where the label intersects with the arrow. Then, if we move the label's
	// center to that point, that'll be the start/end of the range.

	let startBox, endBox
	if (info.type === 'elbow') {
		// for elbow arrows, because they have multiple segments but are always axis-aligned, we can use
		// an expanded box. This helps keep the box from partially covering the first segment when it's
		// very small.
		dbgPoints.push(info.start.point, info.end.point)
		startBox = Box.FromCenter(info.start.point, labelSize).expandBy(labelToArrowPadding)
		endBox = Box.FromCenter(info.end.point, labelSize).expandBy(labelToArrowPadding)
	} else {
		// for other arrows, we move along the arrow by the padding amount to find the start/end points
		const startPoint = bodyGeom.interpolateAlongEdge(paddingRelative)
		const endPoint = bodyGeom.interpolateAlongEdge(1 - paddingRelative)
		dbgPoints.push(startPoint, endPoint)
		startBox = Box.FromCenter(startPoint, labelSize)
		endBox = Box.FromCenter(endPoint, labelSize)
	}
	const startIntersections = bodyGeom.intersectPolygon(startBox.corners)
	const endIntersections = bodyGeom.intersectPolygon(endBox.corners)

	const startConstrained = furthest(info.start.point, startIntersections)
	const endConstrained = furthest(info.end.point, endIntersections)

	let startRelative = startConstrained ? bodyGeom.uninterpolateAlongEdge(startConstrained) : 0.5
	let endRelative = endConstrained ? bodyGeom.uninterpolateAlongEdge(endConstrained) : 0.5

	if (startRelative > endRelative) {
		startRelative = 0.5
		endRelative = 0.5
	}

	for (const pt of [...startIntersections, ...endIntersections, ...dbgPoints]) {
		dbg.push(
			new Circle2d({
				x: pt.x - 3,
				y: pt.y - 3,
				radius: 3,
				isFilled: false,
				debugColor: 'magenta',
				ignore: true,
			})
		)
	}
	dbg.push(
		new Polygon2d({
			points: startBox.corners,
			debugColor: 'lime',
			isFilled: false,
			ignore: true,
		}),
		new Polygon2d({
			points: endBox.corners,
			debugColor: 'lime',
			isFilled: false,
			ignore: true,
		})
	)

	return { start: startRelative, end: endRelative, dbg }
}

interface ArrowheadInfo {
	hasStartBinding: boolean
	hasEndBinding: boolean
	hasStartArrowhead: boolean
	hasEndArrowhead: boolean
}
export function getArrowLabelPosition(editor: Editor, shape: TLArrowShape) {
	const debugGeom: Geometry2d[] = []
	const info = getArrowInfo(editor, shape)!

	const arrowheadInfo: ArrowheadInfo = {
		hasStartBinding: !!info.bindings.start,
		hasEndBinding: !!info.bindings.end,
		hasStartArrowhead: info.start.arrowhead !== 'none',
		hasEndArrowhead: info.end.arrowhead !== 'none',
	}

	const range = getArrowLabelRange(editor, shape, info)
	if (range.dbg) debugGeom.push(...range.dbg)

	const clampedPosition = getClampedPosition(shape, range, arrowheadInfo)
	const bodyGeom = arrowBodyGeometryCache.get(editor, shape.id)!
	const labelCenter = bodyGeom.interpolateAlongEdge(clampedPosition)
	const labelSize = getArrowLabelSize(editor, shape)

	return { box: Box.FromCenter(labelCenter, labelSize), debugGeom }
}

function getClampedPosition(
	shape: TLArrowShape,
	range: { start: number; end: number },
	arrowheadInfo: ArrowheadInfo
) {
	const { hasEndArrowhead, hasEndBinding, hasStartBinding, hasStartArrowhead } = arrowheadInfo
	const clampedPosition = clamp(
		shape.props.labelPosition,
		hasStartArrowhead || hasStartBinding ? range.start : 0,
		hasEndArrowhead || hasEndBinding ? range.end : 1
	)

	return clampedPosition
}

function furthest(from: VecLike, candidates: VecLike[]): VecLike | null {
	let furthest: VecLike | null = null
	let furthestDist = -Infinity

	for (const candidate of candidates) {
		const dist = Vec.Dist2(from, candidate)
		if (dist > furthestDist) {
			furthest = candidate
			furthestDist = dist
		}
	}

	return furthest
}

export function getArrowLabelFontSize(shape: TLArrowShape) {
	return ARROW_LABEL_FONT_SIZES[shape.props.size] * shape.props.scale
}

export function getArrowLabelDefaultPosition(editor: Editor, shape: TLArrowShape) {
	const info = getArrowInfo(editor, shape)!
	switch (info.type) {
		case 'straight':
		case 'arc':
			return 0.5
		case 'elbow': {
			const midpointHandle = info.route.midpointHandle
			const bodyGeom = arrowBodyGeometryCache.get(editor, shape.id)
			if (midpointHandle && bodyGeom) {
				return bodyGeom.uninterpolateAlongEdge(midpointHandle.point)
			}
			return 0.5
		}
		default:
			exhaustiveSwitchError(info, 'type')
	}
}
