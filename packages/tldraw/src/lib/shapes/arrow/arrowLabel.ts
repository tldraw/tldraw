import {
	Arc2d,
	Box,
	Circle2d,
	Edge2d,
	Editor,
	Geometry2d,
	Polygon2d,
	TLArrowShape,
	Vec,
	VecLike,
	angleDistance,
	clamp,
	getPointOnCircle,
	intersectCirclePolygon,
	intersectLineSegmentPolygon,
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

const labelSizeCache = new WeakMap<TLArrowShape, Vec>()

function getArrowLabelSize(editor: Editor, shape: TLArrowShape) {
	const cachedSize = labelSizeCache.get(shape)
	if (cachedSize) return cachedSize

	const info = getArrowInfo(editor, shape)!
	let width = 0
	let height = 0

	const bodyGeom = info.isStraight
		? new Edge2d({
				start: Vec.From(info.start.point),
				end: Vec.From(info.end.point),
			})
		: new Arc2d({
				center: Vec.Cast(info.handleArc.center),
				start: Vec.Cast(info.start.point),
				end: Vec.Cast(info.end.point),
				sweepFlag: info.bodyArc.sweepFlag,
				largeArcFlag: info.bodyArc.largeArcFlag,
			})

	if (shape.props.text.trim()) {
		const bodyBounds = bodyGeom.bounds

		const fontSize = getArrowLabelFontSize(shape)

		const { w, h } = editor.textMeasure.measureText(shape.props.text, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[shape.props.font],
			fontSize,
			maxWidth: null,
		})

		width = w
		height = h

		if (bodyBounds.width > bodyBounds.height) {
			width = Math.max(Math.min(w, 64), Math.min(bodyBounds.width - 64, w))

			const { w: squishedWidth, h: squishedHeight } = editor.textMeasure.measureText(
				shape.props.text,
				{
					...TEXT_PROPS,
					fontFamily: FONT_FAMILIES[shape.props.font],
					fontSize,
					maxWidth: width,
				}
			)

			width = squishedWidth
			height = squishedHeight
		}

		if (width > 16 * fontSize) {
			width = 16 * fontSize

			const { w: squishedWidth, h: squishedHeight } = editor.textMeasure.measureText(
				shape.props.text,
				{
					...TEXT_PROPS,
					fontFamily: FONT_FAMILIES[shape.props.font],
					fontSize,
					maxWidth: width,
				}
			)

			width = squishedWidth
			height = squishedHeight
		}
	}

	const size = new Vec(width, height).addScalar(ARROW_LABEL_PADDING * 2 * shape.props.scale)
	labelSizeCache.set(shape, size)
	return size
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
 * Return the range of possible label positions for a straight arrow. The full possible range is 0
 * to 1, but as the label itself takes up space the usable range is smaller.
 */
function getStraightArrowLabelRange(
	editor: Editor,
	shape: TLArrowShape,
	info: Extract<TLArrowInfo, { isStraight: true }>
): { start: number; end: number } {
	const labelSize = getArrowLabelSize(editor, shape)
	const labelToArrowPadding = getLabelToArrowPadding(shape)

	// take the start and end points of the arrow, and nudge them in a bit to give some spare space:
	const startOffset = Vec.Nudge(info.start.point, info.end.point, labelToArrowPadding)
	const endOffset = Vec.Nudge(info.end.point, info.start.point, labelToArrowPadding)

	// assuming we just stick the label in the middle of the shape, where does the arrow intersect the label?
	const intersectionPoints = intersectLineSegmentPolygon(
		startOffset,
		endOffset,
		Box.FromCenter(info.middle, labelSize).corners
	)
	if (!intersectionPoints || intersectionPoints.length !== 2) {
		return { start: 0.5, end: 0.5 }
	}

	// there should be two intersection points - one near the start, and one near the end
	let [startIntersect, endIntersect] = intersectionPoints
	if (Vec.Dist2(startIntersect, startOffset) > Vec.Dist2(endIntersect, startOffset)) {
		;[endIntersect, startIntersect] = intersectionPoints
	}

	// take our nudged start and end points and scooch them in even further to give us the possible
	// range for the position of the _center_ of the label
	const startConstrained = startOffset.add(Vec.Sub(info.middle, startIntersect))
	const endConstrained = endOffset.add(Vec.Sub(info.middle, endIntersect))

	// now we can work out the range of possible label positions
	const start = Vec.Dist(info.start.point, startConstrained) / info.length
	const end = Vec.Dist(info.start.point, endConstrained) / info.length
	return { start, end }
}

/**
 * Return the range of possible label positions for a curved arrow. The full possible range is 0
 * to 1, but as the label itself takes up space the usable range is smaller.
 */
function getCurvedArrowLabelRange(
	editor: Editor,
	shape: TLArrowShape,
	info: Extract<TLArrowInfo, { isStraight: false }>
): { start: number; end: number; dbg?: Geometry2d[] } {
	const labelSize = getArrowLabelSize(editor, shape)
	const labelToArrowPadding = getLabelToArrowPadding(shape)
	const direction = Math.sign(shape.props.bend)

	// take the start and end points of the arrow, and nudge them in a bit to give some spare space:
	const labelToArrowPaddingRad = (labelToArrowPadding / info.handleArc.radius) * direction
	const startOffsetAngle = Vec.Angle(info.bodyArc.center, info.start.point) - labelToArrowPaddingRad
	const endOffsetAngle = Vec.Angle(info.bodyArc.center, info.end.point) + labelToArrowPaddingRad
	const startOffset = getPointOnCircle(info.bodyArc.center, info.bodyArc.radius, startOffsetAngle)
	const endOffset = getPointOnCircle(info.bodyArc.center, info.bodyArc.radius, endOffsetAngle)

	const dbg: Geometry2d[] = []

	// unlike the straight arrow, we can't just stick the label in the middle of the shape when
	// we're working out the range. this is because as the label moves along the curve, the place
	// where the arrow intersects with label changes. instead, we have to stick the label center on
	// the `startOffset` (the start-most place where it can go), then find where it intersects with
	// the arc. because of the symmetry of the label rectangle, we can move the label to that new
	// center and take that as the start-most possible point.
	const startIntersections = intersectArcPolygon(
		info.bodyArc.center,
		info.bodyArc.radius,
		startOffsetAngle,
		endOffsetAngle,
		direction,
		Box.FromCenter(startOffset, labelSize).corners
	)

	dbg.push(
		new Polygon2d({
			points: Box.FromCenter(startOffset, labelSize).corners,
			debugColor: 'lime',
			isFilled: false,
			ignore: true,
		})
	)

	const endIntersections = intersectArcPolygon(
		info.bodyArc.center,
		info.bodyArc.radius,
		startOffsetAngle,
		endOffsetAngle,
		direction,
		Box.FromCenter(endOffset, labelSize).corners
	)

	dbg.push(
		new Polygon2d({
			points: Box.FromCenter(endOffset, labelSize).corners,
			debugColor: 'lime',
			isFilled: false,
			ignore: true,
		})
	)
	for (const pt of [
		...(startIntersections ?? []),
		...(endIntersections ?? []),
		startOffset,
		endOffset,
	]) {
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

	// if we have one or more intersections (we shouldn't have more than two) then the one we need
	// is the one furthest from the arrow terminal
	const startConstrained =
		(startIntersections && furthest(info.start.point, startIntersections)) ?? info.middle
	const endConstrained =
		(endIntersections && furthest(info.end.point, endIntersections)) ?? info.middle

	const startAngle = Vec.Angle(info.bodyArc.center, info.start.point)
	const endAngle = Vec.Angle(info.bodyArc.center, info.end.point)
	const constrainedStartAngle = Vec.Angle(info.bodyArc.center, startConstrained)
	const constrainedEndAngle = Vec.Angle(info.bodyArc.center, endConstrained)

	// if the arc is small enough that there's no room for the label to move, we constrain it to the middle.
	if (
		angleDistance(startAngle, constrainedStartAngle, direction) >
		angleDistance(startAngle, constrainedEndAngle, direction)
	) {
		return { start: 0.5, end: 0.5, dbg }
	}

	// now we can work out the range of possible label positions
	const fullDistance = angleDistance(startAngle, endAngle, direction)
	const start = angleDistance(startAngle, constrainedStartAngle, direction) / fullDistance
	const end = angleDistance(startAngle, constrainedEndAngle, direction) / fullDistance
	return { start, end, dbg }
}

export function getArrowLabelPosition(editor: Editor, shape: TLArrowShape) {
	let labelCenter
	const debugGeom: Geometry2d[] = []
	const info = getArrowInfo(editor, shape)!

	const hasStartBinding = !!info.bindings.start
	const hasEndBinding = !!info.bindings.end
	const hasStartArrowhead = info.start.arrowhead !== 'none'
	const hasEndArrowhead = info.end.arrowhead !== 'none'
	if (info.isStraight) {
		const range = getStraightArrowLabelRange(editor, shape, info)
		let clampedPosition = clamp(
			shape.props.labelPosition,
			hasStartArrowhead || hasStartBinding ? range.start : 0,
			hasEndArrowhead || hasEndBinding ? range.end : 1
		)
		// This makes the position snap in the middle.
		clampedPosition = clampedPosition >= 0.48 && clampedPosition <= 0.52 ? 0.5 : clampedPosition
		labelCenter = Vec.Lrp(info.start.point, info.end.point, clampedPosition)
	} else {
		const range = getCurvedArrowLabelRange(editor, shape, info)
		if (range.dbg) debugGeom.push(...range.dbg)
		let clampedPosition = clamp(
			shape.props.labelPosition,
			hasStartArrowhead || hasStartBinding ? range.start : 0,
			hasEndArrowhead || hasEndBinding ? range.end : 1
		)
		// This makes the position snap in the middle.
		clampedPosition = clampedPosition >= 0.48 && clampedPosition <= 0.52 ? 0.5 : clampedPosition
		const labelAngle = interpolateArcAngles(
			Vec.Angle(info.bodyArc.center, info.start.point),
			Vec.Angle(info.bodyArc.center, info.end.point),
			Math.sign(shape.props.bend),
			clampedPosition
		)
		labelCenter = getPointOnCircle(info.bodyArc.center, info.bodyArc.radius, labelAngle)
	}

	const labelSize = getArrowLabelSize(editor, shape)

	return { box: Box.FromCenter(labelCenter, labelSize), debugGeom }
}

function intersectArcPolygon(
	center: VecLike,
	radius: number,
	angleStart: number,
	angleEnd: number,
	direction: number,
	polygon: VecLike[]
) {
	const intersections = intersectCirclePolygon(center, radius, polygon)

	// filter the circle intersections to just the ones from the arc
	const fullArcDistance = angleDistance(angleStart, angleEnd, direction)
	return intersections?.filter((pt) => {
		const pDistance = angleDistance(angleStart, Vec.Angle(center, pt), direction)
		return pDistance >= 0 && pDistance <= fullArcDistance
	})
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

/**
 *
 * @param angleStart - The angle of the start of the arc
 * @param angleEnd - The angle of the end of the arc
 * @param direction - The direction of the arc (1 = counter-clockwise, -1 = clockwise)
 * @param t - A number between 0 and 1 representing the position along the arc
 * @returns
 */
function interpolateArcAngles(angleStart: number, angleEnd: number, direction: number, t: number) {
	const dist = angleDistance(angleStart, angleEnd, direction)
	return angleStart + dist * t * direction * -1
}

export function getArrowLabelFontSize(shape: TLArrowShape) {
	return ARROW_LABEL_FONT_SIZES[shape.props.size] * shape.props.scale
}
