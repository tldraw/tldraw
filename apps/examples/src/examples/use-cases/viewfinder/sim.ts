import { Creature, FIELD, World } from './game-state'

// Movement tuning, in page units per tick. The whole game is two rules:
// everyone wanders idly, and Wally flees the viewfinder. Everything else
// (herding him into a corner, the panic when you close in) emerges from these.
const WANDER = 0.06 // idle steering acceleration
const DAMP = 0.94 // velocity decay, keeps wander gentle
const MAX_SPEED = 1.6 // cap for ordinary creatures
const WALLY_MAX_SPEED = 2.4 // Wally can bolt a little faster than the crowd

// Wally only panics once the viewfinder is closing in. Far away he wanders like
// everyone else, so you have to spot him before he knows he's being watched.
const FLEE_RADIUS = 360 // page units
const FLEE_FORCE = 0.9
const WALLY_PANIC_SPEED = 4.6 // top speed when nearly framed

// Wally only reacts to the viewfinder once you're zoomed in this far. Otherwise
// a player could just zoom way out, sweep the centre across the field, and spot
// the one creature that bolts — so when zoomed out he wanders like everyone else.
const FLEE_ZOOM = 1.1

function clampSpeed(c: Creature, max: number) {
	const speed = Math.hypot(c.vx, c.vy)
	if (speed > max) {
		c.vx = (c.vx / speed) * max
		c.vy = (c.vy / speed) * max
	}
}

// Bounce off the field edges so nobody escapes — and so a cornered Wally has
// nowhere left to run.
function bounce(c: Creature) {
	if (c.x < 20) {
		c.x = 20
		c.vx = Math.abs(c.vx)
	} else if (c.x > FIELD.w - 20) {
		c.x = FIELD.w - 20
		c.vx = -Math.abs(c.vx)
	}
	if (c.y < 20) {
		c.y = 20
		c.vy = Math.abs(c.vy)
	} else if (c.y > FIELD.h - 20) {
		c.y = FIELD.h - 20
		c.vy = -Math.abs(c.vy)
	}
}

// Advance the world by one tick. `focus` is the viewfinder centre in page space
// (the centre of the screen): the point Wally runs from. `frameHalf` is the
// half-size of the viewfinder in page units, so the sim knows when he's *almost*
// framed and should freak out.
export function stepWorld(
	world: World,
	focus: { x: number; y: number },
	frameHalf: number,
	zoom: number,
	time: number
) {
	if (world.found) return

	// Below the flee zoom, Wally is just another wanderer — invisible in the crowd.
	const alert = zoom >= FLEE_ZOOM

	for (const c of world.creatures) {
		// Idle wander: a smooth, seed-offset drift so each creature meanders on
		// its own path rather than twitching randomly.
		c.vx += Math.cos(time * 0.6 + c.seed) * WANDER
		c.vy += Math.sin(time * 0.5 + c.seed * 1.7) * WANDER

		let maxSpeed = MAX_SPEED
		if (c.isWally && alert) {
			const dx = c.x - focus.x
			const dy = c.y - focus.y
			const d = Math.hypot(dx, dy) || 0.0001
			maxSpeed = WALLY_MAX_SPEED

			if (d < FLEE_RADIUS) {
				// Closer viewfinder => stronger radial flee.
				const force = (FLEE_FORCE * (FLEE_RADIUS - d)) / FLEE_RADIUS
				c.vx += (dx / d) * force
				c.vy += (dy / d) * force
			}

			// "Almost framed": he's inside roughly 1x–2.5x the viewfinder but not
			// caught. Chebyshev distance matches the square reticle.
			const inset = Math.max(Math.abs(dx), Math.abs(dy)) / frameHalf
			c.panic = inset <= 1 ? 1 : Math.max(0, 1 - (inset - 1) / 1.5)

			if (c.panic > 0) {
				// He dodges sideways so he keeps squirting out of the corner of the
				// frame — but gently, and slowly enough to read rather than vibrate.
				const tx = -dy / d
				const ty = dx / d
				const flip = Math.sin(time * 3.5 + c.seed * 5)
				const juke = c.panic * 0.7 * flip
				c.vx += tx * juke
				c.vy += ty * juke
				// The closer the viewfinder, the harder he bolts: acceleration ramps
				// with panic^2, so he surges away just as you're about to catch him.
				const surge = c.panic * c.panic * 1.6
				c.vx += (dx / d) * surge
				c.vy += (dy / d) * surge
				// Speed cap also climbs with proximity.
				maxSpeed = WALLY_MAX_SPEED + (WALLY_PANIC_SPEED - WALLY_MAX_SPEED) * c.panic
			}

			c.wobble += 0.4 + c.panic * 1.2
		} else if (c.isWally) {
			// Zoomed out (or not yet alert): drop the panic so he stops flailing and
			// blends back into the crowd.
			c.panic = 0
		}

		c.vx *= DAMP
		c.vy *= DAMP
		clampSpeed(c, maxSpeed)

		c.x += c.vx
		c.y += c.vy
		bounce(c)
	}
}
