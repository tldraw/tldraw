import { atom } from 'tldraw'

// A mole emerging from a hole. `t` is seconds since it started emerging; `pop`
// is its visible height 0..1 (0 hidden, 1 fully out). `phase` is 'out' while it
// is rising / scorable and 'retreat' once it is sinking back down (after a bonk
// or a miss).
export interface Mole {
	t: number
	phase: 'out' | 'retreat'
	pop: number
}

// A fixed hole in the ground. At most one mole occupies it at a time.
export interface Hole {
	id: string
	x: number
	y: number
	mole: Mole | null
}

// A draggable block the player slides over holes. Stored as a page-space
// top-left rect, plus a velocity so it can be thrown, shoved, and collided.
export interface Block {
	id: string
	x: number
	y: number
	w: number
	h: number
	vx: number
	vy: number
}

export interface World {
	holes: Hole[]
	blocks: Block[]
	// Counts down before the next mole spawns.
	spawnTimer: number
	// The block currently held by the pointer, plus the grab offset.
	grab: { blockId: string; dx: number; dy: number } | null
}

export const HOLE_R = 46
export const MOLE_R = 30
export const MOLE_RISE = 58
// How many moles can be out at once. Two splits the player's attention and lets
// a shoved block carom into a second mole for an unscripted combo.
export const MAX_ACTIVE = 2

// Soft play-area walls. Blocks bounce off these instead of sliding away forever.
export const BOUNDS = { minX: -560, maxX: 560, minY: -180, maxY: 380 }

const HOLE_SPACING = 220

let nextId = 0
const uid = (p: string) => `${p}:${nextId++}`

let world: World = createWorld()
export function getWorld() {
	return world
}

export function createWorld(): World {
	const holes: Hole[] = []
	for (let i = 0; i < 3; i++) {
		holes.push({ id: uid('hole'), x: (i - 1) * HOLE_SPACING, y: 0, mole: null })
	}
	// Two blocks for three holes: you can never cover everything, so you must
	// keep moving a block to wherever the next mole peeks.
	const blocks: Block[] = [
		{ id: uid('block'), x: -HOLE_SPACING - 60, y: 170, w: 120, h: 120, vx: 0, vy: 0 },
		{ id: uid('block'), x: HOLE_SPACING - 60, y: 170, w: 120, h: 120, vx: 0, vy: 0 },
	]
	return { holes, blocks, spawnTimer: 0.6, grab: null }
}

export function resetWorld() {
	world = createWorld()
	score$.set(0)
	misses$.set(0)
	publishWorld()
}

// --- reactive bridge: bumped each tick so the overlay re-renders ---

export const frame$ = atom('wm-frame', 0)
export const score$ = atom('wm-score', 0)
export const misses$ = atom('wm-misses', 0)

export function publishWorld() {
	frame$.set(frame$.get() + 1)
}
