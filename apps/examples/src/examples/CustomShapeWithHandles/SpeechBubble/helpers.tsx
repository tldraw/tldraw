import { TLHandle, Vec2d, VecLike, lerp } from '@tldraw/tldraw'
import { SpeechBubbleShape } from './SpeechBubbleUtil'

export const getSpeechBubbleGeometry = (shape: SpeechBubbleShape): Vec2d[] => {
	const {
		adjustedIntersection: intersection,
		offset,
		line,
	} = getHandleIntersectionPoint({
		w: shape.props.w,
		h: shape.props.h,
		handle: shape.props.handles.handle,
	})

	const handle = shape.props.handles.handle

	const initialSegments = [
		new Vec2d(0, 0),
		new Vec2d(shape.props.w, 0),
		new Vec2d(shape.props.w, shape.props.h),
		new Vec2d(0, shape.props.h),
	]

	if (!intersection) {
		throw new Error('No intersection')
	}

	const createTailSegments = (orientation: 'horizontal' | 'vertical') => {
		// Is it a horizontal or vertical line? Which line are we intersecting?
		return orientation === 'horizontal'
			? [
					line === 0
						? new Vec2d(intersection.x - offset.horizontal, intersection.y)
						: new Vec2d(intersection.x + offset.horizontal, intersection.y),
					new Vec2d(handle.x, handle.y),
					line === 0
						? new Vec2d(intersection.x + offset.horizontal, intersection.y)
						: new Vec2d(intersection.x - offset.horizontal, intersection.y),
			  ]
			: [
					line === 1
						? new Vec2d(intersection.x, intersection.y - offset.vertical)
						: new Vec2d(intersection.x, intersection.y + offset.vertical),
					new Vec2d(handle.x, handle.y),
					line === 1
						? new Vec2d(intersection.x, intersection.y + offset.vertical)
						: new Vec2d(intersection.x, intersection.y - offset.vertical),
			  ]
	}

	let modifiedSegments = [...initialSegments]

	// Inject the tail segments into the geometry of the shape
	switch (line) {
		case 0:
			modifiedSegments.splice(1, 0, ...createTailSegments('horizontal'))
			break
		case 1:
			modifiedSegments.splice(2, 0, ...createTailSegments('vertical'))
			break
		case 2:
			modifiedSegments.splice(3, 0, ...createTailSegments('horizontal'))
			break
		case 3:
			modifiedSegments = [...modifiedSegments, ...createTailSegments('vertical')]
			break
		default:
			// eslint-disable-next-line no-console
			console.log('default')
	}

	return modifiedSegments
}

export function getHandleIntersectionPoint({
	w,
	h,
	handle,
}: {
	w: number
	h: number
	handle: TLHandle
}) {
	const offset = { horizontal: w / 10, vertical: h / 10 }
	const handleVec = new Vec2d(handle.x, handle.y)
	const center = new Vec2d(w / 2, h / 2)
	const box = [new Vec2d(0, 0), new Vec2d(w, 0), new Vec2d(w, h), new Vec2d(0, h)]

	const result = checkIntersection(handleVec, center, box)
	if (!result) return { intersection: null, offset: null, line: null }
	const { result: intersection, line } = result

	// lines
	///      0
	//  _____________
	//  |           |
	// 3|           | 1
	//  |           |
	//  -------------
	//        2

	const intersectionVec = new Vec2d(intersection[0].x, intersection[0].y)
	const lineCoordinates = {
		0: { start: new Vec2d(0, 0), end: new Vec2d(w, 0) },
		1: { start: new Vec2d(w, 0), end: new Vec2d(w, h) },
		2: { start: new Vec2d(0, h), end: new Vec2d(w, h) },
		3: { start: new Vec2d(0, 0), end: new Vec2d(0, h) },
	}

	const { start, end } = lineCoordinates[line]
	const whichOffset = line === 0 || line === 2 ? offset.horizontal : offset.vertical

	// let's make the intersection more likely to be in the middle and also stay away from the edges
	const adjustedIntersection = getAdjustedIntersectionPoint({
		start,
		end,
		intersectionVec,
		offset: whichOffset,
	})

	// We need the adjusted intersection to draw the tail, but the original intersection
	// for the onBeforeUpdate handler
	return {
		originalIntersection: intersectionVec,
		adjustedIntersection: adjustedIntersection,
		offset,
		line,
		insideShape: result.insideShape,
	}
}

