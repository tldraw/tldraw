// The renderer-agnostic geometry core, kept deliberately free of any tldraw
// imports. It models the world the same way the 3D raycaster example does — as
// an arbitrary set of 2D line segments in page space, plus a player that has a
// position *and a facing* (direction + camera plane).
//
// Why carry a facing in a top-down game? So the exact same world can later be
// rendered as a first-person view: feed these segments and this player into
// `castColumns` and you get a Doom-style column buffer for free. The top-down
// view we ship today and a future raycast view are two renderers over one
// world — this file is the shared substrate.

/** A wall as a single line segment, in page coordinates. */
export interface Segment {
	ax: number
	ay: number
	bx: number
	by: number
}

/** The player's position and facing. `dir` is a unit vector; `plane` is
 * perpendicular to it and its length sets the field of view for a raycast view. */
export interface Player {
	x: number
	y: number
	dirX: number
	dirY: number
	planeX: number
	planeY: number
}

export function createPlayer(x: number, y: number): Player {
	// Facing right by default; plane length 0.66 ≈ a 66° FOV if ever raycast.
	return { x, y, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66 }
}

/** Point this player's facing along a unit vector, keeping the camera plane
 * perpendicular and FOV-length. No-op for a zero vector. */
export function faceDirection(p: Player, dx: number, dy: number) {
	if (dx === 0 && dy === 0) return
	p.dirX = dx
	p.dirY = dy
	p.planeX = -dy * 0.66
	p.planeY = dx * 0.66
}

/** Shortest distance from a point to a segment. */
export function distToSegment(px: number, py: number, s: Segment): number {
	const dx = s.bx - s.ax
	const dy = s.by - s.ay
	const len2 = dx * dx + dy * dy
	if (len2 === 0) return Math.hypot(px - s.ax, py - s.ay)
	let t = ((px - s.ax) * dx + (py - s.ay) * dy) / len2
	t = Math.max(0, Math.min(1, t))
	return Math.hypot(px - (s.ax + t * dx), py - (s.ay + t * dy))
}

/** Would a circle of `radius` centred at (x, y) overlap any wall? */
export function blocked(segments: Segment[], x: number, y: number, radius: number): boolean {
	for (const s of segments) {
		if (distToSegment(x, y, s) < radius) return true
	}
	return false
}

/** Transform a world point into the player's camera space. `depth` is the
 * forward distance (<= 0 means behind the player); `lateral` is the sideways
 * offset along the camera plane. Used to billboard sprites (enemies, gems) into
 * a first-person view. The units match `castColumns`' `dist`, so the two can be
 * depth-compared for occlusion. */
export function projectToCamera(
	p: Player,
	x: number,
	y: number
): { lateral: number; depth: number } {
	const rx = x - p.x
	const ry = y - p.y
	// Inverse of the [plane | dir] camera basis.
	const invDet = 1 / (p.planeX * p.dirY - p.dirX * p.planeY)
	const lateral = invDet * (p.dirY * rx - p.dirX * ry)
	const depth = invDet * (-p.planeY * rx + p.planeX * ry)
	return { lateral, depth }
}

/** One screen column's worth of raycast result: distance to the nearest wall
 * (Infinity if none) and how grazing the hit was (0 head-on … 1 edge-on). */
export interface Column {
	dist: number
	faceShade: number
}

// Cast `n` rays across the field of view and return the nearest wall hit for
// each. Unused by the top-down renderer today — it's here so a first-person
// view of this same world is a drop-in, not a rewrite. (Enemies would render as
// distance-sorted billboards on top of these columns.)
export function castColumns(p: Player, segments: Segment[], n: number): Column[] {
	const columns: Column[] = []
	for (let i = 0; i < n; i++) {
		const cameraX = (2 * (i + 0.5)) / n - 1 // -1 at left edge, +1 at right edge
		const rx = p.dirX + p.planeX * cameraX
		const ry = p.dirY + p.planeY * cameraX

		let best = Infinity
		let bestSx = 0
		let bestSy = 0
		for (const s of segments) {
			const sx = s.bx - s.ax
			const sy = s.by - s.ay
			const denom = rx * sy - ry * sx
			if (Math.abs(denom) < 1e-9) continue // ray parallel to segment
			const qx = s.ax - p.x
			const qy = s.ay - p.y
			const t = (qx * sy - qy * sx) / denom // distance along the ray
			const u = (qx * ry - qy * rx) / denom // position along the segment
			if (t > 0.0001 && u >= 0 && u <= 1 && t < best) {
				best = t
				bestSx = sx
				bestSy = sy
			}
		}
		const rayLen = Math.hypot(rx, ry) || 1
		const segLen = Math.hypot(bestSx, bestSy) || 1
		const facing = Math.abs((rx * -bestSy + ry * bestSx) / (rayLen * segLen))
		columns.push({ dist: best, faceShade: 1 - facing })
	}
	return columns
}
