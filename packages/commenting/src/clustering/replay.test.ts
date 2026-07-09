import { describe, expect, it } from 'vitest'
import { mstEdges } from './mst'
// These imports are red until step 2 is implemented — that is intentional.
// Implement `replay.ts` (and the step 2 additions to `types.ts`) per
// CLUSTERING-STEPS.md until this suite passes, without modifying this file.
import { cappedReplay, D_FLOOR } from './replay'
import { ClusterNode, LeafInput, MstEdge, RawMergeEvent } from './types'

function leaf(id: string, x: number, y: number): LeafInput {
	return { id, point: { x, y } }
}

/** Deterministic PRNG so random tests are reproducible. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0
	return () => {
		a = (a + 0x6d2b79f5) >>> 0
		let t = a
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
	const out = items.slice()
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1))
		;[out[i], out[j]] = [out[j], out[i]]
	}
	return out
}

function randomLeaves(n: number, seed: number, scale = 1000): LeafInput[] {
	const rand = mulberry32(seed)
	return Array.from({ length: n }, (_, i) => leaf(`leaf-${i}`, rand() * scale, rand() * scale))
}

/** Order-independent, index-free projection of an event for cross-run comparison. */
function eventShape(ev: RawMergeEvent) {
	return {
		z: ev.z,
		children: ev.children.map((c) => c.id),
		result: ev.result.id,
		members: ev.result.members,
		count: ev.result.count,
	}
}

function eventShapes(events: RawMergeEvent[]) {
	return events.map(eventShape)
}

// --- Reference oracle -------------------------------------------------------
// Direct transcription of contract clause 4 (CLUSTERING-STEPS.md step 2): at
// each of the n−1 steps, evaluate every unfired MST edge's zEff against the
// CURRENT clusters and fire the highest, tie-broken by the edge's normalized
// id pair. O(n · E) per build — slow and obviously correct.

interface RefCluster {
	members: string[] // sorted lexicographic; members[0] is the min-member id
	centroid: { x: number; y: number }
	count: number
	minX: number
	minY: number
	maxX: number
	maxY: number
}

function refNode(c: RefCluster): ClusterNode {
	return {
		id: c.count === 1 ? c.members[0] : `cluster:${c.count}:${c.members[0]}`,
		centroid: { x: c.centroid.x, y: c.centroid.y },
		count: c.count,
		members: c.members.slice(),
	}
}

function refDiag(a: RefCluster, b: RefCluster): number {
	const w = Math.max(a.maxX, b.maxX) - Math.min(a.minX, b.minX)
	const h = Math.max(a.maxY, b.maxY) - Math.min(a.minY, b.minY)
	return Math.hypot(w, h)
}

