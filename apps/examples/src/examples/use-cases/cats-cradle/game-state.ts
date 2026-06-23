import { atom } from 'tldraw'

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

// A peg on the grid. Pegs never move.
export interface Peg {
	id: string
	x: number
	y: number
}

// A strand is a chain of points connected by distance constraints. Its two
// ends (points[0] and points[last]) are the only points that can be pinned to
// pegs or grabbed; everything between is free rope.
export interface Strand {
	id: string
	points: Point[]
	restLen: number
	color: string
}

// A signal travelling along one strand. `dir` is which way it runs: 1 means
// from points[0] toward the last point, -1 the reverse. `dist` is arc length
// covered from the starting end. `hops` caps how many pegs it can chain
// through, so loops eventually die instead of cycling forever.
export interface Pulse {
	id: string
	strandId: string
	dir: 1 | -1
	dist: number
	hops: number
}

export interface World {
	pegs: Peg[]
	strands: Strand[]
	pulses: Pulse[]
	// Peg ids that emit signal / count arrivals.
	sources: string[]
	outputs: string[]
	emitTimer: number
	// The end currently held by the pointer, if any.
	grab: { strandId: string; end: 'first' | 'last' } | null
}

// Grid layout. The peg field the strands live on.
export const GRID = { cols: 7, rows: 9, spacing: 90, x0: 0, y0: 0 }

// A small, readable palette pulled by index when strands are created.
const PALETTE = ['blue', 'violet', 'light-blue', 'green', 'orange'] as const

let nextId = 0
const uid = (prefix: string) => `${prefix}:${nextId++}`

let world: World = createWorld()

export function getWorld() {
	return world
}

// Build an evenly-segmented strand between two pegs, pinned at both ends.
function makeStrand(a: Peg, b: Peg, color: string): Strand {
	const dist = Math.hypot(b.x - a.x, b.y - a.y)
	const segLen = 18
	const segs = Math.max(2, Math.round(dist / segLen))
	const points: Point[] = []
	for (let i = 0; i <= segs; i++) {
		const t = i / segs
		const x = a.x + (b.x - a.x) * t
		const y = a.y + (b.y - a.y) * t
		points.push({ x, y, ox: x, oy: y, pinned: i === 0 || i === segs, grabbed: false })
	}
	return { id: uid('strand'), points, restLen: dist / segs, color }
}

export function createWorld(): World {
	const pegs: Peg[] = []
	for (let r = 0; r < GRID.rows; r++) {
		for (let c = 0; c < GRID.cols; c++) {
			pegs.push({
				id: `peg:${c},${r}`,
				x: GRID.x0 + c * GRID.spacing,
				y: GRID.y0 + r * GRID.spacing,
			})
		}
	}
	const peg = (c: number, r: number) => pegs.find((p) => p.id === `peg:${c},${r}`)!

	// A long signal line from source (top) to output (bottom), plus two spare
	// triangles to cut up and rewire into the path.
	const strands: Strand[] = [
		makeStrand(peg(3, 0), peg(3, 6), PALETTE[2]),
		makeStrand(peg(0, 2), peg(0, 3), PALETTE[0]),
		makeStrand(peg(0, 3), peg(1, 3), PALETTE[0]),
		makeStrand(peg(1, 3), peg(0, 2), PALETTE[0]),
		makeStrand(peg(5, 4), peg(6, 4), PALETTE[1]),
		makeStrand(peg(6, 4), peg(6, 5), PALETTE[1]),
		makeStrand(peg(6, 5), peg(5, 4), PALETTE[1]),
	]

	// Top of the long line emits; the bottom counts arrivals.
	return {
		pegs,
		strands,
		pulses: [],
		sources: ['peg:3,0'],
		outputs: ['peg:3,6'],
		emitTimer: 0,
		grab: null,
	}
}

export function uidPulse() {
	return uid('pulse')
}

export function resetWorld() {
	world = createWorld()
	arrivals$.set(0)
	publishWorld()
}

// --- reactive bridge: republished each tick so the overlay re-renders ---

export const frame$ = atom('cc-frame', 0)
export const arrivals$ = atom('cc-arrivals', 0)

export function publishWorld() {
	frame$.set(frame$.get() + 1)
}

export function addArrival() {
	arrivals$.set(arrivals$.get() + 1)
}
