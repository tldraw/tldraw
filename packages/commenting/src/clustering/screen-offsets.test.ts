import type { VecLike } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { computeClusterTable } from './computeClusterTable'
import type { LeafInput } from './types'

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

function randomLeaves(n: number, seed: number, scale = 1000): LeafInput[] {
	const rand = mulberry32(seed)
	return Array.from({ length: n }, (_, i) => leaf(`leaf-${i}`, rand() * scale, rand() * scale))
}

const ZOOM_BOUNDS = { minZoom: 0.05, maxZoom: 8 }
// eps 0 keeps every merge as its own solo event, so the exact thresholds under test aren't
// snapped to a contraction window's anchor.
const EXACT_OPTS = { Tc: 22, Tu: 26.4, eps: 0, Dmax: 82.5, ...ZOOM_BOUNDS }

function offsets(entries: Record<string, VecLike>): Map<string, VecLike> {
	return new Map(Object.entries(entries))
}

describe('computeClusterTable without screen offsets (the guarantee)', () => {
	it('is deep-equal across omitted, undefined, and empty offset arguments', () => {
		for (const seed of [3, 21]) {
			const leaves = randomLeaves(40, seed)
			const plain = computeClusterTable(leaves, { ...ZOOM_BOUNDS })
			expect(computeClusterTable(leaves, { ...ZOOM_BOUNDS }, undefined)).toEqual(plain)
			expect(computeClusterTable(leaves, { ...ZOOM_BOUNDS }, new Map())).toEqual(plain)
		}
	})

	it('is deep-equal when every leaf carries the same offset (Δō is always zero)', () => {
		const leaves = randomLeaves(30, 11)
		const uniform = new Map(leaves.map((l) => [l.id, { x: -20, y: 20 }]))
		expect(computeClusterTable(leaves, { ...ZOOM_BOUNDS }, uniform)).toEqual(
			computeClusterTable(leaves, { ...ZOOM_BOUNDS })
		)
	})

	it('never emits a zSplit override on the offset-free path', () => {
		const table = computeClusterTable(randomLeaves(20, 5), { ...ZOOM_BOUNDS }, new Map())
		for (const event of table.events) {
			// finalize always derives ratio splits when no override was carried
			expect(event.zSplit).toBeCloseTo(event.zMerge * 1.2, 10)
		}
	})
})

describe('offset-aware pricing', () => {
	const A = leaf('a', 0, 0)
	const B = leaf('b', 100, 0)

	it('merges earlier when the insets point toward each other, at the exact visual crossing', () => {
		// Visual positions: a at 100·0·z + 20, b at 100z − 20 → distance |100z − 40|. Tc = 22
		// crosses at z = 0.62 (raw anchors would say 0.22); the split derives from the Tu/Tc
		// ratio, as for every event.
		const table = computeClusterTable(
			[A, B],
			EXACT_OPTS,
			offsets({ a: { x: 20, y: 0 }, b: { x: -20, y: 0 } })
		)
		expect(table.events).toHaveLength(1)
		expect(table.events[0].zMerge).toBeCloseTo(0.62, 10)
		expect(table.events[0].zSplit).toBeCloseTo(0.62 * 1.2, 10)
	})

	it('merges later when the insets point apart, at the exact visual crossing', () => {
		// Distance 100z + 10: Tc at z = 0.12 (raw: 0.22); ratio split at 0.144.
		const table = computeClusterTable(
			[A, B],
			EXACT_OPTS,
			offsets({ a: { x: -5, y: 0 }, b: { x: 5, y: 0 } })
		)
		expect(table.events).toHaveLength(1)
		expect(table.events[0].zMerge).toBeCloseTo(0.12, 10)
		expect(table.events[0].zSplit).toBeCloseTo(0.144, 10)
	})

	it('never merges a pair whose visual distance never reaches Tc', () => {
		// Distance 100z + 40 ≥ 40 > Tc at every zoom: priced 0 and pruned by the minZoom cut.
		const table = computeClusterTable(
			[A, B],
			EXACT_OPTS,
			offsets({ a: { x: -20, y: 0 }, b: { x: 20, y: 0 } })
		)
		expect(table.events).toEqual([])
	})

	it('still applies the Dmax fit cap to a corrected merge', () => {
		// Exaggerated inward offsets put the Tc crossing at z = 1.42, above the spread cap
		// Dmax/diag = 82.5/100 = 0.825, so the cap wins the min.
		const table = computeClusterTable(
			[A, B],
			EXACT_OPTS,
			offsets({ a: { x: 60, y: 0 }, b: { x: -60, y: 0 } })
		)
		expect(table.events).toHaveLength(1)
		expect(table.events[0].zMerge).toBeCloseTo(0.825, 10)
		expect(table.events[0].zSplit).toBeCloseTo(0.825 * 1.2, 10)
	})

	it('treats coincident anchors with differing offsets as a constant visual distance', () => {
		// Same anchor point, one pin tucked: constant 20px apart < Tc → merged at every zoom,
		// entering the same maxSplitZoom band as a coincident pair (zMerge 6/1.2 = 5, zSplit 6).
		const table = computeClusterTable(
			[leaf('a', 50, 50), leaf('b', 50, 50)],
			{ ...EXACT_OPTS, maxSplitZoom: 6 },
			offsets({ a: { x: 20, y: 0 } })
		)
		expect(table.events).toHaveLength(1)
		expect(table.events[0].zMerge).toBe(5)
		expect(table.events[0].zSplit).toBe(6)
	})

	it("dilutes a cluster's mean offset as precise members fold in", () => {
		// a (tucked 20px) and b (precise) share an anchor: constant 20px apart, always merged.
		// Their cluster's mean offset is (10, 0); against precise c 100 units right the visual
		// distance is |100z − 10| → Tc at z = 0.32 — half the lone pin's correction.
		const table = computeClusterTable(
			[leaf('a', 0, 0), leaf('b', 0, 0), leaf('c', 100, 0)],
			EXACT_OPTS,
			offsets({ a: { x: 20, y: 0 } })
		)
		expect(table.events).toHaveLength(2)
		const outer = table.events.find((e) => e.result.count === 3)!
		expect(outer.zMerge).toBeCloseTo(0.32, 10)
		expect(outer.zSplit).toBeCloseTo(0.32 * 1.2, 10)
	})
})

describe('table ordering with offsets', () => {
	it('keeps zMerge and zSplit non-increasing (splits are always ratio-derived)', () => {
		// Mixed offset and plain leaves at varied spacings: every split is zMerge · (Tu/Tc), so
		// both threshold sequences inherit the table's non-increasing order — the invariant the
		// runtime's prefix cursor, split walk, and seed bisection rely on.
		const leaves = [
			leaf('a', 0, 0),
			leaf('b', 100, 0),
			leaf('c', 130, 0),
			leaf('d', 400, 0),
			leaf('e', 470, 0),
			leaf('f', 1000, 300),
		]
		const table = computeClusterTable(
			leaves,
			EXACT_OPTS,
			offsets({ a: { x: -20, y: 0 }, b: { x: 14, y: 0 }, d: { x: 20, y: 14 } })
		)
		expect(table.events.length).toBeGreaterThan(2)
		for (let i = 1; i < table.events.length; i++) {
			expect(table.events[i].zMerge).toBeLessThanOrEqual(table.events[i - 1].zMerge)
			expect(table.events[i].zSplit).toBeLessThanOrEqual(table.events[i - 1].zSplit)
		}
		for (const event of table.events) {
			expect(event.zSplit).toBeCloseTo(event.zMerge * 1.2, 10)
		}
	})
})
