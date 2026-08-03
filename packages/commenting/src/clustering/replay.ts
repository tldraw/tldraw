import type { ClusterNode, LeafInput, LeafScreenOffsets, MstEdge, RawMergeEvent } from './types'

export const D_FLOOR = 1e-9

export function cappedReplay(
	leaves: readonly LeafInput[],
	edges: readonly MstEdge[],
	opts: { Tc: number; Dmax: number },
	// Render offsets for markers that draw off their anchor (imprecise pins). Omitted or empty,
	// every code path below is the offset-unaware original — pricing, events, and floats alike.
	screenOffsets?: LeafScreenOffsets
): RawMergeEvent[] {
	validateOptions(opts)

	if (edges.length === 0) return []

	const clusters = new ClusterState(leaves, screenOffsets)
	const heap = new EdgeMaxHeap(edges, leaves)
	// Edges incident to each current cluster root, for eager repricing: a merge
	// moves the result's centroid, which can RAISE an incident edge's key (the
	// centroid may move toward a neighbor), so the lazy pop-time recheck alone
	// is not enough — every price change pushes a fresh heap entry.
	const incident: number[][] = leaves.map(() => [])
	for (let i = 0; i < edges.length; i++) {
		heap.push({ edgeIndex: i, z: zForEdge(edges[i], clusters, opts) })
		incident[edges[i].a].push(i)
		incident[edges[i].b].push(i)
	}

	const events: RawMergeEvent[] = []
	// Emitted thresholds are clamped non-increasing: with centroid pricing a
	// later merge's raw price can in principle exceed an earlier one's, and the
	// table's descending sort is load-bearing for the runtime cursor.
	let lastZ = Number.POSITIVE_INFINITY
	while (events.length < edges.length) {
		const entry = heap.pop()
		if (!entry) break

		const edge = edges[entry.edgeIndex]
		const aRoot = clusters.find(edge.a)
		const bRoot = clusters.find(edge.b)
		if (aRoot === bRoot) continue // stale duplicate of an already-fired edge

		const current = { edgeIndex: entry.edgeIndex, z: zForRoots(edge, aRoot, bRoot, clusters, opts) }
		const next = heap.peek()
		if (next && heap.higherPriority(next, current)) {
			heap.push(current)
			continue
		}

		const z = Math.min(current.z, lastZ)
		lastZ = z
		events.push(clusters.merge(aRoot, bRoot, z))

		// eager reprice: the new cluster's centroid and bbox changed, so every
		// surviving incident edge gets a fresh entry at its current price
		const root = clusters.find(edge.a)
		const other = root === aRoot ? bRoot : aRoot
		const survivors: number[] = []
		for (const idx of [...incident[root], ...incident[other]]) {
			const e2 = edges[idx]
			const ra = clusters.find(e2.a)
			const rb = clusters.find(e2.b)
			if (ra === rb) continue
			survivors.push(idx)
			heap.push({ edgeIndex: idx, z: zForRoots(e2, ra, rb, clusters, opts) })
		}
		incident[root] = survivors
	}

	return events
}

function validateOptions(opts: { Tc: number; Dmax: number }) {
	if (!Number.isFinite(opts.Tc) || opts.Tc <= 0) {
		throw new Error('Tc must be greater than 0')
	}
	if (!Number.isFinite(opts.Dmax) || opts.Dmax <= 0) {
		throw new Error('Dmax must be greater than 0')
	}
	if (opts.Dmax < opts.Tc) {
		throw new Error('Dmax must be greater than or equal to Tc')
	}
}

function zForEdge(
	edge: MstEdge,
	clusters: ClusterState,
	opts: { Tc: number; Dmax: number }
): number {
	return zForRoots(edge, clusters.find(edge.a), clusters.find(edge.b), clusters, opts)
}

