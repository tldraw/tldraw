import { VecLike, assert } from '../vendor'
import { finishPath, resetPath, toCenti, writeC, writeCPair, writeStr } from './fmt'
import { getStrokeOutlineTracks } from './getStrokeOutlinePoints'
import { getStrokePoints } from './getStrokePoints'
import { setStrokePointRadii } from './setStrokePointRadii'
import { StrokeOptions, StrokePoint } from './types'

/**
 * Render a freehand stroke as svg path data in a single pass, from raw input points to a filled
 * outline with round caps. This is the path used by tldraw's draw shape when drawing with ink.
 *
 * @param rawInputPoints - The raw input points (as `{x, y, z}`, where `z` is pressure).
 * @param options - An object with options.
 * @public
 */
export function svgInk(rawInputPoints: VecLike[], options: StrokeOptions = {}) {
	const { start = {}, end = {} } = options
	const { cap: capStart = true } = start
	const { cap: capEnd = true } = end
	assert(!start.taper && !end.taper, 'cap taper not supported here')
	assert(!start.easing && !end.easing, 'cap easing not supported here')
	assert(capStart && capEnd, 'cap must be true')

	const points = getStrokePoints(rawInputPoints, options)
	setStrokePointRadii(points, options)
	const partitions = partitionAtElbows(points)
	resetPath()
	for (const partition of partitions) {
		renderPartition(partition, options)
	}

	return finishPath()
}

interface Partition {
	points: StrokePoint[]
	/**
	 * The original predecessor of `points[1]` when partitioning has cut or moved the point in
	 * front of it (the partition starts at an elbow, or cleanup spliced points out). The outline
	 * tracks derive the second point's vector from this anchor so it keeps the direction it had
	 * in the uncut stroke.
	 */
	vectorAnchor: VecLike | null
}

function partitionAtElbows(points: StrokePoint[]): Partition[] {
	if (points.length <= 2) return [{ points, vectorAnchor: null }]

	const result: Partition[] = []
	let currentPartition: StrokePoint[] = [points[0]]
	let currentAnchor: VecLike | null = null

	// Unit direction of the previous segment, computed with scalar math to avoid
	// allocating two vectors per point.
	let dx = points[1].point.x - points[0].point.x
	let dy = points[1].point.y - points[0].point.y
	let len = Math.sqrt(dx * dx + dy * dy)
	let prevVx = dx / len
	let prevVy = dy / len

	let prevPoint: StrokePoint, thisPoint: StrokePoint, nextPoint: StrokePoint

	for (let i = 1, n = points.length; i < n - 1; i++) {
		prevPoint = points[i - 1]
		thisPoint = points[i]
		nextPoint = points[i + 1]

		dx = nextPoint.point.x - thisPoint.point.x
		dy = nextPoint.point.y - thisPoint.point.y
		len = Math.sqrt(dx * dx + dy * dy)
		const nextVx = dx / len
		const nextVy = dy / len
		const dpr = prevVx * nextVx + prevVy * nextVy
		prevVx = nextVx
		prevVy = nextVy

		if (dpr < -0.8) {
			// always treat such acute angles as elbows
			// and use the extended .input point as the elbow point for swooshiness in fast zaggy lines
			const elbowPoint = {
				...thisPoint,
				point: thisPoint.input,
			}
			currentPartition.push(elbowPoint)
			result.push(cleanUpPartition(currentPartition, currentAnchor))
			currentPartition = [elbowPoint]
			// The next partition's second point keeps the vector it had in the uncut stroke,
			// which pointed at this point's streamlined position rather than its .input.
			currentAnchor = thisPoint.point
			continue
		}
		currentPartition.push(thisPoint)

		if (dpr > 0.7) {
			// Not an elbow
			continue
		}

		// so now we have a reasonably acute angle but it might not be an elbow if it's far
		// away from it's neighbors, angular dist is a normalized representation of how far away the point is from it's neighbors
		// (normalized by the radius)
		const pdx = thisPoint.point.x - prevPoint.point.x
		const pdy = thisPoint.point.y - prevPoint.point.y
		const ndx = nextPoint.point.x - thisPoint.point.x
		const ndy = nextPoint.point.y - thisPoint.point.y
		const meanRadius = (prevPoint.radius + thisPoint.radius + nextPoint.radius) / 3
		if ((pdx * pdx + pdy * pdy + ndx * ndx + ndy * ndy) / (meanRadius * meanRadius) < 1.5) {
			// if this point is kinda close to its neighbors and it has a reasonably
			// acute angle, it's probably a hard elbow
			currentPartition.push(thisPoint)
			result.push(cleanUpPartition(currentPartition, currentAnchor))
			currentPartition = [thisPoint]
			currentAnchor = null
			continue
		}
	}
	currentPartition.push(points[points.length - 1])
	result.push(cleanUpPartition(currentPartition, currentAnchor))

	return result
}