export const getAdjustedIntersectionPoint = ({
	start,
	end,
	intersectionVec,
	offset,
}: {
	start: Vec2d
	end: Vec2d
	intersectionVec: Vec2d
	offset: number
}): Vec2d | null => {
	// a normalised vector from start to end, so this can work in any direction
	const unit = Vec2d.Sub(end, start).norm()

	// Where is the intersection relative to the start?
	const totalDistance = start.dist(end)
	const distance = intersectionVec.dist(start)

	const middleRelative = mapRange(0, totalDistance, -1, 1, distance) // absolute -> -1 to 1
	const squaredRelative = Math.abs(middleRelative) ** 2 * Math.sign(middleRelative) // square it and keep the sign
	// make it stick to the middle
	const squared = mapRange(-1, 1, 0, totalDistance, squaredRelative) // -1 to 1 -> absolute

	//keep it away from the edges
	const constrained = mapRange(0, totalDistance, offset * 3, totalDistance - offset * 3, distance)

	// combine the two
	const interpolated = lerp(constrained, squared, 0.5)

	return unit.mul(interpolated).add(start)
}

// This works similarly to the function intersectLineSegmentPolygon in the tldraw codebase,
// but we want to return which line was intersected, and also call the function recursively
export function checkIntersection(
	handle: Vec2d,
	center: Vec2d,
	points: Vec2d[]
): { result: VecLike[]; line: 0 | 1 | 2 | 3; insideShape?: boolean } | null {
	const result: VecLike[] = []
	let segmentIntersection: VecLike | null

	for (let i = 1, n = points.length; i < n + 1; i++) {
		segmentIntersection = intersectLineSegmentLineSegment(
			handle,
			center,
			points[i - 1],
			points[i % points.length]
		)

		if (segmentIntersection) {
			result.push(segmentIntersection)
			return { result, line: (i - 1) as 0 | 1 | 2 | 3 }
		}
	}
	//We're inside the shape, look backwards to find the intersection
	const angle = Math.atan2(handle.y - center.y, handle.x - center.x)
	//the third point's coordinates are the same as the height and width of the shape
	const direction = Vec2d.FromAngle(angle, Math.max(points[2].x, points[2].y))
	const newPoint = handle.add(direction)
	// Call this function again with the new point
	const intersection = checkIntersection(newPoint, center, points)
	if (!intersection) return null
	return {
		result: intersection.result,
		line: intersection.line,
		insideShape: true,
	}
}

// This function is copied from the tldraw codebase
export function intersectLineSegmentLineSegment(
	a1: VecLike,
	a2: VecLike,
	b1: VecLike,
	b2: VecLike
) {
	const ABx = a1.x - b1.x
	const ABy = a1.y - b1.y
	const BVx = b2.x - b1.x
	const BVy = b2.y - b1.y
	const AVx = a2.x - a1.x
	const AVy = a2.y - a1.y
	const ua_t = BVx * ABy - BVy * ABx
	const ub_t = AVx * ABy - AVy * ABx
	const u_b = BVy * AVx - BVx * AVy

	if (ua_t === 0 || ub_t === 0) return null // coincident

	if (u_b === 0) return null // parallel

	if (u_b !== 0) {
		const ua = ua_t / u_b
		const ub = ub_t / u_b
		if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
			return Vec2d.AddXY(a1, ua * AVx, ua * AVy)
		}
	}

	return null // no intersection
}

/**
 * Inverse linear interpolation
 */
export function invLerp(a: number, b: number, v: number) {
	return (v - a) / (b - a)
}
/**
 * Maps a value from one range to another.
 * e.g. mapRange(10, 20, 50, 100, 15) => 75
 */
export function mapRange(a1: number, b1: number, a2: number, b2: number, s: number) {
	return lerp(a2, b2, invLerp(a1, b1, s))
}