function zForRoots(
	edge: MstEdge,
	aRoot: number,
	bRoot: number,
	clusters: ClusterState,
	opts: { Tc: number; Dmax: number }
): number {
	// Null unless offset pricing is active AND this pair's mean render offsets differ. Every
	// other pair — including every pair when no offsets were passed — takes the branch below,
	// which is the offset-unaware pricing verbatim.
	const off = clusters.offsetDelta(aRoot, bRoot)
	if (off === null) {
		if (edge.d < D_FLOOR) return Number.POSITIVE_INFINITY
		// Badge-anchored gap pricing: clusters render as badges at their centroids,
		// so the merge is priced by the distance between the rendered centers, not
		// the nearest members. For leaves the two are identical; for clusters the
		// centroid distance is larger, so groups merge later than their closest
		// members would suggest — matching what the user actually sees.
		// (Coincident CENTROIDS with non-coincident members leave the gap term
		// Infinity and the fit term finite — the min stays finite, no special case.)
		const gap = opts.Tc / clusters.centroidDistance(aRoot, bRoot)
		const fit = opts.Dmax / clusters.unionBboxDiag(aRoot, bRoot)
		return Math.min(gap, fit)
	}

	// Offset-aware gap pricing: these markers render at `z·centroid + meanOffset`, so their
	// visual distance at zoom z is |z·ΔC + Δō| and the merge prices at its Tc crossing. When
	// that distance never reaches Tc (the constant offsets hold the visuals apart harder than
	// the anchors close), the pair prices at 0 — visually never mergeable, pruned by finalize's
	// minZoom cut. No D_FLOOR fast path here: coincident anchors with differing offsets are a
	// constant |Δō| apart on screen, which is exactly the ΔC = 0 case below.
	const dc = clusters.centroidDelta(aRoot, bRoot)
	if (dc.x === 0 && dc.y === 0) {
		return Math.hypot(off.x, off.y) < opts.Tc ? Number.POSITIVE_INFINITY : 0
	}
	const gap = largestVisualCrossing(dc.x, dc.y, off.x, off.y, opts.Tc)
	if (gap === null) return 0
	const fit = opts.Dmax / clusters.unionBboxDiag(aRoot, bRoot)
	return Math.min(gap, fit)
}

/**
 * The largest positive root of `|z·ΔC + Δō| = level`, i.e. of
 * `|ΔC|²·z² + 2(ΔC·Δō)·z + (|Δō|² − level²) = 0` — the zoom at which two offset markers are
 * exactly `level` screen px apart, with the distance below the level for every smaller zoom
 * (matching the "merged at z ≤ threshold" model; a lower second crossing, where opposed offsets
 * push the visuals back above the level near z = 0, is deliberately collapsed). Null when the
 * visual distance never reaches the level. Callers handle ΔC = 0 (constant distance) themselves.
 */
function largestVisualCrossing(
	dcx: number,
	dcy: number,
	dox: number,
	doy: number,
	level: number
): number | null {
	const a = dcx * dcx + dcy * dcy
	const b = 2 * (dcx * dox + dcy * doy)
	const c = dox * dox + doy * doy - level * level
	const disc = b * b - 4 * a * c
	if (disc < 0) return null
	const z = (-b + Math.sqrt(disc)) / (2 * a)
	return z > 0 ? z : null
}

class ClusterState {
	private readonly parent: Int32Array
	private readonly minX: Float64Array
	private readonly minY: Float64Array
	private readonly maxX: Float64Array
	private readonly maxY: Float64Array
	private readonly centroidX: Float64Array
	private readonly centroidY: Float64Array
	private readonly counts: Int32Array
	private readonly nodes: ClusterNode[]
	private readonly memberLists: string[][]
	private readonly minMemberIds: string[]
	// Per-cluster sums of member render offsets (screen px), maintained like the centroid sums.
	// Null when no offsets were passed — offsetDelta() then answers null unconditionally, which
	// routes every pricing call down the offset-unaware path.
	private readonly offsetX: Float64Array | null
	private readonly offsetY: Float64Array | null

