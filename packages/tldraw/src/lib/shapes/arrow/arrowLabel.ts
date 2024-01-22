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
	assert,
	clockwiseAngleDist,
	counterClockwiseAngleDist,
	filterIntersectionsToArc,
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

const labelSizeCache = new WeakMap<TLArrowShape, Vec>()

export function getArrowLabelSize(editor: Editor, shape: TLArrowShape) {
	const cachedSize = labelSizeCache.get(shape)
	if (cachedSize) return cachedSize

	const info = editor.getArrowInfo(shape)!
	let width = 0
	let height = 0

	const bodyGeom = info.isStraight
		? new Edge2d({
				start: Vec.From(info.start.point),
				end: Vec.From(info.end.point),
			})
		: new Arc2d({
				center: Vec.Cast(info.handleArc.center),
				radius: info.handleArc.radius,
				start: Vec.Cast(info.start.point),
				end: Vec.Cast(info.end.point),
				sweepFlag: info.bodyArc.sweepFlag,
				largeArcFlag: info.bodyArc.largeArcFlag,
			})

	if (shape.props.text.trim()) {
		const bodyBounds = bodyGeom.bounds

		const { w, h } = editor.textMeasure.measureText(shape.props.text, {
			...TEXT_PROPS,
			fontFamily: FONT_FAMILIES[shape.props.font],
			fontSize: ARROW_LABEL_FONT_SIZES[shape.props.size],
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
					fontSize: ARROW_LABEL_FONT_SIZES[shape.props.size],
					maxWidth: width,
				}
			)

			width = squishedWidth
			height = squishedHeight
		}

		if (width > 16 * ARROW_LABEL_FONT_SIZES[shape.props.size]) {
			width = 16 * ARROW_LABEL_FONT_SIZES[shape.props.size]

			const { w: squishedWidth, h: squishedHeight } = editor.textMeasure.measureText(
				shape.props.text,
				{
					...TEXT_PROPS,
					fontFamily: FONT_FAMILIES[shape.props.font],
					fontSize: ARROW_LABEL_FONT_SIZES[shape.props.size],
					maxWidth: width,
				}
			)

			width = squishedWidth
			height = squishedHeight
		}
	}

	const size = new Vec(width, height).addScalar(ARROW_LABEL_PADDING * 2)
	labelSizeCache.set(shape, size)
	return size
}

function getLabelToArrowPadding(editor: Editor, shape: TLArrowShape) {
	const strokeWidth = STROKE_SIZES[shape.props.size]
	const labelToArrowPadding =
		LABEL_TO_ARROW_PADDING +
		(strokeWidth - STROKE_SIZES.s) * 2 +
		(strokeWidth === STROKE_SIZES.xl ? 20 : 0)

	return labelToArrowPadding
}

export function getStraightArrowLabelRange(
	editor: Editor,
	shape: TLArrowShape
): { start: VecLike; end: VecLike } {
	const info = editor.getArrowInfo(shape)!
	assert(info.isStraight)

	const labelSize = getArrowLabelSize(editor, shape)
	const labelToArrowPadding = getLabelToArrowPadding(editor, shape)

	// take the start and end points of the arrow, and nudge them in a bit to give some spare space:
	const startOffset = Vec.Nudge(info.start.point, info.end.point, labelToArrowPadding)
	const endOffset = Vec.Nudge(info.end.point, info.start.point, labelToArrowPadding)

	// assuming we just stick the label in the middle of the shape, where does the arrow intersect the label?
	const intersectionPoints = intersectLineSegmentPolygon(
		startOffset,
		endOffset,
		Box.FromCenter(info.middle, labelSize).corners
		// labelGeom.points
	)
	if (!intersectionPoints || intersectionPoints.length !== 2) {
		return { start: info.middle, end: info.middle }
	}

	// there should be two intersection points - one near the start, and one near the end
	let [startIntersect, endIntersect] = intersectionPoints
	if (Vec.Dist2(startIntersect, startOffset) > Vec.Dist2(endIntersect, startOffset)) {
		;[endIntersect, startIntersect] = intersectionPoints
	}

	// take our nudged start and end points and scooch them in even further to give us the possible
	// range for the position of the _center_ of the label
	return {
		start: startOffset.add(Vec.Sub(info.middle, startIntersect)),
		end: endOffset.add(Vec.Sub(info.middle, endIntersect)),
	}
}

export function getCurvedArrowLabelRange(
	editor: Editor,
	shape: TLArrowShape
): { startAngle: number; endAngle: number; dbg?: Geometry2d[] } {
	const info = editor.getArrowInfo(shape)!
	assert(!info.isStraight)

	const labelSize = getArrowLabelSize(editor, shape)
	const labelToArrowPadding = getLabelToArrowPadding(editor, shape)
	const direction = Math.sign(shape.props.bend)

	// take the start and end points of the arrow, and nudge them in a bit to give some spare space:
	const labelToArrowPaddingRad = (labelToArrowPadding / info.handleArc.radius) * direction
	const startOffsetAngle = Vec.Angle(info.bodyArc.center, info.start.point) - labelToArrowPaddingRad
	const endOffsetAngle = Vec.Angle(info.bodyArc.center, info.end.point) + labelToArrowPaddingRad
	const startOffset = getPointOnCircle(info.bodyArc.center, info.bodyArc.radius, startOffsetAngle)
	const endOffset = getPointOnCircle(info.bodyArc.center, info.bodyArc.radius, endOffsetAngle)

	const dbg: Geometry2d[] = []

	// const endOffset = Vec.RotWith(info.end.point, info.bodyArc.center, labelToArrowPaddingRad)

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
		!!info.bodyArc.sweepFlag,
		!!info.bodyArc.largeArcFlag,
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
		!!info.bodyArc.sweepFlag,
		!!info.bodyArc.largeArcFlag,
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
	for (const pt of [...(startIntersections ?? []), ...(endIntersections ?? [])]) {
		dbg.push(
			new Circle2d({
				x: pt.x,
				y: pt.y,
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
		(startIntersections && furthest(info.start.point, startIntersections)) ?? startOffset
	const endConstrained =
		(endIntersections && furthest(info.end.point, endIntersections)) ?? endOffset

	return {
		startAngle: Vec.Angle(info.bodyArc.center, startConstrained),
		endAngle: Vec.Angle(info.bodyArc.center, endConstrained),
		dbg,
	}
}

function intersectArcPolygon(
	center: VecLike,
	radius: number,
	angleStart: number,
	angleEnd: number,
	sweepFlag: boolean,
	largArcFlag: boolean,
	polygon: VecLike[]
) {
	return filterIntersectionsToArc(
		intersectCirclePolygon(center, radius, polygon),
		center,
		angleStart,
		angleEnd,
		sweepFlag,
		largArcFlag
	)
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
export function interpolateArcAngles(
	angleStart: number,
	angleEnd: number,
	direction: number,
	t: number
) {
	const dist =
		direction < 0
			? clockwiseAngleDist(angleStart, angleEnd)
			: counterClockwiseAngleDist(angleStart, angleEnd)
	return angleStart + dist * t * direction * -1
}
