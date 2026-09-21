import { Vec, intersectLineSegmentLineSegment, invLerp, lerp, pointInPolygon } from 'tldraw'
import { SpeechBubbleShape } from './SpeechBubbleUtil'

export function getSpeechBubbleVertices(shape: SpeechBubbleShape): Vec[] {
	const { w, tail } = shape.props

	const fullHeight = shape.props.h + shape.props.growY
	const tailInShapeSpace = new Vec(tail.x * w, tail.y * fullHeight)

	const [tl, tr, br, bl] = [
		new Vec(0, 0),
		new Vec(w, 0),
		new Vec(w, fullHeight),
		new Vec(0, fullHeight),
	]

	const offsetH = w / 10
	const offsetV = fullHeight / 10

	const { adjustedIntersection, intersectionSegmentIndex } = getTailIntersectionPoint(shape)

	let vertices: Vec[]

	// Inject the tail segments into the geometry of the shape
	switch (intersectionSegmentIndex) {
		case 0:
			// top
			vertices = [
				tl,
				new Vec(adjustedIntersection.x - offsetH, adjustedIntersection.y),
				new Vec(tailInShapeSpace.x, tailInShapeSpace.y),
				new Vec(adjustedIntersection.x + offsetH, adjustedIntersection.y),
				tr,
				br,
				bl,
			]
			break
		case 1:
			// right
			vertices = [
				tl,
				tr,
				new Vec(adjustedIntersection.x, adjustedIntersection.y - offsetV),
				new Vec(tailInShapeSpace.x, tailInShapeSpace.y),
				new Vec(adjustedIntersection.x, adjustedIntersection.y + offsetV),
				br,
				bl,
			]
			break
		case 2:
			// bottom
			vertices = [
				tl,
				tr,
				br,
				new Vec(adjustedIntersection.x + offsetH, adjustedIntersection.y),
				new Vec(tailInShapeSpace.x, tailInShapeSpace.y),
				new Vec(adjustedIntersection.x - offsetH, adjustedIntersection.y),
				bl,
			]
			break
		case 3:
			// left
			vertices = [
				tl,
				tr,
				br,
				bl,
				new Vec(adjustedIntersection.x, adjustedIntersection.y + offsetV),
				new Vec(tailInShapeSpace.x, tailInShapeSpace.y),
				new Vec(adjustedIntersection.x, adjustedIntersection.y - offsetV),
			]
			break
		default:
			throw Error("no intersection found, this shouldn't happen")
	}

	return vertices
}

export function getTailIntersectionPoint(shape: SpeechBubbleShape) {
	const { w, tail } = shape.props
	const fullHeight = shape.props.h + shape.props.growY
	const tailInShapeSpace = new Vec(tail.x * w, tail.y * fullHeight)

	const center = new Vec(w / 2, fullHeight / 2)
	const corners = [new Vec(0, 0), new Vec(w, 0), new Vec(w, fullHeight), new Vec(0, fullHeight)]
	const segments = [
		[corners[0], corners[1]],
		[corners[1], corners[2]],
		[corners[2], corners[3]],
		[corners[3], corners[0]],
	]

	let segmentsIntersection: Vec | null = null
	let intersectionSegment: Vec[] | null = null

	const insideShape = pointInPolygon(tailInShapeSpace, corners)

	// We want to be sure we get an intersection, so if the point is
	// inside the shape, push it away from the center by a big distance
	const pointToCheck = insideShape
		? Vec.Add(tailInShapeSpace, Vec.Sub(tailInShapeSpace, center).uni().mul(1000000))
		: tailInShapeSpace

	// Test each segment for an intersection
	for (const segment of segments) {
		segmentsIntersection = intersectLineSegmentLineSegment(
			segment[0],
			segment[1],
			center,
			pointToCheck
		)

		if (segmentsIntersection) {
			intersectionSegment = segment
			break
		}
	}

	if (!(segmentsIntersection && intersectionSegment)) {
		throw Error("no intersection found, this shouldn't happen")
	}

	const [start, end] = intersectionSegment
	const intersectionSegmentIndex = segments.indexOf(intersectionSegment)

	// a normalised vector from start to end, so this can work in any direction
	const unit = Vec.Sub(end, start).uni()

	// Where is the intersection relative to the start?
	const totalDistance = Vec.Dist(start, end)
	const distance = Vec.Dist(segmentsIntersection, start)

	// make it stick to the middle
	const middleRelative = mapRange(0, totalDistance, -1, 1, distance) // absolute -> -1 to 1
	const squaredRelative = Math.abs(middleRelative) ** 2 * Math.sign(middleRelative) // square it and keep the sign
	const squared = mapRange(-1, 1, 0, totalDistance, squaredRelative) // -1 to 1 -> absolute

	const offset = (segments.indexOf(intersectionSegment) % 2 === 0 ? w / 10 : fullHeight / 10) * 3
	const constrained = mapRange(0, totalDistance, offset, totalDistance - offset, distance)

	// combine the two
	const interpolated = lerp(constrained, squared, 0.5)

	const adjustedIntersection = unit.mul(interpolated).add(start)

	// We need the adjusted intersection to draw the tail, but the original intersection
	// for the onBeforeUpdate handler
	return {
		segmentsIntersection,
		adjustedIntersection,
		intersectionSegmentIndex,
		insideShape,
	}
}

/**
 * Maps a value from one range to another.
 * e.g. mapRange(10, 20, 50, 100, 15) => 75
 */
function mapRange(a1: number, b1: number, a2: number, b2: number, s: number) {
	return lerp(a2, b2, invLerp(a1, b1, s))
}
