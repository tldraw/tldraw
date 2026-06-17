export interface Vec2 {
	x: number
	y: number
}

// Both the player and every obstacle are passed in as convex polygons of
// page-space points, so the player collides with each shape's real outline —
// including its own, once it's been rotated.
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
	// The full velocity persists between frames: gravity feeds `vy`, and `vx`
	// carries momentum so a player keeps sliding down a slope after we've
	// redirected their fall along the surface.
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
	// A contact normal counts as standable ground when it points up by at least
	// this much (1 = straight up). 0.5 ≈ slopes up to 60°.
	standableUp: 0.5,
	// ...and as flat-enough-to-stop-on when it points up by at least this much,
	// so the player halts on flat ground but keeps sliding on anything tilted.
	flatUp: 0.95,
	// Resolve passes per tick. A few passes settle corners and stacked contacts
	// without leaving the player jittering between two colliders.
	resolveIterations: 4,
}

export interface StepResult {
	// Net page-space displacement to apply to the player this tick.
	dx: number
	dy: number
	vx: number
	vy: number
	grounded: boolean
	facing: Facing | null
}

// Advance the player by `dt` seconds: apply input and gravity, move, then push
// out of every collider along its surface normal. Cancelling only the
// into-surface part of the velocity is what turns a fall into a slide. The
// player is a polygon too, so a rotated player collides as a rotated box.
export function stepPlayer(
	playerVertices: Vec2[],
	motion: PlayerMotion,
	input: PlayerInput,
	colliders: Collider[],
	dt: number
): StepResult {
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

	// Work on a copy of the player polygon, tracking the net displacement so the
	// caller can move the shape by it.
	const verts = playerVertices.map((v) => ({ x: v.x, y: v.y }))
	let dx = 0
	let dy = 0
	const move = (tx: number, ty: number) => {
		for (const v of verts) {
			v.x += tx
			v.y += ty
		}
		dx += tx
		dy += ty
	}

	move(vx * dt, vy * dt)

	let grounded = false
	// The flattest ground we're touching (most upward normal), so we know whether
	// to stop (flat) or let the player slide (tilted).
	let groundUp = 0
	for (let pass = 0; pass < PLATFORMER_PHYSICS.resolveIterations; pass++) {
		for (const collider of colliders) {
			const hit = collide(verts, collider.vertices)
			if (!hit) continue
			// Push out of the surface.
			move(hit.nx * hit.depth, hit.ny * hit.depth)
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

	// Stop dead on flat ground when there's no input — no icy glide. On a slope
	// we skip this so gravity keeps the player sliding.
	if (grounded && groundUp > PLATFORMER_PHYSICS.flatUp && !input.left && !input.right) {
		vx = 0
	}

	return { dx, dy, vx, vy, grounded, facing }
}

// Separating Axis Theorem between two convex polygons. Returns the minimum
// push-out normal (pointing from `b` toward `a`) and depth, or null if they
// don't overlap. Exact for convex shapes (rectangles, rotated rectangles,
// triangles), a close approximation for the many-sided polygons tldraw uses for
// ellipses, and rough for concave shapes.
function collide(a: Vec2[], b: Vec2[]): { nx: number; ny: number; depth: number } | null {
	const axes = [...edgeNormals(a), ...edgeNormals(b)]
	let minOverlap = Infinity
	let nx = 0
	let ny = 0
	for (const axis of axes) {
		const pa = project(a, axis)
		const pb = project(b, axis)
		const overlap = Math.min(pa.max, pb.max) - Math.max(pa.min, pb.min)
		if (overlap <= 0) return null // found a gap — no collision
		if (overlap < minOverlap) {
			minOverlap = overlap
			nx = axis.x
			ny = axis.y
		}
	}

	// Point the normal from b toward a so we push the player out, not in.
	const ca = centroid(a)
	const cb = centroid(b)
	if ((ca.x - cb.x) * nx + (ca.y - cb.y) * ny < 0) {
		nx = -nx
		ny = -ny
	}

	return { nx, ny, depth: minOverlap }
}

function edgeNormals(verts: Vec2[]): Vec2[] {
	const normals: Vec2[] = []
	for (let i = 0; i < verts.length; i++) {
		const a = verts[i]
		const b = verts[(i + 1) % verts.length]
		const ex = b.x - a.x
		const ey = b.y - a.y
		const len = Math.hypot(ex, ey)
		if (len === 0) continue
		normals.push({ x: -ey / len, y: ex / len })
	}
	return normals
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
