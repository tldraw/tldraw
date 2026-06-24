import {
	CHARGE_NORM,
	COST_PER_CELL,
	ENERGY_CAP,
	GRID,
	INCOME,
	makeStrand,
	MAX_BUILD_RANGE,
	Owner,
	Peg,
	pegOwner,
	Point,
	publishScores,
	Pulse,
	RELAY_EMIT_STEPS,
	RELAY_EMIT_STRENGTH,
	RELAY_MIN_CHARGE,
	Strand,
	uidPulse,
	World,
} from './game-state'

// Physics tuning. Strands are deliberately stiff (many constraint iterations)
// so they read as taut "lines" rather than floppy rope, but still bend and
// swing once a free end is hanging.
const GRAVITY = 0.5 // page units per step^2
const FRICTION = 0.98 // lower = more damping, so cut wires settle instead of flapping
const ITERATIONS = 25

// A point is held fixed during integration and constraint solving if it's
// nailed to a peg or currently held by the pointer.
function isFixed(p: Point) {
	return p.pinned || p.grabbed
}

// Advance the whole world by one fixed timestep.
export function stepWorld(world: World) {
	for (const strand of world.strands) {
		for (const p of strand.points) {
			if (isFixed(p)) {
				// Keep velocity zeroed so a released pin doesn't inherit drift.
				p.ox = p.x
				p.oy = p.y
				continue
			}
			const vx = (p.x - p.ox) * FRICTION
			const vy = (p.y - p.oy) * FRICTION
			p.ox = p.x
			p.oy = p.y
			p.x += vx
			p.y += vy + GRAVITY
		}
	}

	for (let iter = 0; iter < ITERATIONS; iter++) {
		for (const strand of world.strands) {
			const pts = strand.points
			for (let i = 0; i < pts.length - 1; i++) {
				const a = pts[i]
				const b = pts[i + 1]
				const dx = b.x - a.x
				const dy = b.y - a.y
				const d = Math.hypot(dx, dy) || 0.0001
				const diff = (strand.restLen - d) / d / 2
				const ox = dx * diff
				const oy = dy * diff
				const aMov = !isFixed(a)
				const bMov = !isFixed(b)
				if (aMov && bMov) {
					a.x -= ox
					a.y -= oy
					b.x += ox
					b.y += oy
				} else if (aMov) {
					a.x -= ox * 2
					a.y -= oy * 2
				} else if (bMov) {
					b.x += ox * 2
					b.y += oy * 2
				}
			}
		}
	}
}

// --- signal ---

const PULSE_SPEED = 4 // page units per step
const EMIT_STEPS = 26 // steps between emitted pulses per source (~0.45s at 60fps)
const MAX_HOPS = 12 // pegs a pulse can chain through before it fizzles
const EMIT_STRENGTH = 1.0 // strength of a freshly emitted pulse from a source
const MIN_STRENGTH = 0.12 // below this a pulse is too weak to continue
const DEPOSIT = 1.6 // charge added per unit strength when a pulse hits a peg
const FLOW_BOOST = 0.5 // how brightly a pulse lights its strand on entry

// Charge decay. Every peg loses a fraction of its charge each tick, so a
// territory that stops receiving pulses collapses. Tuned so a peg fed by a
// single supply line fades to neutral within a couple of seconds once cut.
const DECAY = 0.992 // multiplicative per-tick decay (~0.5%/tick)
const FLOW_DECAY = 0.94 // how fast a strand's flow highlight fades when unfed

function strandLength(strand: Strand) {
	let total = 0
	const pts = strand.points
	for (let i = 0; i < pts.length - 1; i++) {
		total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
	}
	return total
}

// --- per-step lookup maps (performance) ---
//
// On a 19x19 board the per-pulse `pegAt`/`strandsAtPeg` scans were O(strands)
// each, making signal stepping O(pulses * strands). We instead build two maps
// once per step: peg-by-id (snapped to integer grid coords) and the list of
// strand ends pinned at each peg, then reuse them for every pulse this step.

// Snap a pinned end to its grid peg id. Pinned ends sit exactly on a peg, so
// rounding to the grid recovers the peg without scanning all pegs.
function pegIdAtPoint(x: number, y: number): string | null {
	const c = Math.round((x - GRID.x0) / GRID.spacing)
	const r = Math.round((y - GRID.y0) / GRID.spacing)
	if (c < 0 || c >= GRID.cols || r < 0 || r >= GRID.rows) return null
	return `peg:${c},${r}`
}

