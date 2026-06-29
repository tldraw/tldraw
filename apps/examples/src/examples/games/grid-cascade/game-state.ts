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
//
// `heat` (0..1) is the strand's load. Every pulse that passes raises it; it
// cools each tick. When heat crosses 1 the strand burns out and snaps. `spark`
// is a short-lived flash set the moment it burns, for a visible pop.
export interface Strand {
	id: string
	points: Point[]
	restLen: number
	color: string
	heat: number
	spark: number
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
	// Steps since the round started — drives the escalating emit rate.
	age: number
	// Steps since the output last received a signal — the starvation clock.
	starve: number
	// Whether the output has ever received a signal. The starvation clock is held
	// until this flips, giving the first pulse time to traverse the initial path.
	firstLit: boolean
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
	return { id: uid('strand'), points, restLen: dist / segs, color, heat: 0, spark: 0 }
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

	// A leaf-shaped web from source (top) to output (bottom): a short central
	// spine flanked by two longer detour routes that fan out and reconverge.
	// The spine is the tempting cheap path; when it overloads, the player has to
	// push load onto the longer flanks. Cross links let heat bleed between routes
	// so a burnout on one cascades onto its neighbours.
	const strands: Strand[] = [
		// Central spine — the short, tempting path.
		makeStrand(peg(3, 0), peg(3, 2), PALETTE[0]),
		makeStrand(peg(3, 2), peg(3, 4), PALETTE[0]),
		makeStrand(peg(3, 4), peg(3, 6), PALETTE[0]),
		makeStrand(peg(3, 6), peg(3, 8), PALETTE[0]),
		// Left flank — a longer detour the load can spill onto.
		makeStrand(peg(3, 0), peg(1, 1), PALETTE[2]),
		makeStrand(peg(1, 1), peg(1, 3), PALETTE[2]),
		makeStrand(peg(1, 3), peg(1, 5), PALETTE[2]),
		makeStrand(peg(1, 5), peg(2, 7), PALETTE[2]),
		makeStrand(peg(2, 7), peg(3, 8), PALETTE[2]),
		// Right flank — mirror of the left.
		makeStrand(peg(3, 0), peg(5, 1), PALETTE[1]),
		makeStrand(peg(5, 1), peg(5, 3), PALETTE[1]),
		makeStrand(peg(5, 3), peg(5, 5), PALETTE[1]),
		makeStrand(peg(5, 5), peg(4, 7), PALETTE[1]),
		makeStrand(peg(4, 7), peg(3, 8), PALETTE[1]),
		// Cross links — bleed heat and pulses between spine and flanks.
		makeStrand(peg(1, 3), peg(3, 4), PALETTE[3]),
		makeStrand(peg(5, 3), peg(3, 4), PALETTE[3]),
		makeStrand(peg(1, 5), peg(3, 6), PALETTE[3]),
		makeStrand(peg(5, 5), peg(3, 6), PALETTE[3]),
		// Spare strands parked on the wings to cut up and rewire into the path.
		makeStrand(peg(0, 4), peg(0, 6), PALETTE[4]),
		makeStrand(peg(6, 4), peg(6, 6), PALETTE[4]),
	]

	return {
		pegs,
		strands,
		pulses: [],
		sources: ['peg:3,0'],
		outputs: ['peg:3,8'],
		emitTimer: 0,
		age: 0,
		starve: 0,
		firstLit: false,
		grab: null,
	}
}

export function uidPulse() {
	return uid('pulse')
}

export function resetWorld() {
	world = createWorld()
	arrivals$.set(0)
	gameOver$.set(false)
	survived$.set(0)
	publishWorld()
}

// --- reactive bridge: republished each tick so the overlay re-renders ---

export const frame$ = atom('gc-frame', 0)
export const arrivals$ = atom('gc-arrivals', 0)
// Seconds survived this round, and whether the output has starved out.
export const survived$ = atom('gc-survived', 0)
export const gameOver$ = atom('gc-gameover', false)

export function publishWorld() {
	frame$.set(frame$.get() + 1)
}

export function addArrival() {
	arrivals$.set(arrivals$.get() + 1)
}
