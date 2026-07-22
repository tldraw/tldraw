/**
 * Spatial graph builders. Each takes a set of points (cluster centroids) and
 * returns undirected edges as index pairs. The proximity-graph family forms a
 * strict hierarchy: MST ⊆ RNG ⊆ Gabriel ⊆ Delaunay, so Gabriel and RNG are
 * computed by filtering Delaunay edges.
 */

export interface GraphPoint {
	x: number
	y: number
}

export interface IndexEdge {
	a: number
	b: number
}

function dist2(p: GraphPoint, q: GraphPoint) {
	const dx = p.x - q.x
	const dy = p.y - q.y
	return dx * dx + dy * dy
}

function edgeKey(a: number, b: number) {
	return a < b ? `${a}-${b}` : `${b}-${a}`
}

interface Triangle {
	a: number
	b: number
	c: number
	// circumcircle
	cx: number
	cy: number
	r2: number
}

function circumcircle(pts: GraphPoint[], a: number, b: number, c: number): Triangle | null {
	const A = pts[a]
	const B = pts[b]
	const C = pts[c]
	const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y))
	if (Math.abs(d) < 1e-9) return null
	const a2 = A.x * A.x + A.y * A.y
	const b2 = B.x * B.x + B.y * B.y
	const c2 = C.x * C.x + C.y * C.y
	const cx = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d
	const cy = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d
	const r2 = (A.x - cx) * (A.x - cx) + (A.y - cy) * (A.y - cy)
	return { a, b, c, cx, cy, r2 }
}

/**
 * Delaunay triangulation via Bowyer-Watson insertion. O(n²) worst case, which
 * is fine for the cluster counts this playground deals with. Inputs get a tiny
 * deterministic jitter so collinear/cocircular layouts (grids!) stay stable.
 */
export function delaunayEdges(points: GraphPoint[]): IndexEdge[] {
	const n = points.length
	if (n < 2) return []
	if (n === 2) return [{ a: 0, b: 1 }]

	const pts: GraphPoint[] = points.map((p, i) => ({
		x: p.x + ((i * 7919) % 101) * 1e-4,
		y: p.y + ((i * 104729) % 97) * 1e-4,
	}))

	// Super triangle that comfortably contains every point
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity
	for (const p of pts) {
		minX = Math.min(minX, p.x)
		minY = Math.min(minY, p.y)
		maxX = Math.max(maxX, p.x)
		maxY = Math.max(maxY, p.y)
	}
	const dmax = Math.max(maxX - minX, maxY - minY, 1)
	const midX = (minX + maxX) / 2
	const midY = (minY + maxY) / 2
	pts.push({ x: midX - 20 * dmax, y: midY - dmax })
	pts.push({ x: midX, y: midY + 20 * dmax })
	pts.push({ x: midX + 20 * dmax, y: midY - dmax })

	let triangles: Triangle[] = []
	const superTri = circumcircle(pts, n, n + 1, n + 2)
	if (superTri) triangles.push(superTri)

	for (let i = 0; i < n; i++) {
		const p = pts[i]
		const bad: Triangle[] = []
		const good: Triangle[] = []
		for (const t of triangles) {
			const dx = p.x - t.cx
			const dy = p.y - t.cy
			if (dx * dx + dy * dy <= t.r2) bad.push(t)
			else good.push(t)
		}
		// Boundary of the cavity: edges that belong to exactly one bad triangle
		const edgeCount = new Map<string, [number, number]>()
		const seen = new Map<string, number>()
		for (const t of bad) {
			for (const [a, b] of [
				[t.a, t.b],
				[t.b, t.c],
				[t.c, t.a],
			] as const) {
				const key = edgeKey(a, b)
				seen.set(key, (seen.get(key) ?? 0) + 1)
				edgeCount.set(key, [a, b])
			}
		}
		triangles = good
		for (const [key, [a, b]] of edgeCount) {
			if (seen.get(key) !== 1) continue
			const t = circumcircle(pts, a, b, i)
			if (t) triangles.push(t)
		}
	}

	const edges = new Map<string, IndexEdge>()
	for (const t of triangles) {
		for (const [a, b] of [
			[t.a, t.b],
			[t.b, t.c],
			[t.c, t.a],
		] as const) {
			if (a >= n || b >= n) continue
			edges.set(edgeKey(a, b), { a, b })
		}
	}
	return Array.from(edges.values())
}

/**
 * Gabriel graph: keep edge (a,b) if the disk with diameter ab contains no
 * other point.
 */
export function gabrielEdges(points: GraphPoint[], delaunay: IndexEdge[]): IndexEdge[] {
	return delaunay.filter(({ a, b }) => {
		const mx = (points[a].x + points[b].x) / 2
		const my = (points[a].y + points[b].y) / 2
		const r2 = dist2(points[a], points[b]) / 4
		for (let c = 0; c < points.length; c++) {
			if (c === a || c === b) continue
			if (dist2(points[c], { x: mx, y: my }) < r2 - 1e-9) return false
		}
		return true
	})
}

/**
 * Relative neighborhood graph: keep edge (a,b) if no point c is closer to both
 * a and b than they are to each other (the "lune" is empty).
 */
export function rngEdges(points: GraphPoint[], delaunay: IndexEdge[]): IndexEdge[] {
	return delaunay.filter(({ a, b }) => {
		const dab = dist2(points[a], points[b])
		for (let c = 0; c < points.length; c++) {
			if (c === a || c === b) continue
			if (dist2(points[c], points[a]) < dab && dist2(points[c], points[b]) < dab) return false
		}
		return true
	})
}

/**
 * Minimum spanning tree via Prim's algorithm over a full weight matrix, so it
 * works with non-Euclidean weights (e.g. hull gap distance). O(n²).
 */
export function mstEdges(weights: number[][]): IndexEdge[] {
	const n = weights.length
	if (n < 2) return []
	const inTree = new Array<boolean>(n).fill(false)
	const bestCost = new Array<number>(n).fill(Infinity)
	const bestFrom = new Array<number>(n).fill(-1)
	const edges: IndexEdge[] = []
	inTree[0] = true
	for (let i = 1; i < n; i++) {
		bestCost[i] = weights[0][i]
		bestFrom[i] = 0
	}
	for (let added = 1; added < n; added++) {
		let next = -1
		for (let i = 0; i < n; i++) {
			if (!inTree[i] && (next === -1 || bestCost[i] < bestCost[next])) next = i
		}
		if (next === -1) break
		inTree[next] = true
		edges.push({ a: bestFrom[next], b: next })
		for (let i = 0; i < n; i++) {
			if (!inTree[i] && weights[next][i] < bestCost[i]) {
				bestCost[i] = weights[next][i]
				bestFrom[i] = next
			}
		}
	}
	return edges
}

/** Symmetrized k-nearest-neighbor graph over a full weight matrix. */
export function knnEdges(weights: number[][], k: number): IndexEdge[] {
	const n = weights.length
	const edges = new Map<string, IndexEdge>()
	for (let i = 0; i < n; i++) {
		const order = []
		for (let j = 0; j < n; j++) if (j !== i) order.push(j)
		order.sort((a, b) => weights[i][a] - weights[i][b])
		for (const j of order.slice(0, k)) {
			edges.set(edgeKey(i, j), { a: Math.min(i, j), b: Math.max(i, j) })
		}
	}
	return Array.from(edges.values())
}
