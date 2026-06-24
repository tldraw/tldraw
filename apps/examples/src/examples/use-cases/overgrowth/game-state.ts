import { atom } from 'tldraw'

// Two colors fight for a large peg grid. Blue is the human (top-left home),
// orange is the AI (the 180° rotation, bottom-right home). Territory grows on its
// own as branching tendrils that advance in rhythmic pulse-waves. The player's
// only verb is to CUT vines — and because each color's network is a strict TREE
// (a forest, one tree per source), cutting any vine orphans everything beyond
// it, which then withers to neutral.
export type Owner = 'a' | 'b'

// Faction → tldraw palette color name. Resolved to actual values through the
// editor's DEFAULT_THEME in the overlay, so the game uses tldraw's own colors and
// follows its light/dark color scheme.
export const PLAYER_COLOR: Record<Owner, string> = { a: 'blue', b: 'orange' }

// ============================================================================
// TUNING CONSTANTS — all of the simulation's feel lives here. Declared at the
// top so nothing reads them before they exist (world is built lazily).
// ============================================================================

// --- grid ---
// 80×80 = 6400 cells. All spatial/LOD/culling code is O(visible), so size is
// free to change here; generation + connectivity flood-fill run ONCE at world
// creation, never per tick.
export const GRID = { cols: 80, rows: 80, spacing: 46, x0: 0, y0: 0 }

// --- procedural map (cave: open chambers joined by corridor chokepoints) ---
// Fraction of cells seeded as wall before smoothing. Higher = more rock / tighter
// corridors.
export const MAP_WALL_FRACTION = 0.46
// Cellular-automata smoothing passes (cave carving). More = smoother blobs.
export const MAP_SMOOTH_PASSES = 5
// Radius (cells) of the guaranteed-open chamber carved around each core, so a
// core always has breathing room and a defensible room.
export const CORE_CHAMBER_RADIUS = 5
// Half-width (cells) of the corridor carved between the chambers if the random
// cave leaves them disconnected (connectivity guarantee).
export const CORRIDOR_HALF_WIDTH = 1
// Map variation: carve a few large open caverns (radius range below) into the
// CA texture so the board mixes big rooms with smaller scattered rock, and add a
// couple of deliberate narrow chokepoint passages between regions. Light touch —
// not a maze. All applied to the canonical half then mirrored, so symmetry holds.
export const MAP_CAVERN_COUNT = 4 // big open caverns carved per half
export const MAP_CAVERN_MIN_RADIUS = 4
export const MAP_CAVERN_MAX_RADIUS = 8
export const MAP_CHOKE_COUNT = 2 // deliberate narrow passages per half
export const MAP_CHOKE_HALF_WIDTH = 1 // 1 → 1-cell-wide chokes (passage = 1..2)

// --- growth: discrete pulse-waves ---
// Growth does NOT happen a little each tick. Every GROWTH_PULSE_INTERVAL ticks
// all active tips advance together in one visible surge, then nothing grows
// until the next pulse. This makes expansion read as rhythmic outward steps and
// gives the player a window to prune between waves.
export const GROWTH_PULSE_INTERVAL = 14 // ticks between growth pulses (~0.23s)
// How many cells a tip jumps forward per pulse (advances outward fast).
export const CELLS_PER_PULSE = 1
// Global cap on tip extensions per color per pulse, so a huge frontier still
// reads as a wave rather than an instant flood.
export const MAX_TIPS_ADVANCED_PER_PULSE = 60

// --- tips: organic, chaotic tendrils ---
// Probability a tip forks into a second tip on a pulse (fractal branching).
export const TIP_BRANCH_PROB = 0.22
// Probability a tip simply dies on a pulse (finite, irregular tendril length).
export const TIP_DEATH_PROB = 0.04
// Directional persistence: how strongly a tip keeps its current heading vs
// turning. Higher = straighter vines; lower = more wandering.
export const TIP_PERSISTENCE = 0.78
// Max heading jitter (radians) applied when a tip turns, for chaotic wander.
export const TIP_JITTER = 1.1
// Slight perpendicular wiggle on intermediate vine points (page units) so vines
// aren't dead-straight grid segments. Purely visual.
export const VINE_WIGGLE = 6
// Lifetime (ticks) of the cut-flash "snip" played at each severed vine. ~18
// ticks ≈ 0.3s at 60fps: a quick, obvious scale-pop then fade.
export const CUT_FLASH_TICKS = 18

