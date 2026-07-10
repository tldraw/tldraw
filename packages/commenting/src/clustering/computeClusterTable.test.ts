import { describe, expect, it } from 'vitest'
import { computeClusterTable } from './computeClusterTable'
import { mstEdges } from './mst'
import { cappedReplay } from './replay'
import { createClusterRuntime } from './runtime'
import { contract, finalize } from './schedule'
import { ClusterTable, LeafInput, MergeEvent } from './types'

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

/** The pipeline composed by hand — computeClusterTable must match it exactly. */
function manualPipeline(
	leaves: readonly LeafInput[],
	opts: {
		Tc: number
		Tu: number
		eps: number
		Dmax: number
		minZoom: number
		maxZoom: number
		maxSplitZoom?: number
	}
): MergeEvent[] {
	const raw = cappedReplay(leaves, mstEdges(leaves), { Tc: opts.Tc, Dmax: opts.Dmax })
	return finalize(contract(raw, opts.eps), {
		Tc: opts.Tc,
		Tu: opts.Tu,
		minZoom: opts.minZoom,
		maxZoom: opts.maxZoom,
		maxSplitZoom: opts.maxSplitZoom ?? 6,
	})
}

function eventShape(ev: MergeEvent) {
	return {
		zMerge: ev.zMerge,
		zSplit: ev.zSplit,
		children: ev.children.map((c) => c.id),
		result: ev.result.id,
		members: ev.result.members,
	}
}

function tableShapes(table: ClusterTable) {
	return table.events.map(eventShape)
}

const ZOOM_BOUNDS = { minZoom: 0.05, maxZoom: 8 }

describe('computeClusterTable composition', () => {
	it('equals the hand-composed pipeline with all options explicit', () => {
		const opts = { Tc: 40, Tu: 60, eps: 0.12, Dmax: 120, ...ZOOM_BOUNDS }
		for (const seed of [1, 42]) {
			for (const n of [2, 10, 60]) {
				const leaves = randomLeaves(n, seed * 19 + n)
				const table = computeClusterTable(leaves, opts)
				expect(tableShapes(table)).toEqual(manualPipeline(leaves, opts).map(eventShape))
			}
		}
	})

	it('resolves all defaults from an empty option set (Tc 40, Tu 60, eps 0.12, Dmax 120)', () => {
		const leaves = randomLeaves(30, 7)
		const table = computeClusterTable(leaves, { ...ZOOM_BOUNDS })
		const expected = manualPipeline(leaves, {
			Tc: 40,
			Tu: 60,
			eps: 0.12,
			Dmax: 120,
			...ZOOM_BOUNDS,
		})
		expect(tableShapes(table)).toEqual(expected.map(eventShape))
	})

	it('derives Tu and Dmax from a caller-supplied Tc (Tu = 1.5·Tc, Dmax = 3·Tc)', () => {
		const leaves = randomLeaves(30, 13)
		const table = computeClusterTable(leaves, { Tc: 50, ...ZOOM_BOUNDS })
		const expected = manualPipeline(leaves, {
			Tc: 50,
			Tu: 75,
			eps: 0.12,
			Dmax: 150,
			...ZOOM_BOUNDS,
		})
		expect(tableShapes(table)).toEqual(expected.map(eventShape))
	})

	it('caps coincident pairs at the default maxSplitZoom of 6 (600%)', () => {
		// Two threads at the same point: raw merge zoom is Infinity (never split), but the
		// default cap schedules them to merge at 4 and split at 6 like any ultra-tight pair.
		const leaves = [leaf('a', 50, 50), leaf('b', 50, 50)]
		const table = computeClusterTable(leaves, { ...ZOOM_BOUNDS })
		expect(table.events).toHaveLength(1)
		expect(table.events[0].zMerge).toBe(4)
		expect(table.events[0].zSplit).toBe(6)
	})

	it('honors partial overrides without disturbing the other defaults', () => {
		const leaves = randomLeaves(30, 29)
		const table = computeClusterTable(leaves, { Tu: 100, eps: 0, ...ZOOM_BOUNDS })
		const expected = manualPipeline(leaves, {
			Tc: 40,
			Tu: 100,
			eps: 0,
			Dmax: 120,
			...ZOOM_BOUNDS,
		})
		expect(tableShapes(table)).toEqual(expected.map(eventShape))
	})
})

