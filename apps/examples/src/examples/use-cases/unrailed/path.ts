// The track is a freeform polyline the player draws. The train follows it by
// arc-length: `trainS` is a distance along the path, and `samplePath` maps that
// distance to a point + heading so the train can sit on (and rotate with) the
// ink.

export interface PathPoint {
	x: number
	y: number
}

export interface Path {
	pts: PathPoint[]
	// cum[i] = total length from pts[0] to pts[i].
	cum: number[]
	length: number
}

function dist(a: PathPoint, b: PathPoint) {
	return Math.hypot(b.x - a.x, b.y - a.y)
}

export function makePath(pts: PathPoint[]): Path {
	const cum = [0]
	for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + dist(pts[i - 1], pts[i])
	return { pts: pts.slice(), cum, length: cum[cum.length - 1] ?? 0 }
}

/** Append points to the end of the path, dropping a near-duplicate join point. */
export function appendPath(path: Path, pts: PathPoint[]) {
	if (pts.length === 0) return
	const head = path.pts[path.pts.length - 1]
	let start = 0
	if (head && dist(head, pts[0]) < 0.01) start = 1
	for (let i = start; i < pts.length; i++) {
		const prev = path.pts[path.pts.length - 1]
		path.pts.push(pts[i])
		path.cum.push(path.cum[path.cum.length - 1] + dist(prev, pts[i]))
	}
	path.length = path.cum[path.cum.length - 1]
}

export function pathHead(path: Path): PathPoint {
	return path.pts[path.pts.length - 1]
}

export interface SampledPoint {
	x: number
	y: number
	angle: number // radians, heading of the path at this distance
}

/** Point and heading at arc-length `s` (clamped to the path). */
export function samplePath(path: Path, s: number): SampledPoint {
	const { pts, cum, length } = path
	if (pts.length === 1) return { x: pts[0].x, y: pts[0].y, angle: 0 }
	const clamped = Math.max(0, Math.min(length, s))
	// Find the segment [i, i+1] containing `clamped`.
	let i = 1
	while (i < cum.length - 1 && cum[i] < clamped) i++
	const segStart = cum[i - 1]
	const segLen = cum[i] - segStart || 1
	const t = (clamped - segStart) / segLen
	const a = pts[i - 1]
	const b = pts[i]
	return {
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
		angle: Math.atan2(b.y - a.y, b.x - a.x),
	}
}