// --- cut swipe (SDK eraser scribble; laser-style bounded trailing) ---
// The swipe is the SDK eraser brush in one scribbles session. The ScribbleManager
// already caps the live trail length and fades it (laser style); these tune that
// trailing so a long drag stays a bounded, smoothly-fading streak (no smear).
// Idle timeout (ms). 0 disables the manager's auto-stop, so the scribble session
// lives for the whole hold (it only stops on pointerup). selfConsume already trims
// the live trail and lets it retreat when the pointer pauses, so we don't want the
// idle timer killing the session mid-drag (that made it vanish and then draw blank).
export const SWIPE_IDLE_MS = 0
// `shrink` per step while the stopped scribble fades — tapers the trail away for a
// clean animated fade-out (0 = no shrink, higher = faster taper).
export const SWIPE_SHRINK = 0.35

// --- growth dynamism: seek open space, punch through gaps ---
// Tips are attracted toward open NEUTRAL space so colonies flow into emptiness
// and gaps instead of piling sideways along the enemy contact line (which froze
// the front). Two mechanisms:
// OPENNESS_WEIGHT: in pickTarget, how strongly a candidate is preferred for the
// amount of open neutral space around it (its 3×3 neutral-cell count). Higher =
// growth dives into open ground harder.
export const OPENNESS_WEIGHT = 1.2
// GAP_SEEK_WEIGHT: when a tip's forward cells are all enemy/blocked, its heading
// is steered toward the nearest reachable NEUTRAL cell within GAP_SEEK_RADIUS so
// it routes around the obstruction / through a 1–2 cell hole rather than turning
// to grind the seam. This weight blends that gap direction into the heading.
export const GAP_SEEK_WEIGHT = 1.6
// How far (cells) a boxed-in tip looks for a neutral cell to aim at.
export const GAP_SEEK_RADIUS = 4

// --- claiming ---
// A target cell is claimable by a color if it is unreached by that color and
// not part of the OTHER color's living network (colors can't grow into each
// other's tendrils; first to reach an empty cell claims it).
// Charge seeded on a freshly-claimed peg (drives the visual gradient/fade).
export const CLAIM_CHARGE = 4
// Freshly-CUT endpoint cells can't re-sprout for this many ticks, so a pruned
// area stays clear instead of instantly re-growing (pruning has lasting effect).
// Kept modest so the neutral ground a cut opens at a contested front reopens for
// the attacker to push through, rather than freezing the frontline.
export const CUT_LOCKOUT_TICKS = 24

// --- withering: connectivity-driven, deterministic ---
// Connected (reachable-from-source) pegs hold/regain charge toward CLAIM_CHARGE
// at this rate, so living territory stays bright.
export const CONNECTED_REGEN = 0.5
// Orphaned (disconnected) pegs lose charge at this multiplicative rate each
// tick — fast, so a severed branch visibly fades to neutral within ~1s.
export const ORPHAN_DECAY = 0.86
// Sere/dead tint a withering vine blends toward as its charge decays (a
// desaturated brown). Healthy connected vines are unaffected.
export const WITHER_COLOR = '#6b5536'

// --- ownership ---
export const OWN_THRESHOLD = 0.5
export const TIE_MARGIN = 0.2
export const CHARGE_NORM = CLAIM_CHARGE

