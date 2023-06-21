import {
	Box2d,
	intersectLineSegmentPolygon,
	intersectLineSegmentPolyline,
	Matrix2d,
	Matrix2dModel,
	Vec2d,
	VecLike,
} from '@tldraw/primitives'
import { TLArrowShape } from '@tldraw/tlschema'
import { Editor } from '../../../Editor'
import { STROKE_SIZES } from '../../shared/default-shape-constants'
import { ArrowInfo } from './arrow-types'
import {
	BOUND_ARROW_OFFSET,
	BoundShapeInfo,
	getArrowTerminalsInArrowSpace,
	getBoundShapeInfoForTerminal,
	MIN_ARROW_LENGTH,
} from './shared'

export function getStraightArrowInfo(editor: Editor, shape: TLArrowShape): ArrowInfo {
	const { start, end, arrowheadStart, arrowheadEnd } = shape.props

	const terminalsInArrowSpace = getArrowTerminalsInArrowSpace(editor, shape)

	const a = terminalsInArrowSpace.start.clone()
	const b = terminalsInArrowSpace.end.clone()
	const c = Vec2d.Med(a, b)
	const uAB = Vec2d.Sub(b, a).uni()

	// Update the arrowhead points using intersections with the bound shapes, if any.

	const startShapeInfo = getBoundShapeInfoForTerminal(editor, start)
	const endShapeInfo = getBoundShapeInfoForTerminal(editor, end)

	const arrowPageTransform = editor.getPageTransform(shape)!

	// Update the position of the arrowhead's end point
	updateArrowheadPointWithBoundShape(
		b, // <-- will be mutated
		terminalsInArrowSpace.start,
		arrowPageTransform,
		endShapeInfo
	)

	// Then update the position of the arrowhead's end point
	updateArrowheadPointWithBoundShape(
		a, // <-- will be mutated
		terminalsInArrowSpace.end,
		arrowPageTransform,
		startShapeInfo
	)

	let minDist = MIN_ARROW_LENGTH

	const isSelfIntersection =
		startShapeInfo && endShapeInfo && startShapeInfo.shape === endShapeInfo.shape

	if (
		startShapeInfo &&
		endShapeInfo &&
		!isSelfIntersection &&
		!startShapeInfo.isExact &&
		!endShapeInfo.isExact
	) {
		if (endShapeInfo.didIntersect && !startShapeInfo.didIntersect) {
			// ...and if only the end shape intersected, then make it
			// a short arrow ending at the end shape intersection.
			if (startShapeInfo.isClosed) {
				a.setTo(Vec2d.Nudge(b, a, minDist))
			}
		} else if (!endShapeInfo.didIntersect) {
			// ...and if only the end shape intersected, or if neither
			// shape intersected, then make it a short arrow starting
			// at the start shape intersection.
			if (endShapeInfo.isClosed) {
				b.setTo(Vec2d.Nudge(a, b, minDist))
			}
		}
	}

	const u = Vec2d.Sub(b, a).uni()
	const didFlip = !Vec2d.Equals(u, uAB)

	// If the arrow is bound non-exact to a start shape and the
	// start point has an arrowhead offset the start point
	if (!isSelfIntersection) {
		if (startShapeInfo && arrowheadStart !== 'none' && !startShapeInfo.isExact) {
			const offset =
				BOUND_ARROW_OFFSET +
				STROKE_SIZES[shape.props.size] / 2 +
				('size' in startShapeInfo.shape.props
					? STROKE_SIZES[startShapeInfo.shape.props.size] / 2
					: 0)

			minDist -= offset
			a.nudge(b, offset * (didFlip ? -1 : 1))
		}

		// If the arrow is bound non-exact to an end shape and the
		// end point has an arrowhead offset the end point
		if (endShapeInfo && arrowheadEnd !== 'none' && !endShapeInfo.isExact) {
			const offset =
				BOUND_ARROW_OFFSET +
				STROKE_SIZES[shape.props.size] / 2 +
				('size' in endShapeInfo.shape.props ? STROKE_SIZES[endShapeInfo.shape.props.size] / 2 : 0)

			minDist -= offset
			b.nudge(a, offset * (didFlip ? -1 : 1))
		}
	}

	if (startShapeInfo && endShapeInfo) {
		// If we have two bound shapes...
		if (didFlip) {
			// If we flipped, then make the arrow a short arrow from
			// the start point towards where the end point should be.
			b.setTo(Vec2d.Add(a, u.mul(-minDist)))
		} else if (Vec2d.Dist(a, b) < MIN_ARROW_LENGTH / 2) {
			// Otherwise, if the arrow is too short, make it a short
			// arrow from the start point towards where the end point
			// should be.
			b.setTo(Vec2d.Add(a, u.mul(MIN_ARROW_LENGTH / 2)))
		}
	}

	// If the handles flipped their order, then set the center handle
	// to the midpoint of the terminals (rather than the midpoint of the
	// arrow body); otherwise, it may not be "between" the other terminals.
	if (didFlip) {
		c.setTo(Vec2d.Med(terminalsInArrowSpace.start, terminalsInArrowSpace.end))
	} else {
		c.setTo(Vec2d.Med(a, b))
	}

	const length = Vec2d.Dist(a, b)

	return {
		isStraight: true,
		start: {
			handle: terminalsInArrowSpace.start,
			point: a,
			arrowhead: shape.props.arrowheadStart,
		},
		end: {
			handle: terminalsInArrowSpace.end,
			point: b,
			arrowhead: shape.props.arrowheadEnd,
		},
		middle: c,
		isValid: length > 0,
		length,
	}
}