function referenceReplay(
	leaves: readonly LeafInput[],
	edges: readonly MstEdge[],
	opts: { Tc: number; Dmax: number }
): RawMergeEvent[] {
	const n = leaves.length
	const parent = Array.from({ length: n }, (_, i) => i)
	const find = (x: number): number => {
		while (parent[x] !== x) {
			parent[x] = parent[parent[x]]
			x = parent[x]
		}
		return x
	}
	const clusters = new Map<number, RefCluster>()
	for (let i = 0; i < n; i++) {
		const p = leaves[i].point
		clusters.set(i, {
			members: [leaves[i].id],
			centroid: { x: p.x, y: p.y },
			count: 1,
			minX: p.x,
			minY: p.y,
			maxX: p.x,
			maxY: p.y,
		})
	}

	const zOf = (e: MstEdge): number => {
		// coincident anchors: permanently merged; the fit term is not consulted
		if (e.d < D_FLOOR) return Infinity
		const a = clusters.get(find(e.a))!
		const b = clusters.get(find(e.b))!
		// badge-anchored gap: priced by the clusters' centroid distance
		const gap = opts.Tc / Math.hypot(a.centroid.x - b.centroid.x, a.centroid.y - b.centroid.y)
		const fit = opts.Dmax / refDiag(a, b)
		return Math.min(gap, fit)
	}

	const unfired = edges.slice()
	const events: RawMergeEvent[] = []
	let lastZ = Infinity // emitted thresholds are clamped non-increasing
	while (unfired.length > 0) {
		let best = 0
		let bestZ = zOf(unfired[0])
		for (let i = 1; i < unfired.length; i++) {
			const z = zOf(unfired[i])
			if (z > bestZ) {
				best = i
				bestZ = z
				continue
			}
			if (z === bestZ) {
				// tie-break by the edge's normalized id pair, ascending idLo then idHi
				const a = unfired[i]
				const b = unfired[best]
				const aLo = leaves[a.a].id
				const aHi = leaves[a.b].id
				const bLo = leaves[b.a].id
				const bHi = leaves[b.b].id
				if (aLo < bLo || (aLo === bLo && aHi < bHi)) {
					best = i
					bestZ = z
				}
			}
		}
		const e = unfired.splice(best, 1)[0]
		const ra = find(e.a)
		const rb = find(e.b)
		const ca = clusters.get(ra)!
		const cb = clusters.get(rb)!
		const [first, second] = ca.members[0] < cb.members[0] ? [ca, cb] : [cb, ca]
		const count = ca.count + cb.count
		const merged: RefCluster = {
			members: [...ca.members, ...cb.members].sort(),
			centroid: {
				x: (ca.count * ca.centroid.x + cb.count * cb.centroid.x) / count,
				y: (ca.count * ca.centroid.y + cb.count * cb.centroid.y) / count,
			},
			count,
			minX: Math.min(ca.minX, cb.minX),
			minY: Math.min(ca.minY, cb.minY),
			maxX: Math.max(ca.maxX, cb.maxX),
			maxY: Math.max(ca.maxY, cb.maxY),
		}
		parent[ra] = rb
		clusters.delete(ra)
		clusters.set(find(rb), merged)
		const z = Math.min(bestZ, lastZ)
		lastZ = z
		events.push({
			z,
			children: [refNode(first), refNode(second)],
			result: refNode(merged),
		})
	}
	return events
}

// --- Shared invariant assertions --------------------------------------------

function expectNonIncreasingZ(events: RawMergeEvent[]) {
	for (let i = 1; i < events.length; i++) {
		expect(events[i].z).toBeLessThanOrEqual(events[i - 1].z)
	}
}

/**
 * Dendrogram integrity: children are consumed exactly once, results are well
 * formed unions, and replaying all events over the leaves ends in one root.
 */
function expectDendrogramIntegrity(events: RawMergeEvent[], leaves: readonly LeafInput[]) {
	const live = new Map<string, ClusterNode>()
	for (const l of leaves) {
		live.set(l.id, { id: l.id, centroid: { ...l.point }, count: 1, members: [l.id] })
	}
	for (const ev of events) {
		expect(ev.children).toHaveLength(2)
		// children must currently exist (consumed exactly once, produced before use)
		for (const child of ev.children) {
			expect(live.get(child.id)).toBeDefined()
			live.delete(child.id)
		}
		// children tuple ordered by ascending min-member id
		expect(ev.children[0].members[0] < ev.children[1].members[0]).toBe(true)
		// result members = sorted union of children members
		const union = [...ev.children[0].members, ...ev.children[1].members].sort()
		expect(ev.result.members).toEqual(union)
		expect(ev.result.count).toBe(ev.children[0].count + ev.children[1].count)
		expect(ev.result.id).toBe(`cluster:${ev.result.count}:${union[0]}`)
		expect(live.has(ev.result.id)).toBe(false)
		live.set(ev.result.id, ev.result)
	}
	// n−1 merges over a spanning tree always end in a single root
	if (leaves.length >= 2) {
		expect(live.size).toBe(1)
		const root = [...live.values()][0]
		expect(root.members).toEqual(leaves.map((l) => l.id).sort())
	}
}

