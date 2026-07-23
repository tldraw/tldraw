import { describe, expect, it } from 'vitest'
import { mstEdges } from './mst'
import { cappedReplay } from './replay'
import { createClusterRuntime } from './runtime'
import { contract, finalize } from './schedule'
import { ClusterNode, ClusterTable, LeafInput, MergeEvent } from './types'

// --- Synthetic builders --------------------------------------------------------

function node(ids: string[], x = 0, y = 0): ClusterNode {
	const members = ids.slice().sort()
	return {
		id: members.length === 1 ? members[0] : `cluster:${members.length}:${members[0]}`,
		centroid: { x, y },
		count: members.length,
		members,
	}
}

function mev(
	zMerge: number,
	zSplit: number,
	children: ClusterNode[],
	result: ClusterNode
): MergeEvent {
	return { zMerge, zSplit, children, result }
}

function visibleIds(runtime: { getVisible(): ReadonlyMap<string, ClusterNode> }): string[] {
	return [...runtime.getVisible().keys()].sort()
}

/** Reference derivation: start from all leaves, apply events[0..k) in order. */
function referenceVisible(table: ClusterTable, k: number): Map<string, ClusterNode> {
	const map = new Map(table.leaves.map((l) => [l.id, l]))
	for (let i = 0; i < k; i++) {
		const ev = table.events[i]
		for (const child of ev.children) map.delete(child.id)
		map.set(ev.result.id, ev.result)
	}
	return map
}

/** Contract clause 3 postconditions, asserted after every seed/onCamera. */
function expectPostconditions(
	runtime: { readonly k: number; getVisible(): ReadonlyMap<string, ClusterNode> },
	table: ClusterTable,
	zoom: number
) {
	const k = runtime.k
	expect(k).toBeGreaterThanOrEqual(0)
	expect(k).toBeLessThanOrEqual(table.events.length)
	if (k < table.events.length) expect(zoom).toBeGreaterThan(table.events[k].zMerge)
	if (k > 0) expect(zoom).toBeLessThan(table.events[k - 1].zSplit)
	const expected = referenceVisible(table, k)
	expect(visibleIds(runtime)).toEqual([...expected.keys()].sort())
	for (const [id, nodeRef] of expected) {
		// deep equality: a restored leaf may be the event's child object rather
		// than the leaves-array twin — both are table objects (no-cloning is
		// asserted by identity in the fixture tests, where objects are shared)
		expect(runtime.getVisible().get(id)).toEqual(nodeRef)
	}
}

// The micro-trace table of CLUSTERING.md §8.5:
//   E0 { zMerge 4.0, zSplit 6.0, A+B+C → P }
//   E1 { zMerge 1.0, zSplit 1.5, P+D → Q }
const A = node(['a'], 0, 0)
const B = node(['b'], 10, 0)
const C = node(['c'], 20, 0)
const D = node(['d'], 100, 0)
const P = node(['a', 'b', 'c'], 10, 0)
const Q = node(['a', 'b', 'c', 'd'], 32.5, 0)

function microTraceTable(): ClusterTable {
	return {
		events: [mev(4, 6, [A, B, C], P), mev(1, 1.5, [P, D], Q)],
		leaves: [A, B, C, D],
	}
}

// --- Fixtures -------------------------------------------------------------------

