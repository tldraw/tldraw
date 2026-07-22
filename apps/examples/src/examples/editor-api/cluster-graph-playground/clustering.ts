import { Box, Editor, TLArrowBinding, TLShape, TLShapeId, Vec } from 'tldraw'
import { delaunayEdges, gabrielEdges, IndexEdge, knnEdges, mstEdges, rngEdges } from './graphs'
import { ClusterLabelInfo, labelClusters } from './keywords'
import { ClusterPlaygroundSettings } from './settings'

/**
 * Turns the shapes on the current page into a cluster graph:
 *
 * 1. Atoms — every top-level shape (direct child of the page) is one
 *    clusterable unit. Frames and groups therefore arrive pre-clustered:
 *    their children travel with them.
 * 2. Linkage — a union-find pass merges atoms by proximity (bounds gap or
 *    center distance within eps), by containment, and/or through arrow
 *    bindings depending on the settings. Proximity-with-threshold is
 *    equivalent to DBSCAN with minPts=1 / single-linkage clustering cut at
 *    eps, which keeps every shape in exactly one cluster (no noise label).
 * 3. Graph — cluster centroids become nodes, connected by a configurable
 *    proximity graph (Delaunay, Gabriel, RNG, MST, kNN), plus "semantic"
 *    edges wherever arrows connect shapes in different clusters.
 */

export interface ClusterAtom {
	id: TLShapeId
	bounds: Box
	isArrow: boolean
}

export interface ClusterSubcluster {
	hull: Vec[]
	atomIds: TLShapeId[]
}

export interface ClusterNode {
	id: number
	atomIds: TLShapeId[]
	bounds: Box
	hull: Vec[]
	center: Vec
	subclusters: ClusterSubcluster[]
	info: ClusterLabelInfo
}

export interface ClusterEdge {
	a: number
	b: number
	kind: 'spatial' | 'binding'
}

export interface ClusterModel {
	clusters: ClusterNode[]
	spatialEdges: ClusterEdge[]
	bindingEdges: ClusterEdge[]
	/** The eps actually used (manual or auto-derived) */
	epsUsed: number
	atomCount: number
}

class UnionFind {
	private parent: number[]
	constructor(n: number) {
		this.parent = Array.from({ length: n }, (_, i) => i)
	}
	find(i: number): number {
		while (this.parent[i] !== i) {
			this.parent[i] = this.parent[this.parent[i]]
			i = this.parent[i]
		}
		return i
	}
	union(a: number, b: number) {
		const ra = this.find(a)
		const rb = this.find(b)
		if (ra !== rb) this.parent[rb] = ra
	}
}

/** Shortest distance between two axis-aligned boxes; 0 when they overlap. */
export function boundsGapDistance(a: Box, b: Box): number {
	const dx = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX))
	const dy = Math.max(0, Math.max(a.minY, b.minY) - Math.min(a.maxY, b.maxY))
	return Math.hypot(dx, dy)
}

function centerDistance(a: Box, b: Box): number {
	return Math.hypot(a.midX - b.midX, a.midY - b.midY)
}

function atomDistance(a: Box, b: Box, metric: ClusterPlaygroundSettings['distance']): number {
	return metric === 'gap' ? boundsGapDistance(a, b) : centerDistance(a, b)
}

/** Does box a fully contain box b (with a little tolerance)? */
function containsBox(a: Box, b: Box, tolerance = 2): boolean {
	return (
		a.minX - tolerance <= b.minX &&
		a.minY - tolerance <= b.minY &&
		a.maxX + tolerance >= b.maxX &&
		a.maxY + tolerance >= b.maxY &&
		(a.w > b.w || a.h > b.h)
	)
}

/** Andrew's monotone chain convex hull. */
function convexHull(points: { x: number; y: number }[]): Vec[] {
	const pts = [...points].sort((p, q) => p.x - q.x || p.y - q.y)
	if (pts.length < 3) return pts.map((p) => new Vec(p.x, p.y))
	const cross = (
		o: { x: number; y: number },
		a: { x: number; y: number },
		b: { x: number; y: number }
	) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
	const lower: { x: number; y: number }[] = []
	for (const p of pts) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
			lower.pop()
		lower.push(p)
	}
	const upper: { x: number; y: number }[] = []
	for (let i = pts.length - 1; i >= 0; i--) {
		const p = pts[i]
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
			upper.pop()
		upper.push(p)
	}
	const hull = lower.slice(0, -1).concat(upper.slice(0, -1))
	return hull.map((p) => new Vec(p.x, p.y))
}

