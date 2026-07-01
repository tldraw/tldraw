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

// The sun sits at the world origin.
export const SUN_RADIUS = 46
/** Drift within this of the sun's center and you're gone. */
export const SUN_KILL_RADIUS = 42
/** A fresh ship starts out here, in the safe ring. */
export const SPAWN = new Vec(0, 380)

// The asteroid belt is a thick ring wall at the outer edge of the arena; the safe
// ring is everything between the sun and the belt.
export const BELT_INNER = 560
export const BELT_OUTER = 780
// The orbital current carries every ship tangentially around the sun.
const CURRENT_SPEED = 2
// Gravity toward the sun: inverse-square, so it's a gentle nudge out in the ring
// and an inescapable yank once you're close.
const GRAVITY = 60000

const BELT_CELL = 82
const BELT_CHANCE = 0.85
const BELT_R_MIN = 20
const BELT_R_MAX = 52

const STAR_CELL = 64

/**
 * A numeric seed from the room id (fnv-1a). Everyone in a sync room passes the
 * same room id, so everyone generates the identical belt and starfield.
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

/**
 * The per-tick drift at a world point: the orbital current (tangential, carrying
 * you around the sun) plus the sun's gravity (inward). Holding the cursor still,
 * this is what flies you — a slow circle out in the ring, a fatal plunge near the
 * sun.
 */
export function driftAt(x: number, y: number): Vec {
	const dist = Math.hypot(x, y) || 0.001
	// Tangential current — perpendicular to the sun direction.
	const tx = (-y / dist) * CURRENT_SPEED
	const ty = (x / dist) * CURRENT_SPEED
	// Inward gravity, inverse-square.
	const g = GRAVITY / (dist * dist)
	return new Vec(tx - (x / dist) * g, ty - (y / dist) * g)
}

/** Belt asteroids overlapping the given world bounds — a dense ring wall. */
export function beltInBounds(
	minX: number,
	minY: number,
	maxX: number,
	maxY: number,
	seed: number
): Asteroid[] {
	const out: Asteroid[] = []
	const cx0 = Math.floor(minX / BELT_CELL) - 1
	const cx1 = Math.floor(maxX / BELT_CELL) + 1
	const cy0 = Math.floor(minY / BELT_CELL) - 1
	const cy1 = Math.floor(maxY / BELT_CELL) + 1
	for (let cx = cx0; cx <= cx1; cx++) {
		for (let cy = cy0; cy <= cy1; cy++) {
			if (hash3(cx, cy, seed) / 0x100000000 > BELT_CHANCE) continue
			const g = hash3(cx, cy, seed ^ 0x85ebca6b)
			const x = (cx + 0.15 + ((g & 0xff) / 255) * 0.7) * BELT_CELL
			const y = (cy + 0.15 + (((g >>> 8) & 0xff) / 255) * 0.7) * BELT_CELL
			const dist = Math.hypot(x, y)
			if (dist < BELT_INNER || dist > BELT_OUTER) continue
			const r = BELT_R_MIN + (((g >>> 16) & 0xff) / 255) * (BELT_R_MAX - BELT_R_MIN)
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
			if ((h & 0xff) < 150) continue
			const x = (cx + ((h >>> 8) & 0xff) / 255) * STAR_CELL
			const y = (cy + ((h >>> 16) & 0xff) / 255) * STAR_CELL
			const size = 0.5 + (((h >>> 24) & 0xff) / 255) * 1.4
			out.push({ x, y, size })
		}
	}
	return out
}