/** Locality invariant: at its birth zoom, a cluster spans at most Dmax screen px. */
function expectLocality(events: RawMergeEvent[], leaves: readonly LeafInput[], Dmax: number) {
	const pointOf = new Map(leaves.map((l) => [l.id, l.point]))
	for (const ev of events) {
		if (!Number.isFinite(ev.z)) continue
		let minX = Infinity
		let minY = Infinity
		let maxX = -Infinity
		let maxY = -Infinity
		for (const id of ev.result.members) {
			const p = pointOf.get(id)!
			minX = Math.min(minX, p.x)
			minY = Math.min(minY, p.y)
			maxX = Math.max(maxX, p.x)
			maxY = Math.max(maxY, p.y)
		}
		const diag = Math.hypot(maxX - minX, maxY - minY)
		expect(ev.z * diag).toBeLessThanOrEqual(Dmax * (1 + 1e-9))
	}
}

/** Centroids equal the count-weighted mean = plain mean of all member anchors. */
function expectCentroids(events: RawMergeEvent[], leaves: readonly LeafInput[]) {
	const pointOf = new Map(leaves.map((l) => [l.id, l.point]))
	for (const ev of events) {
		let sx = 0
		let sy = 0
		for (const id of ev.result.members) {
			const p = pointOf.get(id)!
			sx += p.x
			sy += p.y
		}
		expect(ev.result.centroid.x).toBeCloseTo(sx / ev.result.count, 8)
		expect(ev.result.centroid.y).toBeCloseTo(sy / ev.result.count, 8)
	}
}

// --- Fixtures ----------------------------------------------------------------

