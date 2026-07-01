import { Vec } from 'tldraw'

/** A round asteroid in world space. */
export interface Asteroid {
	x: number
	y: number
	r: number
}

/** A background star in world space. */
export interface Star {
	x: number
	y: number
	size: number
}

/** The ship's collision radius. Tiny, so the cursor tip reaches right up to a rock. */
export const SHIP_RADIUS = 3

// World units per procedural cell. Each cell independently decides whether it
// holds an asteroid, so the field is infinite in every direction.
const CELL = 300
const ASTEROID_CHANCE = 0.5
const R_MIN = 26
const R_MAX = 78
// Keep a clear pocket around the launch point (world origin) so you don't spawn
// inside a rock.
const SPAWN_CLEAR = 300

const STAR_CELL = 64

/**
 * A numeric seed from the room id (fnv-1a). Everyone in a sync room passes the
 * same room id, so everyone generates the identical asteroid field and starfield.
 */
export function spaceSeed(roomId: string): number {
	let h = 2166136261 >>> 0
	for (let i = 0; i < roomId.length; i++) {
		h ^= roomId.charCodeAt(i)
		h = Math.imul(h, 16777619)
	}
	return h >>> 0
}

// Hash three integers into a well-mixed uint32 — the deterministic dice roll for
// a single procedural cell.
function hash3(a: number, b: number, c: number): number {
	let h = (a ^ 0x9e3779b9) >>> 0
	h = Math.imul(h ^ b, 2654435761)
	h = Math.imul(h ^ c, 2246822519)
	h ^= h >>> 13
	h = Math.imul(h, 3266489917)
	h ^= h >>> 16
	return h >>> 0
}

/** Every asteroid whose cell overlaps the given world bounds. */
export function asteroidsInBounds(
	minX: number,
	minY: number,
	maxX: number,
	maxY: number,
	seed: number
): Asteroid[] {
	const out: Asteroid[] = []
	const cx0 = Math.floor(minX / CELL) - 1
	const cx1 = Math.floor(maxX / CELL) + 1
	const cy0 = Math.floor(minY / CELL) - 1
	const cy1 = Math.floor(maxY / CELL) + 1
	for (let cx = cx0; cx <= cx1; cx++) {
		for (let cy = cy0; cy <= cy1; cy++) {
			if (hash3(cx, cy, seed) / 0x100000000 > ASTEROID_CHANCE) continue
			// A second, independent hash places and sizes the rock within its cell.
			const g = hash3(cx, cy, seed ^ 0x85ebca6b)
			const x = (cx + 0.2 + ((g & 0xff) / 255) * 0.6) * CELL
			const y = (cy + 0.2 + (((g >>> 8) & 0xff) / 255) * 0.6) * CELL
			if (x * x + y * y < SPAWN_CLEAR * SPAWN_CLEAR) continue
			const r = R_MIN + (((g >>> 16) & 0xff) / 255) * (R_MAX - R_MIN)
			out.push({ x, y, r })
		}
	}
	return out
}

/** Every background star whose cell overlaps the given world bounds. */
export function starsInBounds(
	minX: number,
	minY: number,
	maxX: number,
	maxY: number,
	seed: number
): Star[] {
	const out: Star[] = []
	const cx0 = Math.floor(minX / STAR_CELL)
	const cx1 = Math.floor(maxX / STAR_CELL)
	const cy0 = Math.floor(minY / STAR_CELL)
	const cy1 = Math.floor(maxY / STAR_CELL)
	for (let cx = cx0; cx <= cx1; cx++) {
		for (let cy = cy0; cy <= cy1; cy++) {
			const h = hash3(cx, cy, seed ^ 0xc2b2ae35)
			// Only some cells hold a star, so the field isn't a perfect grid.
			if ((h & 0xff) < 150) continue
			const x = (cx + ((h >>> 8) & 0xff) / 255) * STAR_CELL
			const y = (cy + ((h >>> 16) & 0xff) / 255) * STAR_CELL
			const size = 0.5 + (((h >>> 24) & 0xff) / 255) * 1.4
			out.push({ x, y, size })
		}
	}
	return out
}

/**
 * Advance the ship from `from` toward `to`, sliding around asteroids instead of
 * entering them. Substepped so a fast flick can't tunnel through a rock, and each
 * step pushes the ship back out along the surface normal — which keeps the
 * tangential motion, so you skim around a rock rather than sticking to it.
 */
export function moveShip(from: Vec, to: Vec, asteroids: Asteroid[]): Vec {
	let px = from.x
	let py = from.y
	const dx = to.x - from.x
	const dy = to.y - from.y
	const dist = Math.hypot(dx, dy)
	const steps = Math.max(1, Math.ceil(dist / (SHIP_RADIUS + 6)))
	const sx = dx / steps
	const sy = dy / steps
	for (let i = 0; i < steps; i++) {
		px += sx
		py += sy
		// A couple of relaxation passes settle the ship when two rocks overlap it.
		for (let iter = 0; iter < 2; iter++) {
			for (const a of asteroids) {
				const ox = px - a.x
				const oy = py - a.y
				const minD = a.r + SHIP_RADIUS
				const d2 = ox * ox + oy * oy
				if (d2 < minD * minD) {
					const d = Math.sqrt(d2) || 0.001
					const k = (minD - d) / d
					px += ox * k
					py += oy * k
				}
			}
		}
	}
	return new Vec(px, py)
}
