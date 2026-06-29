// The math for a Doom-style raycaster, with two twists from the usual tutorial:
//
// 1. The world isn't a grid, it's an arbitrary set of line segments — because the
//    walls are *real tldraw shapes* the user drew (and, in multiplayer, that every
//    player shares). We read their outlines as segments and cast rays against them.
// 2. Other players are billboards — short segments turned to face the viewer — so
//    they slot straight into the same ray cast as the walls and get occluded by
//    them correctly.
//
// This file stays pure (no tldraw imports); Engine3DMultiplayerExample.tsx does the
// tldraw and sync glue.

export interface Segment {
	ax: number
	ay: number
	bx: number
	by: number
	// A tldraw colour name, carried through so the projected slice can match the
	// colour of the wall (or player) it came from.
	color: string
	// Set only when this segment is a player billboard, so a ray that hits it can be
	// attributed to that player (used for shooting).
	peerId?: string
}

export interface Player {
	x: number
	y: number
	// Unit direction vector (where the player faces).
	dirX: number
	dirY: number
	// Camera plane, perpendicular to the direction; its length sets the FOV.
	planeX: number
	planeY: number
}

export interface Input {
	forward: boolean
	back: boolean
	strafeLeft: boolean
	strafeRight: boolean
	turnLeft: boolean
	turnRight: boolean
}

// The result of casting one screen column: how far to the nearest hit (in page
// pixels) and what colour it was. dist is Infinity if the ray hit nothing. When the
// hit was a player billboard, `peerId` is set and `u` is where along the billboard
// the ray landed (0..1), which the renderer uses to draw a rounded silhouette.
export interface Column {
	dist: number
	color: string
	peerId?: string
	u?: number
}

// A single ray cast result, also carrying which player (if any) was hit and where
// along the hit segment it landed.
export interface RayHit {
	dist: number
	color: string
	peerId?: string
	u?: number
}

export const PLAYER_RADIUS = 11

export function createInput(): Input {
	return {
		forward: false,
		back: false,
		strafeLeft: false,
		strafeRight: false,
		turnLeft: false,
		turnRight: false,
	}
}

export function resetInput(input: Input) {
	input.forward = false
	input.back = false
	input.strafeLeft = false
	input.strafeRight = false
	input.turnLeft = false
	input.turnRight = false
}

export function createPlayer(x: number, y: number): Player {
	return { x, y, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66 }
}

export function rotatePlayer(p: Player, angle: number) {
	const cos = Math.cos(angle)
	const sin = Math.sin(angle)
	const dx = p.dirX
	p.dirX = dx * cos - p.dirY * sin
	p.dirY = dx * sin + p.dirY * cos
	const px = p.planeX
	p.planeX = px * cos - p.planeY * sin
	p.planeY = px * sin + p.planeY * cos
}

function distToSegment(px: number, py: number, s: Segment): number {
	const dx = s.bx - s.ax
	const dy = s.by - s.ay
	const len2 = dx * dx + dy * dy
	if (len2 === 0) return Math.hypot(px - s.ax, py - s.ay)
	let t = ((px - s.ax) * dx + (py - s.ay) * dy) / len2
	t = Math.max(0, Math.min(1, t))
	return Math.hypot(px - (s.ax + t * dx), py - (s.ay + t * dy))
}

function blocked(segments: Segment[], x: number, y: number, radius: number): boolean {
	for (const s of segments) {
		if (s.peerId) continue // players don't block movement, only walls do
		if (distToSegment(x, y, s) < radius) return true
	}
	return false
}

