// Hardcoded enemy path. Page-space waypoints; enemies move along it from start
// to end. Kept simple so the OverlayUtil mechanics, not the routing, are the
// point of the example.

export interface Waypoint {
	x: number
	y: number
}

export const PATH: Waypoint[] = [
	{ x: -200, y: 200 },
	{ x: 200, y: 200 },
	{ x: 200, y: 500 },
	{ x: 600, y: 500 },
	{ x: 600, y: 100 },
	{ x: 1000, y: 100 },
	{ x: 1000, y: 600 },
	{ x: 1400, y: 600 },
]

const SEGMENT_LENGTHS: number[] = []
let TOTAL_LENGTH = 0
for (let i = 1; i < PATH.length; i++) {
	const dx = PATH[i].x - PATH[i - 1].x
	const dy = PATH[i].y - PATH[i - 1].y
	const len = Math.hypot(dx, dy)
	SEGMENT_LENGTHS.push(len)
	TOTAL_LENGTH += len
}

export const PATH_LENGTH = TOTAL_LENGTH

export interface PointOnPath {
	x: number
	y: number
	angle: number
}

export function getPositionAtDistance(distance: number): PointOnPath {
	if (distance <= 0) {
		const a = PATH[0]
		const b = PATH[1]
		return { x: a.x, y: a.y, angle: Math.atan2(b.y - a.y, b.x - a.x) }
	}
	let remaining = distance
	for (let i = 0; i < SEGMENT_LENGTHS.length; i++) {
		const segLen = SEGMENT_LENGTHS[i]
		if (remaining <= segLen) {
			const a = PATH[i]
			const b = PATH[i + 1]
			const t = remaining / segLen
			return {
				x: a.x + (b.x - a.x) * t,
				y: a.y + (b.y - a.y) * t,
				angle: Math.atan2(b.y - a.y, b.x - a.x),
			}
		}
		remaining -= segLen
	}
	const last = PATH[PATH.length - 1]
	const prev = PATH[PATH.length - 2]
	return { x: last.x, y: last.y, angle: Math.atan2(last.y - prev.y, last.x - prev.x) }
}