describe('computeClusterTable leaves output', () => {
	it('returns leaf nodes in input order with exact leaf shape', () => {
		const leaves = [leaf('z-last', 5, 6), leaf('a-first', 1, 2), leaf('m-mid', 3, 4)]
		const table = computeClusterTable(leaves, { ...ZOOM_BOUNDS })
		expect(table.leaves).toEqual([
			{ id: 'z-last', centroid: { x: 5, y: 6 }, count: 1, members: ['z-last'] },
			{ id: 'a-first', centroid: { x: 1, y: 2 }, count: 1, members: ['a-first'] },
			{ id: 'm-mid', centroid: { x: 3, y: 4 }, count: 1, members: ['m-mid'] },
		])
	})

	it('handles n = 0 and n = 1 (empty events, leaves still produced)', () => {
		expect(computeClusterTable([], { ...ZOOM_BOUNDS })).toEqual({ events: [], leaves: [] })
		const table = computeClusterTable([leaf('only', 9, 9)], { ...ZOOM_BOUNDS })
		expect(table.events).toEqual([])
		expect(table.leaves).toEqual([
			{ id: 'only', centroid: { x: 9, y: 9 }, count: 1, members: ['only'] },
		])
	})

	it('is usable directly by the runtime (n = 1 and n = 0 tables)', () => {
		const table = computeClusterTable([leaf('only', 9, 9)], { ...ZOOM_BOUNDS })
		const rt = createClusterRuntime(table)
		rt.seed(1)
		rt.onCamera(0.1)
		expect([...rt.getVisible().keys()]).toEqual(['only'])
	})
})

describe('computeClusterTable determinism', () => {
	it('is invariant under input permutation, events as id-keyed structures', () => {
		const base = randomLeaves(50, 23)
		const expected = tableShapes(computeClusterTable(base, { ...ZOOM_BOUNDS }))
		for (const shuffleSeed of [5, 17]) {
			const perm = shuffled(base, mulberry32(shuffleSeed))
			const table = computeClusterTable(perm, { ...ZOOM_BOUNDS })
			expect(tableShapes(table)).toEqual(expected)
			// leaves follow the (new) input order
			expect(table.leaves.map((l) => l.id)).toEqual(perm.map((l) => l.id))
		}
	})

	it('returns identical output for repeated calls', () => {
		const leaves = randomLeaves(20, 3)
		expect(computeClusterTable(leaves, { ...ZOOM_BOUNDS })).toEqual(
			computeClusterTable(leaves, { ...ZOOM_BOUNDS })
		)
	})
})

describe('computeClusterTable validation', () => {
	const leaves = [leaf('a', 0, 0), leaf('b', 10, 0)]

	it('rejects every invalid option combination', () => {
		expect(() => computeClusterTable(leaves, { Tc: 0, ...ZOOM_BOUNDS })).toThrow()
		expect(() => computeClusterTable(leaves, { Tc: -5, ...ZOOM_BOUNDS })).toThrow()
		expect(() => computeClusterTable(leaves, { Tc: 40, Tu: 40, ...ZOOM_BOUNDS })).toThrow()
		expect(() => computeClusterTable(leaves, { Tu: 30, ...ZOOM_BOUNDS })).toThrow() // < default Tc 40
		expect(() => computeClusterTable(leaves, { eps: -0.01, ...ZOOM_BOUNDS })).toThrow()
		expect(() => computeClusterTable(leaves, { Dmax: 30, ...ZOOM_BOUNDS })).toThrow() // < default Tc 40
		expect(() => computeClusterTable(leaves, { Tc: 50, Dmax: 40, ...ZOOM_BOUNDS })).toThrow()
		expect(() => computeClusterTable(leaves, { minZoom: 0, maxZoom: 8 })).toThrow()
		expect(() => computeClusterTable(leaves, { minZoom: 8, maxZoom: 8 })).toThrow()
		expect(() => computeClusterTable(leaves, { minZoom: 9, maxZoom: 8 })).toThrow()
		expect(() => computeClusterTable(leaves, { minZoom: 0.05, maxZoom: NaN })).toThrow()
		expect(() => computeClusterTable(leaves, { minZoom: 0.05, maxZoom: Infinity })).toThrow()
		expect(() => computeClusterTable(leaves, { eps: NaN, ...ZOOM_BOUNDS })).toThrow()
		expect(() => computeClusterTable(leaves, { Tc: NaN, ...ZOOM_BOUNDS })).toThrow()
	})

	it('validates even when there is nothing to cluster', () => {
		expect(() => computeClusterTable([], { minZoom: 0, maxZoom: 8 })).toThrow()
		expect(() => computeClusterTable([leaf('x', 0, 0)], { Tc: -1, ...ZOOM_BOUNDS })).toThrow()
	})

	it('propagates input errors from the MST stage', () => {
		expect(() =>
			computeClusterTable([leaf('dup', 0, 0), leaf('dup', 1, 1)], { ...ZOOM_BOUNDS })
		).toThrow(/dup/)
		expect(() =>
			computeClusterTable([leaf('ok', 0, 0), leaf('bad', NaN, 0)], { ...ZOOM_BOUNDS })
		).toThrow(/bad/)
	})
})