function cleanUpPartition(partition: StrokePoint[], vectorAnchor: VecLike | null): Partition {
	// clean up start of partition (remove points that are too close to the start)
	const startPoint = partition[0]
	let nextPoint: StrokePoint
	while (partition.length > 2) {
		nextPoint = partition[1]
		const dx = startPoint.point.x - nextPoint.point.x
		const dy = startPoint.point.y - nextPoint.point.y
		if (dx * dx + dy * dy < (((startPoint.radius + nextPoint.radius) / 2) * 0.5) ** 2) {
			// The surviving second point's vector keeps pointing at the spliced-out point.
			vectorAnchor = partition.splice(1, 1)[0].point
		} else {
			break
		}
	}
	// clean up end of partition in the same fashion
	const endPoint = partition[partition.length - 1]
	let prevPoint: StrokePoint
	while (partition.length > 2) {
		prevPoint = partition[partition.length - 2]
		const dx = endPoint.point.x - prevPoint.point.x
		const dy = endPoint.point.y - prevPoint.point.y
		if (dx * dx + dy * dy < (((endPoint.radius + prevPoint.radius) / 2) * 0.5) ** 2) {
			partition.splice(partition.length - 2, 1)
		} else {
			break
		}
	}
	return { points: partition, vectorAnchor }
}

function writeCirclePath(cx: number, cy: number, r: number) {
	const ncx = toCenti(cx)
	const ncy = toCenti(cy)
	const nr = toCenti(r)
	writeStr('M ')
	writeC(ncx)
	writeStr(' ')
	writeC(ncy)
	writeStr(' m -')
	writeC(nr)
	writeStr(', 0 a ')
	writeC(nr)
	writeStr(',')
	writeC(nr)
	writeStr(' 0 1,1 ')
	writeC(nr * 2)
	writeStr(',0 a ')
	writeC(nr)
	writeStr(',')
	writeC(nr)
	writeStr(' 0 1,1 -')
	writeC(nr * 2)
	writeStr(',0')
}

/** Append an arc from the current position to the cap's other side: `a r,r 0 0 1 dx,dy`. */
function writeCapArc(nr: number, dx: number, dy: number) {
	writeStr('a')
	writeC(nr)
	writeStr(',')
	writeC(nr)
	writeStr(' 0 0 1 ')
	writeCPair(dx, dy)
}

function renderPartition(partition: Partition, options: StrokeOptions = {}): void {
	const strokePoints = partition.points
	if (strokePoints.length === 0) return
	if (strokePoints.length === 1) {
		writeCirclePath(strokePoints[0].point.x, strokePoints[0].point.y, strokePoints[0].radius)
		return
	}

	const { left, right } = getStrokeOutlineTracks(
		strokePoints,
		options,
		partition.vectorAnchor ?? undefined
	)

	// Current position in integer hundredths; all subsequent commands are relative.
	let cx = toCenti(left[0].x)
	let cy = toCenti(left[0].y)
	writeStr('M')
	writeCPair(cx, cy)
	writeStr('t')

	// draw left track, as quadratic curves through the midpoints of consecutive points
	let prev = left[0]
	for (let i = 1; i < left.length; i++) {
		const pt = left[i]
		const mx = Math.round((prev.x + pt.x) * 50)
		const my = Math.round((prev.y + pt.y) * 50)
		writeCPair(mx - cx, my - cy)
		cx = mx
		cy = my
		prev = pt
	}
	// draw end cap arc
	{
		const point = strokePoints[strokePoints.length - 1]
		const radius = point.radius
		// The cap vector points from the last point back at its nearest neighbor.
		const penultimate = strokePoints[strokePoints.length - 2]
		const vdx = penultimate.point.x - point.point.x
		const vdy = penultimate.point.y - point.point.y
		const vlen = Math.sqrt(vdx * vdx + vdy * vdy)
		// direction = vector.per().neg()
		const dx = (-vdy / vlen) * radius
		const dy = (vdx / vlen) * radius
		const asx = toCenti(point.point.x + dx)
		const asy = toCenti(point.point.y + dy)
		const aex = toCenti(point.point.x - dx)
		const aey = toCenti(point.point.y - dy)
		writeCPair(asx - cx, asy - cy)
		writeCapArc(toCenti(radius), aex - asx, aey - asy)
		writeStr('t')
		cx = aex
		cy = aey
	}
	// draw right track in reverse, also as quadratic curves through midpoints
	prev = right[right.length - 1]
	for (let i = right.length - 2; i >= 0; i--) {
		const pt = right[i]
		const mx = Math.round((prev.x + pt.x) * 50)
		const my = Math.round((prev.y + pt.y) * 50)
		writeCPair(mx - cx, my - cy)
		cx = mx
		cy = my
		prev = pt
	}
	// draw start cap arc
	{
		const point = strokePoints[0]
		const radius = point.radius
		// The cap vector points from the first point back past its nearest neighbor.
		const second = strokePoints[1]
		const vdx = point.point.x - second.point.x
		const vdy = point.point.y - second.point.y
		const vlen = Math.sqrt(vdx * vdx + vdy * vdy)
		// direction = vector.per()
		const dx = (vdy / vlen) * radius
		const dy = (-vdx / vlen) * radius
		const asx = toCenti(point.point.x + dx)
		const asy = toCenti(point.point.y + dy)
		const aex = toCenti(point.point.x - dx)
		const aey = toCenti(point.point.y - dy)
		writeCPair(asx - cx, asy - cy)
		writeCapArc(toCenti(radius), aex - asx, aey - asy)
		writeStr('Z')
	}
}
