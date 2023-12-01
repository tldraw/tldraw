import { TLArrowShape } from '@tldraw/tlschema'
import { Box2d } from '../../../../primitives/Box2d'
import { Matrix2d } from '../../../../primitives/Matrix2d'
import { Vec2d, VecLike } from '../../../../primitives/Vec2d'
import { intersectCirclePolygon, intersectCirclePolyline } from '../../../../primitives/intersect'
import {
	PI,
	PI2,
	clockwiseAngleDist,
	counterClockwiseAngleDist,
	isSafeFloat,
} from '../../../../primitives/utils'
import type { Editor } from '../../../Editor'
import { TLArcInfo, TLArrowInfo } from './arrow-types'
import {
	BOUND_ARROW_OFFSET,
	MIN_ARROW_LENGTH,
	STROKE_SIZES,
	WAY_TOO_BIG_ARROW_BEND_FACTOR,
	getArrowTerminalsInArrowSpace,
	getBoundShapeInfoForTerminal,
	getBoundShapeRelationships,
} from './shared'
import { getStraightArrowInfo } from './straight-arrow'

export function getCurvedArrowInfo(
	editor: Editor,
	shape: TLArrowShape,
	extraBend = 0
): TLArrowInfo {
	const { arrowheadEnd, arrowheadStart } = shape.props
	const bend = shape.props.bend + extraBend

	if (Math.abs(bend) > Math.abs(shape.props.bend * WAY_TOO_BIG_ARROW_BEND_FACTOR)) {
		return getStraightArrowInfo(editor, shape)
	}

	const terminalsInArrowSpace = getArrowTerminalsInArrowSpace(editor, shape)

	const med = Vec2d.Med(terminalsInArrowSpace.start, terminalsInArrowSpace.end) // point between start and end
	const u = Vec2d.Sub(terminalsInArrowSpace.end, terminalsInArrowSpace.start).uni() // unit vector between start and end
	const middle = Vec2d.Add(med, u.per().mul(-bend)) // middle handle

	const startShapeInfo = getBoundShapeInfoForTerminal(editor, shape.props.start)
	const endShapeInfo = getBoundShapeInfoForTerminal(editor, shape.props.end)

	// The positions of the body of the arrow, which may be different
	// than the arrow's start / end points if the arrow is bound to shapes
	const a = terminalsInArrowSpace.start.clone()
	const b = terminalsInArrowSpace.end.clone()
	const c = middle.clone()

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

	const isClockwise = shape.props.bend < 0
	const distFn = isClockwise ? clockwiseAngleDist : counterClockwiseAngleDist

	const handleArc = getArcInfo(a, b, c)
	const handle_aCA = Vec2d.Angle(handleArc.center, a)
	const handle_aCB = Vec2d.Angle(handleArc.center, b)
	const handle_dAB = distFn(handle_aCA, handle_aCB)

	if (
		handleArc.length === 0 ||
		handleArc.size === 0 ||
		!isSafeFloat(handleArc.length) ||
		!isSafeFloat(handleArc.size)
	) {
		return getStraightArrowInfo(editor, shape)
	}

	const tempA = a.clone()
	const tempB = b.clone()
	const tempC = c.clone()

	const arrowPageTransform = editor.getShapePageTransform(shape)!

	let offsetA = 0
	let offsetB = 0

	let minLength = MIN_ARROW_LENGTH

	if (startShapeInfo && !startShapeInfo.isExact) {
		const startInPageSpace = Matrix2d.applyToPoint(arrowPageTransform, tempA)
		const centerInPageSpace = Matrix2d.applyToPoint(arrowPageTransform, handleArc.center)
		const endInPageSpace = Matrix2d.applyToPoint(arrowPageTransform, tempB)

		const inverseTransform = Matrix2d.Inverse(startShapeInfo.transform)

		const startInStartShapeLocalSpace = Matrix2d.applyToPoint(inverseTransform, startInPageSpace)
		const centerInStartShapeLocalSpace = Matrix2d.applyToPoint(inverseTransform, centerInPageSpace)
		const endInStartShapeLocalSpace = Matrix2d.applyToPoint(inverseTransform, endInPageSpace)

		const { isClosed } = startShapeInfo
		const fn = isClosed ? intersectCirclePolygon : intersectCirclePolyline

		let point: VecLike | undefined

		let intersections = fn(centerInStartShapeLocalSpace, handleArc.radius, startShapeInfo.outline)

		if (intersections) {
			const angleToStart = centerInStartShapeLocalSpace.angle(startInStartShapeLocalSpace)
			const angleToEnd = centerInStartShapeLocalSpace.angle(endInStartShapeLocalSpace)
			const dAB = distFn(angleToStart, angleToEnd)

			// Filter out any intersections that aren't in the arc
			intersections = intersections.filter(
				(pt) => distFn(angleToStart, centerInStartShapeLocalSpace.angle(pt)) <= dAB
			)

			const targetDist = dAB * 0.25

			intersections.sort(
				isClosed
					? (p0, p1) =>
							Math.abs(distFn(angleToStart, centerInStartShapeLocalSpace.angle(p0)) - targetDist) <
							Math.abs(distFn(angleToStart, centerInStartShapeLocalSpace.angle(p1)) - targetDist)
								? -1
								: 1
					: (p0, p1) =>
							distFn(angleToStart, centerInStartShapeLocalSpace.angle(p0)) <
							distFn(angleToStart, centerInStartShapeLocalSpace.angle(p1))
								? -1
								: 1
			)

			point = intersections[0] ?? (isClosed ? undefined : startInStartShapeLocalSpace)
		} else {
			point = isClosed ? undefined : startInStartShapeLocalSpace
		}

		if (point) {
			tempA.setTo(
				editor.getPointInShapeSpace(shape, Matrix2d.applyToPoint(startShapeInfo.transform, point))
			)

			startShapeInfo.didIntersect = true

			if (arrowheadStart !== 'none') {
				const strokeOffset =
					STROKE_SIZES[shape.props.size] / 2 +
					('size' in startShapeInfo.shape.props
						? STROKE_SIZES[startShapeInfo.shape.props.size] / 2
						: 0)
				offsetA = BOUND_ARROW_OFFSET + strokeOffset
				minLength += strokeOffset
			}
		}
	}

	if (endShapeInfo && !endShapeInfo.isExact) {
		// get points in shape's coordinates?
		const startInPageSpace = Matrix2d.applyToPoint(arrowPageTransform, tempA)
		const endInPageSpace = Matrix2d.applyToPoint(arrowPageTransform, tempB)
		const centerInPageSpace = Matrix2d.applyToPoint(arrowPageTransform, handleArc.center)

		const inverseTransform = Matrix2d.Inverse(endShapeInfo.transform)

		const startInEndShapeLocalSpace = Matrix2d.applyToPoint(inverseTransform, startInPageSpace)
		const centerInEndShapeLocalSpace = Matrix2d.applyToPoint(inverseTransform, centerInPageSpace)
		const endInEndShapeLocalSpace = Matrix2d.applyToPoint(inverseTransform, endInPageSpace)

		const isClosed = endShapeInfo.isClosed
		const fn = isClosed ? intersectCirclePolygon : intersectCirclePolyline

		let point: VecLike | undefined

		let intersections = fn(centerInEndShapeLocalSpace, handleArc.radius, endShapeInfo.outline)

		if (intersections) {
			const angleToStart = centerInEndShapeLocalSpace.angle(startInEndShapeLocalSpace)
			const angleToEnd = centerInEndShapeLocalSpace.angle(endInEndShapeLocalSpace)
			const dAB = distFn(angleToStart, angleToEnd)
			const targetDist = dAB * 0.75

			// or simplified...

			intersections = intersections.filter(
				(pt) => distFn(angleToStart, centerInEndShapeLocalSpace.angle(pt)) <= dAB
			)

			intersections.sort(
				isClosed
					? (p0, p1) =>
							Math.abs(distFn(angleToStart, centerInEndShapeLocalSpace.angle(p0)) - targetDist) <
							Math.abs(distFn(angleToStart, centerInEndShapeLocalSpace.angle(p1)) - targetDist)
								? -1
								: 1
					: (p0, p1) =>
							distFn(angleToStart, centerInEndShapeLocalSpace.angle(p0)) <
							distFn(angleToStart, centerInEndShapeLocalSpace.angle(p1))
								? -1
								: 1
			)

			if (intersections[0]) {
				point = intersections[0]
			} else {
				point = isClosed ? undefined : endInEndShapeLocalSpace
			}
		} else {
			point = isClosed ? undefined : endInEndShapeLocalSpace
		}

		if (point) {
			// Set b to target local point -> page point -> shape local point
			tempB.setTo(
				editor.getPointInShapeSpace(shape, Matrix2d.applyToPoint(endShapeInfo.transform, point))
			)

			endShapeInfo.didIntersect = true

			if (arrowheadEnd !== 'none') {
				const strokeOffset =
					STROKE_SIZES[shape.props.size] / 2 +
					('size' in endShapeInfo.shape.props ? STROKE_SIZES[endShapeInfo.shape.props.size] / 2 : 0)
				offsetB = BOUND_ARROW_OFFSET + strokeOffset
				minLength += strokeOffset
			}
		}
	}

	// Apply arrowhead offsets

	let aCA = Vec2d.Angle(handleArc.center, tempA) // angle center -> a
	let aCB = Vec2d.Angle(handleArc.center, tempB) // angle center -> b
	let dAB = distFn(aCA, aCB) // angle distance between a and b
	let lAB = dAB * handleArc.radius // length of arc between a and b

	// Try the offsets first, then check whether the distance between the points is too small;
	// if it is, flip the offsets and expand them. We need to do this using temporary points
	// so that we can apply them both in a balanced way.
	const tA = tempA.clone()
	const tB = tempB.clone()

	if (offsetA !== 0) {
		const n = (offsetA / lAB) * (isClockwise ? 1 : -1)
		const u = Vec2d.FromAngle(aCA + dAB * n)
		tA.setTo(handleArc.center).add(u.mul(handleArc.radius))
	}

	if (offsetB !== 0) {
		const n = (offsetB / lAB) * (isClockwise ? -1 : 1)
		const u = Vec2d.FromAngle(aCB + dAB * n)
		tB.setTo(handleArc.center).add(u.mul(handleArc.radius))
	}

	const distAB = Vec2d.Dist(tA, tB)
	if (distAB < minLength) {
		if (offsetA !== 0 && offsetB !== 0) {
			offsetA *= -1.5
			offsetB *= -1.5
		} else if (offsetA !== 0) {
			offsetA *= -2
		} else if (offsetB !== 0) {
			offsetB *= -2
		} else {
			// noop
		}
	}

	if (offsetA !== 0) {
		const n = (offsetA / lAB) * (isClockwise ? 1 : -1)
		const u = Vec2d.FromAngle(aCA + dAB * n)
		tempA.setTo(handleArc.center).add(u.mul(handleArc.radius))
	}

	if (offsetB !== 0) {
		const n = (offsetB / lAB) * (isClockwise ? -1 : 1)
		const u = Vec2d.FromAngle(aCB + dAB * n)
		tempB.setTo(handleArc.center).add(u.mul(handleArc.radius))
	}

	// Did we miss intersections? This happens when we have overlapping shapes.
	if (startShapeInfo && endShapeInfo && !startShapeInfo.isExact && !endShapeInfo.isExact) {
		aCA = Vec2d.Angle(handleArc.center, tempA) // angle center -> a
		aCB = Vec2d.Angle(handleArc.center, tempB) // angle center -> b
		dAB = distFn(aCA, aCB) // angle distance between a and b
		lAB = dAB * handleArc.radius // length of arc between a and b
		const relationship = getBoundShapeRelationships(
			editor,
			startShapeInfo.shape.id,
			endShapeInfo.shape.id
		)

		if (relationship === 'double-bound' && lAB < 30) {
			tempA.setTo(a)
			tempB.setTo(b)
			tempC.setTo(c)
		} else if (relationship === 'safe') {
			if (startShapeInfo && !startShapeInfo.didIntersect) {
				tempA.setTo(a)
			}

			if (
				(endShapeInfo && !endShapeInfo.didIntersect) ||
				distFn(handle_aCA, aCA) > distFn(handle_aCA, aCB)
			) {
				const n = Math.min(0.9, MIN_ARROW_LENGTH / lAB) * (isClockwise ? 1 : -1)
				const u = Vec2d.FromAngle(aCA + dAB * n)
				tempB.setTo(handleArc.center).add(u.mul(handleArc.radius))
			}
		}
	}

	placeCenterHandle(
		handleArc.center,
		handleArc.radius,
		tempA,
		tempB,
		tempC,
		handle_dAB,
		isClockwise
	)

	if (tempA.equals(tempB)) {
		tempA.setTo(tempC.clone().addXY(1, 1))
		tempB.setTo(tempC.clone().subXY(1, 1))
	}

	a.setTo(tempA)
	b.setTo(tempB)
	c.setTo(tempC)
	const bodyArc = getArcInfo(a, b, c)

	return {
		isStraight: false,
		start: {
			point: a,
			handle: terminalsInArrowSpace.start,
			arrowhead: shape.props.arrowheadStart,
		},
		end: {
			point: b,
			handle: terminalsInArrowSpace.end,
			arrowhead: shape.props.arrowheadEnd,
		},
		middle: c,
		handleArc,
		bodyArc,
		isValid: bodyArc.length !== 0 && isFinite(bodyArc.center.x) && isFinite(bodyArc.center.y),
	}
}