describe('createClusterRuntime micro-trace (CLUSTERING.md §8.5)', () => {
	it('walks the exact documented trace', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)

		// mount at zoom 5.0 → seed: √(4·6) ≈ 4.9 < 5.0 → k = 0
		rt.seed(5.0)
		expect(rt.k).toBe(0)
		expect(visibleIds(rt)).toEqual(['a', 'b', 'c', 'd'])
		expectPostconditions(rt, table, 5.0)

		// zoom out to 3.5 → fire E0
		rt.onCamera(3.5)
		expect(rt.k).toBe(1)
		expect(visibleIds(rt)).toEqual(['cluster:3:a', 'd'])
		expectPostconditions(rt, table, 3.5)

		// zoom back in to 5.0 → inside E0's band (4 < 5 < 6): hold — no flicker
		rt.onCamera(5.0)
		expect(rt.k).toBe(1)
		expect(visibleIds(rt)).toEqual(['cluster:3:a', 'd'])
		expectPostconditions(rt, table, 5.0)

		// zoom in to 6.2 → split E0
		rt.onCamera(6.2)
		expect(rt.k).toBe(0)
		expect(visibleIds(rt)).toEqual(['a', 'b', 'c', 'd'])
		expectPostconditions(rt, table, 6.2)

		// zoom-to-fit at 0.8 → fires E0 AND E1 in one call
		rt.onCamera(0.8)
		expect(rt.k).toBe(2)
		expect(visibleIds(rt)).toEqual(['cluster:4:a'])
		expectPostconditions(rt, table, 0.8)

		// pan (same zoom) → no-op
		rt.onCamera(0.8)
		expect(rt.k).toBe(2)
		expect(visibleIds(rt)).toEqual(['cluster:4:a'])
	})

	it('splits multiple events in one zoom-in jump', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(0.8) // √(4·6) ≈ 4.9 ≥ 0.8 and √(1·1.5) ≈ 1.22 ≥ 0.8 → k = 2
		expect(rt.k).toBe(2)
		rt.onCamera(7) // ≥ both zSplits (1.5 and 6) → unwinds to k = 0
		expect(rt.k).toBe(0)
		expect(visibleIds(rt)).toEqual(['a', 'b', 'c', 'd'])
		expectPostconditions(rt, table, 7)
	})
})

describe('createClusterRuntime seeding', () => {
	it('seeds each side of the geometric band midpoint', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		const mid0 = Math.sqrt(4 * 6) // ≈ 4.898979
		const mid1 = Math.sqrt(1 * 1.5) // ≈ 1.224745

		rt.seed(mid0 + 0.001) // just above E0's midpoint → unmerged
		expect(rt.k).toBe(0)

		rt.seed(mid0) // exactly at the midpoint: zoom <= mid counts as merged
		expect(rt.k).toBe(1)

		rt.seed(mid1 + 0.001) // between the two midpoints → only E0 active
		expect(rt.k).toBe(1)

		rt.seed(mid1) // at/below E1's midpoint → both active
		expect(rt.k).toBe(2)
		expect(visibleIds(rt)).toEqual(['cluster:4:a'])
	})

	it('re-seeding resets state from scratch', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(0.8)
		expect(rt.k).toBe(2)
		rt.seed(5.0) // rebuild-style reset: history is discarded
		expect(rt.k).toBe(0)
		expect(visibleIds(rt)).toEqual(['a', 'b', 'c', 'd'])
	})

	it('throws on non-positive or non-finite seed zoom', () => {
		const rt = createClusterRuntime(microTraceTable())
		expect(() => rt.seed(0)).toThrow()
		expect(() => rt.seed(-1)).toThrow()
		expect(() => rt.seed(NaN)).toThrow()
		expect(() => rt.seed(Infinity)).toThrow()
	})

	it('throws if onCamera is called before any seed', () => {
		const rt = createClusterRuntime(microTraceTable())
		expect(() => rt.onCamera(3)).toThrow()
	})

	it('seed followed by onCamera at the same zoom is a no-op', () => {
		const table = microTraceTable()
		for (const zoom of [0.5, 1.1, 2, 4.5, 4.9, 5.5, 8]) {
			const rt = createClusterRuntime(table)
			rt.seed(zoom)
			const k = rt.k
			const ids = visibleIds(rt)
			rt.onCamera(zoom)
			expect(rt.k).toBe(k)
			expect(visibleIds(rt)).toEqual(ids)
			expectPostconditions(rt, table, zoom)
		}
	})
})