interface StepMaps {
	pegById: Map<string, Peg>
	strandsAtPeg: Map<string, { strand: Strand; end: 'first' | 'last' }[]>
}

function buildStepMaps(world: World): StepMaps {
	const pegById = new Map<string, Peg>()
	for (const peg of world.pegs) pegById.set(peg.id, peg)

	const strandsAtPeg = new Map<string, { strand: Strand; end: 'first' | 'last' }[]>()
	const add = (pegId: string, strand: Strand, end: 'first' | 'last') => {
		let list = strandsAtPeg.get(pegId)
		if (!list) strandsAtPeg.set(pegId, (list = []))
		list.push({ strand, end })
	}
	for (const strand of world.strands) {
		const f = strand.points[0]
		const l = strand.points[strand.points.length - 1]
		if (f.pinned) {
			const id = pegIdAtPoint(f.x, f.y)
			if (id) add(id, strand, 'first')
		}
		if (l.pinned) {
			const id = pegIdAtPoint(l.x, l.y)
			if (id) add(id, strand, 'last')
		}
	}
	return { pegById, strandsAtPeg }
}

function strandsAt(maps: StepMaps, pegId: string) {
	return maps.strandsAtPeg.get(pegId) ?? []
}

// Position of a pulse along its strand, in page coordinates.
export function pulsePos(strand: Strand, dir: 1 | -1, dist: number) {
	const pts = strand.points
	let rem = dist
	if (dir === 1) {
		for (let i = 0; i < pts.length - 1; i++) {
			const a = pts[i]
			const b = pts[i + 1]
			const l = Math.hypot(b.x - a.x, b.y - a.y)
			if (rem <= l) {
				const t = l ? rem / l : 0
				return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
			}
			rem -= l
		}
		return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y }
	}
	for (let i = pts.length - 1; i > 0; i--) {
		const a = pts[i]
		const b = pts[i - 1]
		const l = Math.hypot(b.x - a.x, b.y - a.y)
		if (rem <= l) {
			const t = l ? rem / l : 0
			return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
		}
		rem -= l
	}
	return { x: pts[0].x, y: pts[0].y }
}

// Light a strand in an owner's color (used when a pulse enters it).
function lightStrand(strand: Strand, owner: Owner, level: number) {
	if (!strand.flow || strand.flow.owner === owner || level >= strand.flow.level) {
		strand.flow = { owner, level: Math.min(1, level) }
	}
}

// Spawn a pulse on a strand from a given end, inheriting owner/strength.
function emit(
	world: World,
	strand: Strand,
	end: 'first' | 'last',
	owner: Owner,
	strength: number,
	hops: number
) {
	lightStrand(strand, owner, FLOW_BOOST + strength * 0.5)
	world.pulses.push({
		id: uidPulse(),
		strandId: strand.id,
		dir: end === 'first' ? 1 : -1,
		dist: 0,
		hops,
		owner,
		strength,
	})
}