// --- constraint system: steer across zoom levels ---
// You READ the game zoomed out (whose territory is winning, where the trunks
// are) but you can only ACT zoomed in. These constants gate and shape cutting.
//
// CUT_ZOOM_MIN: a cut only registers when zoomed in at least this far. Set equal
// to the overlay's VINE_ZOOM so cutting is enabled exactly when vines are drawn.
// (The overlay re-declares VINE_ZOOM for its own use; keep the two in sync.)
export const CUT_ZOOM_MIN = 0.85
// When a player tries to cut while too zoomed out, the camera auto-travels to
// the cut point and zooms to CUT_ZOOM_MIN + this epsilon (just past the cut
// threshold), so the next swipe lands at the right level. That gesture does NOT
// itself cut.
export const CUT_ZOOM_EPSILON = 0.1
// REACH_RADIUS (page units): to cut an ENEMY vine you must have a living vine of
// your own within this radius of the cut point (~3 cells). You can always cut
// your OWN vines (steering) regardless of reach, so self-steering is never
// annoying; enemy interior cuts require real, exposed presence.
export const REACH_RADIUS = GRID.spacing * 3
// CHOKE_THRESHOLD: cutting an enemy vine whose orphaned subtree is at least this
// many pegs is a real CHOKE (devastating wither). Below it the cut is a leaf
// trim and HYDRA-backfires.
export const CHOKE_THRESHOLD = 8
// HYDRA_TIPS: how many new enemy growth tips a backfired (small) enemy cut
// spawns on the surviving, source-connected side — so careless cuts grow them
// back bushier.
export const HYDRA_TIPS = 2
// THICKNESS_SCALE: vine stroke width grows with the log of its subtree size so
// trunks render fat and leaves thin — the affordance that lets a zoomed-out
// player SEE the chokes to dive in and cut.
export const THICKNESS_SCALE = 1.1

// --- win condition: SIEGE the enemy core ---
// You win by besieging the enemy core to 0 HP; you lose if yours falls. A core
// is besieged while enemy living vine-pegs sit within CORE_SIEGE_RADIUS of it.
export const CORE_HP = 100
// Cells around a core within which an enemy vine-peg counts as besieging it.
export const CORE_SIEGE_RADIUS = 2.5
// HP lost per tick PER besieging enemy peg, capped by SIEGE_DMG_MAX so a swarm
// isn't instant. Tuned so a maintained siege kills in ~15-30s; a brush-up
// doesn't (the defender has time to cut the siege off).
export const SIEGE_DMG = 0.12
export const SIEGE_DMG_MAX = 0.6
// HP regained per tick while NOT under siege (recovers, slower than it falls).
export const CORE_REGEN = 0.25

// --- AI pressure: blue still NEVER cuts, but its growth pulls toward red's core
// so it's a real besieging threat (blended with outward heading + jitter so it
// stays organic). 0 = pure outward; higher = more beeline to the player core.
export const AI_CORE_PULL = 1.4

// ============================================================================
// DATA TYPES
// ============================================================================

// One point mass in a vine strand. We keep verlet-style fields for drawing but
// vines are nearly static, so there's no heavy physics solve.
export interface Point {
	x: number
	y: number
	ox: number
	oy: number
	pinned: boolean
}

// A peg / grid node. Pegs never move. `owner` is set by CLAIMING (not
// diffusion): when a tendril reaches a cell it claims it for its color and
// records `parent` (the peg it grew from) — this is what makes each color's
// network a strict tree. `charge` is kept only for the visual gradient/fade and
// is driven by connectivity (regen if reachable from source, fast decay if
// orphaned). `cutLockout` blocks re-sprouting near a fresh cut.
export interface Peg {
	id: string
	x: number
	y: number
	col: number
	row: number
	owner: Owner | null
	parent: string | null // peg id this one grew from (null for sources/neutral)
	charge: { a: number; b: number }
	cutLockout: number
	adj: Set<string> // peg ids connected by a living vine (the tree edges)
	// Number of pegs in the subtree rooted at this peg (this peg + descendants).
	// Recomputed post-order from each source on graph change; drives vine
	// thickness and the choke-vs-hydra decision.
	subtreeSize: number
	// Wall/obstacle: vines can't grow into or through this cell. Set once at world
	// creation by the map generator; never changes during play.
	blocked: boolean
}

