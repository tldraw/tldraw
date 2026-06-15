// The math for a Doom-style raycaster, with one twist from the usual tutorial:
// the world isn't a grid, it's an arbitrary set of line segments. That's because
// in the example the walls are *real tldraw shapes* the user drew — we read their
// outlines as segments and cast rays against them. This file stays pure (no
// tldraw imports); Engine3DExample.tsx does the tldraw glue.

export interface Segment {
	ax: number
	ay: number
	bx: number
	by: number
	// A tldraw colour name, carried through so the projected wall slice can match
	// the colour of the shape it came from.
	color: string
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

// The result of casting one screen column: how far to the nearest wall (in page
// pixels) and what colour it was. dist is Infinity if the ray hit nothing.
export interface Column {
	dist: number
	color: string
}

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
		if (distToSegment(x, y, s) < radius) return true
	}
	return false
}

export function updatePlayer(p: Player, segments: Segment[], input: Input, dt: number) {
	const speed = 0.2 * dt
	const turn = 0.0028 * dt

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
	const radius = 10
	if (!blocked(segments, p.x + dx, p.y, radius)) p.x += dx
	if (!blocked(segments, p.x, p.y + dy, radius)) p.y += dy
}

// Cast `n` rays across the field of view and return the nearest wall hit for each.
export function castColumns(p: Player, segments: Segment[], n: number): Column[] {
	const columns: Column[] = []
	for (let i = 0; i < n; i++) {
		const cameraX = (2 * (i + 0.5)) / n - 1 // -1 at left edge, +1 at right edge
		const rx = p.dirX + p.planeX * cameraX
		const ry = p.dirY + p.planeY * cameraX

		let best = Infinity
		let bestColor = 'grey'
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
				bestColor = s.color
			}
		}
		// Because dir is a unit vector and plane is perpendicular to it, `t` is
		// already the perpendicular ("fisheye-corrected") distance — no extra cosine.
		columns.push({ dist: best, color: bestColor })
	}
	return columns
}
