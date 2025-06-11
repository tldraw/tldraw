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
	TLShapeId,
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
		let result: Geometry2d
		const info = getArrowInfo(editor, shape)!
		switch (info.type) {
			case 'straight':
				result = new Edge2d({
					start: Vec.From(info.start.point),
					end: Vec.From(info.end.point),
				})
				break
			case 'arc':
				result = new Arc2d({
					center: Vec.Cast(info.handleArc.center),
					start: Vec.Cast(info.start.point),
					end: Vec.Cast(info.end.point),
					sweepFlag: info.bodyArc.sweepFlag,
					largeArcFlag: info.bodyArc.largeArcFlag,
				})
				break
			case 'elbow':
				result = new Polyline2d({ points: info.route.points })
				break
			default:
				exhaustiveSwitchError(info, 'type')
		}
		return result
	}
)

function getLabelToArrowPadding(shape: TLArrowShape) {
	const strokeWidth = STROKE_SIZES[shape.props.size]
	const labelToArrowPadding =
		(LABEL_TO_ARROW_PADDING +
			(strokeWidth - STROKE_SIZES.s) * 2 +
			(strokeWidth === STROKE_SIZES.xl ? 20 : 0)) *
		shape.props.scale

	return labelToArrowPadding
}

interface ArrowheadInfo {
	hasStartBinding: boolean
	hasEndBinding: boolean
	hasStartArrowhead: boolean
	hasEndArrowhead: boolean
}

function _getArrowLabelPosition(
	editor: Editor,
	shape: TLArrowShape,
	info: TLArrowInfo,
	bodyGeom: Geometry2d
) {
	const debugGeom: Geometry2d[] = []

	const arrowheadInfo: ArrowheadInfo = {
		hasStartBinding: !!info.bindings.start,
		hasEndBinding: !!info.bindings.end,
		hasStartArrowhead: info.start.arrowhead !== 'none',
		hasEndArrowhead: info.end.arrowhead !== 'none',
	}

	const dbgPoints: VecLike[] = []
	const dbg: Geometry2d[] = [new Group2d({ children: [bodyGeom], debugColor: 'lime' })]

	editor.fonts.trackFontsForShape(shape)
	let width = 0
	let height = 0

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

	const labelSize = new Vec(width, height).addScalar(ARROW_LABEL_PADDING * 2 * shape.props.scale)
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

	const range = { start: startRelative, end: endRelative, dbg }

	if (range.dbg) debugGeom.push(...range.dbg)

	const clampedPosition = getClampedPosition(shape, range, arrowheadInfo)
	const labelCenter = bodyGeom.interpolateAlongEdge(clampedPosition)

	return { box: Box.FromCenter(labelCenter, labelSize), debugGeom }
}

const arrowLabelPositionCache = {} as {
	[id: TLShapeId]: {
		shape: TLArrowShape
		geom: Geometry2d
		position: { box: Box; debugGeom: Geometry2d[] }
	}
}

export function getArrowLabelPosition(
	editor: Editor,
	shape: TLArrowShape,
	info: TLArrowInfo,
	bodyGeom: Geometry2d
) {
	const prev = arrowLabelPositionCache[shape.id]

	if (
		prev &&
		prev.shape.props.text === shape.props.text &&
		prev.geom.bounds.prettyMuchEquals(bodyGeom.bounds) &&
		prev.shape.props.labelPosition === shape.props.labelPosition
	) {
		return prev.position
	}

	const position = _getArrowLabelPosition(editor, shape, info, bodyGeom)
	arrowLabelPositionCache[shape.id] = { shape, geom: bodyGeom, position }
	return position
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