	constructor(leaves: readonly LeafInput[], screenOffsets?: LeafScreenOffsets) {
		const n = leaves.length
		this.parent = new Int32Array(n)
		this.minX = new Float64Array(n)
		this.minY = new Float64Array(n)
		this.maxX = new Float64Array(n)
		this.maxY = new Float64Array(n)
		this.centroidX = new Float64Array(n)
		this.centroidY = new Float64Array(n)
		this.counts = new Int32Array(n)
		this.nodes = new Array(n)
		this.memberLists = new Array(n)
		this.minMemberIds = new Array(n)

		if (screenOffsets !== undefined && screenOffsets.size > 0) {
			this.offsetX = new Float64Array(n)
			this.offsetY = new Float64Array(n)
			for (let i = 0; i < n; i++) {
				const offset = screenOffsets.get(leaves[i].id)
				if (offset) {
					this.offsetX[i] = offset.x
					this.offsetY[i] = offset.y
				}
			}
		} else {
			this.offsetX = null
			this.offsetY = null
		}

		for (let i = 0; i < n; i++) {
			const leaf = leaves[i]
			this.parent[i] = i
			this.minX[i] = leaf.point.x
			this.minY[i] = leaf.point.y
			this.maxX[i] = leaf.point.x
			this.maxY[i] = leaf.point.y
			this.centroidX[i] = leaf.point.x
			this.centroidY[i] = leaf.point.y
			this.counts[i] = 1
			this.memberLists[i] = [leaf.id]
			this.minMemberIds[i] = leaf.id
			this.nodes[i] = {
				id: leaf.id,
				centroid: { x: leaf.point.x, y: leaf.point.y },
				count: 1,
				members: [leaf.id],
			}
		}
	}

	find(index: number): number {
		let root = index
		while (this.parent[root] !== root) {
			root = this.parent[root]
		}
		while (this.parent[index] !== index) {
			const next = this.parent[index]
			this.parent[index] = root
			index = next
		}
		return root
	}

	centroidDistance(aRoot: number, bRoot: number): number {
		return Math.hypot(
			this.centroidX[aRoot] - this.centroidX[bRoot],
			this.centroidY[aRoot] - this.centroidY[bRoot]
		)
	}

	centroidDelta(aRoot: number, bRoot: number): { x: number; y: number } {
		return {
			x: this.centroidX[aRoot] - this.centroidX[bRoot],
			y: this.centroidY[aRoot] - this.centroidY[bRoot],
		}
	}

	/** The difference of the two clusters' mean render offsets (screen px), or null when it's
	 *  zero — including always when no offsets were passed. Null routes pricing down the
	 *  offset-unaware path. */
	offsetDelta(aRoot: number, bRoot: number): { x: number; y: number } | null {
		if (this.offsetX === null || this.offsetY === null) return null
		const x = this.offsetX[aRoot] / this.counts[aRoot] - this.offsetX[bRoot] / this.counts[bRoot]
		const y = this.offsetY[aRoot] / this.counts[aRoot] - this.offsetY[bRoot] / this.counts[bRoot]
		if (x === 0 && y === 0) return null
		return { x, y }
	}

	unionBboxDiag(aRoot: number, bRoot: number): number {
		const minX = Math.min(this.minX[aRoot], this.minX[bRoot])
		const minY = Math.min(this.minY[aRoot], this.minY[bRoot])
		const maxX = Math.max(this.maxX[aRoot], this.maxX[bRoot])
		const maxY = Math.max(this.maxY[aRoot], this.maxY[bRoot])
		return Math.hypot(maxX - minX, maxY - minY)
	}

	merge(aRoot: number, bRoot: number, z: number): RawMergeEvent {
		const leftRoot = this.minMemberIds[aRoot] < this.minMemberIds[bRoot] ? aRoot : bRoot
		const rightRoot = leftRoot === aRoot ? bRoot : aRoot
		const left = this.nodes[leftRoot]
		const right = this.nodes[rightRoot]
		const count = this.counts[leftRoot] + this.counts[rightRoot]
		const members = mergeSortedMembers(this.memberLists[leftRoot], this.memberLists[rightRoot])

		const minX = Math.min(this.minX[leftRoot], this.minX[rightRoot])
		const minY = Math.min(this.minY[leftRoot], this.minY[rightRoot])
		const maxX = Math.max(this.maxX[leftRoot], this.maxX[rightRoot])
		const maxY = Math.max(this.maxY[leftRoot], this.maxY[rightRoot])
		const centroidX =
			(this.counts[leftRoot] * this.centroidX[leftRoot] +
				this.counts[rightRoot] * this.centroidX[rightRoot]) /
			count
		const centroidY =
			(this.counts[leftRoot] * this.centroidY[leftRoot] +
				this.counts[rightRoot] * this.centroidY[rightRoot]) /
			count

		// Leaf ids are assumed not to start with `cluster:`; see the step 2 contract.
		const result: ClusterNode = {
			id: `cluster:${count}:${members[0]}`,
			centroid: { x: centroidX, y: centroidY },
			count,
			members,
		}

		this.parent[rightRoot] = leftRoot
		this.minX[leftRoot] = minX
		this.minY[leftRoot] = minY
		this.maxX[leftRoot] = maxX
		this.maxY[leftRoot] = maxY
		this.centroidX[leftRoot] = centroidX
		this.centroidY[leftRoot] = centroidY
		this.counts[leftRoot] = count
		this.nodes[leftRoot] = result
		this.memberLists[leftRoot] = members
		this.minMemberIds[leftRoot] = members[0]
		if (this.offsetX !== null && this.offsetY !== null) {
			this.offsetX[leftRoot] += this.offsetX[rightRoot]
			this.offsetY[leftRoot] += this.offsetY[rightRoot]
		}

		return { z, children: [left, right], result }
	}
}

