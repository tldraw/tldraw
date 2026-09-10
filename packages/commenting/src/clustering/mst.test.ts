import { describe, expect, it } from 'vitest'
import { mstEdges } from './mst'
import { LeafInput, MstEdge } from './types'

function leaf(id: string, x: number, y: number): LeafInput {
	return { id, point: { x, y } }
}

/** An edge as a canonical `idLo|idHi` string (output edges are already id-normalized). */
function pairKey(e: MstEdge, leaves: readonly LeafInput[]): string {
	return `${leaves[e.a].id}|${leaves[e.b].id}`
}

function pairKeySet(edges: MstEdge[], leaves: readonly LeafInput[]): Set<string> {
	return new Set(edges.map((e) => pairKey(e, leaves)))
}

/** Map of `idLo|idHi` → distance, for order-independent comparisons across shuffles. */
function pairDistanceMap(edges: MstEdge[], leaves: readonly LeafInput[]): Map<string, number> {
	return new Map(edges.map((e) => [pairKey(e, leaves), e.d]))
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

class UnionFind {
	private parent: number[]
	constructor(n: number) {
		this.parent = Array.from({ length: n }, (_, i) => i)
	}
	find(x: number): number {
		while (this.parent[x] !== x) {
			this.parent[x] = this.parent[this.parent[x]]
			x = this.parent[x]
		}
		return x
	}
	union(a: number, b: number): boolean {
		const ra = this.find(a)
		const rb = this.find(b)
		if (ra === rb) return false
		this.parent[ra] = rb
		return true
	}
}

/**
 * Reference oracle: Kruskal over the complete graph under the contract's strict edge
 * order — (distance, idLo, idHi). Distances are compared as squares, which orders
 * identically to true distances and avoids sqrt rounding. This is the definition the
 * implementation must reproduce exactly, ties and all.
 */
function referenceKruskal(leaves: readonly LeafInput[]): Set<string> {
	const n = leaves.length
	if (n < 2) return new Set()
	const all: { i: number; j: number; d2: number; idLo: string; idHi: string }[] = []
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const dx = leaves[i].point.x - leaves[j].point.x
			const dy = leaves[i].point.y - leaves[j].point.y
			const [idLo, idHi] =
				leaves[i].id < leaves[j].id ? [leaves[i].id, leaves[j].id] : [leaves[j].id, leaves[i].id]
			all.push({ i, j, d2: dx * dx + dy * dy, idLo, idHi })
		}
	}
	all.sort((a, b) => {
		if (a.d2 !== b.d2) return a.d2 - b.d2
		if (a.idLo !== b.idLo) return a.idLo < b.idLo ? -1 : 1
		return a.idHi < b.idHi ? -1 : 1
	})
	const uf = new UnionFind(n)
	const accepted = new Set<string>()
	for (const e of all) {
		if (uf.union(e.i, e.j)) {
			accepted.add(`${e.idLo}|${e.idHi}`)
			if (accepted.size === n - 1) break
		}
	}
	return accepted
}

/** Assert the structural contract: n−1 edges, spanning, no duplicate pairs, valid endpoints. */
function expectSpanningTree(edges: MstEdge[], leaves: readonly LeafInput[]) {
	const n = leaves.length
	expect(edges).toHaveLength(Math.max(0, n - 1))
	const uf = new UnionFind(n)
	const seen = new Set<string>()
	for (const e of edges) {
		expect(Number.isInteger(e.a)).toBe(true)
		expect(Number.isInteger(e.b)).toBe(true)
		expect(e.a).toBeGreaterThanOrEqual(0)
		expect(e.b).toBeGreaterThanOrEqual(0)
		expect(e.a).toBeLessThan(n)
		expect(e.b).toBeLessThan(n)
		expect(e.a).not.toBe(e.b)
		const key = pairKey(e, leaves)
		expect(seen.has(key)).toBe(false)
		seen.add(key)
		// n−1 accepted unions with no rejected ones ⇒ connected and acyclic
		expect(uf.union(e.a, e.b)).toBe(true)
	}
}

