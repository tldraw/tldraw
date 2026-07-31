import type { ClusterNode, LeafInput, MstEdge, RawMergeEvent } from './types'

export const D_FLOOR = 1e-9

export function cappedReplay(
	leaves: readonly LeafInput[],
	edges: readonly MstEdge[],
	opts: { Tc: number; Dmax: number }
): RawMergeEvent[] {
	validateOptions(opts)

	if (edges.length === 0) return []

	const clusters = new ClusterState(leaves)
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

	constructor(leaves: readonly LeafInput[]) {
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

	constructor(
		private readonly edges: readonly MstEdge[],
		private readonly leaves: readonly LeafInput[]
	) {}

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
		return edgeIdPairLess(this.edges[a.edgeIndex], this.edges[b.edgeIndex], this.leaves)
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

function edgeIdPairLess(a: MstEdge, b: MstEdge, leaves: readonly LeafInput[]): boolean {
	const [aLo, aHi] = normalizedEdgeIds(a, leaves)
	const [bLo, bHi] = normalizedEdgeIds(b, leaves)
	if (aLo !== bLo) return aLo < bLo
	return aHi < bHi
}

function normalizedEdgeIds(edge: MstEdge, leaves: readonly LeafInput[]): [string, string] {
	const aId = leaves[edge.a].id
	const bId = leaves[edge.b].id
	return aId < bId ? [aId, bId] : [bId, aId]
}