describe('cappedReplay fixtures', () => {
	it('exports the pinned D_FLOOR constant', () => {
		expect(D_FLOOR).toBe(1e-9)
	})

	it('returns [] for fewer than two leaves', () => {
		expect(cappedReplay([], [], { Tc: 40, Dmax: 120 })).toEqual([])
		const one = [leaf('only', 3, 3)]
		expect(cappedReplay(one, mstEdges(one), { Tc: 40, Dmax: 120 })).toEqual([])
	})

	it('merges a gap-limited pair at z = Tc/d with exact node bookkeeping', () => {
		const leaves = [leaf('a', 0, 0), leaf('b', 10, 0)]
		const events = cappedReplay(leaves, mstEdges(leaves), { Tc: 40, Dmax: 120 })
		expect(events).toEqual([
			{
				z: 4,
				children: [
					{ id: 'a', centroid: { x: 0, y: 0 }, count: 1, members: ['a'] },
					{ id: 'b', centroid: { x: 10, y: 0 }, count: 1, members: ['b'] },
				],
				result: { id: 'cluster:2:a', centroid: { x: 5, y: 0 }, count: 2, members: ['a', 'b'] },
			},
		])
	})

	it('gives coincident anchors z = Infinity', () => {
		const leaves = [leaf('a', 7, 7), leaf('b', 7, 7)]
		const events = cappedReplay(leaves, mstEdges(leaves), { Tc: 40, Dmax: 120 })
		expect(events).toHaveLength(1)
		expect(events[0].z).toBe(Infinity)
		expect(events[0].result.id).toBe('cluster:2:a')
	})

	it('treats sub-D_FLOOR distances as coincident, but not distances above it', () => {
		const below = [leaf('a', 0, 0), leaf('b', 1e-12, 0)]
		expect(cappedReplay(below, mstEdges(below), { Tc: 40, Dmax: 120 })[0].z).toBe(Infinity)
		const above = [leaf('a', 0, 0), leaf('b', 1e-6, 0)]
		const [ev] = cappedReplay(above, mstEdges(above), { Tc: 40, Dmax: 120 })
		expect(ev.z).toBe(40 / 1e-6)
		expect(Number.isFinite(ev.z)).toBe(true)
	})

	it('fires the coincident merge first, then the bridge (Infinity sorts to the head)', () => {
		const leaves = [leaf('a', 5, 5), leaf('b', 5, 5), leaf('c', 105, 5)]
		const events = cappedReplay(leaves, mstEdges(leaves), { Tc: 40, Dmax: 120 })
		expect(eventShapes(events)).toEqual([
			{ z: Infinity, children: ['a', 'b'], result: 'cluster:2:a', members: ['a', 'b'], count: 2 },
			{
				z: 40 / 100,
				children: ['cluster:2:a', 'c'],
				result: 'cluster:3:a',
				members: ['a', 'b', 'c'],
				count: 3,
			},
		])
	})

	it('replays the ABCDE path of CLUSTERING.md appendix A.1 (cap not binding)', () => {
		// a —10— b —25— c —12— d —40— e, Tc = 300, cap effectively off.
		// The MST edges still decide WHICH clusters merge; the gap term prices
		// each merge by the clusters' CENTROID distance:
		//   a+b at 300/10 (leaves: centroid dist = edge length)
		//   c+d at 300/12... no — c–d edge, leaves, d = 12 → 300/12 = 25
		//   {a,b}+{c,d} via b–c: centroids (5,0) vs (41,0) → 300/36
		//   +e via d–e: centroids (23,0) vs (87,0) → 300/64
		const leaves = [
			leaf('a', 0, 0),
			leaf('b', 10, 0),
			leaf('c', 35, 0),
			leaf('d', 47, 0),
			leaf('e', 87, 0),
		]
		const events = cappedReplay(leaves, mstEdges(leaves), { Tc: 300, Dmax: 1e9 })
		expect(eventShapes(events)).toEqual([
			{ z: 30, children: ['a', 'b'], result: 'cluster:2:a', members: ['a', 'b'], count: 2 },
			{ z: 25, children: ['c', 'd'], result: 'cluster:2:c', members: ['c', 'd'], count: 2 },
			{
				z: 300 / 36,
				children: ['cluster:2:a', 'cluster:2:c'],
				result: 'cluster:4:a',
				members: ['a', 'b', 'c', 'd'],
				count: 4,
			},
			{
				z: 300 / 64,
				children: ['cluster:4:a', 'e'],
				result: 'cluster:5:a',
				members: ['a', 'b', 'c', 'd', 'e'],
				count: 5,
			},
		])
		// exact incremental centroids: (5,0), (41,0), (23,0), (35.8,0)
		expect(events.map((e) => e.result.centroid.x)).toEqual([5, 41, 23, 35.8])
	})

	it('prices cluster merges by badge (centroid) distance, not nearest members', () => {
		// Two tight pairs whose facing members are only 14 apart but whose
		// centroids are 20 apart. Nearest-member pricing would join the badges at
		// z = 40/14 ≈ 2.86 — while the rendered badges still look far apart.
		// Centroid pricing fires at 40/20 = 2.
		const leaves = [leaf('a', 0, 0), leaf('b', 6, 0), leaf('c', 20, 0), leaf('d', 26, 0)]
		const events = cappedReplay(leaves, mstEdges(leaves), { Tc: 40, Dmax: 1000 })
		expect(events.map((e) => e.z)).toEqual([40 / 6, 40 / 6, 2])
		expect(events[2].children.map((c) => c.id)).toEqual(['cluster:2:a', 'cluster:2:c'])
	})

	it('builds the 8-pin chain hierarchically: pairs, then quads, then the octet', () => {
		// p1..p8 spaced 10 apart, Tc = 40, Dmax = 120 (CLUSTERING.md appendix A.2).
		// Leaf pairs all price at 40/10 = 4. Once a pair forms, extending it is
		// priced from the pair's CENTROID (dist 15 → z ≈ 2.67), which loses ties
		// against the remaining leaf pairs — so the chain forms 4 pairs first.
		// Pair-pair merges price at centroid dist 20 → z = 2 (quads), and the
		// final quad-quad bridge at centroid dist 40 (centroids 15 and 55) → z = 1.
		// Centroid pricing alone now produces the progressive doubling the cap
		// used to force; the cap remains as the hard extent guarantee.
		const leaves = Array.from({ length: 8 }, (_, i) => leaf(`p${i + 1}`, i * 10, 0))
		const events = cappedReplay(leaves, mstEdges(leaves), { Tc: 40, Dmax: 120 })
		expect(events.map((e) => e.z)).toEqual([4, 4, 4, 4, 2, 2, 1])
		expect(events.map((e) => e.result.id)).toEqual([
			'cluster:2:p1',
			'cluster:2:p3',
			'cluster:2:p5',
			'cluster:2:p7',
			'cluster:4:p1',
			'cluster:4:p5',
			'cluster:8:p1',
		])
		expect(events[4].children.map((c) => c.id)).toEqual(['cluster:2:p1', 'cluster:2:p3'])
		expect(events[6].children.map((c) => c.id)).toEqual(['cluster:4:p1', 'cluster:4:p5'])
		expect(events[6].result.members).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'])
	})

	it('computes the fit term from the union bbox DIAGONAL, not an axis span', () => {
		// {a,b} spans (0,0)–(0,30); adding c(40,30) makes the union bbox 40×30,
		// diag hypot(40,30) = 50. With Tc = 100, Dmax = 110:
		//   a–b: leaves at dist 30 → min(100/30, 110/30) = 100/30 (gap-limited)
		//   b–c after a+b: centroid (0,15) to c(40,30) → gap = 100/√1825 ≈ 2.34;
		//   fit via the diagonal = 110/50 = 2.2 wins (an axis-span implementation
		//   would give 110/40 = 2.75 and the gap term would win instead)
		const leaves = [leaf('a', 0, 0), leaf('b', 0, 30), leaf('c', 40, 30)]
		const events = cappedReplay(leaves, mstEdges(leaves), { Tc: 100, Dmax: 110 })
		expect(events.map((e) => e.z)).toEqual([100 / 30, 2.2])
		expect(events[1].result.id).toBe('cluster:3:a')
	})
})

