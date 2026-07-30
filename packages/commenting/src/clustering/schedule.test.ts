import { describe, expect, it } from 'vitest'
import { mstEdges } from './mst'
import { cappedReplay } from './replay'
// These imports are red until step 3 is implemented — that is intentional.
// Implement `schedule.ts` (and the step 3 additions to `types.ts`) per
// CLUSTERING-STEPS.md until this suite passes, without modifying this file.
import { contract, finalize } from './schedule'
import { ClusterNode, ContractedEvent, LeafInput, MergeEvent, RawMergeEvent } from './types'

// --- Synthetic builders -------------------------------------------------------
// `contract` is specified over plain RawMergeEvent[] input precisely so it can
// be tested with hand-built events, without running the replay.

/** Build a ClusterNode from member ids (leaf node for one id, cluster node for more). */
function node(ids: string[], x = 0, y = 0): ClusterNode {
	const members = ids.slice().sort()
	return {
		id: members.length === 1 ? members[0] : `cluster:${members.length}:${members[0]}`,
		centroid: { x, y },
		count: members.length,
		members,
	}
}

/** Build a RawMergeEvent merging two nodes, with contract-conformant ordering. */
function raw(z: number, a: ClusterNode, b: ClusterNode): RawMergeEvent {
	const [first, second] = a.members[0] < b.members[0] ? [a, b] : [b, a]
	return { z, children: [first, second], result: node([...a.members, ...b.members]) }
}

/** Every cluster id referenced anywhere in the output (children and results). */
function collectIds(events: readonly ContractedEvent[]): Set<string> {
	const ids = new Set<string>()
	for (const ev of events) {
		for (const c of ev.children) ids.add(c.id)
		ids.add(ev.result.id)
	}
	return ids
}

function contractedShape(ev: ContractedEvent) {
	return {
		zMerge: ev.zMerge,
		children: ev.children.map((c) => c.id),
		result: ev.result.id,
	}
}

const A = node(['a'])
const B = node(['b'])
const C = node(['c'])
const D = node(['d'])
const E = node(['e'])
const F = node(['f'])
const X = node(['x'])
const Y = node(['y'])

// --- contract: fixtures -------------------------------------------------------