export function updatePlayer(p: Player, segments: Segment[], input: Input, dt: number) {
	const speed = 0.2 * dt
	const turn = 0.0015 * dt

	if (input.turnLeft) rotatePlayer(p, -turn)
	if (input.turnRight) rotatePlayer(p, turn)

	let dx = 0
	let dy = 0
	if (input.forward) {
		dx += p.dirX * speed
		dy += p.dirY * speed
	}
	if (input.back) {
		dx -= p.dirX * speed
		dy -= p.dirY * speed
	}
	if (input.strafeLeft) {
		dx -= p.planeX * speed
		dy -= p.planeY * speed
	}
	if (input.strafeRight) {
		dx += p.planeX * speed
		dy += p.planeY * speed
	}

	// Per-axis collision against the wall segments so the player slides along walls.
	if (!blocked(segments, p.x + dx, p.y, PLAYER_RADIUS)) p.x += dx
	if (!blocked(segments, p.x, p.y + dy, PLAYER_RADIUS)) p.y += dy
}

// Cast a single ray from (px, py) along (rx, ry) and return the nearest hit. Note
// (rx, ry) need not be a unit vector: when it isn't, the returned `dist` is scaled
// by its length, which is exactly the fisheye correction castColumns relies on.
export function castRay(
	px: number,
	py: number,
	rx: number,
	ry: number,
	segments: Segment[]
): RayHit {
	let best = Infinity
	let bestColor = 'grey'
	let bestPeer: string | undefined
	let bestU: number | undefined
	for (const s of segments) {
		const sx = s.bx - s.ax
		const sy = s.by - s.ay
		const denom = rx * sy - ry * sx
		if (Math.abs(denom) < 1e-9) continue // ray parallel to segment
		const qx = s.ax - px
		const qy = s.ay - py
		const t = (qx * sy - qy * sx) / denom // distance along the ray
		const u = (qx * ry - qy * rx) / denom // position along the segment
		if (t > 0.0001 && u >= 0 && u <= 1 && t < best) {
			best = t
			bestColor = s.color
			bestPeer = s.peerId
			bestU = u
		}
	}
	return { dist: best, color: bestColor, peerId: bestPeer, u: bestU }
}

// Cast `n` rays across the field of view and return the nearest hit for each.
export function castColumns(p: Player, segments: Segment[], n: number): Column[] {
	const columns: Column[] = []
	for (let i = 0; i < n; i++) {
		const cameraX = (2 * (i + 0.5)) / n - 1 // -1 at left edge, +1 at right edge
		const rx = p.dirX + p.planeX * cameraX
		const ry = p.dirY + p.planeY * cameraX
		// Because dir is a unit vector and plane is perpendicular to it, `dist` here
		// is already the perpendicular ("fisheye-corrected") distance — no cosine.
		const hit = castRay(p.x, p.y, rx, ry, segments)
		columns.push({ dist: hit.dist, color: hit.color, peerId: hit.peerId, u: hit.u })
	}
	return columns
}

// A player seen by `viewer` becomes a short segment centred on the player and
// turned to face the viewer, so it renders as an upright slab and occludes / is
// occluded by walls through the same ray cast.
export function peerBillboard(
	viewerX: number,
	viewerY: number,
	peerX: number,
	peerY: number,
	color: string,
	peerId: string,
	width = PLAYER_RADIUS * 2.4
): Segment {
	const dx = peerX - viewerX
	const dy = peerY - viewerY
	const len = Math.hypot(dx, dy) || 1
	const nx = -dy / len // unit perpendicular to the line of sight
	const ny = dx / len
	const half = width / 2
	return {
		ax: peerX - nx * half,
		ay: peerY - ny * half,
		bx: peerX + nx * half,
		by: peerY + ny * half,
		color,
		peerId,
	}
}

// If the ray from (ox, oy) along the unit vector (dx, dy) passes within `radius` of
// the point (tx, ty), return how far along the ray the closest approach is; else
// null. Used to decide whether a shot hits a player.
export function rayHitsPoint(
	ox: number,
	oy: number,
	dx: number,
	dy: number,
	tx: number,
	ty: number,
	radius: number
): number | null {
	const t = (tx - ox) * dx + (ty - oy) * dy // (dx, dy) is unit, so t is a distance
	if (t <= 0) return null // target is behind the shooter
	const cx = ox + dx * t
	const cy = oy + dy * t
	if (Math.hypot(tx - cx, ty - cy) <= radius) return t
	return null
}
