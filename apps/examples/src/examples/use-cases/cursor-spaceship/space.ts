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

/** A collectible fuel cell in world space; `key` identifies its procedural cell. */
export interface FuelCell {
	x: number
	y: number
	key: string
}

// The sun sits at the world origin.
export const SUN_RADIUS = 46
/** Drift within this of the sun's center and you're gone. */
export const SUN_KILL_RADIUS = 42
/** A fresh ship starts out here, in the safe ring. */
export const SPAWN = new Vec(0, 380)

// The asteroid belt is a thick lethal ring at the outer edge of the arena; the
// safe ring is everything between the sun and the belt.
export const BELT_INNER = 560
export const BELT_OUTER = 780
// The ship's collision radius. Tiny, so the cursor tip reaches right up to a rock.
const SHIP_RADIUS = 3
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

// Fuel cells are scattered through the ring, between the sun and the belt.
const FUEL_CELL = 150
const FUEL_RING_INNER = 120
const FUEL_RING_OUTER = 530

/**
 * A numeric seed from the room id (fnv-1a). Everyone in a sync room passes the
 * same room id, so everyone generates the identical belt, starfield, and fuel.
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
 * The sun's gravitational pull at a world point — inward, inverse-square. It's the
 * acceleration a coasting, engine-dead ship feels, and the inward half of the drift.
 */
export function gravityAt(x: number, y: number): Vec {
	const dist = Math.hypot(x, y) || 0.001
	const g = GRAVITY / (dist * dist)
	return new Vec((-x / dist) * g, (-y / dist) * g)
}

/**
 * The per-tick drift at a world point: the orbital current (tangential, carrying
 * you around the sun) plus the sun's gravity (inward). Holding the cursor still,
 * this is what flies you — a slow circle out in the ring, a fatal plunge near the
 * sun.
 */
export function driftAt(x: number, y: number): Vec {
	const dist = Math.hypot(x, y) || 0.001
	const grav = gravityAt(x, y)
	return new Vec((-y / dist) * CURRENT_SPEED + grav.x, (x / dist) * CURRENT_SPEED + grav.y)
}

/**
 * A jagged rock silhouette for an asteroid — `points` unit offsets from its center
 * (radius 0.64–1 of the asteroid's, with the spokes angled irregularly so the
 * corners come out sharp). Deterministic from the asteroid position, so everyone
 * sees the same rock and it doesn't shimmer frame to frame.
 */
export function asteroidShape(a: Asteroid, points: number): Vec[] {
	const ax = Math.round(a.x)
	const ay = Math.round(a.y)
	const out: Vec[] = []
	for (let i = 0; i < points; i++) {
		const h = hash3(ax, ay, i)
		const rad = 0.64 + ((h & 0xff) / 255) * 0.36
		const jitter = (((h >>> 8) & 0xff) / 255 - 0.5) * ((Math.PI / points) * 1.1)
		const ang = (i / points) * Math.PI * 2 + jitter
		out.push(new Vec(Math.cos(ang) * rad, Math.sin(ang) * rad))
	}
	return out
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

/** True if a ship at this world point is touching the belt (or past its outer edge). */
export function hitsBelt(x: number, y: number, seed: number): boolean {
	const dist = Math.hypot(x, y)
	if (dist > BELT_OUTER) return true
	if (dist < BELT_INNER - 70) return false
	for (const a of beltInBounds(x - 80, y - 80, x + 80, y + 80, seed)) {
		if (Math.hypot(x - a.x, y - a.y) < a.r + SHIP_RADIUS) return true
	}
	return false
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

/** Every fuel cell whose cell overlaps the given world bounds (scattered in the ring). */
export function fuelCellsInBounds(
	minX: number,
	minY: number,
	maxX: number,
	maxY: number,
	seed: number
): FuelCell[] {
	const out: FuelCell[] = []
	const cx0 = Math.floor(minX / FUEL_CELL) - 1
	const cx1 = Math.floor(maxX / FUEL_CELL) + 1
	const cy0 = Math.floor(minY / FUEL_CELL) - 1
	const cy1 = Math.floor(maxY / FUEL_CELL) + 1
	for (let cx = cx0; cx <= cx1; cx++) {
		for (let cy = cy0; cy <= cy1; cy++) {
			const h = hash3(cx, cy, seed ^ 0x27d4eb2f)
			if ((h & 0xff) > 96) continue // ~38% of cells hold fuel
			const x = (cx + 0.2 + (((h >>> 8) & 0xff) / 255) * 0.6) * FUEL_CELL
			const y = (cy + 0.2 + (((h >>> 16) & 0xff) / 255) * 0.6) * FUEL_CELL
			const dist = Math.hypot(x, y)
			if (dist < FUEL_RING_INNER || dist > FUEL_RING_OUTER) continue
			out.push({ x, y, key: `${cx},${cy}` })
		}
	}
	return out
}