describe('contract fixtures', () => {
	it('returns [] for empty input', () => {
		expect(contract([], 0.12)).toEqual([])
	})

	it('passes a single event through unchanged (apart from the type)', () => {
		const e1 = raw(4, A, B)
		expect(contract([e1], 0.12)).toEqual([{ zMerge: 4, children: [A, B], result: e1.result }])
	})

	it('fuses a two-event chain within eps into one 3-way event at the anchor z', () => {
		const e1 = raw(4, A, B) // result P = cluster:2:a
		const e2 = raw(3.7, e1.result, C) // 3.7 >= 4/1.12 ≈ 3.571 → same window, chained via P
		const out = contract([e1, e2], 0.12)
		expect(out).toEqual([{ zMerge: 4, children: [A, B, C], result: e2.result }])
		// the intermediate P is erased — representable nowhere
		expect(collectIds(out).has(e1.result.id)).toBe(false)
	})

	it('keeps the same chain separate when the second event falls outside eps', () => {
		const e1 = raw(4, A, B)
		const e2 = raw(3.5, e1.result, C) // 3.5 < 4/1.12 ≈ 3.571 → next window
		const out = contract([e1, e2], 0.12)
		expect(out.map(contractedShape)).toEqual([
			{ zMerge: 4, children: ['a', 'b'], result: e1.result.id },
			{ zMerge: 3.5, children: [e1.result.id, 'c'], result: e2.result.id },
		])
		// the intermediate survives: it is genuinely visible between 3.5 and 4
		expect(collectIds(out).has(e1.result.id)).toBe(true)
	})

	it('synchronizes unrelated same-window merges without fusing them', () => {
		const e1 = raw(4, A, B)
		const e2 = raw(3.9, X, Y) // within eps of the anchor, but disjoint
		const out = contract([e1, e2], 0.12)
		// two events, BOTH at the anchor z, ordered by ascending min-member id of result
		expect(out.map(contractedShape)).toEqual([
			{ zMerge: 4, children: ['a', 'b'], result: e1.result.id },
			{ zMerge: 4, children: ['x', 'y'], result: e2.result.id },
		])
	})

	it('separates interleaved chains within one window by connectivity', () => {
		const e1 = raw(4, A, B) // chain 1
		const e2 = raw(3.95, X, Y) // chain 2, interleaved between chain 1's events
		const e3 = raw(3.9, e1.result, C) // chain 1 again, via e1.result
		const out = contract([e1, e2, e3], 0.12)
		expect(out.map(contractedShape)).toEqual([
			{ zMerge: 4, children: ['a', 'b', 'c'], result: e3.result.id },
			{ zMerge: 4, children: ['x', 'y'], result: e2.result.id },
		])
		expect(collectIds(out).has(e1.result.id)).toBe(false)
	})

	it('fuses branched chains (two results consumed by one later event)', () => {
		const e1 = raw(4, A, B) // → cluster:2:a
		const e2 = raw(3.9, C, D) // → cluster:2:c
		const e3 = raw(3.85, e1.result, e2.result) // consumes both → one connected chain
		const out = contract([e1, e2, e3], 0.12)
		expect(out).toEqual([{ zMerge: 4, children: [A, B, C, D], result: e3.result }])
		const ids = collectIds(out)
		expect(ids.has(e1.result.id)).toBe(false)
		expect(ids.has(e2.result.id)).toBe(false)
	})

	it('anchors the window to its first event, never the previous one', () => {
		// 3.8 is within eps of the 4.0 anchor; 3.55 is within eps of 3.8 but NOT of
		// the anchor (3.55 < 4/1.12 ≈ 3.571) — a gradient must break into windows.
		const e1 = raw(4, A, B)
		const e2 = raw(3.8, X, Y)
		const e3 = raw(3.55, C, D)
		const out = contract([e1, e2, e3], 0.12)
		expect(out.map((ev) => ev.zMerge)).toEqual([4, 4, 3.55])
	})

	it('includes an event exactly on the window boundary (>=, not >)', () => {
		// eps = 0.25 → boundary at exactly 4/1.25 = 3.2
		const e1 = raw(4, A, B)
		const e2 = raw(3.2, X, Y)
		const out = contract([e1, e2], 0.25)
		expect(out.map((ev) => ev.zMerge)).toEqual([4, 4])
	})

	it('fuses a chain that spans windows only up to the boundary, keeping the seam intact', () => {
		// One chain across five events; eps = 0.12 splits it into windows
		// {4.0, 3.8, 3.6} and {3.4, 3.2}. The second window's fused event must
		// reference the first window's fused RESULT (cluster:4:a), not an erased
		// intermediate.
		const e1 = raw(4, A, B) // → cluster:2:a
		const e2 = raw(3.8, e1.result, C) // → cluster:3:a
		const e3 = raw(3.6, e2.result, D) // → cluster:4:a
		const e4 = raw(3.4, e3.result, E) // → cluster:5:a
		const e5 = raw(3.2, e4.result, F) // → cluster:6:a
		const out = contract([e1, e2, e3, e4, e5], 0.12)
		expect(out.map(contractedShape)).toEqual([
			{ zMerge: 4, children: ['a', 'b', 'c', 'd'], result: 'cluster:4:a' },
			{ zMerge: 3.4, children: ['cluster:4:a', 'e', 'f'], result: 'cluster:6:a' },
		])
		const ids = collectIds(out)
		for (const erased of [e1.result.id, e2.result.id, e4.result.id]) {
			expect(ids.has(erased)).toBe(false)
		}
	})

	it('groups exact ties with eps = 0, and nothing else', () => {
		const e1 = raw(4, A, B)
		const e2 = raw(4, e1.result, C) // exact tie, chained → fuses even at eps = 0
		expect(contract([e1, e2], 0)).toEqual([{ zMerge: 4, children: [A, B, C], result: e2.result }])

		const e3 = raw(4, A, B)
		const e4 = raw(3.9999999, e3.result, C) // any difference → separate windows
		expect(contract([e3, e4], 0).map((ev) => ev.zMerge)).toEqual([4, 3.9999999])
	})

	it('lets an Infinity anchor admit only other Infinity events', () => {
		const e1 = raw(Infinity, A, B)
		const e2 = raw(4, e1.result, C) // finite: must NOT join the Infinity window
		expect(contract([e1, e2], 0.12).map(contractedShape)).toEqual([
			{ zMerge: Infinity, children: ['a', 'b'], result: e1.result.id },
			{ zMerge: 4, children: [e1.result.id, 'c'], result: e2.result.id },
		])
	})

	it('keeps two coincident groups separate inside one Infinity window', () => {
		const e1 = raw(Infinity, A, B)
		const e2 = raw(Infinity, X, Y)
		expect(contract([e1, e2], 0.12).map(contractedShape)).toEqual([
			{ zMerge: Infinity, children: ['a', 'b'], result: e1.result.id },
			{ zMerge: Infinity, children: ['x', 'y'], result: e2.result.id },
		])
	})
})