describe('createClusterRuntime edge cases', () => {
	it('handles an empty table: all leaves visible at any zoom', () => {
		const table: ClusterTable = { events: [], leaves: [A, B] }
		const rt = createClusterRuntime(table)
		rt.seed(3)
		expect(rt.k).toBe(0)
		expect(visibleIds(rt)).toEqual(['a', 'b'])
		rt.onCamera(0.01)
		rt.onCamera(100)
		expect(visibleIds(rt)).toEqual(['a', 'b'])
	})

	it('keeps Infinity events permanently merged at any reachable zoom', () => {
		const R = node(['a', 'b'])
		const table: ClusterTable = { events: [mev(Infinity, Infinity, [A, B], R)], leaves: [A, B] }
		const rt = createClusterRuntime(table)
		rt.seed(8) // √(∞·∞) = ∞ ≥ any zoom → seeded merged
		expect(rt.k).toBe(1)
		expect(visibleIds(rt)).toEqual(['cluster:2:a'])
		rt.onCamera(1e9) // no finite zoom reaches zSplit = ∞
		expect(rt.k).toBe(1)
		expect(visibleIds(rt)).toEqual(['cluster:2:a'])
	})

	it('exposes the table node objects by reference, without cloning', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(5)
		expect(rt.getVisible().get('a')).toBe(A)
		rt.onCamera(3.5)
		expect(rt.getVisible().get('cluster:3:a')).toBe(P)
		expect(rt.getVisible().get('d')).toBe(D)
	})

	it('never mutates the table', () => {
		const table = microTraceTable()
		const snapshot = JSON.parse(JSON.stringify(table))
		const rt = createClusterRuntime(table)
		rt.seed(5)
		rt.onCamera(0.8)
		rt.onCamera(7)
		rt.seed(2)
		expect(JSON.parse(JSON.stringify(table))).toEqual(snapshot)
	})
})

// --- Property tests against real pipeline tables --------------------------------

function leaf(id: string, x: number, y: number): LeafInput {
	return { id, point: { x, y } }
}

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

const PIPE_OPTS = {
	Tc: 40,
	Tu: 60,
	eps: 0.12,
	Dmax: 120,
	minZoom: 0.05,
	maxZoom: 8,
	maxSplitZoom: 1e9,
}

function buildTable(leaves: LeafInput[]): ClusterTable {
	const rawEvents = cappedReplay(leaves, mstEdges(leaves), {
		Tc: PIPE_OPTS.Tc,
		Dmax: PIPE_OPTS.Dmax,
	})
	const events = finalize(contract(rawEvents, PIPE_OPTS.eps), {
		Tc: PIPE_OPTS.Tc,
		Tu: PIPE_OPTS.Tu,
		minZoom: PIPE_OPTS.minZoom,
		maxZoom: PIPE_OPTS.maxZoom,
		maxSplitZoom: PIPE_OPTS.maxSplitZoom,
	})
	const leafNodes: ClusterNode[] = leaves.map((l) => ({
		id: l.id,
		centroid: { x: l.point.x, y: l.point.y },
		count: 1,
		members: [l.id],
	}))
	return { events, leaves: leafNodes }
}

function randomLeaves(n: number, seed: number, scale = 1000): LeafInput[] {
	const rand = mulberry32(seed)
	return Array.from({ length: n }, (_, i) => leaf(`leaf-${i}`, rand() * scale, rand() * scale))
}

/** A zoom walk within camera bounds: mostly small multiplicative steps, some jumps. */
function zoomWalk(steps: number, seed: number): number[] {
	const rand = mulberry32(seed)
	const lnMin = Math.log(PIPE_OPTS.minZoom)
	const lnMax = Math.log(PIPE_OPTS.maxZoom)
	let ln = (lnMin + lnMax) / 2
	const walk: number[] = []
	for (let i = 0; i < steps; i++) {
		const r = rand()
		if (r < 0.15) {
			// jump anywhere (zoom-to-fit, keyboard shortcuts)
			ln = lnMin + rand() * (lnMax - lnMin)
		} else if (r < 0.25) {
			// hold (pan-only frames)
		} else {
			// scrub: small multiplicative step, clamped to bounds
			ln = Math.min(lnMax, Math.max(lnMin, ln + (rand() - 0.5) * 0.4))
		}
		walk.push(Math.exp(ln))
	}
	return walk
}

/**
 * Independent per-event hysteresis simulator: each event keeps its own bit with
 * the two-threshold update rule. The prefix property says the bit vector is
 * always exactly the prefix mask [0..k) — this cross-checks the cursor against
 * the definition it compresses.
 */
