import { describe, expect, it } from 'vitest'
import { computeClusterTable } from './computeClusterTable'
import { createClusterRuntime } from './runtime'
import { ClusterTable, LeafInput, MergeEvent } from './types'

// The locality contract the overlay's rendering relies on (CLUSTERING.md §8.4):
// a visible cluster's members never sit farther than (1+eps)·r·Dmax screen px
// from its centroid, so culling with that margin never hides a badge whose
// member anchors are on screen. The bound stacks all three mechanisms:
//   cap        — zEff·pageDiag ≤ Dmax at every raw merge
//   contraction— fusing to the window anchor overshoots by ≤ (1+eps)
//   hysteresis — a merged cluster survives up to zSplit = r·zMerge
// and uses the FULL extent, not half: a count-weighted centroid of a skewed
// cluster (many pins on one side, one far out) can sit a full extent from its
// farthest member.

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

const OPTS = { Tc: 40, Tu: 60, eps: 0.12, Dmax: 120, minZoom: 0.05, maxZoom: 8, maxSplitZoom: 1e9 }
const R = OPTS.Tu / OPTS.Tc
const SLACK = 1 + 1e-9

function pointsOf(leaves: readonly LeafInput[]): Map<string, { x: number; y: number }> {
	return new Map(leaves.map((l) => [l.id, l.point]))
}

/** Bbox diagonal of a member set, recomputed from the original leaf anchors. */
function memberDiag(
	members: readonly string[],
	pts: Map<string, { x: number; y: number }>
): number {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const id of members) {
		const p = pts.get(id)!
		minX = Math.min(minX, p.x)
		minY = Math.min(minY, p.y)
		maxX = Math.max(maxX, p.x)
		maxY = Math.max(maxY, p.y)
	}
	return Math.hypot(maxX - minX, maxY - minY)
}

function zoomWalk(steps: number, seed: number): number[] {
	const rand = mulberry32(seed)
	const lnMin = Math.log(OPTS.minZoom)
	const lnMax = Math.log(OPTS.maxZoom)
	let ln = (lnMin + lnMax) / 2
	const walk: number[] = []
	for (let i = 0; i < steps; i++) {
		const r = rand()
		if (r < 0.15) ln = lnMin + rand() * (lnMax - lnMin)
		else ln = Math.min(lnMax, Math.max(lnMin, ln + (rand() - 0.5) * 0.4))
		walk.push(Math.exp(ln))
	}
	return walk
}

describe('locality bounds (the culling contract)', () => {
	it('bounds every finite event at birth: zMerge · pageDiag(result) ≤ (1+eps) · Dmax', () => {
		for (const seed of [3, 42, 77]) {
			const leaves = randomLeaves(50, seed)
			const table = computeClusterTable(leaves, OPTS)
			const pts = pointsOf(leaves)
			for (const ev of table.events) {
				if (!Number.isFinite(ev.zMerge)) continue
				const diag = memberDiag(ev.result.members, pts)
				expect(ev.zMerge * diag).toBeLessThanOrEqual((1 + OPTS.eps) * OPTS.Dmax * SLACK)
			}
		}
	})

	it('bounds every VISIBLE cluster during random zoom walks: member-to-centroid ≤ (1+eps)·r·Dmax screen px', () => {
		const margin = (1 + OPTS.eps) * R * OPTS.Dmax * SLACK
		for (const seed of [5, 21]) {
			const leaves = randomLeaves(40, seed * 7)
			const table = computeClusterTable(leaves, OPTS)
			const pts = pointsOf(leaves)
			const rt = createClusterRuntime(table)
			const walk = zoomWalk(200, seed)
			rt.seed(walk[0])
			for (const zoom of walk) {
				rt.onCamera(zoom)
				for (const cluster of rt.getVisible().values()) {
					if (cluster.count === 1) continue
					for (const id of cluster.members) {
						const p = pts.get(id)!
						const dist = Math.hypot(p.x - cluster.centroid.x, p.y - cluster.centroid.y)
						expect(zoom * dist).toBeLessThanOrEqual(margin)
					}
				}
			}
		}
	})

	it('exercises the skewed-centroid worst case (many pins one side, one far out)', () => {
		// 9 pins tightly packed at the origin plus one at distance 35: the
		// count-weighted centroid sits near the pack, so the far member is almost
		// a FULL extent away — the case that breaks a Dmax/2-style margin.
		const leaves = [
			...Array.from({ length: 9 }, (_, i) => leaf(`pack-${i}`, (i % 3) * 2, Math.floor(i / 3) * 2)),
			leaf('far', 39, 2),
		]
		const table = computeClusterTable(leaves, OPTS)
		const pts = pointsOf(leaves)
		const full = table.events.find((ev) => ev.result.count === 10)
		expect(full).toBeDefined()
		// the far member really is beyond half the extent from the centroid…
		const diag = memberDiag(full!.result.members, pts)
		const p = pts.get('far')!
		const dist = Math.hypot(p.x - full!.result.centroid.x, p.y - full!.result.centroid.y)
		expect(dist).toBeGreaterThan(diag / 2)
		// …and still within the full-extent bound at any zoom the cluster survives
		expect(full!.zSplit * dist).toBeLessThanOrEqual((1 + OPTS.eps) * R * OPTS.Dmax * SLACK)
	})
})

describe('move lifecycle (pick up = delete, drop = insert — CLUSTERING.md §9.2)', () => {
	function tableShapes(table: ClusterTable) {
		return table.events.map((ev: MergeEvent) => ({
			zMerge: ev.zMerge,
			zSplit: ev.zSplit,
			children: ev.children.map((c) => c.id),
			result: ev.result.id,
		}))
	}

	it('drop-then-rebuild equals a fresh build of the final positions', () => {
		const before = randomLeaves(20, 11)
		// pick up leaf-5 (delete)…
		const during = before.filter((l) => l.id !== 'leaf-5')
		// …drop it somewhere else (insert at the end — array order differs from a
		// fresh build, which must not matter)
		const after = [...during, leaf('leaf-5', 777, 333)]
		const fresh = before.map((l) => (l.id === 'leaf-5' ? leaf('leaf-5', 777, 333) : l))

		expect(tableShapes(computeClusterTable(after, OPTS))).toEqual(
			tableShapes(computeClusterTable(fresh, OPTS))
		)
	})

	it('the mid-drag table is simply the table without the picked-up comment', () => {
		const before = randomLeaves(12, 13)
		const during = before.filter((l) => l.id !== 'leaf-3')
		const table = computeClusterTable(during, OPTS)
		expect(table.leaves.some((l) => l.id === 'leaf-3')).toBe(false)
		for (const ev of table.events) {
			expect(ev.result.members).not.toContain('leaf-3')
		}
	})

	it('re-seeding after the rebuild matches seeding the fresh table directly', () => {
		const before = randomLeaves(20, 17)
		const after = [...before.filter((l) => l.id !== 'leaf-5'), leaf('leaf-5', 777, 333)]
		const rebuilt = createClusterRuntime(computeClusterTable(after, OPTS))
		const freshRt = createClusterRuntime(createFreshTableSameShape(after))
		for (const zoom of [0.1, 0.5, 1, 2, 4, 7.9]) {
			rebuilt.seed(zoom)
			freshRt.seed(zoom)
			expect([...rebuilt.getVisible().keys()].sort()).toEqual(
				[...freshRt.getVisible().keys()].sort()
			)
		}

		function createFreshTableSameShape(leaves: LeafInput[]): ClusterTable {
			return computeClusterTable(leaves.slice().reverse(), OPTS)
		}
	})
})