describe('contract validation and purity', () => {
	it('throws on negative or non-finite eps', () => {
		const events = [raw(4, A, B)]
		expect(() => contract(events, -0.1)).toThrow()
		expect(() => contract(events, NaN)).toThrow()
		expect(() => contract(events, Infinity)).toThrow()
	})

	it('is pure: identical repeat output, no input mutation', () => {
		const e1 = raw(4, A, B)
		const e2 = raw(3.7, e1.result, C)
		const input = [e1, e2]
		const snapshot = JSON.parse(JSON.stringify(input))
		const first = contract(input, 0.12)
		const second = contract(input, 0.12)
		expect(first).toEqual(second)
		expect(JSON.parse(JSON.stringify(input))).toEqual(snapshot)
	})
})

// --- finalize: fixtures --------------------------------------------------------

const FIN_OPTS = { Tc: 40, Tu: 60, minZoom: 0.1, maxZoom: 8, maxSplitZoom: 1e9 } // r = 1.5

function contracted(zMerge: number, children: ClusterNode[], result: ClusterNode): ContractedEvent {
	return { zMerge, children, result }
}

describe('finalize fixtures', () => {
	it('returns [] for empty input', () => {
		expect(finalize([], FIN_OPTS)).toEqual([])
	})

	it('applies zSplit = r · zMerge and preserves everything else', () => {
		const ev1 = contracted(4, [A, B], node(['a', 'b']))
		const ev2 = contracted(1, [node(['a', 'b']), C], node(['a', 'b', 'c']))
		expect(finalize([ev1, ev2], FIN_OPTS)).toEqual([
			{ zMerge: 4, zSplit: 6, children: ev1.children, result: ev1.result },
			{ zMerge: 1, zSplit: 1.5, children: ev2.children, result: ev2.result },
		])
	})

	it('clamps a band that straddles maxZoom (the stuck-merged trap)', () => {
		// zMerge 6, r 1.5 → raw zSplit 9 > maxZoom 8: without the clamp this pair
		// would merge on zoom-out and never split again within reachable zoom.
		const ev = contracted(6, [A, B], node(['a', 'b']))
		const [out] = finalize([ev], FIN_OPTS)
		expect(out.zSplit).toBe(8)
		expect(out.zMerge).toBe(6)
	})

	it('does not clamp bands that fit under maxZoom', () => {
		const ev = contracted(2, [A, B], node(['a', 'b']))
		expect(finalize([ev], FIN_OPTS)[0].zSplit).toBe(3)
	})

	it('leaves zMerge >= maxZoom events unclamped by maxZoom (band above camera range)', () => {
		// zMerge exactly at maxZoom: the clamp condition is zMerge < maxZoom, strict
		const atMax = contracted(8, [A, B], node(['a', 'b']))
		expect(finalize([atMax], FIN_OPTS)[0].zSplit).toBe(12)
		// coincident anchors are no longer permanently merged — maxSplitZoom caps them
		const inf = contracted(Infinity, [X, Y], node(['x', 'y']))
		expect(finalize([inf], FIN_OPTS)[0]).toMatchObject({ zMerge: 1e9 / 1.5, zSplit: 1e9 })
	})

	it('caps every split at maxSplitZoom, folding the band below the cap', () => {
		// r = 1.5, maxSplitZoom 6 -> zMerge cap 4: past zoom 6 nothing stays clustered,
		// however close (or coincident) the members are.
		const opts = { ...FIN_OPTS, maxSplitZoom: 6 }
		const coincident = contracted(Infinity, [A, B], node(['a', 'b']))
		const tight = contracted(10, [A, B], node(['a', 'b']))
		const normal = contracted(2, [A, B], node(['a', 'b']))
		expect(finalize([coincident], opts)[0]).toMatchObject({ zMerge: 4, zSplit: 6 })
		expect(finalize([tight], opts)[0]).toMatchObject({ zMerge: 4, zSplit: 6 })
		// events already below the cap are untouched
		expect(finalize([normal], opts)[0]).toMatchObject({ zMerge: 2, zSplit: 3 })
	})

	it('capping preserves sort order and the zSplit > zMerge invariant', () => {
		const opts = { ...FIN_OPTS, maxSplitZoom: 6 }
		const events = [
			contracted(Infinity, [A, B], node(['a', 'b'])),
			contracted(10, [C, X], node(['c', 'x'])),
			contracted(2, [Y, node(['a', 'b'])], node(['a', 'b', 'y'])),
		]
		const out = finalize(events, opts)
		expect(out.map((e) => e.zMerge)).toEqual([4, 4, 2])
		for (let i = 0; i < out.length; i++) {
			expect(out[i].zSplit).toBeGreaterThan(out[i].zMerge)
			if (i > 0) expect(out[i].zSplit).toBeLessThanOrEqual(out[i - 1].zSplit)
		}
	})

	it('throws on non-positive or non-finite maxSplitZoom', () => {
		const events = [contracted(2, [A, B], node(['a', 'b']))]
		expect(() => finalize(events, { ...FIN_OPTS, maxSplitZoom: 0 })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, maxSplitZoom: -1 })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, maxSplitZoom: NaN })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, maxSplitZoom: Infinity })).toThrow()
	})

	it('prunes the trailing suffix below minZoom, keeping the boundary value', () => {
		const keep = contracted(4, [A, B], node(['a', 'b']))
		const boundary = contracted(0.1, [node(['a', 'b']), C], node(['a', 'b', 'c'])) // == minZoom: kept
		const prune = contracted(0.0999, [node(['a', 'b', 'c']), D], node(['a', 'b', 'c', 'd']))
		const out = finalize([keep, boundary, prune], FIN_OPTS)
		expect(out.map((ev) => ev.zMerge)).toEqual([4, 0.1])
	})

	it('throws on every invalid option combination', () => {
		const events = [contracted(4, [A, B], node(['a', 'b']))]
		expect(() => finalize(events, { ...FIN_OPTS, Tc: 0 })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, Tc: -1 })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, Tu: 40 })).toThrow() // Tu must be > Tc
		expect(() => finalize(events, { ...FIN_OPTS, Tu: 30 })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, minZoom: 0 })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, minZoom: -1 })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, maxZoom: 0.1 })).toThrow() // must be > minZoom
		expect(() => finalize(events, { ...FIN_OPTS, maxZoom: 0.05 })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, Tc: NaN })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, Tu: Infinity })).toThrow()
		expect(() => finalize(events, { ...FIN_OPTS, maxZoom: Infinity })).toThrow()
	})

	it('is pure: identical repeat output, no input mutation', () => {
		const input = [contracted(4, [A, B], node(['a', 'b']))]
		const snapshot = JSON.parse(JSON.stringify(input))
		expect(finalize(input, FIN_OPTS)).toEqual(finalize(input, FIN_OPTS))
		expect(JSON.parse(JSON.stringify(input))).toEqual(snapshot)
	})
})