/** Get an intersection point from A -> B with bound shape (target) from shape (arrow). */
function updateArrowheadPointWithBoundShape(
	point: Vec2d,
	opposite: Vec2d,
	arrowPageTransform: Matrix2dModel,
	targetShapeInfo?: BoundShapeInfo
) {
	if (targetShapeInfo === undefined) {
		// No bound shape? The arrowhead point will be at the arrow terminal.
		return
	}

	if (targetShapeInfo.isExact) {
		// Exact type binding? The arrowhead point will be at the arrow terminal.
		return
	}

	// From and To in page space
	const pageFrom = Matrix2d.applyToPoint(arrowPageTransform, opposite)
	const pageTo = Matrix2d.applyToPoint(arrowPageTransform, point)

	// From and To in local space of the target shape
	const targetFrom = Matrix2d.applyToPoint(Matrix2d.Inverse(targetShapeInfo.transform), pageFrom)
	const targetTo = Matrix2d.applyToPoint(Matrix2d.Inverse(targetShapeInfo.transform), pageTo)

	const isClosed = targetShapeInfo.isClosed
	const fn = isClosed ? intersectLineSegmentPolygon : intersectLineSegmentPolyline

	const intersection = fn(targetFrom, targetTo, targetShapeInfo.outline)

	let targetInt: VecLike | undefined

	if (intersection !== null) {
		targetInt =
			intersection.sort((p1, p2) => Vec2d.Dist(p1, targetFrom) - Vec2d.Dist(p2, targetFrom))[0] ??
			(isClosed ? undefined : targetTo)
	}

	if (targetInt === undefined) {
		// No intersection? The arrowhead point will be at the arrow terminal.
		return
	}

	const pageInt = Matrix2d.applyToPoint(targetShapeInfo.transform, targetInt)
	const arrowInt = Matrix2d.applyToPoint(Matrix2d.Inverse(arrowPageTransform), pageInt)

	point.setTo(arrowInt)

	targetShapeInfo.didIntersect = true
}

export function getStraightArrowHandlePath(info: ArrowInfo & { isStraight: true }) {
	return getArrowPath(info.start.handle, info.end.handle)
}

export function getSolidStraightArrowPath(info: ArrowInfo & { isStraight: true }) {
	return getArrowPath(info.start.point, info.end.point)
}

function getArrowPath(start: VecLike, end: VecLike) {
	return `M${start.x},${start.y}L${end.x},${end.y}`
}

export function getStraightArrowBoundingBox(start: VecLike, end: VecLike) {
	return new Box2d(
		Math.min(start.x, end.x),
		Math.min(start.y, end.y),
		Math.abs(start.x - end.x),
		Math.abs(start.y - end.y)
	)
}
