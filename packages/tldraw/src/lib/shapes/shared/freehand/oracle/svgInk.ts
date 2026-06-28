import { VecLike, assert } from '@tldraw/editor'
import { StrokeOptions } from '../types'
import {
	computeRadii,
	ingest,
	inputX,
	inputY,
	loadSrcFromPipeline,
	loadSrcPartition,
	pointCount,
	pointX,
	pointY,
	radii,
	srcCount,
	srcRadius,
	srcX,
	srcY,
} from './core'
import { finishPath, resetPath, toCenti, writeC, writeCPair, writeStr } from './fmt'
import {
	buildTracks,
	trackLeftCount,
	trackLeftX,
	trackLeftY,
	trackRightCount,
	trackRightX,
	trackRightY,
} from './getStrokeOutlinePoints'

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

	ingest(rawInputPoints, options)
	computeRadii(options)
	resetPath()
	partitionAtElbows(options)
	return finishPath()
}

/**
 * Walk the stroke points in the pipeline buffers, cutting the stroke into partitions at
 * elbows, and render each one. Partitions are index ranges into the pipeline: each runs
 * from the previous boundary point to the next elbow. An acute elbow uses the input point
 * rather than the streamlined point at the boundary (for swooshiness in fast zaggy
 * lines), in which case the next partition's second point keeps the vector it had in the
 * uncut stroke via the vector anchor.
 */
function partitionAtElbows(options: StrokeOptions): void {
	const n = pointCount
	if (n === 0) return
	if (n <= 2) {
		loadSrcFromPipeline()
		renderPartition(options, false, 0, 0)
		return
	}

	const ptX = pointX
	const ptY = pointY
	const rads = radii

	// The start of the current partition, and whether it is an acute elbow (which reads
	// the input coordinates rather than the streamlined ones).
	let a = 0
	let aElbow = false
	let hasAnchor = false
	let anchorX = 0
	let anchorY = 0

	// Unit direction of the previous segment, computed with scalar math to avoid
	// allocating two vectors per point.
	let dx = ptX[1] - ptX[0]
	let dy = ptY[1] - ptY[0]
	let len = Math.sqrt(dx * dx + dy * dy)
	let prevVx = dx / len
	let prevVy = dy / len

	for (let i = 1; i < n - 1; i++) {
		dx = ptX[i + 1] - ptX[i]
		dy = ptY[i + 1] - ptY[i]
		len = Math.sqrt(dx * dx + dy * dy)
		const nextVx = dx / len
		const nextVy = dy / len
		const dpr = prevVx * nextVx + prevVy * nextVy
		prevVx = nextVx
		prevVy = nextVy

		if (dpr < -0.8) {
			// always treat such acute angles as elbows
			// and use the extended input point as the elbow point for swooshiness in fast zaggy lines
			finishPartition(a, aElbow, i, true, false, hasAnchor, anchorX, anchorY, options)
			a = i
			aElbow = true
			// The next partition's second point keeps the vector it had in the uncut stroke,
			// which pointed at this point's streamlined position rather than its input.
			hasAnchor = true
			anchorX = ptX[i]
			anchorY = ptY[i]
			continue
		}

		if (dpr > 0.7) {
			// Not an elbow
			continue
		}

		// so now we have a reasonably acute angle but it might not be an elbow if it's far
		// away from it's neighbors, angular dist is a normalized representation of how far away the point is from it's neighbors
		// (normalized by the radius)
		const pdx = ptX[i] - ptX[i - 1]
		const pdy = ptY[i] - ptY[i - 1]
		const ndx = ptX[i + 1] - ptX[i]
		const ndy = ptY[i + 1] - ptY[i]
		const meanRadius = (rads[i - 1] + rads[i] + rads[i + 1]) / 3
		if ((pdx * pdx + pdy * pdy + ndx * ndx + ndy * ndy) / (meanRadius * meanRadius) < 1.5) {
			// if this point is kinda close to its neighbors and it has a reasonably
			// acute angle, it's probably a hard elbow. The boundary point ends its
			// partition twice over (the object pipeline pushed it twice).
			finishPartition(a, aElbow, i, false, true, hasAnchor, anchorX, anchorY, options)
			a = i
			aElbow = false
			hasAnchor = false
			continue
		}
	}
	finishPartition(a, aElbow, n - 1, false, false, hasAnchor, anchorX, anchorY, options)
}

/**
 * Clean up a partition's ends (drop inner points too close to the boundary points), load
 * it into the track-source buffers and render it. The partition runs from boundary `a` to
 * boundary `b`; `bDup` marks a hard elbow whose end point is duplicated.
 */