// A vine: a chain of points pinned at both ends to two pegs. Vines ARE the tree
// edges. `owner` is the color that grew it. `aId` is the parent peg, `bId` the
// child (further from the source), so cutting drops the child's subtree.
export interface Strand {
	id: string
	points: Point[]
	owner: Owner | null
	aId: string | null
	bId: string | null
	cell: number // spatial-index bucket (grid cell of midpoint), for culling
}

// An active growth tip: the leading end of a tendril. It has a heading (angle)
// for directional persistence, lives on a peg, and advances during pulses.
// Killing a tip stops that tendril; cutting a vine kills every tip on the
// orphaned subtree.
export interface Tip {
	owner: Owner
	pegId: string // the peg the tip currently sits on
	heading: number // radians; biased outward from the source
}

// A spark is PURE DECORATION — bounded, viewport-local (see sim.ts).
export interface Spark {
	strandId: string
	dir: 1 | -1
	dist: number
	owner: Owner
}

// A short-lived "snip" marker spawned at each successful cut point — a small
// flash that expands and fades over CUT_FLASH_TICKS. Pure decoration; culled to
// the viewport like sparks. `born` is the world tick it was created.
export interface CutFlash {
	x: number
	y: number
	cell: number // spatial-index bucket for culling
	born: number
}

export interface World {
	pegs: Peg[]
	pegById: Map<string, Peg>
	strands: Strand[]
	strandById: Map<string, Strand>
	tips: Tip[]
	sparks: Spark[]
	// Short-lived cut-flash markers (the "snip" flourish at each severed vine).
	flashes: CutFlash[]
	// True only while a cut is actively in progress (set by the input handler on
	// startSlice, cleared on pointerup). The overlay reads it each frame to grey
	// out the enemy vines the player can't currently reach. Contextual cue only.
	slicing: boolean
	sources: Record<Owner, string>
	// Per-core hit points. A core at 0 HP means that color loses.
	coreHp: { a: number; b: number }
	tick: number
	pulseTimer: number
	winner: Owner | null
}

let nextId = 0
const uid = (prefix: string) => `${prefix}:${nextId++}`

let world: World | null = null

export function getWorld() {
	if (!world) world = createWorld()
	return world
}

function pegId(c: number, r: number) {
	return `peg:${c},${r}`
}

// Spatial-index bucket for a page point, flattened to a single integer.
export function cellOf(x: number, y: number): number {
	const c = Math.round((x - GRID.x0) / GRID.spacing)
	const r = Math.round((y - GRID.y0) / GRID.spacing)
	return r * GRID.cols + c
}

// Build a vine between two pegs, pinned at both ends, with a slight random
// perpendicular wiggle on the interior points so it reads as an organic tendril
// rather than a straight grid segment.
export function makeStrand(a: Peg, b: Peg, owner: Owner | null): Strand {
	const segs = 4
	const dx = b.x - a.x
	const dy = b.y - a.y
	const len = Math.hypot(dx, dy) || 1
	const nx = -dy / len // unit perpendicular
	const ny = dx / len
	const points: Point[] = []
	for (let i = 0; i <= segs; i++) {
		const t = i / segs
		let x = a.x + dx * t
		let y = a.y + dy * t
		if (i !== 0 && i !== segs) {
			// Smooth-ish bump peaking at the middle, signed randomly.
			const w = Math.sin(t * Math.PI) * (Math.random() - 0.5) * 2 * VINE_WIGGLE
			x += nx * w
			y += ny * w
		}
		points.push({ x, y, ox: x, oy: y, pinned: i === 0 || i === segs })
	}
	const mx = (a.x + b.x) / 2
	const my = (a.y + b.y) / 2
	return { id: uid('vine'), points, owner, aId: a.id, bId: b.id, cell: cellOf(mx, my) }
}

// Core cell coordinates: symmetric under 180° rotation about the board center.
const CORE_A = { col: 9, row: 9 }
const CORE_B = { col: GRID.cols - 1 - CORE_A.col, row: GRID.rows - 1 - CORE_A.row }