describe('computeClusterTable end-to-end scenarios', () => {
	it('produces the appendix A.2 zoom bands for the 8-pin chain, via the runtime', () => {
		const leaves = Array.from({ length: 8 }, (_, i) => leaf(`p${i + 1}`, i * 10, 0))
		const table = computeClusterTable(leaves, { ...ZOOM_BOUNDS })

		// events (centroid pricing): four pair births at zMerge 4 (zSplit 6), two
		// quads at zMerge 2 (zSplit 3), the bridge at zMerge 1 (zSplit 1.5)
		const seedAt = (zoom: number) => {
			const rt = createClusterRuntime(table)
			rt.seed(zoom)
			return [...rt.getVisible().keys()].sort()
		}
		// zoom 8: above every band midpoint → 8 separate pins
		expect(seedAt(8)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'])
		// zoom 3: below the pair midpoints (√24 ≈ 4.9), above the quad midpoint (√6 ≈ 2.45)
		expect(seedAt(3)).toEqual(['cluster:2:p1', 'cluster:2:p3', 'cluster:2:p5', 'cluster:2:p7'])
		// zoom 2: quads merged, above the bridge midpoint (√1.5 ≈ 1.22)
		expect(seedAt(2)).toEqual(['cluster:4:p1', 'cluster:4:p5'])
		// zoom 1: below everything → one badge of 8
		expect(seedAt(1)).toEqual(['cluster:8:p1'])
	})

	it('keeps far-apart groups exactly independent at eps = 0 (bridge pruned by minZoom)', () => {
		// Two groups 10,000 page units apart: the bridging merge would fire at
		// z ≈ 40/10000 = 0.004 < minZoom → pruned. With eps = 0 no contraction
		// window can couple the groups, so the combined table is exactly the two
		// solo tables' events merged in threshold order.
		const groupA = randomLeaves(12, 5, 300)
		const groupB = randomLeaves(12, 9, 300).map((l) => ({
			id: `far-${l.id}`,
			point: { x: l.point.x + 10000, y: l.point.y },
		}))
		const opts = { eps: 0, ...ZOOM_BOUNDS }

		const combined = tableShapes(computeClusterTable([...groupA, ...groupB], opts))
		const soloA = tableShapes(computeClusterTable(groupA, opts))
		const soloB = tableShapes(computeClusterTable(groupB, opts))

		const merged = [...soloA, ...soloB].sort((a, b) => b.zMerge - a.zMerge)
		expect(combined.map((e) => e.result).sort()).toEqual(merged.map((e) => e.result).sort())
		expect(combined).toHaveLength(soloA.length + soloB.length)

		// no event ever mixes members across the gap
		for (const ev of combined) {
			const far = ev.members.filter((m) => m.startsWith('far-')).length
			expect(far === 0 || far === ev.members.length).toBe(true)
		}
	})

	it('keeps group memberships unmixed at default eps too (thresholds may synchronize)', () => {
		// Global contraction windows may pull the two groups' thresholds together
		// (synchronized firing is by design) but must never fuse their clusters.
		const groupA = randomLeaves(10, 55, 300)
		const groupB = randomLeaves(10, 66, 300).map((l) => ({
			id: `far-${l.id}`,
			point: { x: l.point.x + 10000, y: l.point.y },
		}))
		const combined = computeClusterTable([...groupA, ...groupB], { ...ZOOM_BOUNDS })
		for (const ev of combined.events) {
			const far = ev.result.members.filter((m) => m.startsWith('far-')).length
			expect(far === 0 || far === ev.result.members.length).toBe(true)
		}
	})
})

describe('computeClusterTable performance', () => {
	it('builds 2,000 leaves well within budget', () => {
		const leaves = randomLeaves(2000, 2026)
		const start = performance.now()
		const table = computeClusterTable(leaves, { ...ZOOM_BOUNDS })
		const elapsed = performance.now() - start
		expect(table.leaves).toHaveLength(2000)
		// generous bound to stay non-flaky on slow CI
		expect(elapsed).toBeLessThan(2500)
	})
})
