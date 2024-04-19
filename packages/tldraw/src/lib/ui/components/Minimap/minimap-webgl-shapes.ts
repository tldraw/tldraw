import { Box, HALF_PI, PI, PI2, Vec } from '@tldraw/editor'

export const numArcSegmentsPerCorner = 10

export const roundedRectangleDataSize =
	// num triangles in corners
	4 * 6 * numArcSegmentsPerCorner +
	// num triangles in center rect
	12 +
	// num triangles in outer rects
	4 * 12

export function pie(
	array: Float32Array,
	{
		center,
		radius,
		numArcSegments = 20,
		startAngle = 0,
		endAngle = PI2,
		offset = 0,
	}: {
		center: Vec
		radius: number
		numArcSegments?: number
		startAngle?: number
		endAngle?: number
		offset?: number
	}
) {
	const angle = (endAngle - startAngle) / numArcSegments
	let i = offset
	for (let a = startAngle; a < endAngle; a += angle) {
		array[i++] = center.x
		array[i++] = center.y
		array[i++] = center.x + Math.cos(a) * radius
		array[i++] = center.y + Math.sin(a) * radius
		array[i++] = center.x + Math.cos(a + angle) * radius
		array[i++] = center.y + Math.sin(a + angle) * radius
	}
	return array
}

/** @internal **/
export function rectangle(
	array: Float32Array,
	offset: number,
	x: number,
	y: number,
	w: number,
	h: number
) {
	array[offset++] = x
	array[offset++] = y
	array[offset++] = x
	array[offset++] = y + h
	array[offset++] = x + w
	array[offset++] = y

	array[offset++] = x + w
	array[offset++] = y
	array[offset++] = x
	array[offset++] = y + h
	array[offset++] = x + w
	array[offset++] = y + h
}

export function roundedRectangle(data: Float32Array, box: Box, radius: number): number {
	const numArcSegments = numArcSegmentsPerCorner
	radius = Math.min(radius, Math.min(box.w, box.h) / 2)
	// first draw the inner box
	const innerBox = Box.ExpandBy(box, -radius)
	if (innerBox.w <= 0 || innerBox.h <= 0) {
		// just draw a circle
		pie(data, { center: box.center, radius: radius, numArcSegments: numArcSegmentsPerCorner * 4 })
		return numArcSegmentsPerCorner * 4 * 6
	}
	let offset = 0
	// draw center rect first
	rectangle(data, offset, innerBox.minX, innerBox.minY, innerBox.w, innerBox.h)
	offset += 12
	// then top rect
	rectangle(data, offset, innerBox.minX, box.minY, innerBox.w, radius)
	offset += 12
	// then right rect
	rectangle(data, offset, innerBox.maxX, innerBox.minY, radius, innerBox.h)
	offset += 12
	// then bottom rect
	rectangle(data, offset, innerBox.minX, innerBox.maxY, innerBox.w, radius)
	offset += 12
	// then left rect
	rectangle(data, offset, box.minX, innerBox.minY, radius, innerBox.h)
	offset += 12

	// draw the corners

	// top left
	pie(data, {
		numArcSegments,
		offset,
		center: innerBox.point,
		radius,
		startAngle: PI,
		endAngle: PI * 1.5,
	})

	offset += numArcSegments * 6

	// top right
	pie(data, {
		numArcSegments,
		offset,
		center: Vec.Add(innerBox.point, new Vec(innerBox.w, 0)),
		radius,
		startAngle: PI * 1.5,
		endAngle: PI2,
	})

	offset += numArcSegments * 6

	// bottom right
	pie(data, {
		numArcSegments,
		offset,
		center: Vec.Add(innerBox.point, innerBox.size),
		radius,
		startAngle: 0,
		endAngle: HALF_PI,
	})

	offset += numArcSegments * 6

	// bottom left
	pie(data, {
		numArcSegments,
		offset,
		center: Vec.Add(innerBox.point, new Vec(0, innerBox.h)),
		radius,
		startAngle: HALF_PI,
		endAngle: PI,
	})

	return roundedRectangleDataSize
}