class BitSimulator {
	private bits: boolean[]
	constructor(
		private events: readonly MergeEvent[],
		seedZoom: number
	) {
		this.bits = events.map((e) => seedZoom <= Math.sqrt(e.zMerge * e.zSplit))
	}
	update(zoom: number) {
		this.bits = this.events.map((e, i) => {
			if (zoom <= e.zMerge) return true
			if (zoom >= e.zSplit) return false
			return this.bits[i]
		})
	}
	expectPrefixOfLength(k: number) {
		for (let i = 0; i < this.bits.length; i++) {
			expect(this.bits[i]).toBe(i < k)
		}
	}
}

describe('createClusterRuntime properties (random tables, random zoom walks)', () => {
	it('holds all postconditions and matches the per-event bit simulator', () => {
		for (const [n, seed] of [
			[2, 1],
			[15, 42],
			[60, 7],
		] as const) {
			const leaves = randomLeaves(n, seed * 13 + n)
			const table = buildTable(leaves)
			const rt = createClusterRuntime(table)
			const walk = zoomWalk(300, seed + 100)

			const seedZoom = walk[0]
			rt.seed(seedZoom)
			const sim = new BitSimulator(table.events, seedZoom)
			expectPostconditions(rt, table, seedZoom)
			sim.expectPrefixOfLength(rt.k)

			for (const zoom of walk.slice(1)) {
				rt.onCamera(zoom)
				sim.update(zoom)
				expectPostconditions(rt, table, zoom)
				sim.expectPrefixOfLength(rt.k)
				// conservation: visible clusters always partition all n leaves
				let total = 0
				for (const cluster of rt.getVisible().values()) total += cluster.count
				expect(total).toBe(n)
			}
		}
	})

	it('is monotone: k never decreases while zooming out, never increases zooming in', () => {
		const leaves = randomLeaves(40, 33)
		const table = buildTable(leaves)
		const rt = createClusterRuntime(table)

		rt.seed(PIPE_OPTS.maxZoom)
		let prevK = rt.k
		for (let zoom = PIPE_OPTS.maxZoom; zoom >= PIPE_OPTS.minZoom; zoom *= 0.97) {
			rt.onCamera(zoom)
			expect(rt.k).toBeGreaterThanOrEqual(prevK)
			prevK = rt.k
		}
		expect(rt.k).toBe(table.events.length) // fully zoomed out → everything merged

		for (let zoom = PIPE_OPTS.minZoom; zoom <= PIPE_OPTS.maxZoom; zoom *= 1.03) {
			rt.onCamera(zoom)
			expect(rt.k).toBeLessThanOrEqual(prevK)
			prevK = rt.k
		}
	})

	it('produces zero transitions while scrubbing inside a hysteresis band', () => {
		const leaves = randomLeaves(30, 55)
		const table = buildTable(leaves)
		// pick a finite event with a usable band inside camera bounds
		const ev = table.events.find(
			(e) =>
				Number.isFinite(e.zMerge) &&
				e.zMerge > PIPE_OPTS.minZoom * 2 &&
				e.zSplit < PIPE_OPTS.maxZoom &&
				e.zSplit / e.zMerge > 1.01
		)
		expect(ev).toBeDefined()
		const lo = ev!.zMerge * 1.001
		const hi = ev!.zSplit * 0.999

		const rt = createClusterRuntime(table)
		// approach from below: merged state, then scrub within (zMerge, zSplit)
		rt.seed(ev!.zMerge * 0.9)
		rt.onCamera(lo)
		const k = rt.k
		const ids = visibleIds(rt)
		const rand = mulberry32(9)
		for (let i = 0; i < 50; i++) {
			rt.onCamera(lo + rand() * (hi - lo))
			expect(rt.k).toBe(k)
			expect(visibleIds(rt)).toEqual(ids)
		}
	})

	it('agrees with a fresh seed after any walk that ends outside all bands', () => {
		// Outside every band, state is history-independent: a runtime that walked
		// there must equal a runtime seeded there directly.
		const leaves = randomLeaves(30, 77)
		const table = buildTable(leaves)
		const walked = createClusterRuntime(table)
		walked.seed(2)
		for (const zoom of zoomWalk(120, 5)) walked.onCamera(zoom)

		// find a zoom outside all bands near the end state
		const finalZoom = PIPE_OPTS.maxZoom
		walked.onCamera(finalZoom)
		const inBand = table.events.some((e) => finalZoom > e.zMerge && finalZoom < e.zSplit)
		if (!inBand) {
			const seeded = createClusterRuntime(table)
			seeded.seed(finalZoom)
			expect(seeded.k).toBe(walked.k)
			expect(visibleIds(seeded)).toEqual(visibleIds(walked))
		}
	})
})