// Advance every pulse one step, branching at pegs, emitting from sources and
// owned relay pegs (atom 1), and applying charge deposits, decay, and income.
export function stepSignals(world: World) {
	const maps = buildStepMaps(world)

	// Decay all charge and strand highlights first, and pay income for owned
	// pegs in the same pass.
	let incomeA = 0
	let incomeB = 0
	for (const peg of world.pegs) {
		peg.charge.a *= DECAY
		peg.charge.b *= DECAY
		if (peg.charge.a < 0.001) peg.charge.a = 0
		if (peg.charge.b < 0.001) peg.charge.b = 0
		const owner = pegOwner(peg)
		if (owner === 'a') incomeA += INCOME
		else if (owner === 'b') incomeB += INCOME
	}
	world.energy.a = Math.min(ENERGY_CAP, world.energy.a + incomeA)
	world.energy.b = Math.min(ENERGY_CAP, world.energy.b + incomeB)

	for (const strand of world.strands) {
		if (strand.flow) {
			strand.flow.level *= FLOW_DECAY
			if (strand.flow.level < 0.04) strand.flow = null
		}
	}

	// Emit from each player's home source on the fast shared timer. The source
	// is the economic anchor: full strength, always charged for its own color.
	world.emitTimer++
	const sourceEmit = world.emitTimer >= EMIT_STEPS
	if (sourceEmit) world.emitTimer = 0
	for (const owner of ['a', 'b'] as Owner[]) {
		const sourceId = world.sources[owner]
		const peg = maps.pegById.get(sourceId)
		if (!peg) continue
		// A source is always charged for its own color so it stays owned.
		peg.charge[owner] = Math.max(peg.charge[owner], 4)
		if (sourceEmit) {
			for (const { strand, end } of strandsAt(maps, sourceId)) {
				emit(world, strand, end, owner, EMIT_STRENGTH, 0)
			}
		}
	}

	// Atom 1: every owned relay peg (non-source) re-emits its owner's color on a
	// slower per-peg timer, at strength scaled by its charge. This is what makes
	// owned territory spread itself outward into neutral/enemy ground, forming
	// moving fronts — and what makes a region cut off from emitters decay away.
	for (const peg of world.pegs) {
		peg.relayTimer++
		if (peg.relayTimer < RELAY_EMIT_STEPS) continue
		peg.relayTimer = 0
		if (peg.id === world.sources.a || peg.id === world.sources.b) continue
		const owner = pegOwner(peg)
		if (!owner) continue
		const charge = peg.charge[owner]
		if (charge < RELAY_MIN_CHARGE) continue
		const strength = Math.min(1, charge / CHARGE_NORM) * RELAY_EMIT_STRENGTH
		if (strength < MIN_STRENGTH) continue
		for (const { strand, end } of strandsAt(maps, peg.id)) {
			emit(world, strand, end, owner, strength, 0)
		}
	}

	const next: Pulse[] = []
	const strandById = new Map<string, Strand>()
	for (const s of world.strands) strandById.set(s.id, s)

	for (const pulse of world.pulses) {
		const strand = strandById.get(pulse.strandId)
		if (!strand) continue // wire was cut out from under it — pulse dies
		pulse.dist += PULSE_SPEED
		lightStrand(strand, pulse.owner, FLOW_BOOST + pulse.strength * 0.5)
		if (pulse.dist < strandLength(strand)) {
			next.push(pulse)
			continue
		}
		// Reached the far end of this strand.
		const farPt = pulse.dir === 1 ? strand.points[strand.points.length - 1] : strand.points[0]
		if (!farPt.pinned) continue // ran off a dangling end — drops off
		const pegId = pegIdAtPoint(farPt.x, farPt.y)
		const peg = pegId ? maps.pegById.get(pegId) : null
		if (!peg) continue

		// Deposit this pulse's strength as charge of its color.
		peg.charge[pulse.owner] += pulse.strength * DEPOSIT

		if (pulse.hops >= MAX_HOPS) continue

		// Branch onto every other strand at this peg, DIVIDING strength among
		// the branches. Spreading wide dilutes; a too-weak pulse stops here.
		const onward = strandsAt(maps, peg.id).filter(({ strand: s2 }) => s2.id !== strand.id)
		if (onward.length === 0) continue
		const childStrength = pulse.strength / onward.length
		if (childStrength < MIN_STRENGTH) continue
		for (const { strand: s2, end } of onward) {
			emit(world, s2, end, pulse.owner, childStrength, pulse.hops + 1)
		}
	}
	world.pulses = next

	checkWin(world)
	publishScores(world)
}

// --- win condition (atom: keep thin) ---

// Fraction of all pegs a player must hold to trigger the majority win.
const MAJORITY_FRACTION = 0.6
// How long (ticks) that majority must be sustained.
const MAJORITY_HOLD_TICKS = 180

function checkWin(world: World) {
	if (world.winner) return

	// Capture: own the enemy's home source (dominant enemy-color charge on it).
	const homeA = world.pegs.find((p) => p.id === world.sources.a)
	const homeB = world.pegs.find((p) => p.id === world.sources.b)
	if (homeA && pegOwner(homeA) === 'b') {
		world.winner = 'b'
		return
	}
	if (homeB && pegOwner(homeB) === 'a') {
		world.winner = 'a'
		return
	}

	// Majority: hold >= MAJORITY_FRACTION of all pegs for a sustained moment.
	let a = 0
	let b = 0
	for (const peg of world.pegs) {
		const o = pegOwner(peg)
		if (o === 'a') a++
		else if (o === 'b') b++
	}
	const need = world.pegs.length * MAJORITY_FRACTION
	world.majorityHold.a = a >= need ? world.majorityHold.a + 1 : 0
	world.majorityHold.b = b >= need ? world.majorityHold.b + 1 : 0
	if (world.majorityHold.a >= MAJORITY_HOLD_TICKS) world.winner = 'a'
	else if (world.majorityHold.b >= MAJORITY_HOLD_TICKS) world.winner = 'b'
}