// ----------------------------------------------------------------------------
// PROCEDURAL MAP — a cave of open chambers joined by corridor chokepoints.
//
// 1. Seed the upper-left HALF of the board with random walls, smooth it with a
//    cellular-automata cave rule, then MIRROR it 180° onto the lower-right half.
//    This makes the layout symmetric, so neither side is favored.
// 2. Force-open a chamber around each core (CORE_CHAMBER_RADIUS) so each core has
//    a defensible room.
// 3. Flood-fill the open cells from core A; if core B isn't reachable, carve a
//    straight corridor between them and re-fill until both cores are connected.
//
// Returns a boolean wall grid [row][col]. Runs ONCE at world creation.
// ----------------------------------------------------------------------------
function generateMap(): boolean[][] {
	const { cols, rows } = GRID
	const wall: boolean[][] = []
	for (let r = 0; r < rows; r++) wall.push(new Array(cols).fill(false))

	// Border is always wall.
	const isBorder = (c: number, r: number) => c === 0 || r === 0 || c === cols - 1 || r === rows - 1

	// Seed: random walls in the canonical (upper-left) half only; the other half
	// is its 180° mirror. The "half" is the set of cells at/under the anti-diagonal
	// midpoint so each cell maps to a distinct partner.
	const half = (c: number, r: number) => r * cols + c <= ((rows - 1) * cols + (cols - 1)) / 2
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			if (!half(c, r)) continue
			wall[r][c] = isBorder(c, r) || Math.random() < MAP_WALL_FRACTION
		}
	}
	const mirror = () => {
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				if (half(c, r)) wall[rows - 1 - r][cols - 1 - c] = wall[r][c]
			}
		}
	}
	mirror()

	// Cellular-automata smoothing: a cell becomes wall if it has many wall
	// neighbours, open if it has few — carving organic blobs/caverns. Apply to the
	// canonical half each pass, then re-mirror to keep symmetry exact.
	const countWallNeighbours = (c: number, r: number) => {
		let n = 0
		for (let dr = -1; dr <= 1; dr++) {
			for (let dc = -1; dc <= 1; dc++) {
				if (dc === 0 && dr === 0) continue
				const nc = c + dc
				const nr = r + dr
				if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || wall[nr][nc]) n++
			}
		}
		return n
	}
	for (let pass = 0; pass < MAP_SMOOTH_PASSES; pass++) {
		const nextHalf: Array<[number, number, boolean]> = []
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				if (!half(c, r)) continue
				if (isBorder(c, r)) {
					nextHalf.push([c, r, true])
					continue
				}
				const n = countWallNeighbours(c, r)
				nextHalf.push([c, r, n >= 5])
			}
		}
		for (const [c, r, w] of nextHalf) wall[r][c] = w
		mirror()
	}

	// Carve an open disk (used for chambers, caverns).
	const carveDisk = (cc: number, cr: number, rad: number) => {
		for (let dr = -rad; dr <= rad; dr++) {
			for (let dc = -rad; dc <= rad; dc++) {
				const c = cc + dc
				const r = cr + dr
				if (c <= 0 || r <= 0 || c >= cols - 1 || r >= rows - 1) continue
				if (dc * dc + dr * dr <= rad * rad) wall[r][c] = false
			}
		}
	}
	// Carve a narrow open passage between two points (a deliberate chokepoint).
	const carveLine = (x0: number, y0: number, x1: number, y1: number, w: number) => {
		let x = x0
		let y = y0
		const dxa = Math.abs(x1 - x)
		const dya = Math.abs(y1 - y)
		const sx = x < x1 ? 1 : -1
		const sy = y < y1 ? 1 : -1
		let err = dxa - dya
		for (;;) {
			for (let oy = -w; oy <= w; oy++) {
				for (let ox = -w; ox <= w; ox++) {
					const c = x + ox
					const r = y + oy
					if (c > 0 && r > 0 && c < cols - 1 && r < rows - 1) wall[r][c] = false
				}
			}
			if (x === x1 && y === y1) break
			const e2 = 2 * err
			if (e2 > -dya) {
				err -= dya
				x += sx
			}
			if (e2 < dxa) {
				err += dxa
				y += sy
			}
		}
	}

	// MAP VARIATION (light touch): carve a few large caverns of varied size into
	// the canonical half so the board mixes big rooms with the smaller scattered
	// CA rock, plus a couple of deliberate narrow chokepoint passages. Then
	// re-mirror so symmetry is preserved exactly.
	const randHalfCell = (): [number, number] => {
		// Reject until we land in the canonical half (interior).
		for (;;) {
			const c = 2 + ((Math.random() * (cols - 4)) | 0)
			const r = 2 + ((Math.random() * (rows - 4)) | 0)
			if (half(c, r)) return [c, r]
		}
	}
	for (let i = 0; i < MAP_CAVERN_COUNT; i++) {
		const [c, r] = randHalfCell()
		const rad =
			MAP_CAVERN_MIN_RADIUS +
			((Math.random() * (MAP_CAVERN_MAX_RADIUS - MAP_CAVERN_MIN_RADIUS + 1)) | 0)
		carveDisk(c, r, rad)
	}
	for (let i = 0; i < MAP_CHOKE_COUNT; i++) {
		const [c0, r0] = randHalfCell()
		const [c1, r1] = randHalfCell()
		carveLine(c0, r0, c1, r1, MAP_CHOKE_HALF_WIDTH)
	}
	mirror()

	// Carve an open chamber around each core (after variation, so a stray cavern
	// can't wall a core in).
	carveDisk(CORE_A.col, CORE_A.row, CORE_CHAMBER_RADIUS)
	carveDisk(CORE_B.col, CORE_B.row, CORE_CHAMBER_RADIUS)

	// Connectivity guarantee: flood-fill open cells from core A. If core B is not
	// reached, carve a straight corridor between the cores and refill. Repeat a
	// few times (each carve widens the path) until connected.
	const reachableFromA = () => {
		const seen = new Set<number>()
		const startKey = CORE_A.row * cols + CORE_A.col
		const stack = [startKey]
		seen.add(startKey)
		while (stack.length) {
			const k = stack.pop()!
			const c = k % cols
			const r = (k / cols) | 0
			for (const [dc, dr] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1],
			]) {
				const nc = c + dc
				const nr = r + dr
				if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue
				if (wall[nr][nc]) continue
				const nk = nr * cols + nc
				if (seen.has(nk)) continue
				seen.add(nk)
				stack.push(nk)
			}
		}
		return seen
	}
	const carveCorridor = () => {
		// Bresenham-ish straight line from core A to core B, opening a band of
		// CORRIDOR_HALF_WIDTH cells around it.
		let x = CORE_A.col
		let y = CORE_A.row
		const dx = Math.abs(CORE_B.col - x)
		const dy = Math.abs(CORE_B.row - y)
		const sx = x < CORE_B.col ? 1 : -1
		const sy = y < CORE_B.row ? 1 : -1
		let err = dx - dy
		const w = CORRIDOR_HALF_WIDTH
		for (;;) {
			for (let oy = -w; oy <= w; oy++) {
				for (let ox = -w; ox <= w; ox++) {
					const c = x + ox
					const r = y + oy
					if (c > 0 && r > 0 && c < cols - 1 && r < rows - 1) wall[r][c] = false
				}
			}
			if (x === CORE_B.col && y === CORE_B.row) break
			const e2 = 2 * err
			if (e2 > -dy) {
				err -= dy
				x += sx
			}
			if (e2 < dx) {
				err += dx
				y += sy
			}
		}
	}
	for (let attempt = 0; attempt < 4; attempt++) {
		const reach = reachableFromA()
		if (reach.has(CORE_B.row * cols + CORE_B.col)) break
		carveCorridor()
	}

	return wall
}

