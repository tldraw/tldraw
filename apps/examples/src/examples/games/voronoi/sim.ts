// The pure territory-game simulation. No tldraw imports — the `World` is a plain
// mutable object that is the single source of truth. game-state.ts publishes
// snapshots of it into atoms for the overlays and HUD to render.
//
// Both sides take turns dropping sites. Every point on the board belongs to the
// nearest site, so each site claims a Voronoi cell; your score is the total area
// of your cells. Place to carve area from your opponent and the neutral seeds.

import { MIN_SITE_GAP, NEUTRAL_SITES, Owner, STONES_EACH, TIME_BANK_MS, WORLD } from './constants'
import { boxPolygon, cellFor, polygonArea, Pt } from './voronoi'

export interface Site {
	id: number
	x: number
	y: number
	owner: Owner
}

export interface World {
	sites: Site[]
	turn: 'you' | 'ai'
	youLeft: number
	aiLeft: number
	// Chess clocks, in milliseconds. Each ticks down only on its owner's turn.
	youTimeMs: number
	aiTimeMs: number
	gameOver: boolean
	// Who, if anyone, lost on time. Null when the game ended by running out of stones.
	flagged: 'you' | 'ai' | null
	// Bumped whenever a site is added, so the host re-syncs the real tldraw shapes.
	structureVersion: number
	nextId: number
}

const BOUNDARY = boxPolygon(WORLD)

function uid(world: World) {
	return ++world.nextId
}

export function getBoundary() {
	return BOUNDARY
}

// Is (x, y) a legal placement: inside the board and not on top of a site.
export function canPlace(world: World, x: number, y: number): boolean {
	if (x < WORLD.minX || x > WORLD.maxX || y < WORLD.minY || y > WORLD.maxY) return false
	return !world.sites.some((s) => Math.hypot(s.x - x, s.y - y) < MIN_SITE_GAP)
}

export function createWorld(): World {
	const world: World = {
		sites: [],
		turn: 'you',
		youLeft: STONES_EACH,
		aiLeft: STONES_EACH,
		youTimeMs: TIME_BANK_MS,
		aiTimeMs: TIME_BANK_MS,
		gameOver: false,
		flagged: null,
		structureVersion: 0,
		nextId: 0,
	}

	// Seed a few neutral sites so the board starts partitioned and there's
	// existing territory to fight over.
	let attempts = 0
	while (
		world.sites.filter((s) => s.owner === 'neutral').length < NEUTRAL_SITES &&
		attempts < 200
	) {
		attempts++
		const x = WORLD.minX + 80 + Math.random() * (WORLD.maxX - WORLD.minX - 160)
		const y = WORLD.minY + 80 + Math.random() * (WORLD.maxY - WORLD.minY - 160)
		if (canPlace(world, x, y)) world.sites.push({ id: uid(world), x, y, owner: 'neutral' })
	}

	world.structureVersion++
	return world
}

// Each site paired with its cell polygon.
export function cells(world: World): { site: Site; poly: Pt[] }[] {
	const points = world.sites.map((s) => ({ x: s.x, y: s.y }))
	return world.sites.map((site, i) => ({
		site,
		poly: cellFor(points[i], points, BOUNDARY),
	}))
}

export interface Areas {
	you: number
	ai: number
	neutral: number
	total: number
}

export function areas(world: World): Areas {
	const result: Areas = { you: 0, ai: 0, neutral: 0, total: 0 }
	for (const { site, poly } of cells(world)) {
		const a = polygonArea(poly)
		result[site.owner] += a
		result.total += a
	}
	return result
}

// The cell a new site at (x, y) would carve out, for the hover preview.
export function previewCell(world: World, x: number, y: number): Pt[] {
	const point = { x, y }
	const others = world.sites.map((s) => ({ x: s.x, y: s.y }))
	return cellFor(point, others, BOUNDARY)
}

// Run the active player's clock. Call once per frame from the host. If a clock
// hits zero that player flags and the game ends immediately.
export function tickClock(world: World, dtMs: number) {
	if (world.gameOver) return
	if (world.turn === 'you') {
		world.youTimeMs = Math.max(0, world.youTimeMs - dtMs)
		if (world.youTimeMs === 0) {
			world.gameOver = true
			world.flagged = 'you'
		}
	} else {
		world.aiTimeMs = Math.max(0, world.aiTimeMs - dtMs)
		if (world.aiTimeMs === 0) {
			world.gameOver = true
			world.flagged = 'ai'
		}
	}
}

// Commit a site. Returns true if it was placed.
export function placeSite(world: World, x: number, y: number, owner: 'you' | 'ai'): boolean {
	if (world.gameOver || world.turn !== owner || !canPlace(world, x, y)) return false
	world.sites.push({ id: uid(world), x, y, owner })
	if (owner === 'you') world.youLeft--
	else world.aiLeft--
	world.turn = owner === 'you' ? 'ai' : 'you'
	if (world.youLeft === 0 && world.aiLeft === 0) world.gameOver = true
	world.structureVersion++
	return true
}

// The AI's total cell area if it placed a site at `candidate`.
function aiAreaWith(world: World, candidate: Pt): number {
	const points = world.sites.map((s) => ({ x: s.x, y: s.y }))
	points.push(candidate)
	const owners = [...world.sites.map((s) => s.owner), 'ai' as Owner]
	let total = 0
	for (let i = 0; i < points.length; i++) {
		if (owners[i] !== 'ai') continue
		total += polygonArea(cellFor(points[i], points, BOUNDARY))
	}
	return total
}

// A greedy AI turn: sample a grid of candidate spots and place where it gains the
// most area, with a little randomness among the best so it stays beatable.
export function aiMove(world: World): boolean {
	if (world.gameOver || world.turn !== 'ai') return false

	const scored: { p: Pt; score: number }[] = []
	const cols = 13
	const rows = 9
	for (let i = 1; i < cols; i++) {
		for (let j = 1; j < rows; j++) {
			const x = WORLD.minX + (i / cols) * (WORLD.maxX - WORLD.minX)
			const y = WORLD.minY + (j / rows) * (WORLD.maxY - WORLD.minY)
			if (!canPlace(world, x, y)) continue
			scored.push({ p: { x, y }, score: aiAreaWith(world, { x, y }) })
		}
	}
	if (scored.length === 0) {
		// No grid spot was free; nudge to any legal point.
		world.turn = 'you'
		return false
	}

	scored.sort((a, b) => b.score - a.score)
	const pick = scored[Math.floor(Math.random() * Math.min(3, scored.length))]
	return placeSite(world, pick.p.x, pick.p.y, 'ai')
}
