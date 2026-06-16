export interface Vec2 {
	x: number
	y: number
}

// The player is always an upright box.
export interface Box {
	x: number
	y: number
	w: number
	h: number
}

// A collider is the page-space outline of any shape that isn't the player. We
// keep the full polygon (not just a bounding box) so the player can land on and
// slide down rotated shapes.
export interface Collider {
	vertices: Vec2[]
}

export type Facing = 'left' | 'right'

export interface PlayerInput {
	left: boolean
	right: boolean
	jump: boolean
}

export interface PlayerMotion {
	// The full velocity persists between frames now: gravity feeds `vy`, and the
	// horizontal `vx` carries momentum so a player keeps sliding down a slope
	// after we've redirected their fall along the surface.
	vx: number
	vy: number
	grounded: boolean
}

export const PLATFORMER_PHYSICS = {
	// page units per second
	moveSpeed: 360,
	// page units per second, per second
	gravity: 2400,
	// initial upward speed of a jump
	jumpSpeed: 820,
	// terminal velocity, so a long fall can't tunnel straight through the floor
	maxFallSpeed: 2000,
	// Horizontal speed kept per frame while standing still on flat ground; below
	// this much it snaps to zero for a clean stop. Slopes ignore this (gravity
	// keeps re-feeding the slide), so only flat ground actually brakes.
	groundFriction: 0.6,
	// A contact normal counts as standable ground when it points up by at least
	// this much (1 = straight up). 0.5 ≈ slopes up to 60°.
	standableUp: 0.5,
	// ...and as flat-enough-to-brake ground when it points up by at least this
	// much, so the player rests on flat ground but slides on anything tilted.
	flatUp: 0.95,
	// Resolve passes per tick. A few passes settle corners and stacked contacts
	// without leaving the player jittering between two colliders.
	resolveIterations: 4,
}

export interface StepResult {
	box: Box
	vx: number
	vy: number
	grounded: boolean
	facing: Facing | null
}

// Advance the player by `dt` seconds: apply input and gravity, move, then push
// out of every collider along its surface normal. Cancelling only the
// into-surface part of the velocity is what turns a fall into a slide.
export function stepPlayer(
	player: Box,
	motion: PlayerMotion,
	input: PlayerInput,
	colliders: Collider[],
	dt: number
): StepResult {
	const box: Box = { ...player }
	let vx = motion.vx
	let vy = motion.vy
	let facing: Facing | null = null

	// A jump takes off when we were standing on something last frame.
	if (input.jump && motion.grounded) {
		vy = -PLATFORMER_PHYSICS.jumpSpeed
	}

	// Holding a direction sets the horizontal speed outright (tight controls);
	// with no key held we keep whatever momentum we have, so slides continue.
	if (input.left) {
		vx = -PLATFORMER_PHYSICS.moveSpeed
		facing = 'left'
	} else if (input.right) {
		vx = PLATFORMER_PHYSICS.moveSpeed
		facing = 'right'
	}

	// Gravity, clamped to a terminal velocity.
	vy = Math.min(vy + PLATFORMER_PHYSICS.gravity * dt, PLATFORMER_PHYSICS.maxFallSpeed)

	// Move, then resolve.
	box.x += vx * dt
	box.y += vy * dt

	let grounded = false
	// The flattest ground we're touching (most upward normal), so we know whether
	// to brake (flat) or let the player slide (tilted).
	let groundUp = 0
	for (let pass = 0; pass < PLATFORMER_PHYSICS.resolveIterations; pass++) {
		for (const collider of colliders) {
			const hit = collide(box, collider.vertices)
			if (!hit) continue
			// Push out of the surface.
			box.x += hit.nx * hit.depth
			box.y += hit.ny * hit.depth
			// Remove only the velocity heading into the surface; the part running
			// along it is kept, which is the slide.
			const into = vx * hit.nx + vy * hit.ny
			if (into < 0) {
				vx -= into * hit.nx
				vy -= into * hit.ny
			}
			// In page space y points down, so an upward normal has negative y.
			const up = -hit.ny
			if (up > PLATFORMER_PHYSICS.standableUp) {
				grounded = true
				groundUp = Math.max(groundUp, up)
			}
		}
	}

	// Brake to a stop on flat ground when there's no input. On a slope we skip
	// this so gravity can keep the player sliding.
	if (grounded && groundUp > PLATFORMER_PHYSICS.flatUp && !input.left && !input.right) {
		vx *= PLATFORMER_PHYSICS.groundFriction
		if (Math.abs(vx) < 1) vx = 0
	}

	return { box, vx, vy, grounded, facing }
}

// Separating Axis Theorem between the upright player box and a convex polygon.
// Returns the minimum push-out normal and depth, or null if they don't overlap.
// It's exact for convex shapes (rectangles, rotated rectangles, triangles) and
// a close approximation for the many-sided polygons tldraw uses for ellipses.
function collide(box: Box, poly: Vec2[]): { nx: number; ny: number; depth: number } | null {
	const boxVerts: Vec2[] = [
		{ x: box.x, y: box.y },
		{ x: box.x + box.w, y: box.y },
		{ x: box.x + box.w, y: box.y + box.h },
		{ x: box.x, y: box.y + box.h },
	]

	// Candidate separating axes: the box's two axes plus every polygon edge normal.
	const axes: Vec2[] = [
		{ x: 1, y: 0 },
		{ x: 0, y: 1 },
	]
	for (let i = 0; i < poly.length; i++) {
		const a = poly[i]
		const b = poly[(i + 1) % poly.length]
		const ex = b.x - a.x
		const ey = b.y - a.y
		const len = Math.hypot(ex, ey)
		if (len === 0) continue
		axes.push({ x: -ey / len, y: ex / len })
	}

	let minOverlap = Infinity
	let nx = 0
	let ny = 0
	for (const axis of axes) {
		const a = project(boxVerts, axis)
		const b = project(poly, axis)
		const overlap = Math.min(a.max, b.max) - Math.max(a.min, b.min)
		if (overlap <= 0) return null // found a gap — no collision
		if (overlap < minOverlap) {
			minOverlap = overlap
			nx = axis.x
			ny = axis.y
		}
	}

	// Point the normal from the polygon toward the player so we push out, not in.
	const polyCenter = centroid(poly)
	const boxCenterX = box.x + box.w / 2
	const boxCenterY = box.y + box.h / 2
	if ((boxCenterX - polyCenter.x) * nx + (boxCenterY - polyCenter.y) * ny < 0) {
		nx = -nx
		ny = -ny
	}

	return { nx, ny, depth: minOverlap }
}

function project(verts: Vec2[], axis: Vec2) {
	let min = Infinity
	let max = -Infinity
	for (const v of verts) {
		const p = v.x * axis.x + v.y * axis.y
		if (p < min) min = p
		if (p > max) max = p
	}
	return { min, max }
}

function centroid(verts: Vec2[]): Vec2 {
	let x = 0
	let y = 0
	for (const v of verts) {
		x += v.x
		y += v.y
	}
	return { x: x / verts.length, y: y / verts.length }
}