describe('createClusterRuntime seedFrom (carryover seeding)', () => {
	it('band event merged in the previous partition stays merged', () => {
		// zoom 5 is inside E0's band and above the geometric midpoint (≈4.899):
		// a fresh seed would leave A/B/C split. History says merged — carryover keeps it.
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seedFrom(
			5,
			new Map([
				[P.id, P],
				[D.id, D],
			])
		)
		expect(rt.k).toBe(1)
		expect(rt.getSuppressedCount()).toBe(0)
		expect(visibleIds(rt)).toEqual(['cluster:3:a', 'd'])
	})

	it('band event unmerged in the previous partition stays unmerged (no snap-together)', () => {
		// zoom 4.5 is inside E0's band and below the geometric midpoint: a fresh seed
		// would merge A/B/C even though nothing changed for them. History says split.
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seedFrom(
			4.5,
			new Map([
				[A.id, A],
				[B.id, B],
				[C.id, C],
				[D.id, D],
			])
		)
		expect(rt.k).toBe(1)
		expect(rt.getSuppressedCount()).toBe(1)
		expect(visibleIds(rt)).toEqual(['a', 'b', 'c', 'd'])
	})

	it('thresholds override history in both directions', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		// zoom <= zMerge: mandatory merge, even though the previous partition was split
		rt.seedFrom(
			3,
			new Map([
				[A.id, A],
				[B.id, B],
				[C.id, C],
				[D.id, D],
			])
		)
		expect(rt.k).toBe(1)
		// zoom >= zSplit: mandatory split, even though the previous partition was merged
		rt.seedFrom(
			7,
			new Map([
				[P.id, P],
				[D.id, D],
			])
		)
		expect(rt.k).toBe(0)
	})

	it('a band event with no counterpart in the previous partition stays inactive', () => {
		// Empty history (or partial membership) → the rebuild introduced this merge; it
		// defers to the next zoom-out rather than firing under a static camera.
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seedFrom(5, new Map())
		expect(rt.k).toBe(1)
		expect(rt.getSuppressedCount()).toBe(1)
		expect(visibleIds(rt)).toEqual(['a', 'b', 'c', 'd'])
		const partial = node(['a', 'b'], 5, 0)
		rt.seedFrom(
			5,
			new Map([
				[partial.id, partial],
				[C.id, C],
				[D.id, D],
			])
		)
		expect(rt.k).toBe(1)
		expect(rt.getSuppressedCount()).toBe(1)
		expect(visibleIds(rt)).toEqual(['a', 'b', 'c', 'd'])
	})

	it('membership in a superset cluster counts as merged', () => {
		// The previous partition holds all four in Q; E1 (band at zoom 1.2) inherits merged.
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seedFrom(1.2, new Map([[Q.id, Q]]))
		expect(rt.k).toBe(2)
		expect(visibleIds(rt)).toEqual(['cluster:4:a'])
	})

	it('carries over mixed band states exactly (split before merged in table order)', () => {
		// Two independent band events at zoom 4.5: the earlier-sorted one split in history,
		// the later one merged. The old prefix cut forced the second to split (the mass-split
		// bug); with suppression the carryover is exact — each keeps its own state.
		const AB = node(['a', 'b'], 5, 0)
		const CD = node(['c', 'd'], 105, 0)
		const table: ClusterTable = {
			events: [mev(4, 6, [A, B], AB), mev(3, 5, [C, D], CD)],
			leaves: [A, B, C, D],
		}
		const rt = createClusterRuntime(table)
		rt.seedFrom(
			4.5,
			new Map([
				[A.id, A],
				[B.id, B],
				[CD.id, CD],
			])
		)
		expect(rt.k).toBe(2)
		expect(rt.getSuppressedCount()).toBe(1)
		expect(visibleIds(rt)).toEqual(['a', 'b', 'cluster:2:c'])
	})

	it('a suppressed event merges (heals) when a zoom-out crosses its own zMerge', () => {
		const AB = node(['a', 'b'], 5, 0)
		const CD = node(['c', 'd'], 105, 0)
		const table: ClusterTable = {
			events: [mev(4, 6, [A, B], AB), mev(3, 5, [C, D], CD)],
			leaves: [A, B, C, D],
		}
		const rt = createClusterRuntime(table)
		rt.seedFrom(
			4.5,
			new Map([
				[A.id, A],
				[B.id, B],
				[CD.id, CD],
			])
		)
		const versionBefore = rt.version
		rt.onCamera(4.4) // still inside AB's band: nothing happens
		expect(rt.version).toBe(versionBefore)
		rt.onCamera(3.9) // below AB's zMerge (4): the held-out merge fires at its own threshold
		expect(rt.version).toBeGreaterThan(versionBefore)
		expect(rt.k).toBe(2)
		expect(rt.getSuppressedCount()).toBe(0)
		expect(visibleIds(rt)).toEqual(['cluster:2:a', 'cluster:2:c'])
		expectPostconditions(rt, table, 3.9)
	})

	it('the split walk retreats past a suppressed event without corrupting the partition', () => {
		const AB = node(['a', 'b'], 5, 0)
		const CD = node(['c', 'd'], 105, 0)
		const table: ClusterTable = {
			events: [mev(4, 6, [A, B], AB), mev(3, 5, [C, D], CD)],
			leaves: [A, B, C, D],
		}
		const rt = createClusterRuntime(table)
		rt.seedFrom(
			4.5,
			new Map([
				[A.id, A],
				[B.id, B],
				[CD.id, CD],
			])
		)
		rt.onCamera(5.5) // past CD's zSplit (5): CD splits; suppressed AB stays put
		expect(rt.k).toBe(1)
		expect(rt.getSuppressedCount()).toBe(1)
		expect(visibleIds(rt)).toEqual(['a', 'b', 'c', 'd'])
		rt.onCamera(6.5) // past AB's zSplit (6): retreat past the suppressed (never-applied) event
		expect(rt.k).toBe(0)
		expect(rt.getSuppressedCount()).toBe(0)
		expect(visibleIds(rt)).toEqual(['a', 'b', 'c', 'd'])
		rt.onCamera(3.9) // zoom back out: normal cursor walk from a clean state
		expect(rt.k).toBe(1)
		expect(visibleIds(rt)).toEqual(['c', 'cluster:2:a', 'd'])
		expectPostconditions(rt, table, 3.9)
	})

	it('seedFrom followed by onCamera at the same zoom is a no-op', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seedFrom(
			5,
			new Map([
				[P.id, P],
				[D.id, D],
			])
		)
		const k = rt.k
		const ids = visibleIds(rt)
		rt.onCamera(5)
		expect(rt.k).toBe(k)
		expect(visibleIds(rt)).toEqual(ids)
		expectPostconditions(rt, table, 5)
	})

	it('matches a fresh seed when the previous partition mirrors the geometric tiebreak', () => {
		// Sanity: outside bands and with agreeing history, seedFrom degenerates to seed.
		const table = microTraceTable()
		for (const zoom of [0.5, 2, 8]) {
			const fresh = createClusterRuntime(table)
			fresh.seed(zoom)
			const carried = createClusterRuntime(table)
			carried.seedFrom(zoom, fresh.getVisible())
			expect(carried.k).toBe(fresh.k)
			expect(visibleIds(carried)).toEqual(visibleIds(fresh))
		}
	})

	it('throws on non-positive or non-finite zoom', () => {
		const rt = createClusterRuntime(microTraceTable())
		expect(() => rt.seedFrom(0, new Map())).toThrow()
		expect(() => rt.seedFrom(NaN, new Map())).toThrow()
	})
})