function hullForAtoms(atoms: ClusterAtom[]): Vec[] {
	const corners: { x: number; y: number }[] = []
	for (const atom of atoms) {
		const b = atom.bounds
		corners.push(
			{ x: b.minX, y: b.minY },
			{ x: b.maxX, y: b.minY },
			{ x: b.maxX, y: b.maxY },
			{ x: b.minX, y: b.maxY }
		)
	}
	let hull = convexHull(corners)
	if (hull.length < 3) {
		// Degenerate (zero-area) cluster: fall back to an inflated rectangle
		const bounds = Box.Common(atoms.map((a) => a.bounds)).expandBy(1)
		hull = [
			new Vec(bounds.minX, bounds.minY),
			new Vec(bounds.maxX, bounds.minY),
			new Vec(bounds.maxX, bounds.maxY),
			new Vec(bounds.minX, bounds.maxY),
		]
	}
	return hull
}

/**
 * Derive eps from the page itself, so the "how close is close" threshold
 * scales with the content: a page of three dense wireframes gets a small eps
 * (each wireframe becomes a cluster), a page of large scattered groups gets a
 * proportionally larger one.
 *
 * Heuristic: within-group structure shows up as small nearest-neighbor
 * distances, so eps = max(median nearest-neighbor distance × 2, median
 * shape diagonal × 0.4) + 20. The median is robust to far-away outliers, and
 * the diagonal term keeps eps proportional to shape size on sparse pages.
 */
function computeAutoEps(
	atoms: ClusterAtom[],
	skip: Set<number>,
	metric: ClusterPlaygroundSettings['distance'],
	multiplier: number
): number {
	const idxs = atoms.map((_, i) => i).filter((i) => !skip.has(i))
	if (idxs.length < 2) return 128 * multiplier
	const nn: number[] = []
	const diagonals: number[] = []
	for (const i of idxs) {
		let best = Infinity
		for (const j of idxs) {
			if (i === j) continue
			best = Math.min(best, atomDistance(atoms[i].bounds, atoms[j].bounds, metric))
		}
		nn.push(best)
		diagonals.push(Math.hypot(atoms[i].bounds.w, atoms[i].bounds.h))
	}
	nn.sort((a, b) => a - b)
	diagonals.sort((a, b) => a - b)
	const medianNN = nn[Math.floor(nn.length / 2)]
	const medianDiag = diagonals[Math.floor(diagonals.length / 2)]
	const eps = (Math.max(medianNN * 2, medianDiag * 0.4) + 20) * multiplier
	return Math.min(5000, Math.max(8, eps))
}

interface ArrowLink {
	/** Atom index of the annotation/source side of the link */
	from: number
	/** Atom index of the target side of the link */
	to: number
}