/**
 * Get a solid path for a curved arrow's handles.
 *
 * @param info - The arrow info.
 * @public
 */
export function getCurvedArrowHandlePath(info: TLArrowInfo & { isStraight: false }) {
	const {
		start,
		end,
		handleArc: { radius, largeArcFlag, sweepFlag },
	} = info
	return `M${start.handle.x},${start.handle.y} A${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.handle.x},${end.handle.y}`
}

/**
 * Get a solid path for a curved arrow's body.
 *
 * @param info - The arrow info.
 * @public
 */
export function getSolidCurvedArrowPath(info: TLArrowInfo & { isStraight: false }) {
	const {
		start,
		end,
		bodyArc: { radius, largeArcFlag, sweepFlag },
	} = info
	return `M${start.point.x},${start.point.y} A${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.point.x},${end.point.y}`
}

/**
 * Get a point along an arc.
 *
 * @param center - The arc's center.
 * @param radius - The arc's radius.
 * @param startAngle - The start point of the arc.
 * @param size - The size of the arc.
 * @param t - The point along the arc to get.
 */
export function getPointOnArc(
	center: VecLike,
	radius: number,
	startAngle: number,
	size: number,
	t: number
) {
	const angle = startAngle + size * t
	return new Vec2d(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle))
}

/**
 * Get a bounding box for an arc.
 *
 * @param center - The arc's center.
 * @param radius - The arc's radius.
 * @param start - The start point of the arc.
 * @param size - The size of the arc.
 */