// --- Composed pipeline properties ---------------------------------------------
// finalize(contract(cappedReplay(mstEdges(leaves)))) must satisfy every table
// invariant of CLUSTERING.md §7.6.

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

const PIPE_OPTS = {
	Tc: 40,
	Tu: 60,
	eps: 0.12,
	Dmax: 120,
	minZoom: 1e-6,
	maxZoom: 8,
	maxSplitZoom: 1e9,
}

function buildTableEvents(
	leaves: readonly LeafInput[],
	opts: typeof PIPE_OPTS = PIPE_OPTS
): MergeEvent[] {
	const rawEvents = cappedReplay(leaves, mstEdges(leaves), { Tc: opts.Tc, Dmax: opts.Dmax })
	return finalize(contract(rawEvents, opts.eps), {
		Tc: opts.Tc,
		Tu: opts.Tu,
		minZoom: opts.minZoom,
		maxZoom: opts.maxZoom,
		maxSplitZoom: opts.maxSplitZoom,
	})
}

/** All §7.6 invariants over a finalized event list. */
function expectTableInvariants(
	events: readonly MergeEvent[],
	leaves: readonly LeafInput[],
	opts: typeof PIPE_OPTS
) {
	// 1–3: threshold ordering and band validity
	for (let i = 1; i < events.length; i++) {
		expect(events[i].zMerge).toBeLessThanOrEqual(events[i - 1].zMerge)
		expect(events[i].zSplit).toBeLessThanOrEqual(events[i - 1].zSplit)
	}
	for (const ev of events) {
		// coincident clusters are the one exception: zMerge = zSplit = Infinity (never split)
		if (Number.isFinite(ev.zMerge)) {
			expect(ev.zSplit).toBeGreaterThan(ev.zMerge)
		} else {
			expect(ev.zSplit).toBe(Infinity)
		}
		if (ev.zMerge < opts.maxZoom) expect(ev.zSplit).toBeLessThanOrEqual(opts.maxZoom)
		expect(ev.zMerge).toBeGreaterThanOrEqual(opts.minZoom)
	}
	// 4: dendrogram integrity — replaying all events over the leaves is well
	// formed (children exist when consumed ⇒ no erased intermediate is referenced)
	const live = new Map<string, ClusterNode>()
	for (const l of leaves) {
		live.set(l.id, { id: l.id, centroid: { ...l.point }, count: 1, members: [l.id] })
	}
	for (const ev of events) {
		expect(ev.children.length).toBeGreaterThanOrEqual(2)
		for (const child of ev.children) {
			expect(live.get(child.id)).toBeDefined()
			live.delete(child.id)
		}
		for (let i = 1; i < ev.children.length; i++) {
			expect(ev.children[i - 1].members[0] < ev.children[i].members[0]).toBe(true)
		}
		const union = ev.children.flatMap((c) => c.members).sort()
		expect(ev.result.members).toEqual(union)
		expect(ev.result.count).toBe(union.length)
		expect(ev.result.id).toBe(`cluster:${union.length}:${union[0]}`)
		live.set(ev.result.id, ev.result)
	}
	// with minZoom = 1e-6 nothing prunes, so the dendrogram completes to one root
	if (leaves.length >= 2) {
		expect(live.size).toBe(1)
		expect([...live.values()][0].members).toEqual(leaves.map((l) => l.id).sort())
	}
}