// --- cutting ---

// Do segments p1->p2 and p3->p4 cross?
function segmentsIntersect(
	p1: { x: number; y: number },
	p2: { x: number; y: number },
	p3: { x: number; y: number },
	p4: { x: number; y: number }
) {
	const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x)
	if (d === 0) return false
	const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d
	const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d
	return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

// Cut every strand crossed by the slice segment a->b. A strand splits into two:
// each keeps its anchored end, and the newly cut ends become free (and will
// fall/swing). A strand is cut at most once per slice segment.
export function sliceCut(world: World, a: { x: number; y: number }, b: { x: number; y: number }) {
	const next: Strand[] = []
	const cutIds = new Set<string>()
	let cutAny = false
	for (const strand of world.strands) {
		const pts = strand.points
		let cutAt = -1
		for (let i = 0; i < pts.length - 1; i++) {
			if (segmentsIntersect(a, b, pts[i], pts[i + 1])) {
				cutAt = i
				break
			}
		}
		if (cutAt === -1) {
			next.push(strand)
			continue
		}
		cutAny = true
		cutIds.add(strand.id)
		const left = pts.slice(0, cutAt + 1)
		const right = pts.slice(cutAt + 1)
		left[left.length - 1] = { ...left[left.length - 1], pinned: false, grabbed: false }
		right[0] = { ...right[0], pinned: false, grabbed: false }
		// Cut halves lose their flow highlight so a severed line goes dark.
		if (left.length >= 1) next.push({ ...strand, id: strand.id + 'L', points: left, flow: null })
		if (right.length >= 1) next.push({ ...strand, id: strand.id + 'R', points: right, flow: null })
	}
	world.strands = next
	// Any pulse riding a strand we just severed dies with it.
	if (cutIds.size) world.pulses = world.pulses.filter((p) => !cutIds.has(p.strandId))
	return cutAny
}

// --- build verb (atom 2) ---

// Find the peg nearest to a page point within `radius` page units.
export function nearestPeg(world: World, p: { x: number; y: number }, radius: number): Peg | null {
	let best: Peg | null = null
	let bestDist = radius
	for (const peg of world.pegs) {
		const dist = Math.hypot(peg.x - p.x, peg.y - p.y)
		if (dist <= bestDist) {
			bestDist = dist
			best = peg
		}
	}
	return best
}

// Is there already a strand directly between these two pegs?
function strandExistsBetween(world: World, a: Peg, b: Peg) {
	for (const strand of world.strands) {
		const f = strand.points[0]
		const l = strand.points[strand.points.length - 1]
		if (!f.pinned || !l.pinned) continue
		const fId = pegIdAtPoint(f.x, f.y)
		const lId = pegIdAtPoint(l.x, l.y)
		if ((fId === a.id && lId === b.id) || (fId === b.id && lId === a.id)) return true
	}
	return false
}

// Energy cost to build a strand between two pegs: per grid cell of length.
export function buildCost(a: Peg, b: Peg) {
	const dist = Math.hypot(b.x - a.x, b.y - a.y)
	return Math.ceil(dist / GRID.spacing) * COST_PER_CELL
}

// Whether `owner` could build a wire from `a` to `b` right now: distinct pegs,
// within range, not already wired, and affordable.
export function canBuild(world: World, owner: Owner, a: Peg, b: Peg) {
	if (a.id === b.id) return false
	const cells = Math.hypot(b.x - a.x, b.y - a.y) / GRID.spacing
	if (cells > MAX_BUILD_RANGE + 0.001) return false
	if (strandExistsBetween(world, a, b)) return false
	return world.energy[owner] >= buildCost(a, b)
}

// Build a wire from `a` to `b` for `owner`, spending energy. Returns true if
// built. The new strand starts with no flow. Used by both the human and the AI.
export function buildStrand(world: World, owner: Owner, a: Peg, b: Peg): boolean {
	if (!canBuild(world, owner, a, b)) return false
	world.energy[owner] -= buildCost(a, b)
	world.strands.push(makeStrand(a, b))
	return true
}

// --- AI opponent (player B / blue) ---

