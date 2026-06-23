import { addArrival, Peg, Point, Pulse, Strand, uidPulse, World } from './game-state'

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
const EMIT_STEPS = 55 // steps between emitted pulses (~0.9s at 60fps)
const MAX_HOPS = 16 // pegs a pulse can chain through before it fizzles
const PEG_EPS = 1 // a pinned end this close to a peg counts as attached

function near(p: { x: number; y: number }, peg: Peg) {
	return Math.abs(p.x - peg.x) < PEG_EPS && Math.abs(p.y - peg.y) < PEG_EPS
}

function strandLength(strand: Strand) {
	let total = 0
	const pts = strand.points
	for (let i = 0; i < pts.length - 1; i++) {
		total += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y)
	}
	return total
}

function pegAt(world: World, x: number, y: number) {
	return world.pegs.find((p) => Math.abs(p.x - x) < PEG_EPS && Math.abs(p.y - y) < PEG_EPS)
}

// Every strand end pinned at this peg, with which end it is.
function strandsAtPeg(world: World, peg: Peg) {
	const out: { strand: Strand; end: 'first' | 'last' }[] = []
	for (const strand of world.strands) {
		const f = strand.points[0]
		const l = strand.points[strand.points.length - 1]
		if (f.pinned && near(f, peg)) out.push({ strand, end: 'first' })
		if (l.pinned && near(l, peg)) out.push({ strand, end: 'last' })
	}
	return out
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

// Advance every pulse one step, branching at pegs and emitting from sources.
export function stepSignals(world: World) {
	// Emit from each source on a timer.
	world.emitTimer++
	if (world.emitTimer >= EMIT_STEPS) {
		world.emitTimer = 0
		for (const sourceId of world.sources) {
			const peg = world.pegs.find((p) => p.id === sourceId)
			if (!peg) continue
			for (const { strand, end } of strandsAtPeg(world, peg)) {
				world.pulses.push({
					id: uidPulse(),
					strandId: strand.id,
					dir: end === 'first' ? 1 : -1,
					dist: 0,
					hops: 0,
				})
			}
		}
	}

	const next: Pulse[] = []
	for (const pulse of world.pulses) {
		const strand = world.strands.find((s) => s.id === pulse.strandId)
		if (!strand) continue // wire was cut out from under it — pulse dies
		pulse.dist += PULSE_SPEED
		if (pulse.dist < strandLength(strand)) {
			next.push(pulse)
			continue
		}
		// Reached the far end of this strand.
		const farPt = pulse.dir === 1 ? strand.points[strand.points.length - 1] : strand.points[0]
		if (!farPt.pinned) continue // ran off a dangling end — drops off
		const peg = pegAt(world, farPt.x, farPt.y)
		if (!peg) continue
		if (world.outputs.includes(peg.id)) addArrival()
		if (pulse.hops >= MAX_HOPS) continue
		// Branch onto every other strand attached to this peg.
		for (const { strand: s2, end } of strandsAtPeg(world, peg)) {
			if (s2.id === strand.id) continue
			next.push({
				id: uidPulse(),
				strandId: s2.id,
				dir: end === 'first' ? 1 : -1,
				dist: 0,
				hops: pulse.hops + 1,
			})
		}
	}
	world.pulses = next
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
		if (left.length >= 1) next.push({ ...strand, id: strand.id + 'L', points: left })
		if (right.length >= 1) next.push({ ...strand, id: strand.id + 'R', points: right })
	}
	world.strands = next
	// Any pulse riding a strand we just severed dies with it.
	if (cutIds.size) world.pulses = world.pulses.filter((p) => !cutIds.has(p.strandId))
	return cutAny
}

// --- grabbing / re-pinning ---

function endPoint(strand: Strand, end: 'first' | 'last') {
	return end === 'first' ? strand.points[0] : strand.points[strand.points.length - 1]
}

// Grab the nearest strand end within radius of p. Detaches it from any peg so
// it follows the pointer. Returns true if something was grabbed.
export function tryGrab(world: World, p: { x: number; y: number }, radius: number) {
	let best: { strand: Strand; end: 'first' | 'last'; dist: number } | null = null
	for (const strand of world.strands) {
		for (const end of ['first', 'last'] as const) {
			const pt = endPoint(strand, end)
			const dist = Math.hypot(pt.x - p.x, pt.y - p.y)
			if (dist <= radius && (!best || dist < best.dist)) best = { strand, end, dist }
		}
	}
	if (!best) return false
	const pt = endPoint(best.strand, best.end)
	pt.pinned = false
	pt.grabbed = true
	pt.ox = pt.x
	pt.oy = pt.y
	world.grab = { strandId: best.strand.id, end: best.end }
	return true
}

function grabbedPoint(world: World) {
	if (!world.grab) return null
	const strand = world.strands.find((s) => s.id === world.grab!.strandId)
	if (!strand) return null
	return endPoint(strand, world.grab.end)
}

// Move the grabbed end to p, recording motion so the catch carries momentum.
export function dragGrab(world: World, p: { x: number; y: number }) {
	const pt = grabbedPoint(world)
	if (!pt) return
	pt.ox = pt.x
	pt.oy = pt.y
	pt.x = p.x
	pt.y = p.y
}

// Release the grabbed end. If a peg is within snap radius, pin to it; otherwise
// let it go free so it swings away with whatever momentum it had.
export function releaseGrab(world: World, p: { x: number; y: number }, snap: number) {
	const pt = grabbedPoint(world)
	if (pt) {
		let peg: Peg | null = null
		let bestDist = snap
		for (const candidate of world.pegs) {
			const dist = Math.hypot(candidate.x - p.x, candidate.y - p.y)
			if (dist <= bestDist) {
				bestDist = dist
				peg = candidate
			}
		}
		pt.grabbed = false
		if (peg) {
			pt.pinned = true
			pt.x = peg.x
			pt.y = peg.y
			pt.ox = peg.x
			pt.oy = peg.y
		}
	}
	world.grab = null
}