function mergeSortedMembers(a: readonly string[], b: readonly string[]): string[] {
	const out = new Array<string>(a.length + b.length)
	let i = 0
	let j = 0
	let k = 0
	while (i < a.length && j < b.length) {
		if (a[i] < b[j]) {
			out[k++] = a[i++]
		} else {
			out[k++] = b[j++]
		}
	}
	while (i < a.length) out[k++] = a[i++]
	while (j < b.length) out[k++] = b[j++]
	return out
}

interface HeapEntry {
	edgeIndex: number
	z: number
}

class EdgeMaxHeap {
	private readonly items: HeapEntry[] = []
	// Per-edge normalized (lo, hi) id pair for the z tie-break, precomputed once so comparisons
	// allocate nothing. With coincident anchors every edge prices to the same z (+Infinity), so
	// the tie-break runs on nearly every comparison of a rebuild — allocating the pair there
	// churned millions of short-lived tuples.
	private readonly loIds: string[]
	private readonly hiIds: string[]

	constructor(edges: readonly MstEdge[], leaves: readonly LeafInput[]) {
		const n = edges.length
		this.loIds = new Array(n)
		this.hiIds = new Array(n)
		for (let i = 0; i < n; i++) {
			const aId = leaves[edges[i].a].id
			const bId = leaves[edges[i].b].id
			if (aId < bId) {
				this.loIds[i] = aId
				this.hiIds[i] = bId
			} else {
				this.loIds[i] = bId
				this.hiIds[i] = aId
			}
		}
	}

	peek(): HeapEntry | undefined {
		return this.items[0]
	}

	push(entry: HeapEntry) {
		this.items.push(entry)
		this.siftUp(this.items.length - 1)
	}

	pop(): HeapEntry | undefined {
		if (this.items.length === 0) return undefined
		const first = this.items[0]
		const last = this.items.pop()!
		if (this.items.length > 0) {
			this.items[0] = last
			this.siftDown(0)
		}
		return first
	}

	higherPriority(a: HeapEntry, b: HeapEntry): boolean {
		if (a.z > b.z) return true
		if (a.z < b.z) return false
		// Tie-break on the normalized leaf-id pair, ascending.
		const aLo = this.loIds[a.edgeIndex]
		const bLo = this.loIds[b.edgeIndex]
		if (aLo !== bLo) return aLo < bLo
		return this.hiIds[a.edgeIndex] < this.hiIds[b.edgeIndex]
	}

	private siftUp(index: number) {
		while (index > 0) {
			const parent = (index - 1) >> 1
			if (!this.higherPriority(this.items[index], this.items[parent])) break
			;[this.items[index], this.items[parent]] = [this.items[parent], this.items[index]]
			index = parent
		}
	}

	private siftDown(index: number) {
		while (true) {
			const left = index * 2 + 1
			const right = left + 1
			let best = index
			if (left < this.items.length && this.higherPriority(this.items[left], this.items[best])) {
				best = left
			}
			if (right < this.items.length && this.higherPriority(this.items[right], this.items[best])) {
				best = right
			}
			if (best === index) break
			;[this.items[index], this.items[best]] = [this.items[best], this.items[index]]
			index = best
		}
	}
}