/** Assert output ordering (d, then idLo, then idHi) and endpoint id-normalization. */
function expectSortedAndNormalized(edges: MstEdge[], leaves: readonly LeafInput[]) {
	for (const e of edges) {
		expect(leaves[e.a].id < leaves[e.b].id).toBe(true)
	}
	for (let i = 1; i < edges.length; i++) {
		const prev = edges[i - 1]
		const curr = edges[i]
		if (prev.d !== curr.d) {
			expect(prev.d).toBeLessThan(curr.d)
			continue
		}
		const prevLo = leaves[prev.a].id
		const currLo = leaves[curr.a].id
		if (prevLo !== currLo) {
			expect(prevLo < currLo).toBe(true)
			continue
		}
		expect(leaves[prev.b].id < leaves[curr.b].id).toBe(true)
	}
}

/** Assert each edge's distance is the exact Math.hypot of its endpoints. */
function expectExactDistances(edges: MstEdge[], leaves: readonly LeafInput[]) {
	for (const e of edges) {
		const expected = Math.hypot(
			leaves[e.a].point.x - leaves[e.b].point.x,
			leaves[e.a].point.y - leaves[e.b].point.y
		)
		expect(e.d).toBe(expected)
	}
}

describe('mstEdges fixtures', () => {
	it('returns [] for zero and one leaves', () => {
		expect(mstEdges([])).toEqual([])
		expect(mstEdges([leaf('only', 5, 5)])).toEqual([])
	})

	it('connects two points with one exact-distance edge', () => {
		const leaves = [leaf('a', 0, 0), leaf('b', 3, 4)]
		expect(mstEdges(leaves)).toEqual([{ a: 0, b: 1, d: 5 }])
	})

	it('normalizes endpoints by id, not input order', () => {
		// 'b' comes first in the array; the edge must still point a→'a', b→'b'
		const leaves = [leaf('b', 3, 4), leaf('a', 0, 0)]
		expect(mstEdges(leaves)).toEqual([{ a: 1, b: 0, d: 5 }])
	})

	it('handles coincident points with a d = 0 edge', () => {
		const leaves = [leaf('a', 7, 7), leaf('b', 7, 7)]
		expect(mstEdges(leaves)).toEqual([{ a: 0, b: 1, d: 0 }])
	})

	it('builds the path MST for collinear points with distinct gaps, sorted ascending', () => {
		// x positions 0, 1, 3, 7 → consecutive gaps 1, 2, 4; no skip edge can beat them
		const leaves = [leaf('a', 0, 0), leaf('b', 1, 0), leaf('c', 3, 0), leaf('d', 7, 0)]
		expect(mstEdges(leaves)).toEqual([
			{ a: 0, b: 1, d: 1 },
			{ a: 1, b: 2, d: 2 },
			{ a: 2, b: 3, d: 4 },
		])
	})

	it('breaks four-way side ties of the unit square by id order', () => {
		// All four sides have d = 1. Kruskal under (d, idLo, idHi) accepts
		// (a,b), then (a,d), then (b,c); (c,d) would close the cycle.
		const leaves = [leaf('a', 0, 0), leaf('b', 1, 0), leaf('c', 1, 1), leaf('d', 0, 1)]
		expect(mstEdges(leaves)).toEqual([
			{ a: 0, b: 1, d: 1 },
			{ a: 0, b: 3, d: 1 },
			{ a: 1, b: 2, d: 1 },
		])
	})

	it('builds the path MST for the uniform chain (the clustering worst case)', () => {
		// 8 pins spaced 10 apart — CLUSTERING.md appendix A.2. All 7 edges d = 10.
		const leaves = Array.from({ length: 8 }, (_, i) => leaf(`p${i + 1}`, i * 10, 0))
		const edges = mstEdges(leaves)
		expect(edges.map((e) => pairKey(e, leaves))).toEqual([
			'p1|p2',
			'p2|p3',
			'p3|p4',
			'p4|p5',
			'p5|p6',
			'p6|p7',
			'p7|p8',
		])
		for (const e of edges) expect(e.d).toBe(10)
	})

	it('crosses a dumbbell gap exactly once, via the closest pair (cut property)', () => {
		// Two tight clusters far apart; l2/r0 is the unique closest crossing pair.
		const leaves = [
			leaf('l0', 0, 0),
			leaf('l1', 2, 1),
			leaf('l2', 4, 0),
			leaf('r0', 100, 0),
			leaf('r1', 102, 1),
			leaf('r2', 104, 0),
		]
		const edges = mstEdges(leaves)
		const crossings = edges.filter(
			(e) => leaves[e.a].id.startsWith('l') !== leaves[e.b].id.startsWith('l')
		)
		expect(crossings).toHaveLength(1)
		expect(pairKey(crossings[0], leaves)).toBe('l2|r0')
		expect(crossings[0].d).toBe(96)
	})

	it('chains coincident points with d = 0 edges plus one bridge', () => {
		const leaves = [leaf('a', 5, 5), leaf('b', 5, 5), leaf('c', 5, 5), leaf('far', 105, 5)]
		const edges = mstEdges(leaves)
		const zeros = edges.filter((e) => e.d === 0)
		const bridges = edges.filter((e) => e.d !== 0)
		expect(zeros).toHaveLength(2)
		expect(bridges).toHaveLength(1)
		expect(bridges[0].d).toBe(100)
		// zero edges come first in the ascending sort, tie-broken by id: (a,b) then (a,c)
		expect(edges.slice(0, 2).map((e) => pairKey(e, leaves))).toEqual(['a|b', 'a|c'])
	})
})

