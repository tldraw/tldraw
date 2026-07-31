import type { VecLike } from 'tldraw'
import { describe, expect, it } from 'vitest'
import { computeClusterTable } from './computeClusterTable'
import { contract } from './schedule'
import type { ClusterNode, LeafInput, RawMergeEvent } from './types'

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
		// crosses at z = 0.62 (raw anchors would say 0.22); Tu = 26.4 crosses at z = 0.664.
		const table = computeClusterTable(
			[A, B],
			EXACT_OPTS,
			offsets({ a: { x: 20, y: 0 }, b: { x: -20, y: 0 } })
		)
		expect(table.events).toHaveLength(1)
		expect(table.events[0].zMerge).toBeCloseTo(0.62, 10)
		expect(table.events[0].zSplit).toBeCloseTo(0.664, 10)
	})

	it('merges later when the insets point apart, at the exact visual crossing', () => {
		// Distance 100z + 10: Tc at z = 0.12 (raw: 0.22), Tu at z = 0.164.
		const table = computeClusterTable(
			[A, B],
			EXACT_OPTS,
			offsets({ a: { x: -5, y: 0 }, b: { x: 5, y: 0 } })
		)
		expect(table.events).toHaveLength(1)
		expect(table.events[0].zMerge).toBeCloseTo(0.12, 10)
		expect(table.events[0].zSplit).toBeCloseTo(0.164, 10)
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

	it('still applies the Dmax fit cap to a corrected merge, with the exact Tu split', () => {
		// Exaggerated inward offsets put the Tc crossing at z = 1.42, above the spread cap
		// Dmax/diag = 82.5/100 = 0.825, so the cap wins the min. The split keeps the exact Tu
		// crossing (26.4 + 120)/100 = 1.464 — it prices the visuals, not the cap.
		const table = computeClusterTable(
			[A, B],
			EXACT_OPTS,
			offsets({ a: { x: 60, y: 0 }, b: { x: -60, y: 0 } })
		)
		expect(table.events).toHaveLength(1)
		expect(table.events[0].zMerge).toBeCloseTo(0.825, 10)
		expect(table.events[0].zSplit).toBeCloseTo(1.464, 10)
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
		// distance is |100z − 10| → Tc at z = 0.32, Tu at 0.364 — half the lone pin's correction.
		const table = computeClusterTable(
			[leaf('a', 0, 0), leaf('b', 0, 0), leaf('c', 100, 0)],
			EXACT_OPTS,
			offsets({ a: { x: 20, y: 0 } })
		)
		expect(table.events).toHaveLength(2)
		const outer = table.events.find((e) => e.result.count === 3)!
		expect(outer.zMerge).toBeCloseTo(0.32, 10)
		expect(outer.zSplit).toBeCloseTo(0.364, 10)
	})
})

describe('contract with exact splits', () => {
	function node(id: string, x: number, y: number, members: string[] = [id]): ClusterNode {
		return { id, centroid: { x, y }, count: members.length, members }
	}
	function raw(a: ClusterNode, b: ClusterNode, z: number, zSplit?: number): RawMergeEvent {
		const members = [...a.members, ...b.members].sort()
		const result = node(`cluster:${members.length}:${members[0]}`, 0, 0, members)
		return zSplit !== undefined
			? { z, zSplit, children: [a, b], result }
			: { z, children: [a, b], result }
	}

	it("keeps a solo event's exact split and drops a grouped chain's", () => {
		const ab = raw(node('a', 0, 0), node('b', 10, 0), 2, 2.4)
		// c–d chained onto ab's result within the same window: contraction folds them into one
		// multi-way event, whose split must fall back to the ratio.
		const abc = raw(ab.result, node('c', 20, 0), 1.9, 2.28)
		const solo = raw(node('x', 1000, 0), node('y', 1010, 0), 0.5, 0.62)

		const contracted = contract([ab, abc, solo], 0.2)
		const grouped = contracted.find((e) => e.result.members.length === 3)!
		const kept = contracted.find((e) => e.result.members.includes('x'))!
		expect(grouped.zSplit).toBeUndefined()
		expect(kept.zSplit).toBe(0.62)
	})
})