// --- Properties against the reference oracle ---------------------------------

describe('cappedReplay vs reference simulator', () => {
	const OPTION_SETS = [
		{ Tc: 40, Dmax: 120 }, // default shape
		{ Tc: 40, Dmax: 40 }, // tightest legal cap — maximally fit-limited
		{ Tc: 5, Dmax: 1000 }, // cap effectively off
	]

	it.each([2, 3, 5, 10, 40, 80])('matches the oracle on %i random points', (n) => {
		for (const seed of [1, 42]) {
			const leaves = randomLeaves(n, seed * 31 + n)
			const edges = mstEdges(leaves)
			for (const opts of OPTION_SETS) {
				const actual = cappedReplay(leaves, edges, opts)
				const expected = referenceReplay(leaves, edges, opts)
				expect(eventShapes(actual)).toEqual(eventShapes(expected))
				// pinned formulas (hypot diag, incremental centroid) ⇒ exact floats
				expect(actual.map((e) => e.z)).toEqual(expected.map((e) => e.z))
				for (let i = 0; i < actual.length; i++) {
					expect(actual[i].result.centroid).toEqual(expected[i].result.centroid)
				}
			}
		}
	})

	it('matches the oracle on mixed-sign and far-offset coordinates', () => {
		const rand = mulberry32(101)
		const mixed = Array.from({ length: 40 }, (_, i) =>
			leaf(`m-${i}`, (rand() - 0.5) * 2000, (rand() - 0.5) * 2000)
		)
		const offset = Array.from({ length: 40 }, (_, i) =>
			leaf(`f-${i}`, -5_000_000 + rand() * 1000, 3_000_000 + rand() * 1000)
		)
		for (const leaves of [mixed, offset]) {
			const edges = mstEdges(leaves)
			for (const opts of OPTION_SETS) {
				expect(eventShapes(cappedReplay(leaves, edges, opts))).toEqual(
					eventShapes(referenceReplay(leaves, edges, opts))
				)
			}
		}
	})

	it('matches the oracle on lattice points (exact ties + coincident anchors)', () => {
		const rand = mulberry32(7)
		const leaves = Array.from({ length: 50 }, (_, i) =>
			leaf(`lat-${i}`, Math.floor(rand() * 10) * 10, Math.floor(rand() * 10) * 10)
		)
		const edges = mstEdges(leaves)
		for (const opts of OPTION_SETS) {
			expect(eventShapes(cappedReplay(leaves, edges, opts))).toEqual(
				eventShapes(referenceReplay(leaves, edges, opts))
			)
		}
	})
})