export function getArcBoundingBox(center: VecLike, radius: number, start: VecLike, size: number) {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity

	const startAngle = Vec2d.Angle(center, start)

	// Test 20 points along the arc
	for (let i = 0; i < 20; i++) {
		const angle = startAngle + size * (i / 19)
		const x = center.x + radius * Math.cos(angle)
		const y = center.y + radius * Math.sin(angle)

		minX = Math.min(x, minX)
		minY = Math.min(y, minY)
		maxX = Math.max(x, maxX)
		maxY = Math.max(y, maxY)
	}

	return new Box2d(minX, minY, maxX - minX, maxY - minY)
}

/**
 * Get info about an arc formed by three points.
 *
 * @param a - The start of the arc
 * @param b - The end of the arc
 * @param c - A point on the arc
 */
export function getArcInfo(a: VecLike, b: VecLike, c: VecLike): TLArcInfo {
	// find a circle from the three points
	const u = -2 * (a.x * (b.y - c.y) - a.y * (b.x - c.x) + b.x * c.y - c.x * b.y)

	const center = {
		x:
			((a.x * a.x + a.y * a.y) * (c.y - b.y) +
				(b.x * b.x + b.y * b.y) * (a.y - c.y) +
				(c.x * c.x + c.y * c.y) * (b.y - a.y)) /
			u,
		y:
			((a.x * a.x + a.y * a.y) * (b.x - c.x) +
				(b.x * b.x + b.y * b.y) * (c.x - a.x) +
				(c.x * c.x + c.y * c.y) * (a.x - b.x)) /
			u,
	}

	const radius = Vec2d.Dist(center, a)

	// Whether to draw the arc clockwise or counter-clockwise (are the points clockwise?)
	const sweepFlag = +Vec2d.Clockwise(a, c, b)

	// The base angle of the arc in radians
	const ab = Math.hypot(a.y - b.y, a.x - b.x)
	const bc = Math.hypot(b.y - c.y, b.x - c.x)
	const ca = Math.hypot(c.y - a.y, c.x - a.x)

	const theta = Math.acos((bc * bc + ca * ca - ab * ab) / (2 * bc * ca)) * 2

	// Whether to draw the long arc or short arc
	const largeArcFlag = +(PI > theta)

	// The size of the arc to draw in radians
	const size = (PI2 - theta) * (sweepFlag ? 1 : -1)

	// The length of the arc to draw in distance units
	const length = size * radius

	return {
		center,
		radius,
		size,
		length,
		largeArcFlag,
		sweepFlag,
	}
}

function placeCenterHandle(
	center: VecLike,
	radius: number,
	tempA: Vec2d,
	tempB: Vec2d,
	tempC: Vec2d,
	originalArcLength: number,
	isClockwise: boolean
) {
	const aCA = Vec2d.Angle(center, tempA) // angle center -> a
	const aCB = Vec2d.Angle(center, tempB) // angle center -> b
	let dAB = clockwiseAngleDist(aCA, aCB) // angle distance between a and b
	if (!isClockwise) dAB = PI2 - dAB

	const n = 0.5 * (isClockwise ? 1 : -1)
	const u = Vec2d.FromAngle(aCA + dAB * n)
	tempC.setTo(center).add(u.mul(radius))

	if (dAB > originalArcLength) {
		tempC.rotWith(center, PI)
		const t = tempB.clone()
		tempB.setTo(tempA)
		tempA.setTo(t)
	}
}