export function buildClusterModel(
	editor: Editor,
	settings: ClusterPlaygroundSettings
): ClusterModel {
	// -- 1. Collect atoms: top-level shapes on the current page ---------------
	const pageId = editor.getCurrentPageId()
	const atoms: ClusterAtom[] = []
	const atomIndexById = new Map<TLShapeId, number>()
	for (const id of editor.getSortedChildIdsForParent(pageId)) {
		const bounds = editor.getShapePageBounds(id)
		if (!bounds) continue
		atomIndexById.set(id, atoms.length)
		atoms.push({ id, bounds, isArrow: editor.getShape(id)?.type === 'arrow' })
	}
	const n = atoms.length

	// Map any shape (possibly nested in a frame/group) to its top-level atom
	const topLevelAtomIndex = (shapeId: TLShapeId): number => {
		let current: TLShape | undefined = editor.getShape(shapeId)
		while (current && current.parentId !== pageId) {
			current = editor.getShape(current.parentId as TLShapeId)
		}
		return current ? (atomIndexById.get(current.id) ?? -1) : -1
	}

	// -- 2. Analyze arrow bindings --------------------------------------------
	const uf = new UnionFind(n)
	// Bound arrows span between clusters, so their own (long, thin) bounds must
	// never take part in proximity linkage — they would bridge everything.
	const skipProximity = new Set<number>()
	// In 'ignore' mode, bound arrows also get no cluster membership at all.
	const skipMembership = new Set<number>()
	const links: ArrowLink[] = []

	// First pass: resolve every bound arrow to atom indices, and count how many
	// arrows point AT each atom (in-degree) for the annotation heuristic below.
	interface RawArrow {
		arrowIdx: number
		startIdx: number
		endIdx: number
	}
	const rawArrows: RawArrow[] = []
	const inDegree = new Map<number, number>()
	for (const shape of editor.getCurrentPageShapes()) {
		if (shape.type !== 'arrow') continue
		const bindings = editor.getBindingsFromShape<TLArrowBinding>(shape, 'arrow')
		if (bindings.length === 0) continue // freestanding arrows are normal shapes

		const arrowIdx = atomIndexById.get(shape.id) ?? -1
		if (arrowIdx !== -1) skipProximity.add(arrowIdx)

		const startBinding = bindings.find((b) => b.props.terminal === 'start')
		const endBinding = bindings.find((b) => b.props.terminal === 'end')
		const startIdx = startBinding ? topLevelAtomIndex(startBinding.toId) : -1
		const endIdx = endBinding ? topLevelAtomIndex(endBinding.toId) : -1

		// Both ends resolve to the same atom (e.g. an arrow inside one frame)
		if (startIdx === endIdx) {
			if (arrowIdx !== -1 && startIdx !== -1) uf.union(startIdx, arrowIdx)
			continue
		}
		if (endIdx !== -1) inDegree.set(endIdx, (inDegree.get(endIdx) ?? 0) + 1)
		rawArrows.push({ arrowIdx, startIdx, endIdx })
	}

	// An atom reads as an annotation when it's a text or note shape that only
	// points at things — nothing points back at it. Flowchart nodes (geo shapes,
	// or anything with incoming arrows) stay peers.
	const isAnnotationSource = (idx: number): boolean => {
		const shape = editor.getShape(atoms[idx].id)
		if (!shape || (shape.type !== 'text' && shape.type !== 'note')) return false
		return (inDegree.get(idx) ?? 0) === 0
	}

	for (const { arrowIdx, startIdx, endIdx } of rawArrows) {
		switch (settings.bindingMode) {
			case 'merge': {
				// Connected shapes belong together: union everything the arrow touches
				const members = [arrowIdx, startIdx, endIdx].filter((i) => i !== -1)
				for (let i = 1; i < members.length; i++) uf.union(members[0], members[i])
				break
			}
			case 'ignore': {
				if (arrowIdx !== -1) skipMembership.add(arrowIdx)
				if (startIdx !== -1 && endIdx !== -1) links.push({ from: startIdx, to: endIdx })
				break
			}
			case 'separate': {
				if (startIdx !== -1 && endIdx !== -1) {
					if (isAnnotationSource(startIdx)) {
						// The annotation keeps its own cluster (excluded from proximity
						// linkage) and the relationship becomes a graph edge instead
						skipProximity.add(startIdx)
						if (arrowIdx !== -1) uf.union(startIdx, arrowIdx)
						links.push({ from: startIdx, to: endIdx })
					} else {
						// Peer-to-peer connection: keep clusters apart, add an edge
						if (arrowIdx !== -1) skipMembership.add(arrowIdx)
						links.push({ from: startIdx, to: endIdx })
					}
				} else if (endIdx !== -1) {
					// Free tail pointing at something: the arrow itself is the annotation
					if (arrowIdx !== -1) links.push({ from: arrowIdx, to: endIdx })
				} else if (startIdx !== -1 && arrowIdx !== -1) {
					uf.union(startIdx, arrowIdx)
				}
				break
			}
		}
	}

	// -- 3. Resolve eps and run the linkage passes ----------------------------
	const epsUsed = settings.epsAuto
		? computeAutoEps(atoms, skipProximity, settings.distance, settings.epsMultiplier)
		: settings.eps

	if (settings.proximity) {
		for (let i = 0; i < n; i++) {
			if (skipProximity.has(i)) continue
			for (let j = i + 1; j < n; j++) {
				if (skipProximity.has(j)) continue
				if (atomDistance(atoms[i].bounds, atoms[j].bounds, settings.distance) <= epsUsed) {
					uf.union(i, j)
				}
			}
		}
	}

	if (settings.containment) {
		for (let i = 0; i < n; i++) {
			if (skipMembership.has(i)) continue
			for (let j = 0; j < n; j++) {
				if (i === j || skipMembership.has(j)) continue
				if (containsBox(atoms[i].bounds, atoms[j].bounds)) uf.union(i, j)
			}
		}
	}

	// -- 4. Materialize clusters ----------------------------------------------
	const byRoot = new Map<number, number[]>()
	for (let i = 0; i < n; i++) {
		if (skipMembership.has(i)) continue
		const root = uf.find(i)
		let group = byRoot.get(root)
		if (!group) byRoot.set(root, (group = []))
		group.push(i)
	}

	const groups = Array.from(byRoot.values())
	// Number clusters top-left to bottom-right so ids read naturally
	groups.sort((a, b) => {
		const ba = Box.Common(a.map((i) => atoms[i].bounds))
		const bb = Box.Common(b.map((i) => atoms[i].bounds))
		return ba.minY - bb.minY || ba.minX - bb.minX
	})

	const labels = labelClusters(
		editor,
		groups.map((group) => group.map((i) => atoms[i].id))
	)

	const clusterOfAtom = new Map<number, number>()
	const clusters: ClusterNode[] = groups.map((group, clusterId) => {
		const memberAtoms = group.map((i) => atoms[i])
		for (const i of group) clusterOfAtom.set(i, clusterId)
		// Bound arrows belong to the cluster but stretch toward whatever they
		// point at, so leave them out of the visual hull and bounds.
		const solidAtoms = memberAtoms.filter((a) => !a.isArrow)
		const hullAtoms = solidAtoms.length > 0 ? solidAtoms : memberAtoms
		const bounds = Box.Common(hullAtoms.map((a) => a.bounds))

		// Subclusters: the same proximity linkage at a finer eps
		const subclusters: ClusterSubcluster[] = []
		const subGroup = group.filter((i) => !atoms[i].isArrow)
		if (settings.subclusters && subGroup.length >= 2) {
			const fineEps = epsUsed / Math.max(1.5, settings.subclusterFactor)
			const subUf = new UnionFind(subGroup.length)
			for (let i = 0; i < subGroup.length; i++) {
				for (let j = i + 1; j < subGroup.length; j++) {
					if (
						atomDistance(atoms[subGroup[i]].bounds, atoms[subGroup[j]].bounds, settings.distance) <=
						fineEps
					) {
						subUf.union(i, j)
					}
				}
			}
			const subGroups = new Map<number, number[]>()
			for (let i = 0; i < subGroup.length; i++) {
				const root = subUf.find(i)
				let sub = subGroups.get(root)
				if (!sub) subGroups.set(root, (sub = []))
				sub.push(subGroup[i])
			}
			if (subGroups.size >= 2) {
				for (const sub of subGroups.values()) {
					subclusters.push({
						hull: hullForAtoms(sub.map((i) => atoms[i])),
						atomIds: sub.map((i) => atoms[i].id),
					})
				}
			}
		}

		return {
			id: clusterId,
			atomIds: memberAtoms.map((a) => a.id),
			bounds,
			hull: hullForAtoms(hullAtoms),
			center: bounds.center,
			subclusters,
			info: labels[clusterId],
		}
	})

	// -- 5. Build the cluster graph -------------------------------------------
	const centroids = clusters.map((c) => ({ x: c.center.x, y: c.center.y }))
	let spatialIndexEdges: IndexEdge[] = []
	if (clusters.length >= 2 && settings.edgeMode !== 'none') {
		if (
			settings.edgeMode === 'delaunay' ||
			settings.edgeMode === 'gabriel' ||
			settings.edgeMode === 'rng'
		) {
			const delaunay = delaunayEdges(centroids)
			spatialIndexEdges =
				settings.edgeMode === 'delaunay'
					? delaunay
					: settings.edgeMode === 'gabriel'
						? gabrielEdges(centroids, delaunay)
						: rngEdges(centroids, delaunay)
		} else {
			const weights = clusters.map((a) =>
				clusters.map((b) => (a === b ? 0 : atomDistance(a.bounds, b.bounds, settings.distance)))
			)
			spatialIndexEdges =
				settings.edgeMode === 'mst' ? mstEdges(weights) : knnEdges(weights, settings.knnK)
		}
	}
	const spatialEdges: ClusterEdge[] = spatialIndexEdges.map(({ a, b }) => ({
		a,
		b,
		kind: 'spatial',
	}))

	const bindingEdges: ClusterEdge[] = []
	const seenBindingEdges = new Set<string>()
	for (const link of links) {
		const a = clusterOfAtom.get(link.from)
		const b = clusterOfAtom.get(link.to)
		if (a === undefined || b === undefined || a === b) continue
		const key = a < b ? `${a}-${b}` : `${b}-${a}`
		if (seenBindingEdges.has(key)) continue
		seenBindingEdges.add(key)
		bindingEdges.push({ a, b, kind: 'binding' })
	}

	return { clusters, spatialEdges, bindingEdges, epsUsed, atomCount: n }
}