describe('cappedReplay invariants', () => {
	it('satisfies all structural invariants on random inputs', () => {
		for (const seed of [3, 99]) {
			for (const n of [2, 7, 30, 60]) {
				const leaves = randomLeaves(n, seed * 17 + n)
				const events = cappedReplay(leaves, mstEdges(leaves), { Tc: 40, Dmax: 120 })
				expect(events).toHaveLength(n - 1)
				expectNonIncreasingZ(events)
				expectDendrogramIntegrity(events, leaves)
				expectLocality(events, leaves, 120)
				expectCentroids(events, leaves)
			}
		}
	})

	it('holds the locality invariant even at the tightest legal cap', () => {
		const leaves = randomLeaves(50, 13)
		const events = cappedReplay(leaves, mstEdges(leaves), { Tc: 40, Dmax: 40 })
		expectNonIncreasingZ(events)
		expectDendrogramIntegrity(events, leaves)
		expectLocality(events, leaves, 40)
	})

	it('is invariant under input permutation (as id-keyed event structures)', () => {
		const base = randomLeaves(40, 21)
		const expected = eventShapes(cappedReplay(base, mstEdges(base), { Tc: 40, Dmax: 120 }))
		for (const shuffleSeed of [5, 23]) {
			const perm = shuffled(base, mulberry32(shuffleSeed))
			expect(eventShapes(cappedReplay(perm, mstEdges(perm), { Tc: 40, Dmax: 120 }))).toEqual(
				expected
			)
		}
	})

	it('is pure: identical repeat output, no input mutation', () => {
		const leaves = randomLeaves(20, 5)
		const edges = mstEdges(leaves)
		const leavesSnapshot = JSON.parse(JSON.stringify(leaves))
		const edgesSnapshot = JSON.parse(JSON.stringify(edges))
		const first = cappedReplay(leaves, edges, { Tc: 40, Dmax: 120 })
		const second = cappedReplay(leaves, edges, { Tc: 40, Dmax: 120 })
		expect(first).toEqual(second)
		expect(leaves).toEqual(leavesSnapshot)
		expect(edges).toEqual(edgesSnapshot)
	})
})

describe('cappedReplay validation', () => {
	const leaves = [leaf('a', 0, 0), leaf('b', 10, 0)]
	const edges = mstEdges(leaves)

	it('throws on non-positive Tc, naming the option', () => {
		expect(() => cappedReplay(leaves, edges, { Tc: 0, Dmax: 120 })).toThrow(/Tc/)
		expect(() => cappedReplay(leaves, edges, { Tc: -5, Dmax: 120 })).toThrow(/Tc/)
	})

	it('throws on non-positive Dmax, naming the option', () => {
		expect(() => cappedReplay(leaves, edges, { Tc: 40, Dmax: 0 })).toThrow(/Dmax/)
		expect(() => cappedReplay(leaves, edges, { Tc: 40, Dmax: -1 })).toThrow(/Dmax/)
	})

	it('throws when Dmax < Tc, naming the option', () => {
		expect(() => cappedReplay(leaves, edges, { Tc: 40, Dmax: 30 })).toThrow(/Dmax/)
	})
})

describe('cappedReplay performance', () => {
	it('replays 2,000 points well within budget', () => {
		const leaves = randomLeaves(2000, 2026)
		const edges = mstEdges(leaves)
		const start = performance.now()
		const events = cappedReplay(leaves, edges, { Tc: 40, Dmax: 120 })
		const elapsed = performance.now() - start
		expect(events).toHaveLength(1999)
		// generous bound to stay non-flaky on slow CI
		expect(elapsed).toBeLessThan(2000)
	})
})