describe('createClusterRuntime detachLeaf (local partition edits)', () => {
	it('shrinks the containing badge in place: members, count, centroid', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(4) // P = a+b+c visible, d separate
		const versionBefore = rt.version
		rt.detachLeaf('a')
		expect(rt.version).toBeGreaterThan(versionBefore)
		expect(rt.getDetachedCount()).toBe(1)
		const patchedP = rt.getVisible().get(P.id)!
		expect(patchedP.members).toEqual(['b', 'c'])
		expect(patchedP.count).toBe(2)
		// centroid recomputed from the remaining leaves: B (10,0), C (20,0)
		expect(patchedP.centroid).toEqual({ x: 15, y: 0 })
		// keeps the structural id so cursor events keep addressing it
		expect(patchedP.id).toBe(P.id)
		// everything else untouched
		expect(rt.getVisible().get('d')).toEqual(D)
		expect(rt.getVisible().size).toBe(2)
	})

	it('is idempotent and ignores unknown ids', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(4)
		rt.detachLeaf('a')
		const version = rt.version
		rt.detachLeaf('a')
		rt.detachLeaf('nonexistent')
		expect(rt.version).toBe(version)
		expect(rt.getDetachedCount()).toBe(1)
	})

	it('collapses a badge to its surviving leaf, and to nothing', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(4)
		rt.detachLeaf('a')
		rt.detachLeaf('b')
		// P = {a,b,c} minus a,b → the leaf node c, keyed by its own id
		expect(rt.getVisible().get('c')).toEqual(C)
		expect(rt.getVisible().has(P.id)).toBe(false)
		rt.detachLeaf('c')
		expect(visibleIds(rt)).toEqual(['d'])
	})

	it('removes a leaf that is visible as its own pin', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(8) // everything split
		rt.detachLeaf('a')
		expect(visibleIds(rt)).toEqual(['b', 'c', 'd'])
	})

	it('zoom walks stay correct while patches are active (split)', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(4)
		rt.detachLeaf('a')
		rt.onCamera(6.5) // past P's zSplit (6): structural split of a+b+c
		expect(rt.k).toBe(0)
		// resolved view: a stays gone, b/c/d as pins — the split itself changed nothing for a
		expect(visibleIds(rt)).toEqual(['b', 'c', 'd'])
	})

	it('zoom walks stay correct while patches are active (merge)', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(4)
		rt.detachLeaf('a')
		rt.onCamera(0.9) // below E1's zMerge (1): P+D merge into Q
		expect(rt.k).toBe(2)
		const patchedQ = rt.getVisible().get(Q.id)!
		expect(patchedQ.members).toEqual(['b', 'c', 'd'])
		expect(patchedQ.count).toBe(3)
		// mean of B (10,0), C (20,0), D (100,0)
		expect(patchedQ.centroid.x).toBeCloseTo(130 / 3)
		expect(rt.getVisible().size).toBe(1)
	})

	it('seed and seedFrom clear detaches', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(4)
		rt.detachLeaf('a')
		rt.seed(4)
		expect(rt.getDetachedCount()).toBe(0)
		expect(rt.getVisible().get(P.id)).toEqual(P)
		rt.detachLeaf('a')
		rt.seedFrom(
			4,
			new Map([
				[P.id, P],
				[D.id, D],
			])
		)
		expect(rt.getDetachedCount()).toBe(0)
		expect(rt.getVisible().get(P.id)).toEqual(P)
	})

	it('getVisible returns a stable reference until the partition changes', () => {
		const table = microTraceTable()
		const rt = createClusterRuntime(table)
		rt.seed(4)
		rt.detachLeaf('a')
		const first = rt.getVisible()
		expect(rt.getVisible()).toBe(first)
		rt.detachLeaf('b')
		expect(rt.getVisible()).not.toBe(first)
	})
})