describe('mstEdges vs reference Kruskal oracle', () => {
	it.each([2, 3, 5, 10, 50, 120])('matches the oracle on %i random points', (n) => {
		for (const seed of [1, 42, 1234]) {
			const leaves = randomLeaves(n, seed * 31 + n)
			const edges = mstEdges(leaves)
			expectSpanningTree(edges, leaves)
			expectSortedAndNormalized(edges, leaves)
			expectExactDistances(edges, leaves)
			expect(pairKeySet(edges, leaves)).toEqual(referenceKruskal(leaves))
		}
	})

	it('matches the oracle on a 5×5 integer grid (maximal distance ties)', () => {
		const leaves: LeafInput[] = []
		for (let y = 0; y < 5; y++) {
			for (let x = 0; x < 5; x++) {
				leaves.push(leaf(`g-${x}-${y}`, x, y))
			}
		}
		const edges = mstEdges(leaves)
		expectSpanningTree(edges, leaves)
		expectSortedAndNormalized(edges, leaves)
		// every grid MST edge is an axis-aligned unit step
		for (const e of edges) expect(e.d).toBe(1)
		expect(pairKeySet(edges, leaves)).toEqual(referenceKruskal(leaves))
	})

	it('matches the oracle across realistic canvas coordinate regimes', () => {
		// Canvas pages routinely have negative coordinates (panning left/up of the
		// origin), large offsets, and tightly packed points — none of which the
		// uniform [0, 1000]² sets exercise.
		const regimes: { name: string; make(rand: () => number, i: number): LeafInput }[] = [
			{
				name: 'mixed-sign',
				make: (rand, i) => leaf(`m-${i}`, (rand() - 0.5) * 2000, (rand() - 0.5) * 2000),
			},
			{
				name: 'far-offset',
				make: (rand, i) => leaf(`f-${i}`, -5_000_000 + rand() * 1000, 3_000_000 + rand() * 1000),
			},
			{
				name: 'tiny-scale',
				make: (rand, i) => leaf(`t-${i}`, rand() * 0.001, rand() * 0.001),
			},
		]
		for (const regime of regimes) {
			const rand = mulberry32(101)
			const leaves = Array.from({ length: 60 }, (_, i) => regime.make(rand, i))
			const edges = mstEdges(leaves)
			expectSpanningTree(edges, leaves)
			expectSortedAndNormalized(edges, leaves)
			expectExactDistances(edges, leaves)
			expect(pairKeySet(edges, leaves)).toEqual(referenceKruskal(leaves))
		}
	})

	it('matches the oracle on random lattice points (ties + coincident points)', () => {
		const rand = mulberry32(7)
		const leaves = Array.from({ length: 60 }, (_, i) =>
			leaf(`lat-${i}`, Math.floor(rand() * 10), Math.floor(rand() * 10))
		)
		const edges = mstEdges(leaves)
		expectSpanningTree(edges, leaves)
		expectSortedAndNormalized(edges, leaves)
		expectExactDistances(edges, leaves)
		expect(pairKeySet(edges, leaves)).toEqual(referenceKruskal(leaves))
	})
})