export function createWorld(): World {
	const wall = generateMap()

	const pegs: Peg[] = []
	const pegById = new Map<string, Peg>()
	for (let r = 0; r < GRID.rows; r++) {
		for (let c = 0; c < GRID.cols; c++) {
			const peg: Peg = {
				id: pegId(c, r),
				x: GRID.x0 + c * GRID.spacing,
				y: GRID.y0 + r * GRID.spacing,
				col: c,
				row: r,
				owner: null,
				parent: null,
				charge: { a: 0, b: 0 },
				cutLockout: 0,
				adj: new Set(),
				subtreeSize: 1,
				blocked: wall[r][c],
			}
			pegs.push(peg)
			pegById.set(peg.id, peg)
		}
	}

	const sourceA = pegId(CORE_A.col, CORE_A.row)
	const sourceB = pegId(CORE_B.col, CORE_B.row)

	const strands: Strand[] = []
	const strandById = new Map<string, Strand>()

	// Cores claim themselves (and are guaranteed open by the chamber carve). Each
	// gets a starter tip heading toward the enemy core.
	const a0 = pegById.get(sourceA)!
	a0.owner = 'a'
	a0.charge.a = CLAIM_CHARGE
	a0.blocked = false
	const b0 = pegById.get(sourceB)!
	b0.owner = 'b'
	b0.charge.b = CLAIM_CHARGE
	b0.blocked = false

	const headingAB = Math.atan2(b0.y - a0.y, b0.x - a0.x)
	const tips: Tip[] = [
		{ owner: 'a', pegId: sourceA, heading: headingAB },
		{ owner: 'b', pegId: sourceB, heading: headingAB + Math.PI },
	]

	return {
		pegs,
		pegById,
		strands,
		strandById,
		tips,
		sparks: [],
		flashes: [],
		slicing: false,
		sources: { a: sourceA, b: sourceB },
		coreHp: { a: CORE_HP, b: CORE_HP },
		tick: 0,
		pulseTimer: 0,
		winner: null,
	}
}

