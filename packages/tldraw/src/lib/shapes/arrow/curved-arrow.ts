import {
	Editor,
	Mat,
	PI,
	PI2,
	TLArrowShape,
	Vec,
	VecLike,
	centerOfCircleFromThreePoints,
	clockwiseAngleDist,
	counterClockwiseAngleDist,
	isSafeFloat,
} from '@tldraw/editor'
import { TLArcInfo, TLArrowInfo } from './arrow-types'
import {
	BOUND_ARROW_OFFSET,
	MIN_ARROW_LENGTH,
	STROKE_SIZES,
	TLArrowBindings,
	WAY_TOO_BIG_ARROW_BEND_FACTOR,
	getArrowTerminalsInArrowSpace,
	getBoundShapeInfoForTerminal,
	getBoundShapeRelationships,
} from './shared'
import { getStraightArrowInfo } from './straight-arrow'

export function getCurvedArrowInfo(
	editor: Editor,
	shape: TLArrowShape,
	bindings: TLArrowBindings
): TLArrowInfo {
	const { arrowheadEnd, arrowheadStart } = shape.props
	const bend = shape.props.bend

	if (
		Math.abs(bend) >
		Math.abs(shape.props.bend * (WAY_TOO_BIG_ARROW_BEND_FACTOR * shape.props.scale))
	) {
		return getStraightArrowInfo(editor, shape, bindings)
	}

	const terminalsInArrowSpace = getArrowTerminalsInArrowSpace(editor, shape, bindings)

	const med = Vec.Med(terminalsInArrowSpace.start, terminalsInArrowSpace.end) // point between start and end
	const distance = Vec.Sub(terminalsInArrowSpace.end, terminalsInArrowSpace.start)
	// Check for divide-by-zero before we call uni()
	const u = Vec.Len(distance) ? distance.uni() : Vec.From(distance) // unit vector between start and end
	const middle = Vec.Add(med, u.per().mul(-bend)) // middle handle

	const startShapeInfo = getBoundShapeInfoForTerminal(editor, shape, 'start')
	const endShapeInfo = getBoundShapeInfoForTerminal(editor, shape, 'end')

	// The positions of the body of the arrow, which may be different
	// than the arrow's start / end points if the arrow is bound to shapes
	const a = terminalsInArrowSpace.start.clone()
	const b = terminalsInArrowSpace.end.clone()
	const c = middle.clone()

	if (Vec.Equals(a, b)) {
		return {
			bindings,
			type: 'straight',
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
	const handle_aCA = Vec.Angle(handleArc.center, a)
	const handle_aCB = Vec.Angle(handleArc.center, b)
	const handle_dAB = distFn(handle_aCA, handle_aCB)

	if (
		handleArc.length === 0 ||
		handleArc.size === 0 ||
		!isSafeFloat(handleArc.length) ||
		!isSafeFloat(handleArc.size)
	) {
		return getStraightArrowInfo(editor, shape, bindings)
	}

	const tempA = a.clone()
	const tempB = b.clone()
	const tempC = c.clone()

	const arrowPageTransform = editor.getShapePageTransform(shape)!

	let offsetA = 0
	let offsetB = 0

	let minLength = MIN_ARROW_LENGTH * shape.props.scale

	if (startShapeInfo && !startShapeInfo.isExact) {
		const startInPageSpace = Mat.applyToPoint(arrowPageTransform, tempA)
		const centerInPageSpace = Mat.applyToPoint(arrowPageTransform, handleArc.center)
		const endInPageSpace = Mat.applyToPoint(arrowPageTransform, tempB)

		const inverseTransform = Mat.Inverse(startShapeInfo.transform)

		const startInStartShapeLocalSpace = Mat.applyToPoint(inverseTransform, startInPageSpace)
		const centerInStartShapeLocalSpace = Mat.applyToPoint(inverseTransform, centerInPageSpace)
		const endInStartShapeLocalSpace = Mat.applyToPoint(inverseTransform, endInPageSpace)

		const { isClosed } = startShapeInfo
		let point: VecLike | undefined
		let intersections = Array.from(
			startShapeInfo.geometry.intersectCircle(centerInStartShapeLocalSpace, handleArc.radius, {
				includeLabels: false,
				includeInternal: false,
			})
		)

		if (intersections.length) {
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

			point = intersections[0]
		}
		if (!point) {
			if (isClosed) {
				const nearestPoint = startShapeInfo.geometry.nearestPoint(startInStartShapeLocalSpace, {
					includeInternal: false,
					includeLabels: false,
				})
				if (Vec.DistMin(nearestPoint, startInStartShapeLocalSpace, 1)) {
					point = nearestPoint
				}
			} else {
				point = startInStartShapeLocalSpace
			}
		}

		if (point) {
			tempA.setTo(
				editor.getPointInShapeSpace(shape, Mat.applyToPoint(startShapeInfo.transform, point))
			)

			startShapeInfo.didIntersect = true

			if (arrowheadStart !== 'none') {
				const strokeOffset =
					STROKE_SIZES[shape.props.size] / 2 +
					('size' in startShapeInfo.shape.props
						? STROKE_SIZES[startShapeInfo.shape.props.size] / 2
						: 0)
				offsetA = (BOUND_ARROW_OFFSET + strokeOffset) * shape.props.scale
				minLength += strokeOffset * shape.props.scale
			}
		}
	}

	if (endShapeInfo && !endShapeInfo.isExact) {
		// get points in shape's coordinates?
		const startInPageSpace = Mat.applyToPoint(arrowPageTransform, tempA)
		const endInPageSpace = Mat.applyToPoint(arrowPageTransform, tempB)
		const centerInPageSpace = Mat.applyToPoint(arrowPageTransform, handleArc.center)

		const inverseTransform = Mat.Inverse(endShapeInfo.transform)

		const startInEndShapeLocalSpace = Mat.applyToPoint(inverseTransform, startInPageSpace)
		const centerInEndShapeLocalSpace = Mat.applyToPoint(inverseTransform, centerInPageSpace)
		const endInEndShapeLocalSpace = Mat.applyToPoint(inverseTransform, endInPageSpace)

		const isClosed = endShapeInfo.isClosed
		let point: VecLike | undefined
		let intersections = Array.from(
			endShapeInfo.geometry.intersectCircle(centerInEndShapeLocalSpace, handleArc.radius, {
				includeLabels: false,
				includeInternal: false,
			})
		)

		if (intersections.length) {
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

			point = intersections[0]
		}
		if (!point) {
			if (isClosed) {
				const nearestPoint = endShapeInfo.geometry.nearestPoint(endInEndShapeLocalSpace, {
					includeInternal: false,
					includeLabels: false,
				})
				if (Vec.DistMin(nearestPoint, endInEndShapeLocalSpace, 1)) {
					point = nearestPoint
				}
			} else {
				point = endInEndShapeLocalSpace
			}
		}

		if (point) {
			// Set b to target local point -> page point -> shape local point
			tempB.setTo(
				editor.getPointInShapeSpace(shape, Mat.applyToPoint(endShapeInfo.transform, point))
			)

			endShapeInfo.didIntersect = true

			if (arrowheadEnd !== 'none') {
				const strokeOffset =
					STROKE_SIZES[shape.props.size] / 2 +
					('size' in endShapeInfo.shape.props ? STROKE_SIZES[endShapeInfo.shape.props.size] / 2 : 0)
				offsetB = (BOUND_ARROW_OFFSET + strokeOffset) * shape.props.scale
				minLength += strokeOffset * shape.props.scale
			}
		}
	}

	// Apply arrowhead offsets

	let aCA = Vec.Angle(handleArc.center, tempA) // angle center -> a
	let aCB = Vec.Angle(handleArc.center, tempB) // angle center -> b
	let dAB = distFn(aCA, aCB) // angle distance between a and b
	let lAB = dAB * handleArc.radius // length of arc between a and b

	// Try the offsets first, then check whether the distance between the points is too small;
	// if it is, flip the offsets and expand them. We need to do this using temporary points
	// so that we can apply them both in a balanced way.
	const tA = tempA.clone()
	const tB = tempB.clone()

	if (offsetA !== 0) {
		tA.setTo(handleArc.center).add(
			Vec.FromAngle(aCA + dAB * ((offsetA / lAB) * (isClockwise ? 1 : -1))).mul(handleArc.radius)
		)
	}

	if (offsetB !== 0) {
		tB.setTo(handleArc.center).add(
			Vec.FromAngle(aCB + dAB * ((offsetB / lAB) * (isClockwise ? -1 : 1))).mul(handleArc.radius)
		)
	}

	if (Vec.DistMin(tA, tB, minLength)) {
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

		// if we're using negative offsets, we need to make sure that the body arc doesn't end up
		// larger than the handle arc or things will get weird:
		const minOffsetA = 0.1 - distFn(handle_aCA, aCA) * handleArc.radius
		const minOffsetB = 0.1 - distFn(aCB, handle_aCB) * handleArc.radius
		offsetA = Math.max(offsetA, minOffsetA)
		offsetB = Math.max(offsetB, minOffsetB)
	}

	if (offsetA !== 0) {
		tempA
			.setTo(handleArc.center)
			.add(
				Vec.FromAngle(aCA + dAB * ((offsetA / lAB) * (isClockwise ? 1 : -1))).mul(handleArc.radius)
			)
	}

	if (offsetB !== 0) {
		tempB
			.setTo(handleArc.center)
			.add(
				Vec.FromAngle(aCB + dAB * ((offsetB / lAB) * (isClockwise ? -1 : 1))).mul(handleArc.radius)
			)
	}

	// Did we miss intersections? This happens when we have overlapping shapes.
	if (startShapeInfo && endShapeInfo && !startShapeInfo.isExact && !endShapeInfo.isExact) {
		aCA = Vec.Angle(handleArc.center, tempA) // angle center -> a
		aCB = Vec.Angle(handleArc.center, tempB) // angle center -> b
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
				tempB
					.setTo(handleArc.center)
					.add(
						Vec.FromAngle(
							aCA +
								dAB *
									(Math.min(0.9, (MIN_ARROW_LENGTH * shape.props.scale) / lAB) *
										(isClockwise ? 1 : -1))
						).mul(handleArc.radius)
					)
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
		bindings,
		type: 'arc',
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
 * Get info about an arc formed by three points.
 *
 * @param a - The start of the arc
 * @param b - The end of the arc
 * @param c - A point on the arc
 */
function getArcInfo(a: VecLike, b: VecLike, c: VecLike): TLArcInfo {
	// find a circle from the three points
	const center = centerOfCircleFromThreePoints(a, b, c) ?? Vec.Med(a, b)

	const radius = Vec.Dist(center, a)

	// Whether to draw the arc clockwise or counter-clockwise (are the points clockwise?)
	const sweepFlag = +Vec.Clockwise(a, c, b)

	// The base angle of the arc in radians
	const ab = ((a.y - b.y) ** 2 + (a.x - b.x) ** 2) ** 0.5
	const bc = ((b.y - c.y) ** 2 + (b.x - c.x) ** 2) ** 0.5
	const ca = ((c.y - a.y) ** 2 + (c.x - a.x) ** 2) ** 0.5

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
	tempA: Vec,
	tempB: Vec,
	tempC: Vec,
	originalArcLength: number,
	isClockwise: boolean
) {
	const aCA = Vec.Angle(center, tempA) // angle center -> a
	const aCB = Vec.Angle(center, tempB) // angle center -> b
	let dAB = clockwiseAngleDist(aCA, aCB) // angle distance between a and b
	if (!isClockwise) dAB = PI2 - dAB

	tempC.setTo(center).add(Vec.FromAngle(aCA + dAB * (0.5 * (isClockwise ? 1 : -1))).mul(radius))

	if (dAB > originalArcLength) {
		tempC.rotWith(center, PI)
		const t = tempB.clone()
		tempB.setTo(tempA)
		tempA.setTo(t)
	}
}