describe('mstEdges determinism', () => {
	it('is invariant under input permutation (as an id-pair → distance map)', () => {
		const base = randomLeaves(80, 99)
		const expected = pairDistanceMap(mstEdges(base), base)
		for (const shuffleSeed of [5, 17, 23]) {
			const perm = shuffled(base, mulberry32(shuffleSeed))
			expect(pairDistanceMap(mstEdges(perm), perm)).toEqual(expected)
		}
	})

	it('is invariant under permutation even with heavy ties', () => {
		// Uniform chains have all-equal edge lengths — tie-breaking must be id-based,
		// never index-based, or a shuffled rebuild would produce a different tree.
		const base = Array.from({ length: 12 }, (_, i) =>
			leaf(`c${String(i).padStart(2, '0')}`, i * 10, 0)
		)
		const expected = pairDistanceMap(mstEdges(base), base)
		for (const shuffleSeed of [3, 11]) {
			const perm = shuffled(base, mulberry32(shuffleSeed))
			expect(pairDistanceMap(mstEdges(perm), perm)).toEqual(expected)
		}
	})

	it('returns identical output for repeated calls on the same input', () => {
		const leaves = randomLeaves(40, 7)
		expect(mstEdges(leaves)).toEqual(mstEdges(leaves))
	})

	it('does not mutate its input', () => {
		const leaves = randomLeaves(10, 3)
		const snapshot = JSON.parse(JSON.stringify(leaves))
		mstEdges(leaves)
		expect(leaves).toEqual(snapshot)
	})
})

describe('mstEdges validation', () => {
	it('throws on duplicate ids, naming the duplicate', () => {
		const leaves = [leaf('a', 0, 0), leaf('dup', 1, 0), leaf('dup', 2, 0)]
		expect(() => mstEdges(leaves)).toThrow(/dup/)
	})

	it('throws on non-finite coordinates, naming the leaf', () => {
		expect(() => mstEdges([leaf('ok', 0, 0), leaf('bad-x', NaN, 0)])).toThrow(/bad-x/)
		expect(() => mstEdges([leaf('ok', 0, 0), leaf('bad-y', 0, Infinity)])).toThrow(/bad-y/)
		expect(() => mstEdges([leaf('ok', 0, 0), leaf('bad-neg', 0, -Infinity)])).toThrow(/bad-neg/)
	})

	it('fails fast on invalid input even when n < 2', () => {
		expect(() => mstEdges([leaf('bad', NaN, NaN)])).toThrow(/bad/)
	})
})

describe('mstEdges performance', () => {
	it('handles 4,000 points well within budget', () => {
		const leaves = randomLeaves(4000, 2026)
		const start = performance.now()
		const edges = mstEdges(leaves)
		const elapsed = performance.now() - start
		expect(edges).toHaveLength(3999)
		// generous bound to stay non-flaky on slow CI; typical runs are ~100× faster
		expect(elapsed).toBeLessThan(2000)
	})
})
