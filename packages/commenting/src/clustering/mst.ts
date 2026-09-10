import type { LeafInput, MstEdge } from './types'

/**
 * Return the Euclidean MST over the leaves, ordered by the canonical edge key:
 * distance, then normalized endpoint ids.
 */
export function mstEdges(leaves: readonly LeafInput[]): MstEdge[] {
	const n = leaves.length
	const ids = new Array<string>(n)
	const xs = new Float64Array(n)
	const ys = new Float64Array(n)
	const seen = new Set<string>()

	let root = 0
	for (let i = 0; i < n; i++) {
		const leaf = leaves[i]
		if (seen.has(leaf.id)) {
			throw new Error(`Duplicate leaf id: ${leaf.id}`)
		}
		seen.add(leaf.id)
		if (!Number.isFinite(leaf.point.x) || !Number.isFinite(leaf.point.y)) {
			throw new Error(`Non-finite coordinate for leaf id: ${leaf.id}`)
		}
		ids[i] = leaf.id
		xs[i] = leaf.point.x
		ys[i] = leaf.point.y
		if (i > 0 && leaf.id < ids[root]) root = i
	}

	if (n < 2) return []

	const inTree = new Uint8Array(n)
	const bestD2 = new Float64Array(n)
	const bestFrom = new Int32Array(n)

	inTree[root] = 1
	bestD2.fill(Number.POSITIVE_INFINITY)
	bestFrom.fill(-1)

	for (let i = 0; i < n; i++) {
		if (i === root) continue
		bestD2[i] = squaredDistance(xs, ys, root, i)
		bestFrom[i] = root
	}

	const edges: MstEdge[] = []

	for (let edgeCount = 0; edgeCount < n - 1; edgeCount++) {
		let next = -1
		for (let i = 0; i < n; i++) {
			if (inTree[i]) continue
			if (
				next === -1 ||
				edgeKeyLess(bestD2[i], bestFrom[i], i, bestD2[next], bestFrom[next], next, ids)
			) {
				next = i
			}
		}

		const from = bestFrom[next]
		edges.push(createOutputEdge(xs, ys, ids, from, next))
		inTree[next] = 1

		for (let i = 0; i < n; i++) {
			if (inTree[i]) continue
			const d2 = squaredDistance(xs, ys, next, i)
			if (edgeKeyLess(d2, next, i, bestD2[i], bestFrom[i], i, ids)) {
				bestD2[i] = d2
				bestFrom[i] = next
			}
		}
	}

	edges.sort((a, b) => outputEdgeCompare(a, b, leaves))
	return edges
}

function squaredDistance(xs: Float64Array, ys: Float64Array, a: number, b: number): number {
	const dx = xs[a] - xs[b]
	const dy = ys[a] - ys[b]
	return dx * dx + dy * dy
}

function edgeKeyLess(
	d2A: number,
	a0: number,
	a1: number,
	d2B: number,
	b0: number,
	b1: number,
	ids: readonly string[]
): boolean {
	if (d2A !== d2B) return d2A < d2B

	const aLo = ids[a0] < ids[a1] ? ids[a0] : ids[a1]
	const aHi = ids[a0] < ids[a1] ? ids[a1] : ids[a0]
	const bLo = ids[b0] < ids[b1] ? ids[b0] : ids[b1]
	const bHi = ids[b0] < ids[b1] ? ids[b1] : ids[b0]

	if (aLo !== bLo) return aLo < bLo
	return aHi < bHi
}

function createOutputEdge(
	xs: Float64Array,
	ys: Float64Array,
	ids: readonly string[],
	i: number,
	j: number
): MstEdge {
	const a = ids[i] < ids[j] ? i : j
	const b = ids[i] < ids[j] ? j : i
	return {
		a,
		b,
		d: Math.hypot(xs[a] - xs[b], ys[a] - ys[b]),
	}
}

function outputEdgeCompare(a: MstEdge, b: MstEdge, leaves: readonly LeafInput[]): number {
	if (a.d < b.d) return -1
	if (a.d > b.d) return 1

	const aLo = leaves[a.a].id
	const aHi = leaves[a.b].id
	const bLo = leaves[b.a].id
	const bHi = leaves[b.b].id

	if (aLo < bLo) return -1
	if (aLo > bLo) return 1
	if (aHi < bHi) return -1
	if (aHi > bHi) return 1
	return 0
}
