import { TLArrowShape } from '@tldraw/tlschema'
import { Box2d } from '../../../../primitives/Box2d'
import { Matrix2d, Matrix2dModel } from '../../../../primitives/Matrix2d'
import { Vec2d, VecLike } from '../../../../primitives/Vec2d'
import {
	intersectLineSegmentPolygon,
	intersectLineSegmentPolyline,
} from '../../../../primitives/intersect'
import { Editor } from '../../../Editor'
import { TLArrowInfo } from './arrow-types'
import {
	BOUND_ARROW_OFFSET,
	BoundShapeInfo,
	MIN_ARROW_LENGTH,
	STROKE_SIZES,
	getArrowTerminalsInArrowSpace,
	getBoundShapeInfoForTerminal,
	getBoundShapeRelationships,
} from './shared'

export function getStraightArrowInfo(editor: Editor, shape: TLArrowShape): TLArrowInfo {
	const { start, end, arrowheadStart, arrowheadEnd } = shape.props

	const terminalsInArrowSpace = getArrowTerminalsInArrowSpace(editor, shape)

	const a = terminalsInArrowSpace.start.clone()
	const b = terminalsInArrowSpace.end.clone()
	const c = Vec2d.Med(a, b)

	if (Vec2d.Equals(a, b)) {
		return {
			isStraight: true,
			start: {
				handle: a,
				point: a,
				arrowhead: shape.props.arrowheadStart,
			},
			end: {
				handle: b,
				point: b,
				arrowhead: shape.props.arrowheadEnd,
			},
			middle: c,
			isValid: false,
			length: 0,
		}
	}

	const uAB = Vec2d.Sub(b, a).uni()

	// Update the arrowhead points using intersections with the bound shapes, if any.

	const startShapeInfo = getBoundShapeInfoForTerminal(editor, start)
	const endShapeInfo = getBoundShapeInfoForTerminal(editor, end)

	const arrowPageTransform = editor.getShapePageTransform(shape)!

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

	let offsetA = 0
	let offsetB = 0
	let strokeOffsetA = 0
	let strokeOffsetB = 0
	let minLength = MIN_ARROW_LENGTH

	const isSelfIntersection =
		startShapeInfo && endShapeInfo && startShapeInfo.shape === endShapeInfo.shape

	const relationship =
		startShapeInfo && endShapeInfo
			? getBoundShapeRelationships(editor, startShapeInfo.shape.id, endShapeInfo.shape.id)
			: 'safe'

	if (
		relationship === 'safe' &&
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
				a.setTo(b.clone().add(uAB.clone().mul(MIN_ARROW_LENGTH)))
			}
		} else if (!endShapeInfo.didIntersect) {
			// ...and if only the end shape intersected, or if neither
			// shape intersected, then make it a short arrow starting
			// at the start shape intersection.
			if (endShapeInfo.isClosed) {
				b.setTo(a.clone().sub(uAB.clone().mul(MIN_ARROW_LENGTH)))
			}
		}
	}

	const u = Vec2d.Sub(b, a).uni()
	const didFlip = !Vec2d.Equals(u, uAB)

	// If the arrow is bound non-exact to a start shape and the
	// start point has an arrowhead, then offset the start point
	if (!isSelfIntersection) {
		if (
			relationship !== 'start-contains-end' &&
			startShapeInfo &&
			arrowheadStart !== 'none' &&
			!startShapeInfo.isExact
		) {
			strokeOffsetA =
				STROKE_SIZES[shape.props.size] / 2 +
				('size' in startShapeInfo.shape.props
					? STROKE_SIZES[startShapeInfo.shape.props.size] / 2
					: 0)
			offsetA = BOUND_ARROW_OFFSET + strokeOffsetA
			minLength += strokeOffsetA
		}

		// If the arrow is bound non-exact to an end shape and the
		// end point has an arrowhead offset the end point
		if (
			relationship !== 'end-contains-start' &&
			endShapeInfo &&
			arrowheadEnd !== 'none' &&
			!endShapeInfo.isExact
		) {
			strokeOffsetB =
				STROKE_SIZES[shape.props.size] / 2 +
				('size' in endShapeInfo.shape.props ? STROKE_SIZES[endShapeInfo.shape.props.size] / 2 : 0)
			offsetB = BOUND_ARROW_OFFSET + strokeOffsetB
			minLength += strokeOffsetB
		}
	}

	// Adjust offsets if the length of the arrow is too small

	const tA = a.clone().add(u.clone().mul(offsetA * (didFlip ? -1 : 1)))
	const tB = b.clone().sub(u.clone().mul(offsetB * (didFlip ? -1 : 1)))
	const distAB = Vec2d.Dist(tA, tB)

	if (distAB < minLength) {
		if (offsetA !== 0 && offsetB !== 0) {
			// both bound + offset
			offsetA *= -1.5
			offsetB *= -1.5
		} else if (offsetA !== 0) {
			// start bound + offset
			offsetA *= -1
		} else if (offsetB !== 0) {
			// end bound + offset
			offsetB *= -1
		} else {
			// noop, its just a really short arrow
		}
	}

	a.add(u.clone().mul(offsetA * (didFlip ? -1 : 1)))
	b.sub(u.clone().mul(offsetB * (didFlip ? -1 : 1)))

	// If the handles flipped their order, then set the center handle
	// to the midpoint of the terminals (rather than the midpoint of the
	// arrow body); otherwise, it may not be "between" the other terminals.
	if (didFlip) {
		if (startShapeInfo && endShapeInfo) {
			// If we have two bound shapes...then make the arrow a short arrow from
			// the start point towards where the end point should be.
			b.setTo(Vec2d.Add(a, u.clone().mul(-MIN_ARROW_LENGTH)))
		}
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

/** @public */
export function getStraightArrowHandlePath(info: TLArrowInfo & { isStraight: true }) {
	return getArrowPath(info.start.handle, info.end.handle)
}

/** @public */
export function getSolidStraightArrowPath(info: TLArrowInfo & { isStraight: true }) {
	return getArrowPath(info.start.point, info.end.point)
}

function getArrowPath(start: VecLike, end: VecLike) {
	return `M${start.x},${start.y}L${end.x},${end.y}`
}

/** @public */
export function getStraightArrowBoundingBox(start: VecLike, end: VecLike) {
	return new Box2d(
		Math.min(start.x, end.x),
		Math.min(start.y, end.y),
		Math.abs(start.x - end.x),
		Math.abs(start.y - end.y)
	)
}
