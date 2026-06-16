// The level is made of ordinary tldraw shapes, so a "collider" is just the
// page-space bounding box of any shape that isn't the player we're simulating.
export interface Box {
	x: number
	y: number
	w: number
	h: number
}

export type Facing = 'left' | 'right'

export interface PlayerInput {
	left: boolean
	right: boolean
	jump: boolean
}

export interface PlayerMotion {
	// Only vertical velocity needs to persist between frames — horizontal speed
	// is read straight from the keys each tick. `grounded` is remembered so a
	// jump can only take off from the ground.
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
}

// Treat touching-but-not-overlapping as "not colliding". Without this, a player
// resting exactly on the floor would be considered inside it during the
// horizontal pass and get shoved sideways out of the ground.
const EPSILON = 0.01

function intersects(a: Box, b: Box) {
	return (
		a.x + a.w > b.x + EPSILON &&
		b.x + b.w > a.x + EPSILON &&
		a.y + a.h > b.y + EPSILON &&
		b.y + b.h > a.y + EPSILON
	)
}

export interface StepResult {
	box: Box
	vy: number
	grounded: boolean
	facing: Facing | null
}

// Advance the player by `dt` seconds. We resolve one axis at a time — move
// horizontally and push out of anything we hit, then move vertically and do the
// same. Resolving the axes separately is the classic way to get dependable
// platformer collisions out of axis-aligned boxes.
export function stepPlayer(
	player: Box,
	motion: PlayerMotion,
	input: PlayerInput,
	colliders: Box[],
	dt: number
): StepResult {
	const box: Box = { ...player }
	let vy = motion.vy
	let facing: Facing | null = null

	// A jump only takes off when we were standing on something last frame.
	if (input.jump && motion.grounded) {
		vy = -PLATFORMER_PHYSICS.jumpSpeed
	}

	// Horizontal speed comes straight from the keys — no momentum keeps the
	// controls feeling tight.
	let vx = 0
	if (input.left) {
		vx -= PLATFORMER_PHYSICS.moveSpeed
		facing = 'left'
	}
	if (input.right) {
		vx += PLATFORMER_PHYSICS.moveSpeed
		facing = 'right'
	}

	// Gravity, clamped to a terminal velocity.
	vy = Math.min(vy + PLATFORMER_PHYSICS.gravity * dt, PLATFORMER_PHYSICS.maxFallSpeed)

	// --- horizontal pass ---
	box.x += vx * dt
	for (const c of colliders) {
		if (!intersects(box, c)) continue
		if (vx > 0) {
			box.x = c.x - box.w
		} else if (vx < 0) {
			box.x = c.x + c.w
		} else {
			// A collider was dragged sideways into a stationary player — pop us
			// out whichever side is closer.
			const pushLeft = box.x + box.w - c.x
			const pushRight = c.x + c.w - box.x
			box.x = pushLeft < pushRight ? c.x - box.w : c.x + c.w
		}
	}

	// --- vertical pass ---
	box.y += vy * dt
	let grounded = false
	for (const c of colliders) {
		if (!intersects(box, c)) continue
		if (vy > 0) {
			// Falling onto something: land on top of it.
			box.y = c.y - box.h
			vy = 0
			grounded = true
		} else if (vy < 0) {
			// Rising into something: bonk our head and start coming back down.
			box.y = c.y + c.h
			vy = 0
		} else {
			// A collider was dragged vertically into a stationary player.
			const pushUp = box.y + box.h - c.y
			const pushDown = c.y + c.h - box.y
			if (pushUp < pushDown) {
				box.y = c.y - box.h
				grounded = true
			} else {
				box.y = c.y + c.h
			}
		}
	}

	return { box, vy, grounded, facing }
}
