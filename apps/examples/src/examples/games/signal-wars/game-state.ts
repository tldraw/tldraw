import { atom } from 'tldraw'

// The two players. Red is the human (top-left corner); blue is the AI (bottom-right).
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
// decays every tick so ownership must be actively maintained. `relayTimer`
// staggers how often an owned relay peg re-emits (see sim.ts, atom 1).
export interface Peg {
	id: string
	x: number
	y: number
	col: number
	row: number
	charge: { a: number; b: number }
	relayTimer: number
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
	// Each player's home source peg id (emits at full strength, the main base).
	sources: Record<Owner, string>
	emitTimer: number
	aiTimer: number
	// Each player's energy bank. Owned pegs add income; building wires spends it.
	energy: { a: number; b: number }
	// The game outcome, once decided.
	winner: Owner | null
	// How long a player has held a board majority (ticks), for the majority win.
	majorityHold: { a: number; b: number }
}

// Grid layout. A full 19x19 Go board. Strands and signals live on this field.
export const GRID = { cols: 19, rows: 19, spacing: 46, x0: 0, y0: 0 }

let nextId = 0
const uid = (prefix: string) => `${prefix}:${nextId++}`

// Initialized lazily on first access: createWorld() reads constants declared
// lower in this file, so it must not run at module-eval time (TDZ).
let world: World | null = null

export function getWorld() {
	if (!world) world = createWorld()
	return world
}

// Build an evenly-segmented strand between two pegs, pinned at both ends. The
// same constructor is used by the player's and the AI's build verb.
export function makeStrand(a: Peg, b: Peg): Strand {
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
				col: c,
				row: r,
				charge: { a: 0, b: 0 },
				relayTimer: Math.floor(Math.random() * RELAY_EMIT_STEPS),
			})
		}
	}
	const peg = (c: number, r: number) => pegs.find((p) => p.id === `peg:${c},${r}`)!

	// Start nearly empty: each side owns just its home source corner plus one
	// short starter strand reaching one cell inward. Players build out from there.
	const strands: Strand[] = []
	const link = (ax: number, ay: number, bx: number, by: number) =>
		strands.push(makeStrand(peg(ax, ay), peg(bx, by)))

	// Red's home is the top-left corner; blue's is the 180° rotation.
	link(1, 1, 2, 2)
	link(GRID.cols - 2, GRID.rows - 2, GRID.cols - 3, GRID.rows - 3)

	return {
		pegs,
		strands,
		pulses: [],
		sources: { a: 'peg:1,1', b: `peg:${GRID.cols - 2},${GRID.rows - 2}` },
		emitTimer: 0,
		aiTimer: 0,
		energy: { a: START_ENERGY, b: START_ENERGY },
		winner: null,
		majorityHold: { a: 0, b: 0 },
	}
}

export function uidPulse() {
	return uid('pulse')
}

export function resetWorld() {
	world = createWorld()
	scoreA$.set(0)
	scoreB$.set(0)
	energyA$.set(START_ENERGY)
	energyB$.set(START_ENERGY)
	winner$.set(null)
	publishWorld()
}

// --- reactive bridge: republished each tick so the overlay re-renders ---

export const frame$ = atom('sw-frame', 0)
export const scoreA$ = atom('sw-score-a', 0)
export const scoreB$ = atom('sw-score-b', 0)
export const energyA$ = atom('sw-energy-a', 0)
export const energyB$ = atom('sw-energy-b', 0)
export const winner$ = atom<Owner | null>('sw-winner', null)

// Live build-drag state for the overlay's rubber-band preview. `from` is the
// owned peg the drag started on; `to` is the current pointer in page coords;
// `valid` is whether releasing now would build (in range + affordable).
export interface BuildPreview {
	from: { x: number; y: number }
	to: { x: number; y: number }
	valid: boolean
}
export const buildPreview$ = atom<BuildPreview | null>('sw-build-preview', null)

export function publishWorld() {
	frame$.set(frame$.get() + 1)
}

// Recompute the live peg-ownership scores from current charge, and publish the
// energy banks and winner so the HUD stays in sync.
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
	energyA$.set(Math.floor(world.energy.a))
	energyB$.set(Math.floor(world.energy.b))
	winner$.set(world.winner)
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

// --- economy (atom 3) ---

// Starting bank: enough for the first couple of short builds, but limited.
export const START_ENERGY = 5
// Per owned peg, per tick. ~1.2/sec/peg at 60fps, so more territory = faster bank.
export const INCOME = 0.02
// Bank ceiling, so a runaway leader can't hoard infinitely.
export const ENERGY_CAP = 60
// Build cost is charged per grid cell of strand length.
export const COST_PER_CELL = 1

// --- build verb (atom 2) ---

// Max strand length the player/AI can build, in grid cells.
export const MAX_BUILD_RANGE = 4

// --- relay emission (atom 1) ---

// Steps between relay re-emissions from an owned non-source peg (~3x the source
// interval), so owned territory spreads on a slow, readable cadence.
export const RELAY_EMIT_STEPS = 78
// Base strength of a relay emission, scaled down by the peg's charge.
export const RELAY_EMIT_STRENGTH = 0.45
// Charge that maps to full relay strength.
export const CHARGE_NORM = 4
// A relay only emits once its charge is comfortably above ownership threshold.
export const RELAY_MIN_CHARGE = OWN_THRESHOLD + 0.6