export function uidSpark() {
	return uid('spark')
}

export function resetWorld() {
	world = createWorld()
	scoreA$.set(1)
	scoreB$.set(1)
	hpA$.set(CORE_HP)
	hpB$.set(CORE_HP)
	winner$.set(null)
	hint$.set(null)
	publishWorld()
}

// --- reactive bridge: bumped each tick so the overlay re-renders ---

export const frame$ = atom('og-frame', 0)
export const scoreA$ = atom('og-score-a', 0)
export const scoreB$ = atom('og-score-b', 0)
export const hpA$ = atom('og-hp-a', CORE_HP)
export const hpB$ = atom('og-hp-b', CORE_HP)
// `winner` is the besieger who won — but for the player-facing banner we also
// want to know if it was the PLAYER's core that fell. winner$ holds the winner.
export const winner$ = atom<Owner | null>('og-winner', null)

// Transient player-facing feedback for the constraint system: a short message
// and the tick it expires on (so it auto-clears). Set by the sim/runner, shown
// by the HUD. `tone` colors the message.
export interface Hint {
	text: string
	tone: 'info' | 'warn' | 'good'
	until: number // frame$ value after which it's stale
}
export const hint$ = atom<Hint | null>('og-hint', null)

// Show a hint for ~`frames` frames from now.
export function showHint(text: string, tone: Hint['tone'], frames = 90) {
	hint$.set({ text, tone, until: frame$.get() + frames })
}

export function publishWorld() {
	frame$.set(frame$.get() + 1)
}

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
	hpA$.set(Math.max(0, Math.round(world.coreHp.a)))
	hpB$.set(Math.max(0, Math.round(world.coreHp.b)))
	winner$.set(world.winner)
}

// A peg is owned by whichever color dominates its charge. Near-empty or
// roughly-tied pegs are neutral (null). (Charge mirrors the claimed owner while
// connected, and fades after orphaning, so this stays in sync with the tree.)
export function pegOwner(peg: Peg): Owner | null {
	const { a, b } = peg.charge
	if (a < OWN_THRESHOLD && b < OWN_THRESHOLD) return null
	if (Math.abs(a - b) < TIE_MARGIN) return null
	return a > b ? 'a' : 'b'
}