describe('composed pipeline (replay → contract → finalize)', () => {
	it('satisfies all table invariants on random inputs', () => {
		for (const seed of [3, 42]) {
			for (const n of [2, 7, 30, 80]) {
				const leaves = randomLeaves(n, seed * 17 + n)
				expectTableInvariants(buildTableEvents(leaves), leaves, PIPE_OPTS)
			}
		}
	})

	it('satisfies all table invariants with ties and coincident anchors (lattice)', () => {
		const rand = mulberry32(11)
		const leaves = Array.from({ length: 40 }, (_, i) =>
			leaf(`lat-${i}`, Math.floor(rand() * 8) * 10, Math.floor(rand() * 8) * 10)
		)
		expectTableInvariants(buildTableEvents(leaves), leaves, PIPE_OPTS)
	})

	it('reduces to the identity at eps = 0 on tie-free input', () => {
		// Centroid pricing plus the monotonicity clamp can produce exact ties even
		// on random input (a clamped threshold lands exactly on its predecessor),
		// and eps = 0 legitimately fuses chained ties. Identity is only promised
		// for tie-free tables — so probe seeds until one produces distinct
		// thresholds, and assert the identity there.
		let verified = false
		for (const seed of [5, 6, 7, 8, 9, 10]) {
			const leaves = randomLeaves(40, seed)
			const rawEvents = cappedReplay(leaves, mstEdges(leaves), { Tc: 40, Dmax: 120 })
			if (new Set(rawEvents.map((ev) => ev.z)).size !== rawEvents.length) continue
			const contractedEvents = contract(rawEvents, 0)
			expect(
				contractedEvents.map((ev) => ({ z: ev.zMerge, c: ev.children, r: ev.result }))
			).toEqual(rawEvents.map((ev) => ({ z: ev.z, c: ev.children, r: ev.result })))
			verified = true
		}
		expect(verified).toBe(true)
	})

	it('schedules the uniform chain as synchronized pairs, quads, then the octet', () => {
		// CLUSTERING.md appendix A.2 with centroid pricing: leaf pairs all fire at
		// z = 4 (one contraction window, four disconnected chains → four events at
		// the shared anchor), quads at centroid distance 20 → z = 2, and the
		// quad-quad bridge at centroid distance 40 → z = 1.
		const leaves = Array.from({ length: 8 }, (_, i) => leaf(`p${i + 1}`, i * 10, 0))
		const events = buildTableEvents(leaves)
		expect(
			events.map((ev) => ({
				zMerge: ev.zMerge,
				children: ev.children.map((c) => c.id),
				result: ev.result.id,
			}))
		).toEqual([
			{ zMerge: 4, children: ['p1', 'p2'], result: 'cluster:2:p1' },
			{ zMerge: 4, children: ['p3', 'p4'], result: 'cluster:2:p3' },
			{ zMerge: 4, children: ['p5', 'p6'], result: 'cluster:2:p5' },
			{ zMerge: 4, children: ['p7', 'p8'], result: 'cluster:2:p7' },
			{ zMerge: 2, children: ['cluster:2:p1', 'cluster:2:p3'], result: 'cluster:4:p1' },
			{ zMerge: 2, children: ['cluster:2:p5', 'cluster:2:p7'], result: 'cluster:4:p5' },
			{ zMerge: 1, children: ['cluster:4:p1', 'cluster:4:p5'], result: 'cluster:8:p1' },
		])
		expect(events.map((ev) => ev.zSplit)).toEqual([6, 6, 6, 6, 3, 3, 1.5])
	})

	it('is deterministic end to end under input permutation', () => {
		const base = randomLeaves(50, 23)
		const expected = buildTableEvents(base).map((ev) => ({
			zMerge: ev.zMerge,
			zSplit: ev.zSplit,
			children: ev.children.map((c) => c.id),
			result: ev.result.id,
		}))
		for (const shuffleSeed of [7, 29]) {
			const perm = shuffled(base, mulberry32(shuffleSeed))
			expect(
				buildTableEvents(perm).map((ev) => ({
					zMerge: ev.zMerge,
					zSplit: ev.zSplit,
					children: ev.children.map((c) => c.id),
					result: ev.result.id,
				}))
			).toEqual(expected)
		}
	})
})