function finishPartition(
	a: number,
	aElbow: boolean,
	b: number,
	bElbow: boolean,
	bDup: boolean,
	hasAnchor: boolean,
	anchorX: number,
	anchorY: number,
	options: StrokeOptions
): void {
	// The partition as the object pipeline would have built it: point a, points a+1..b-1,
	// point b (twice when bDup). Cleanup only ever removes points adjacent to the ends, so
	// it reduces to two skip counters.
	const ptX = pointX
	const ptY = pointY
	const rads = radii

	const len = b - a + 1 + (bDup ? 1 : 0)
	let s = 0
	let e = 0

	// clean up start of partition (remove points that are too close to the start)
	const startX = aElbow ? inputX[a] : ptX[a]
	const startY = aElbow ? inputY[a] : ptY[a]
	const startRadius = rads[a]
	while (len - s > 2) {
		const i = a + 1 + s
		const dx = startX - ptX[i]
		const dy = startY - ptY[i]
		if (dx * dx + dy * dy < (((startRadius + rads[i]) / 2) * 0.5) ** 2) {
			// The surviving second point's vector keeps pointing at the spliced-out point.
			hasAnchor = true
			anchorX = ptX[i]
			anchorY = ptY[i]
			s++
		} else {
			break
		}
	}

	// clean up end of partition in the same fashion
	const endX = bElbow ? inputX[b] : ptX[b]
	const endY = bElbow ? inputY[b] : ptY[b]
	const endRadius = rads[b]
	while (len - s - e > 2) {
		const i = bDup ? b - e : b - 1 - e
		const dx = endX - ptX[i]
		const dy = endY - ptY[i]
		if (dx * dx + dy * dy < (((endRadius + rads[i]) / 2) * 0.5) ** 2) {
			e++
		} else {
			break
		}
	}

	const innerStart = a + 1 + s
	const innerEnd = bDup ? b - e : b - 1 - e
	loadSrcPartition(a, aElbow, innerStart, innerEnd, b, bElbow, bDup && e === 0)
	renderPartition(options, hasAnchor, anchorX, anchorY)
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

/** Render the partition currently loaded in the track-source buffers. */
function renderPartition(
	options: StrokeOptions,
	hasAnchor: boolean,
	anchorX: number,
	anchorY: number
): void {
	const n = srcCount
	if (n === 0) return
	if (n === 1) {
		writeCirclePath(srcX[0], srcY[0], srcRadius[0])
		return
	}

	buildTracks(options, hasAnchor, anchorX, anchorY)

	const lxs = trackLeftX
	const lys = trackLeftY
	const rxs = trackRightX
	const rys = trackRightY

	// Current position in integer hundredths; all subsequent commands are relative.
	let cx = toCenti(lxs[0])
	let cy = toCenti(lys[0])
	writeStr('M')
	writeCPair(cx, cy)
	writeStr('t')

	// draw left track, as quadratic curves through the midpoints of consecutive points
	let prevX = lxs[0]
	let prevY = lys[0]
	for (let i = 1; i < trackLeftCount; i++) {
		const ptX = lxs[i]
		const ptY = lys[i]
		const mx = Math.round((prevX + ptX) * 50)
		const my = Math.round((prevY + ptY) * 50)
		writeCPair(mx - cx, my - cy)
		cx = mx
		cy = my
		prevX = ptX
		prevY = ptY
	}
	// draw end cap arc
	{
		const pointX = srcX[n - 1]
		const pointY = srcY[n - 1]
		const radius = srcRadius[n - 1]
		// The cap vector points from the last point back at its nearest neighbor.
		const vdx = srcX[n - 2] - pointX
		const vdy = srcY[n - 2] - pointY
		const vlen = Math.sqrt(vdx * vdx + vdy * vdy)
		// The arc endpoints sit one radius to each side, perpendicular to the cap vector.
		const dx = (-vdy / vlen) * radius
		const dy = (vdx / vlen) * radius
		const asx = toCenti(pointX + dx)
		const asy = toCenti(pointY + dy)
		const aex = toCenti(pointX - dx)
		const aey = toCenti(pointY - dy)
		writeCPair(asx - cx, asy - cy)
		writeCapArc(toCenti(radius), aex - asx, aey - asy)
		writeStr('t')
		cx = aex
		cy = aey
	}
	// draw right track in reverse, also as quadratic curves through midpoints
	prevX = rxs[trackRightCount - 1]
	prevY = rys[trackRightCount - 1]
	for (let i = trackRightCount - 2; i >= 0; i--) {
		const ptX = rxs[i]
		const ptY = rys[i]
		const mx = Math.round((prevX + ptX) * 50)
		const my = Math.round((prevY + ptY) * 50)
		writeCPair(mx - cx, my - cy)
		cx = mx
		cy = my
		prevX = ptX
		prevY = ptY
	}
	// draw start cap arc
	{
		const pointX = srcX[0]
		const pointY = srcY[0]
		const radius = srcRadius[0]
		// The cap vector points from the first point back past its nearest neighbor.
		const vdx = pointX - srcX[1]
		const vdy = pointY - srcY[1]
		const vlen = Math.sqrt(vdx * vdx + vdy * vdy)
		// The arc endpoints sit one radius to each side, perpendicular to the cap vector.
		const dx = (vdy / vlen) * radius
		const dy = (-vdx / vlen) * radius
		const asx = toCenti(pointX + dx)
		const asy = toCenti(pointY + dy)
		const aex = toCenti(pointX - dx)
		const aey = toCenti(pointY - dy)
		writeCPair(asx - cx, asy - cy)
		writeCapArc(toCenti(radius), aex - asx, aey - asy)
		writeStr('Z')
	}
}
