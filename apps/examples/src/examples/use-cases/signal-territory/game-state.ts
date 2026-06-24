import { atom } from 'tldraw'

// The two players. Red holds one corner, blue the other.
export type Owner = 'a' | 'b'

export const PLAYER_COLOR: Record<Owner, string> = { a: 'red', b: 'blue' }

// One point mass in a verlet strand. Position is (x, y); (ox, oy) is the
// previous position, so velocity is implicit (x - ox). A pinned point is
// nailed to a peg; a grabbed point is currently dragged by the pointer. Both
// pinned and grabbed points are held fixed during the physics solve.
export interface Point {
	x: number
	y: number
	ox: number
	oy: number
	pinned: boolean
	grabbed: boolean
}

// A peg on the grid. Pegs never move. Each peg accumulates per-color charge
// from pulses that arrive on it. The dominant color owns the peg; charge
// decays every tick so ownership must be actively maintained.
export interface Peg {
	id: string
	x: number
	y: number
	charge: { a: number; b: number }
}

// A strand is a chain of points connected by distance constraints. Its two
// ends (points[0] and points[last]) are the only points that can be pinned to
// pegs or grabbed; everything between is free rope. A strand has no fixed
// color of its own — it's drawn in the color of whichever player most recently
// energised it (see `flow`).
export interface Strand {
	id: string
	points: Point[]
	restLen: number
	// Most recent owner to push a pulse through this strand, with a fading
	// brightness so a cut supply line dims out.
	flow: { owner: Owner; level: number } | null
}

// A signal travelling along one strand. `dir` is which way it runs: 1 means
// from points[0] toward the last point, -1 the reverse. `dist` is arc length
// covered from the starting end. `hops` caps how many pegs it can chain
// through, so loops eventually die instead of cycling forever. `owner` is the
// player that emitted it; `strength` is how much charge it carries and is
// divided among branches at each peg, so spreading wide dilutes the signal.
export interface Pulse {
	id: string
	strandId: string
	dir: 1 | -1
	dist: number
	hops: number
	owner: Owner
	strength: number
}

export interface World {
	pegs: Peg[]
	strands: Strand[]
	pulses: Pulse[]
	// Each player's source peg id (emits its colored pulses).
	sources: Record<Owner, string>
	emitTimer: number
	// The end currently held by the pointer, if any.
	grab: { strandId: string; end: 'first' | 'last' } | null
}

// Grid layout. The peg field the strands live on.
export const GRID = { cols: 9, rows: 9, spacing: 80, x0: 0, y0: 0 }

let nextId = 0
const uid = (prefix: string) => `${prefix}:${nextId++}`

let world: World = createWorld()

export function getWorld() {
	return world
}

// Build an evenly-segmented strand between two pegs, pinned at both ends.
function makeStrand(a: Peg, b: Peg): Strand {
	const dist = Math.hypot(b.x - a.x, b.y - a.y)
	const segLen = 16
	const segs = Math.max(2, Math.round(dist / segLen))
	const points: Point[] = []
	for (let i = 0; i <= segs; i++) {
		const t = i / segs
		const x = a.x + (b.x - a.x) * t
		const y = a.y + (b.y - a.y) * t
		points.push({ x, y, ox: x, oy: y, pinned: i === 0 || i === segs, grabbed: false })
	}
	return { id: uid('strand'), points, restLen: dist / segs, flow: null }
}

export function createWorld(): World {
	const pegs: Peg[] = []
	for (let r = 0; r < GRID.rows; r++) {
		for (let c = 0; c < GRID.cols; c++) {
			pegs.push({
				id: `peg:${c},${r}`,
				x: GRID.x0 + c * GRID.spacing,
				y: GRID.y0 + r * GRID.spacing,
				charge: { a: 0, b: 0 },
			})
		}
	}
	const peg = (c: number, r: number) => pegs.find((p) => p.id === `peg:${c},${r}`)!

	// A symmetric starting network. Red's source is the top-left corner, blue's
	// the bottom-right; each gets an identical mirrored fan of supply lines that
	// reach toward the contested middle. Neither side is favored.
	const strands: Strand[] = []
	const link = (ax: number, ay: number, bx: number, by: number) =>
		strands.push(makeStrand(peg(ax, ay), peg(bx, by)))

	// Red supply network (top-left), fanning down and right toward center.
	link(0, 0, 2, 1)
	link(2, 1, 4, 2)
	link(2, 1, 1, 3)
	link(1, 3, 3, 4)
	link(4, 2, 4, 4)
	link(4, 2, 6, 2)

	// Blue supply network (bottom-right), the 180° rotation of red's.
	link(8, 8, 6, 7)
	link(6, 7, 4, 6)
	link(6, 7, 7, 5)
	link(7, 5, 5, 4)
	link(4, 6, 4, 4)
	link(4, 6, 2, 6)

	return {
		pegs,
		strands,
		pulses: [],
		sources: { a: 'peg:0,0', b: 'peg:8,8' },
		emitTimer: 0,
		grab: null,
	}
}

export function uidPulse() {
	return uid('pulse')
}

export function resetWorld() {
	world = createWorld()
	scoreA$.set(0)
	scoreB$.set(0)
	publishWorld()
}

// --- reactive bridge: republished each tick so the overlay re-renders ---

export const frame$ = atom('st-frame', 0)
export const scoreA$ = atom('st-score-a', 0)
export const scoreB$ = atom('st-score-b', 0)

export function publishWorld() {
	frame$.set(frame$.get() + 1)
}

// Recompute the live peg-ownership scores from current charge.
export function publishScores(world: World) {
	let a = 0
	let b = 0
	for (const peg of world.pegs) {
		const owner = pegOwner(peg)
		if (owner === 'a') a++
		else if (owner === 'b') b++
	}
	scoreA$.set(a)
	scoreB$.set(b)
}

// A peg is owned by whichever color dominates its charge. If both colors are
// near-empty, or roughly tied, it's neutral (null).
export function pegOwner(peg: Peg): Owner | null {
	const { a, b } = peg.charge
	if (a < OWN_THRESHOLD && b < OWN_THRESHOLD) return null
	if (Math.abs(a - b) < TIE_MARGIN) return null
	return a > b ? 'a' : 'b'
}

// Minimum dominant charge for a peg to count as owned.
export const OWN_THRESHOLD = 0.6
// How close the two colors must be to read as a contested tie.
const TIE_MARGIN = 0.25