// Adjacency in grid cells used to find frontier pegs and build targets.
const AI_AGGRESSION_CUT = 0.25 // probability the AI spends an action on a harass cut

// A peg is a blue frontier if blue owns it and it has a neutral/red neighbor
// within build range — i.e. a place blue can push out from.
function ownerOf(peg: Peg) {
	return pegOwner(peg)
}

// Advance the AI one decision. Called on a slow cadence from the runner so the
// behaviour is readable. Uses the same buildStrand/sliceCut the human uses.
export function aiStep(world: World) {
	if (world.winner) return
	const me: Owner = 'b'
	const enemy: Owner = 'a'

	// HARASS: occasionally sever an exposed red supply line bridging toward blue.
	if (Math.random() < AI_AGGRESSION_CUT) {
		if (aiHarassCut(world, enemy)) return
	}

	// MACRO/expand: from a blue-owned peg adjacent to neutral/red ground, build
	// toward the nearest valuable neutral or red-leaning peg in range, biased
	// toward the board center and toward red.
	if (world.energy[me] < COST_PER_CELL) return

	const homeA = world.pegs.find((p) => p.id === world.sources.a)!
	const center = {
		x: ((GRID.cols - 1) * GRID.spacing) / 2,
		y: ((GRID.rows - 1) * GRID.spacing) / 2,
	}

	// Candidate source pegs: blue-owned (so the build extends real territory).
	const owned = world.pegs.filter((p) => ownerOf(p) === me)
	if (owned.length === 0) return

	// Index pegs by grid coords so we only consider targets within build range of
	// each source peg, instead of scanning all 361 pegs per owned peg.
	const pegByCell = new Map<string, Peg>()
	for (const p of world.pegs) pegByCell.set(`${p.col},${p.row}`, p)
	const range = Math.floor(MAX_BUILD_RANGE)

	let bestFrom: Peg | null = null
	let bestTo: Peg | null = null
	let bestScore = -Infinity

	for (const from of owned) {
		for (let dc = -range; dc <= range; dc++) {
			for (let dr = -range; dr <= range; dr++) {
				const to = pegByCell.get(`${from.col + dc},${from.row + dr}`)
				if (!to) continue
				if (!canBuild(world, me, from, to)) continue
				const toOwner = ownerOf(to)
				if (toOwner === me) continue // no point wiring into our own held ground
				// Value: prefer neutral or red-leaning targets, closer to center and
				// to red's home (aggression). Penalise long builds slightly (cost).
				const towardRed = -Math.hypot(to.x - homeA.x, to.y - homeA.y)
				const towardCenter = -Math.hypot(to.x - center.x, to.y - center.y)
				const enemyLean = to.charge[enemy] // attacking contested/red ground is valuable
				const cost = buildCost(from, to)
				const score =
					enemyLean * 40 + towardCenter * 0.5 + towardRed * 0.6 - cost * 2 + Math.random() * 30
				if (score > bestScore) {
					bestScore = score
					bestFrom = from
					bestTo = to
				}
			}
		}
	}

	if (bestFrom && bestTo) buildStrand(world, me, bestFrom, bestTo)
}

// Pick a red-flow strand that bridges toward blue's side and cut it.
function aiHarassCut(world: World, enemy: Owner): boolean {
	const homeB = world.pegs.find((p) => p.id === world.sources.b)!
	let best: Strand | null = null
	let bestDist = Infinity
	for (const strand of world.strands) {
		if (strand.flow?.owner !== enemy) continue
		const mid = strand.points[Math.floor(strand.points.length / 2)]
		const dist = Math.hypot(mid.x - homeB.x, mid.y - homeB.y)
		if (dist < bestDist) {
			bestDist = dist
			best = strand
		}
	}
	if (!best) return false
	// Slice across the strand's midpoint with a short perpendicular segment.
	const pts = best.points
	const i = Math.floor(pts.length / 2)
	const a = pts[Math.max(0, i - 1)]
	const b = pts[Math.min(pts.length - 1, i + 1)]
	const dx = b.x - a.x
	const dy = b.y - a.y
	const len = Math.hypot(dx, dy) || 1
	const nx = -dy / len
	const ny = dx / len
	const mid = pts[i]
	const r = GRID.spacing * 0.4
	return sliceCut(
		world,
		{ x: mid.x - nx * r, y: mid.y - ny * r },
		{ x: mid.x + nx * r, y: mid.y + ny * r }
	)
}
