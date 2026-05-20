import { routeEdges } from 'libavoided-js'
import { useCallback, useState } from 'react'
import {
	ArrowShapeUtil,
	Box,
	createBindingId,
	createShapeId,
	Editor,
	ElbowArrowRouterContext,
	ElbowArrowRouterResult,
	Mat,
	TLEditorComponents,
	Tldraw,
	track,
	useEditor,
	Vec,
	VecLike,
} from 'tldraw'
import 'tldraw/tldraw.css'

// ---------------------------------------------------------------------------
// Router selection — mutable so the elbowRouter callback can read it
// ---------------------------------------------------------------------------

type RouterType = 'default' | 'ruler' | 'libavoided'
let activeRouterType: RouterType = 'ruler'

function setActiveRouterType(type: RouterType) {
	activeRouterType = type
}

// ---------------------------------------------------------------------------
// Debug state
// ---------------------------------------------------------------------------

interface DebugRouterInfo {
	arrowId: string
	bailReason: string | null
	startPage: VecLike | null
	endPage: VecLike | null
	obstaclesPage: { minX: number; minY: number; maxX: number; maxY: number }[]
	paddedObstaclesPage: { minX: number; minY: number; maxX: number; maxY: number }[]
	pathPage: VecLike[] | null
	aBoxPage: { minX: number; minY: number; maxX: number; maxY: number } | null
	bBoxPage: { minX: number; minY: number; maxX: number; maxY: number } | null
	triedCombinations: number
	validPaths: number
	bestBends: number
	rulerCount: { x: number; y: number }
}

const debugInfoMap = new Map<string, DebugRouterInfo>()

// Cache previous results per arrow — skip redundant work and logging
const prevRouteMap = new Map<string, { exitIdx: number; entryIdx: number; score: number; points: Vec[] }>()

// ---------------------------------------------------------------------------
// Non-uniform ruler-based obstacle avoidance router
//
// Instead of a fixed-resolution pixel grid, we place A* nodes only at
// meaningful coordinates: obstacle edges, start/end headings, and midpoints
// between shapes. This gives ~30-60 nodes instead of 1000+, paths naturally
// align to shape geometry, and there are no microbends or jitter.
// ---------------------------------------------------------------------------

const NON_OBSTACLE_TYPES = new Set(['arrow', 'group', 'draw', 'highlight', 'line'])
const TURN_PENALTY = 200

interface EdgeCandidate {
	edge: Vec
	expanded: Vec
}

function getEdgeCandidates(box: Box, legLength: number): EdgeCandidate[] {
	return [
		{ edge: new Vec(box.maxX, box.center.y), expanded: new Vec(box.maxX + legLength, box.center.y) },
		{ edge: new Vec(box.center.x, box.maxY), expanded: new Vec(box.center.x, box.maxY + legLength) },
		{ edge: new Vec(box.minX, box.center.y), expanded: new Vec(box.minX - legLength, box.center.y) },
		{ edge: new Vec(box.center.x, box.minY), expanded: new Vec(box.center.x, box.minY - legLength) },
	]
}

function countBends(points: VecLike[]): number {
	let bends = 0
	for (let i = 2; i < points.length; i++) {
		const dx1 = points[i - 1].x - points[i - 2].x
		const dy1 = points[i - 1].y - points[i - 2].y
		const dx2 = points[i].x - points[i - 1].x
		const dy2 = points[i].y - points[i - 1].y
		if ((Math.abs(dx1) > 0.01 && Math.abs(dy2) > 0.01) || (Math.abs(dy1) > 0.01 && Math.abs(dx2) > 0.01)) bends++
	}
	return bends
}

function manhattanLength(points: VecLike[]): number {
	let d = 0
	for (let i = 1; i < points.length; i++) {
		d += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y)
	}
	return d
}

// ---------------------------------------------------------------------------
// Ruler graph: sparse graph built from shape geometry
// ---------------------------------------------------------------------------

interface RulerGraph {
	xRulers: number[]
	yRulers: number[]
	cols: number
	rows: number
	blockedNodes: Uint8Array
	/** Blocked horizontal edges: index j*cols+i means edge (i,j)→(i+1,j) is blocked */
	blockedH: Uint8Array
	/** Blocked vertical edges: index j*cols+i means edge (i,j)→(i,j+1) is blocked */
	blockedV: Uint8Array
}

function buildRulerGraph(
	obstacles: Box[],
	startCandidates: EdgeCandidate[],
	endCandidates: EdgeCandidate[]
): RulerGraph {
	const xSet = new Set<number>()
	const ySet = new Set<number>()

	for (const obs of obstacles) {
		xSet.add(obs.minX); xSet.add(obs.maxX)
		ySet.add(obs.minY); ySet.add(obs.maxY)
	}
	for (const c of startCandidates) {
		xSet.add(c.edge.x); ySet.add(c.edge.y)
		xSet.add(c.expanded.x); ySet.add(c.expanded.y)
	}
	for (const c of endCandidates) {
		xSet.add(c.edge.x); ySet.add(c.edge.y)
		xSet.add(c.expanded.x); ySet.add(c.expanded.y)
	}

	let xArr = Array.from(xSet).sort((a, b) => a - b)
	let yArr = Array.from(ySet).sort((a, b) => a - b)
	for (let i = 0; i < xArr.length - 1; i++) xSet.add((xArr[i] + xArr[i + 1]) / 2)
	for (let i = 0; i < yArr.length - 1; i++) ySet.add((yArr[i] + yArr[i + 1]) / 2)
	xArr = Array.from(xSet).sort((a, b) => a - b)
	yArr = Array.from(ySet).sort((a, b) => a - b)

	const cols = xArr.length
	const rows = yArr.length
	const eps = 0.5

	// Pre-compute blocked nodes (strictly inside any obstacle)
	const blockedNodes = new Uint8Array(cols * rows)
	for (let j = 0; j < rows; j++) {
		const y = yArr[j]
		for (let i = 0; i < cols; i++) {
			const x = xArr[i]
			for (const obs of obstacles) {
				if (x > obs.minX + eps && x < obs.maxX - eps && y > obs.minY + eps && y < obs.maxY - eps) {
					blockedNodes[j * cols + i] = 1
					break
				}
			}
		}
	}

	// Pre-compute blocked horizontal edges: (i,j) → (i+1,j)
	const blockedH = new Uint8Array(cols * rows)
	for (let j = 0; j < rows; j++) {
		const y = yArr[j]
		for (let i = 0; i < cols - 1; i++) {
			const x1 = xArr[i], x2 = xArr[i + 1]
			for (const obs of obstacles) {
				if (y > obs.minY + eps && y < obs.maxY - eps) {
					if (x1 < obs.maxX - eps && x2 > obs.minX + eps) {
						blockedH[j * cols + i] = 1
						break
					}
				}
			}
		}
	}

	// Pre-compute blocked vertical edges: (i,j) → (i,j+1)
	const blockedV = new Uint8Array(cols * rows)
	for (let j = 0; j < rows - 1; j++) {
		const y1 = yArr[j], y2 = yArr[j + 1]
		for (let i = 0; i < cols; i++) {
			const x = xArr[i]
			for (const obs of obstacles) {
				if (x > obs.minX + eps && x < obs.maxX - eps) {
					if (y1 < obs.maxY - eps && y2 > obs.minY + eps) {
						blockedV[j * cols + i] = 1
						break
					}
				}
			}
		}
	}

	return { xRulers: xArr, yRulers: yArr, cols, rows, blockedNodes, blockedH, blockedV }
}

function findRulerIndex(rulers: number[], value: number): number {
	let best = 0
	let bestDist = Math.abs(rulers[0] - value)
	for (let i = 1; i < rulers.length; i++) {
		const dist = Math.abs(rulers[i] - value)
		if (dist < bestDist) { best = i; bestDist = dist }
	}
	return best
}

// ---------------------------------------------------------------------------
// A* on the ruler graph
// ---------------------------------------------------------------------------

function rulerAStar(graph: RulerGraph, start: VecLike, end: VecLike): Vec[] | null {
	const { xRulers, yRulers, cols, rows, blockedNodes, blockedH, blockedV } = graph

	const si = findRulerIndex(xRulers, start.x)
	const sj = findRulerIndex(yRulers, start.y)
	const ei = findRulerIndex(xRulers, end.x)
	const ej = findRulerIndex(yRulers, end.y)

	if (blockedNodes[sj * cols + si] || blockedNodes[ej * cols + ei]) return null

	const NUM_DIRS = 3
	const total = cols * rows * NUM_DIRS
	const gScore = new Float64Array(total).fill(Infinity)
	const fScore = new Float64Array(total).fill(Infinity)
	const cameFrom = new Int32Array(total).fill(-1)

	const idx = (i: number, j: number, d: number) => (j * cols + i) * NUM_DIRS + d
	const h = (i: number, j: number) => Math.abs(xRulers[i] - xRulers[ei]) + Math.abs(yRulers[j] - yRulers[ej])

	const startState = idx(si, sj, 2)
	gScore[startState] = 0
	fScore[startState] = h(si, sj)
	// Binary min-heap for O(log n) extraction
	const heap: number[] = [startState]
	const heapPri: number[] = [fScore[startState]]
	function heapPush(s: number, p: number) {
		let i = heap.length; heap.push(s); heapPri.push(p)
		while (i > 0) { const parent = (i - 1) >> 1; if (heapPri[parent] <= heapPri[i]) break; [heap[i], heap[parent]] = [heap[parent], heap[i]]; [heapPri[i], heapPri[parent]] = [heapPri[parent], heapPri[i]]; i = parent }
	}
	function heapPop(): number {
		const top = heap[0]; const last = heap.pop()!; const lastP = heapPri.pop()!
		if (heap.length > 0) { heap[0] = last; heapPri[0] = lastP; let i = 0; while (true) { let s = i; const l = 2 * i + 1, r = 2 * i + 2; if (l < heap.length && heapPri[l] < heapPri[s]) s = l; if (r < heap.length && heapPri[r] < heapPri[s]) s = r; if (s === i) break; [heap[i], heap[s]] = [heap[s], heap[i]]; [heapPri[i], heapPri[s]] = [heapPri[s], heapPri[i]]; i = s } }
		return top
	}

	while (heap.length > 0) {
		const cur = heapPop()

		const cd = cur % NUM_DIRS
		const gi = (cur - cd) / NUM_DIRS
		const cj = Math.floor(gi / cols)
		const ci = gi % cols

		if (ci === ei && cj === ej) {
			const path: Vec[] = []
			let s = cur
			while (s !== -1) {
				const d = s % NUM_DIRS
				const g = (s - d) / NUM_DIRS
				path.push(new Vec(xRulers[g % cols], yRulers[Math.floor(g / cols)]))
				s = cameFrom[s]
			}
			path.reverse()
			return simplifyPoints(path)
		}

		// Left (i-1): check horizontal edge from (i-1,j) to (i,j)
		if (ci > 0 && !blockedNodes[cj * cols + (ci - 1)] && !blockedH[cj * cols + (ci - 1)]) {
			const ns = idx(ci - 1, cj, 0)
			const g = gScore[cur] + Math.abs(xRulers[ci - 1] - xRulers[ci]) + (cd !== 2 && cd !== 0 ? TURN_PENALTY : 0)
			if (g < gScore[ns]) { cameFrom[ns] = cur; gScore[ns] = g; fScore[ns] = g + h(ci - 1, cj); heapPush(ns, fScore[ns]) }
		}
		// Right (i+1): check horizontal edge from (i,j) to (i+1,j)
		if (ci < cols - 1 && !blockedNodes[cj * cols + (ci + 1)] && !blockedH[cj * cols + ci]) {
			const ns = idx(ci + 1, cj, 0)
			const g = gScore[cur] + Math.abs(xRulers[ci + 1] - xRulers[ci]) + (cd !== 2 && cd !== 0 ? TURN_PENALTY : 0)
			if (g < gScore[ns]) { cameFrom[ns] = cur; gScore[ns] = g; fScore[ns] = g + h(ci + 1, cj); heapPush(ns, fScore[ns]) }
		}
		// Up (j-1): check vertical edge from (i,j-1) to (i,j)
		if (cj > 0 && !blockedNodes[(cj - 1) * cols + ci] && !blockedV[(cj - 1) * cols + ci]) {
			const ns = idx(ci, cj - 1, 1)
			const g = gScore[cur] + Math.abs(yRulers[cj - 1] - yRulers[cj]) + (cd !== 2 && cd !== 1 ? TURN_PENALTY : 0)
			if (g < gScore[ns]) { cameFrom[ns] = cur; gScore[ns] = g; fScore[ns] = g + h(ci, cj - 1); heapPush(ns, fScore[ns]) }
		}
		// Down (j+1): check vertical edge from (i,j) to (i,j+1)
		if (cj < rows - 1 && !blockedNodes[(cj + 1) * cols + ci] && !blockedV[cj * cols + ci]) {
			const ns = idx(ci, cj + 1, 1)
			const g = gScore[cur] + Math.abs(yRulers[cj + 1] - yRulers[cj]) + (cd !== 2 && cd !== 1 ? TURN_PENALTY : 0)
			if (g < gScore[ns]) { cameFrom[ns] = cur; gScore[ns] = g; fScore[ns] = g + h(ci, cj + 1); heapPush(ns, fScore[ns]) }
		}
	}

	return null
}

/** Merge consecutive collinear points. */
function simplifyPoints(points: Vec[]): Vec[] {
	const result: Vec[] = [points[0]]
	for (let i = 1; i < points.length; i++) {
		const prev = result[result.length - 1]
		const pprev = result[result.length - 2]
		if (pprev) {
			const sameX = Math.abs(prev.x - points[i].x) < 0.1 && Math.abs(pprev.x - prev.x) < 0.1
			const sameY = Math.abs(prev.y - points[i].y) < 0.1 && Math.abs(pprev.y - prev.y) < 0.1
			if (sameX || sameY) { result[result.length - 1] = points[i]; continue }
		}
		result.push(points[i])
	}
	return result
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function obstacleAvoidanceRouter(ctx: ElbowArrowRouterContext): ElbowArrowRouterResult | null {
	const { editor, arrow, info, bindings } = ctx
	const arrowToPage = editor.getShapePageTransform(arrow.id)
	const pageToArrow = arrowToPage.clone().invert()

	const debug: DebugRouterInfo = {
		arrowId: arrow.id, bailReason: null, startPage: null, endPage: null,
		obstaclesPage: [], paddedObstaclesPage: [], pathPage: null,
		aBoxPage: null, bBoxPage: null,
		triedCombinations: 0, validPaths: 0, bestBends: 0, rulerCount: { x: 0, y: 0 },
	}

	const aPageBox = Mat.applyToBounds(arrowToPage, info.A.original)
	const bPageBox = Mat.applyToBounds(arrowToPage, info.B.original)
	debug.aBoxPage = { minX: aPageBox.minX, minY: aPageBox.minY, maxX: aPageBox.maxX, maxY: aPageBox.maxY }
	debug.bBoxPage = { minX: bPageBox.minX, minY: bPageBox.minY, maxX: bPageBox.maxX, maxY: bPageBox.maxY }

	if (arrow.props.elbowMidPoint !== 0.5) {
		debug.bailReason = `midpoint=${arrow.props.elbowMidPoint}`
		debugInfoMap.set(arrow.id, debug)
		return null
	}

	const padding = info.options.avoidObstaclesPadding
	const legLength = info.options.expandElbowLegLength
	// Spatial filter: only gather obstacles near the A↔B region
	const regionBox = Box.Common([info.A.original, info.B.original]).expandBy(legLength + padding)

	const excludeIds = new Set([arrow.id])
	if (bindings.start) excludeIds.add(bindings.start.toId)
	if (bindings.end) excludeIds.add(bindings.end.toId)

	const obstacles: Box[] = []
	for (const id of editor.getCurrentPageShapeIds()) {
		if (excludeIds.has(id)) continue
		const shape = editor.getShape(id)
		if (!shape) continue
		if (NON_OBSTACLE_TYPES.has(shape.type)) continue
		const props = shape.props as Record<string, unknown>
		const w = typeof props.w === 'number' ? props.w : 0
		const h = typeof props.h === 'number' ? props.h : 0
		if (w === 0 || h === 0) continue

		const pageBounds = Mat.applyToBounds(editor.getShapePageTransform(id), new Box(0, 0, w, h))
		const localBounds = Mat.applyToBounds(pageToArrow, pageBounds)
		// Skip shapes outside the A↔B region
		if (localBounds.maxX < regionBox.minX || localBounds.minX > regionBox.maxX ||
			localBounds.maxY < regionBox.minY || localBounds.minY > regionBox.maxY) continue

		debug.obstaclesPage.push({ minX: pageBounds.minX, minY: pageBounds.minY, maxX: pageBounds.maxX, maxY: pageBounds.maxY })
		obstacles.push(localBounds.expandBy(padding))

		const paddedPage = Mat.applyToBounds(arrowToPage, localBounds.expandBy(padding))
		debug.paddedObstaclesPage.push({ minX: paddedPage.minX, minY: paddedPage.minY, maxX: paddedPage.maxX, maxY: paddedPage.maxY })
	}

	if (obstacles.length === 0) {
		debug.bailReason = 'no obstacles in region'
		debugInfoMap.set(arrow.id, debug)
		return null
	}

	// Add bound shapes without padding
	const allObs = [...obstacles]
	if (bindings.start) {
		const b = getBoundBox(editor, bindings.start.toId, pageToArrow)
		if (b) allObs.push(b)
	}
	if (bindings.end) {
		const b = getBoundBox(editor, bindings.end.toId, pageToArrow)
		if (b) allObs.push(b)
	}

	const startCandidates = getEdgeCandidates(info.A.original, legLength)
	const endCandidates = getEdgeCandidates(info.B.original, legLength)

	// Build ruler graph from obstacle geometry
	const graph = buildRulerGraph(allObs, startCandidates, endCandidates)
	debug.rulerCount = { x: graph.xRulers.length, y: graph.yRulers.length }
	let bestPath: Vec[] | null = null
	let bestScore = Infinity
	let bestBends = 0
	let bestStartIdx = -1
	let bestEndIdx = -1
	let validPaths = 0

	const dx = info.B.original.center.x - info.A.original.center.x
	const dy = info.B.original.center.y - info.A.original.center.y
	const maxDot = Math.max(1, Math.sqrt(dx * dx + dy * dy))

	for (let si = 0; si < startCandidates.length; si++) {
		for (let ei = 0; ei < endCandidates.length; ei++) {
			const sc = startCandidates[si]
			const ec = endCandidates[ei]
			const path = rulerAStar(graph, sc.expanded, ec.expanded)
			if (!path || path.length < 2) continue

			const fullPath = simplifyPoints([sc.edge, ...path, ec.edge])
			validPaths++
			const bends = countBends(fullPath)
			const dist = manhattanLength(fullPath)
			const exitDir = Vec.Sub(sc.expanded, sc.edge)
			const entryDir = Vec.Sub(ec.edge, ec.expanded)
			const exitPenalty = Math.max(0, 1 - (exitDir.x * dx + exitDir.y * dy) / (Vec.Len(exitDir) * maxDot)) * 2500
			const entryPenalty = Math.max(0, 1 - (entryDir.x * dx + entryDir.y * dy) / (Vec.Len(entryDir) * maxDot)) * 2500
			const score = bends * 10000 + dist + exitPenalty + entryPenalty
			if (score < bestScore) {
				bestScore = score
				bestPath = fullPath
				bestBends = bends
				bestStartIdx = si
				bestEndIdx = ei
			}
		}
	}

	debug.triedCombinations = 16
	debug.validPaths = validPaths

	if (!bestPath) {
		console.groupEnd()
		debug.bailReason = `all combos failed`
		debugInfoMap.set(arrow.id, debug)
		prevRouteMap.delete(arrow.id)
		return null
	}

	// Hysteresis: if the previous route topology is still viable and its score
	// is within 20% of the new best, keep the previous route to prevent flicker.
	const prev = prevRouteMap.get(arrow.id)
	const HYSTERESIS_MARGIN = 0.20
	if (prev && (prev.exitIdx !== bestStartIdx || prev.entryIdx !== bestEndIdx)) {
		// Topology would change — check if old route is still viable
		const prevSc = startCandidates[prev.exitIdx]
		const prevEc = endCandidates[prev.entryIdx]
		const prevPath = rulerAStar(graph, prevSc.expanded, prevEc.expanded)
		if (prevPath && prevPath.length >= 2) {
			const prevFull = simplifyPoints([prevSc.edge, ...prevPath, prevEc.edge])
			const prevExitDir = Vec.Sub(prevSc.expanded, prevSc.edge)
			const prevEntryDir = Vec.Sub(prevEc.edge, prevEc.expanded)
			const prevExitP = Math.max(0, 1 - (prevExitDir.x * dx + prevExitDir.y * dy) / (Vec.Len(prevExitDir) * maxDot)) * 2500
			const prevEntryP = Math.max(0, 1 - (prevEntryDir.x * dx + prevEntryDir.y * dy) / (Vec.Len(prevEntryDir) * maxDot)) * 2500
			const prevScore = countBends(prevFull) * 10000 + manhattanLength(prevFull) + prevExitP + prevEntryP
			// Only switch if the new route is significantly better
			if (bestScore > prevScore * (1 - HYSTERESIS_MARGIN)) {
				bestPath = prevFull
				bestScore = prevScore
				bestBends = countBends(prevFull)
				bestStartIdx = prev.exitIdx
				bestEndIdx = prev.entryIdx
			}
		}
	}

	// Round path coordinates to suppress sub-pixel drift
	for (const p of bestPath) { p.x = Math.round(p.x); p.y = Math.round(p.y) }
	bestPath = simplifyPoints(bestPath)

	// Cache: if the rounded path is identical to last tick, return same reference
	if (prev && prev.exitIdx === bestStartIdx && prev.entryIdx === bestEndIdx && prev.points.length === bestPath.length) {
		let same = true
		for (let i = 0; i < bestPath.length; i++) {
			if (bestPath[i].x !== prev.points[i].x || bestPath[i].y !== prev.points[i].y) { same = false; break }
		}
		if (same) {
			console.groupEnd()
			return { points: prev.points, skipGeometryCasting: true }
		}
	}

	prevRouteMap.set(arrow.id, { exitIdx: bestStartIdx, entryIdx: bestEndIdx, score: Math.round(bestScore), points: bestPath })
	debug.startPage = Mat.applyToPoint(arrowToPage, startCandidates[bestStartIdx].edge)
	debug.endPage = Mat.applyToPoint(arrowToPage, endCandidates[bestEndIdx].edge)
	debug.pathPage = bestPath.map((p) => Mat.applyToPoint(arrowToPage, p))
	debug.bestBends = bestBends
	debugInfoMap.set(arrow.id, debug)

	return { points: bestPath, skipGeometryCasting: true }
}

function getBoundBox(editor: Editor, shapeId: string, pageToArrow: Mat): Box | null {
	const shape = editor.getShape(shapeId as any)
	if (!shape) return null
	const props = shape.props as Record<string, unknown>
	const w = typeof props.w === 'number' ? props.w : 0
	const h = typeof props.h === 'number' ? props.h : 0
	if (w === 0 || h === 0) return null
	return Mat.applyToBounds(pageToArrow, Mat.applyToBounds(editor.getShapePageTransform(shapeId as any), new Box(0, 0, w, h)))
}

// ---------------------------------------------------------------------------
// libavoided-js router (pure TS, MIT)
// ---------------------------------------------------------------------------

function libavoidedRouter(ctx: ElbowArrowRouterContext): ElbowArrowRouterResult | null {
	const { editor, arrow, info, bindings } = ctx
	const pageToArrow = editor.getShapePageTransform(arrow.id).clone().invert()

	if (arrow.props.elbowMidPoint !== 0.5) return null

	const padding = info.options.avoidObstaclesPadding
	const legLength = info.options.expandElbowLegLength
	const regionBox = Box.Common([info.A.original, info.B.original]).expandBy(legLength + padding)

	const excludeIds = new Set([arrow.id])
	if (bindings.start) excludeIds.add(bindings.start.toId)
	if (bindings.end) excludeIds.add(bindings.end.toId)

	// Gather obstacles as raw bounds (libavoided applies obstacleMargin itself)
	const libObstacles: { id: string; x: number; y: number; width: number; height: number }[] = []
	let obsIdx = 0
	for (const id of editor.getCurrentPageShapeIds()) {
		if (excludeIds.has(id)) continue
		const shape = editor.getShape(id)
		if (!shape) continue
		if (NON_OBSTACLE_TYPES.has(shape.type)) continue
		const props = shape.props as Record<string, unknown>
		const w = typeof props.w === 'number' ? props.w : 0
		const h = typeof props.h === 'number' ? props.h : 0
		if (w === 0 || h === 0) continue
		const pageBounds = Mat.applyToBounds(editor.getShapePageTransform(id), new Box(0, 0, w, h))
		const local = Mat.applyToBounds(pageToArrow, pageBounds)
		if (local.maxX < regionBox.minX || local.minX > regionBox.maxX ||
			local.maxY < regionBox.minY || local.minY > regionBox.maxY) continue
		libObstacles.push({ id: `obs_${obsIdx++}`, x: local.x, y: local.y, width: local.w, height: local.h })
	}

	if (libObstacles.length === 0) return null

	// Add bound shapes so libavoided routes around them too
	const startBox = info.A.original
	const endBox = info.B.original
	libObstacles.push({ id: 'src', x: startBox.x, y: startBox.y, width: startBox.w, height: startBox.h })
	libObstacles.push({ id: 'dst', x: endBox.x, y: endBox.y, width: endBox.w, height: endBox.h })

	// Try all 16 exit/entry combinations, same as the ruler router
	const startCandidates = getEdgeCandidates(info.A.original, legLength)
	const endCandidates = getEdgeCandidates(info.B.original, legLength)

	const dx = info.B.original.center.x - info.A.original.center.x
	const dy = info.B.original.center.y - info.A.original.center.y
	const maxDot = Math.max(1, Math.sqrt(dx * dx + dy * dy))

	let bestPath: Vec[] | null = null
	let bestScore = Infinity
	let bestStartIdx = -1
	let bestEndIdx = -1

	for (let si = 0; si < startCandidates.length; si++) {
		for (let ei = 0; ei < endCandidates.length; ei++) {
			const sc = startCandidates[si]
			const ec = endCandidates[ei]

			const result = routeEdges(
				{
					obstacles: libObstacles,
					edges: [{
						id: 'e',
						sourceId: 'src',
						targetId: 'dst',
						sourcePoint: { x: sc.expanded.x, y: sc.expanded.y },
						targetPoint: { x: ec.expanded.x, y: ec.expanded.y },
					}],
				},
				{ obstacleMargin: padding, routingStyle: 'orthogonal' }
			)

			if (result.edges.length === 0) continue
			const section = result.edges[0].sections[0]
			if (!section) continue

			const routePts = [section.startPoint, ...section.bendPoints, section.endPoint]
			const fullPath = simplifyPoints([
				sc.edge,
				...routePts.map((p) => new Vec(p.x, p.y)),
				ec.edge,
			])

			// Score: bends * 10000 + manhattan distance + direction penalties
			const bends = countBends(fullPath)
			const dist = manhattanLength(fullPath)
			const exitDir = Vec.Sub(sc.expanded, sc.edge)
			const entryDir = Vec.Sub(ec.edge, ec.expanded)
			const exitPenalty = Math.max(0, 1 - (exitDir.x * dx + exitDir.y * dy) / (Vec.Len(exitDir) * maxDot)) * 2500
			const entryPenalty = Math.max(0, 1 - (entryDir.x * dx + entryDir.y * dy) / (Vec.Len(entryDir) * maxDot)) * 2500
			const score = bends * 10000 + dist + exitPenalty + entryPenalty

			if (score < bestScore) {
				bestScore = score
				bestPath = fullPath
				bestStartIdx = si
				bestEndIdx = ei
			}
		}
	}

	// If all 16 combos failed, return last cached route or a simple L-shaped fallback
	const prev = prevRouteMap.get(arrow.id)
	if (!bestPath) {
		if (prev) {
			const psc = startCandidates[prev.exitIdx], pec = endCandidates[prev.entryIdx]
			const fallback = [psc.edge, psc.expanded, pec.expanded, pec.edge]
			for (const p of fallback) { p.x = Math.round(p.x); p.y = Math.round(p.y) }
			return { points: simplifyPoints(fallback), skipGeometryCasting: true }
		}
		const fsi = dx >= 0 ? 0 : 2, fei = dx >= 0 ? 2 : 0
		const fsc = startCandidates[fsi], fec = endCandidates[fei]
		const mx = Math.round((fsc.expanded.x + fec.expanded.x) / 2)
		const fallback = [fsc.edge, fsc.expanded, new Vec(mx, fsc.expanded.y), new Vec(mx, fec.expanded.y), fec.expanded, fec.edge]
		for (const p of fallback) { p.x = Math.round(p.x); p.y = Math.round(p.y) }
		return { points: simplifyPoints(fallback), skipGeometryCasting: true }
	}

	// Hysteresis: keep previous topology unless new route is >20% better
	if (prev && (prev.exitIdx !== bestStartIdx || prev.entryIdx !== bestEndIdx)) {
		const prevSc = startCandidates[prev.exitIdx]
		const prevEc = endCandidates[prev.entryIdx]
		const prevResult = routeEdges(
			{
				obstacles: libObstacles,
				edges: [{
					id: 'e',
					sourceId: 'src',
					targetId: 'dst',
					sourcePoint: { x: prevSc.expanded.x, y: prevSc.expanded.y },
					targetPoint: { x: prevEc.expanded.x, y: prevEc.expanded.y },
				}],
			},
			{ obstacleMargin: padding, routingStyle: 'orthogonal' }
		)
		if (prevResult.edges.length > 0 && prevResult.edges[0].sections[0]) {
			const ps = prevResult.edges[0].sections[0]
			const prevPts = [ps.startPoint, ...ps.bendPoints, ps.endPoint]
			const prevFull = simplifyPoints([prevSc.edge, ...prevPts.map((p) => new Vec(p.x, p.y)), prevEc.edge])
			const prevExitDir = Vec.Sub(prevSc.expanded, prevSc.edge)
			const prevEntryDir = Vec.Sub(prevEc.edge, prevEc.expanded)
			const prevExitP = Math.max(0, 1 - (prevExitDir.x * dx + prevExitDir.y * dy) / (Vec.Len(prevExitDir) * maxDot)) * 2500
			const prevEntryP = Math.max(0, 1 - (prevEntryDir.x * dx + prevEntryDir.y * dy) / (Vec.Len(prevEntryDir) * maxDot)) * 2500
			const prevScore = countBends(prevFull) * 10000 + manhattanLength(prevFull) + prevExitP + prevEntryP
			if (bestScore > prevScore * 0.8) {
				bestPath = prevFull
				bestStartIdx = prev.exitIdx
				bestEndIdx = prev.entryIdx
			}
		}
	}

	// Round coordinates to suppress sub-pixel drift
	for (const p of bestPath) { p.x = Math.round(p.x); p.y = Math.round(p.y) }
	bestPath = simplifyPoints(bestPath)

	prevRouteMap.set(arrow.id, { exitIdx: bestStartIdx, entryIdx: bestEndIdx, score: Math.round(bestScore), points: bestPath })

	return { points: bestPath, skipGeometryCasting: true }
}

// ---------------------------------------------------------------------------
// Dispatch router — reads activeRouterType to choose algorithm
// ---------------------------------------------------------------------------

function dispatchRouter(ctx: ElbowArrowRouterContext): ElbowArrowRouterResult | null {
	switch (activeRouterType) {
		case 'default':
			return null
		case 'ruler':
			return obstacleAvoidanceRouter(ctx)
		case 'libavoided':
			return libavoidedRouter(ctx)
	}
}

// ---------------------------------------------------------------------------
// Configure
// ---------------------------------------------------------------------------

const CustomArrowShapeUtil = ArrowShapeUtil.configure({
	elbowRouter: dispatchRouter,
})

// ---------------------------------------------------------------------------
// Debug overlay
// ---------------------------------------------------------------------------

const DebugOverlay = track(function DebugOverlay() {
	const editor = useEditor()
	const shapes = editor.getCurrentPageShapes()
	void shapes.length

	const entries = Array.from(debugInfoMap.values())
	if (entries.length === 0) {
		const arrowShapes = shapes.filter((s) => s.type === 'arrow')
		const elbowArrows = arrowShapes.filter((s) => (s.props as any).kind === 'elbow')
		if (arrowShapes.length > 0 && elbowArrows.length === 0) {
			return (
				<div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,200,0,0.95)', color: '#333', padding: '8px 12px', borderRadius: 6, fontSize: 13, fontFamily: 'system-ui', pointerEvents: 'none', zIndex: 1000, maxWidth: 340 }}>
					<strong>Debug:</strong> Arrows exist but none are elbow type.
				</div>
			)
		}
		return null
	}

	return (
		<>
			{entries.map((d) => <DebugArrowOverlay key={d.arrowId} debug={d} />)}
			<DebugPanel entries={entries} />
		</>
	)
})

function DebugPanel({ entries }: { entries: DebugRouterInfo[] }) {
	return (
		<div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.85)', color: '#eee', padding: '8px 12px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace', pointerEvents: 'none', zIndex: 1000, maxWidth: 420, lineHeight: 1.5 }}>
			<div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>Obstacle Router Debug (rulers)</div>
			{entries.map((d) => (
				<div key={d.arrowId} style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: 4, marginTop: 4 }}>
					<div>arrow: <span style={{ color: '#8cf' }}>{d.arrowId.slice(0, 16)}...</span></div>
					{d.bailReason ? (
						<div style={{ color: '#f88' }}>BAIL: {d.bailReason}</div>
					) : d.pathPage ? (
						<div style={{ color: '#8f8' }}>
							{d.bestBends} bends, {d.pathPage.length} pts |{d.validPaths}/16 valid | rulers: {d.rulerCount.x}x{d.rulerCount.y}
						</div>
					) : (
						<div style={{ color: '#ff8' }}>waiting...</div>
					)}
					{d.startPage && (
						<div style={{ color: '#aaa', fontSize: 11 }}>
							start: ({Math.round(d.startPage.x)}, {Math.round(d.startPage.y)}) → end: ({Math.round(d.endPage!.x)}, {Math.round(d.endPage!.y)})
						</div>
					)}
				</div>
			))}
		</div>
	)
}

function DebugArrowOverlay({ debug: d }: { debug: DebugRouterInfo }) {
	return (
		<>
			{d.aBoxPage && <DebugRect bounds={d.aBoxPage} stroke="rgba(0,120,255,0.6)" strokeWidth={2} strokeDasharray="6 3" label="A" />}
			{d.bBoxPage && <DebugRect bounds={d.bBoxPage} stroke="rgba(0,120,255,0.6)" strokeWidth={2} strokeDasharray="6 3" label="B" />}
			{d.obstaclesPage.map((obs, i) => <DebugRect key={`obs-${i}`} bounds={obs} stroke="rgba(255,60,60,0.5)" strokeWidth={1.5} fill="rgba(255,60,60,0.08)" />)}
			{d.paddedObstaclesPage.map((obs, i) => <DebugRect key={`pad-${i}`} bounds={obs} stroke="rgba(255,60,60,0.25)" strokeWidth={1} strokeDasharray="4 2" />)}
			{d.startPage && <DebugPoint point={d.startPage} color="rgba(0,200,0,0.9)" label="S" />}
			{d.endPage && <DebugPoint point={d.endPage} color="rgba(200,0,200,0.9)" label="E" />}
			{d.pathPage && d.pathPage.length >= 2 && <DebugPath points={d.pathPage} />}
		</>
	)
}

function DebugRect({ bounds, stroke, strokeWidth = 1, strokeDasharray, fill = 'none', label }: {
	bounds: { minX: number; minY: number; maxX: number; maxY: number }; stroke: string
	strokeWidth?: number; strokeDasharray?: string; fill?: string; label?: string
}) {
	const w = bounds.maxX - bounds.minX; const bh = bounds.maxY - bounds.minY
	return (
		<svg style={{ position: 'absolute', left: bounds.minX, top: bounds.minY, width: w, height: bh, pointerEvents: 'none', overflow: 'visible' }}>
			<rect x={0} y={0} width={w} height={bh} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} fill={fill} />
			{label && <text x={4} y={14} fill={stroke} fontSize={11} fontFamily="monospace" fontWeight="bold">{label}</text>}
		</svg>
	)
}

function DebugPoint({ point, color, label }: { point: VecLike; color: string; label: string }) {
	const r = 6
	return (
		<svg style={{ position: 'absolute', left: point.x - r - 2, top: point.y - r - 2, width: r * 2 + 4, height: r * 2 + 4, pointerEvents: 'none', overflow: 'visible' }}>
			<circle cx={r + 2} cy={r + 2} r={r} fill={color} stroke="white" strokeWidth={1.5} />
			<text x={r + 2} y={r + 6} fill="white" fontSize={10} fontFamily="monospace" fontWeight="bold" textAnchor="middle">{label}</text>
		</svg>
	)
}

function DebugPath({ points }: { points: VecLike[] }) {
	if (points.length < 2) return null
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
	for (const p of points) { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y }
	const pad = 8; minX -= pad; minY -= pad; maxX += pad; maxY += pad
	const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x - minX} ${p.y - minY}`).join(' ')
	return (
		<svg style={{ position: 'absolute', left: minX, top: minY, width: maxX - minX, height: maxY - minY, pointerEvents: 'none', overflow: 'visible' }}>
			<path d={d} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
			<path d={d} fill="none" stroke="rgba(0,180,255,0.9)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
			{points.map((p, i) => <circle key={i} cx={p.x - minX} cy={p.y - minY} r={3} fill="rgba(0,180,255,1)" stroke="white" strokeWidth={1} />)}
		</svg>
	)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function handleMount(editor: Editor) {
	const leftId = createShapeId('left')
	const middleId = createShapeId('middle')
	const rightId = createShapeId('right')
	const arrowId = createShapeId('arrow1')

	editor.createShapes([
		{ id: leftId, type: 'geo', x: 100, y: 200, props: { w: 120, h: 80, geo: 'rectangle' } },
		{ id: middleId, type: 'geo', x: 350, y: 200, props: { w: 120, h: 80, geo: 'rectangle' } },
		{ id: rightId, type: 'geo', x: 600, y: 200, props: { w: 120, h: 80, geo: 'rectangle' } },
		{ id: arrowId, type: 'arrow', x: 0, y: 0, props: { kind: 'elbow' as any, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } } },
	])

	editor.createBinding({ id: createBindingId(), type: 'arrow', fromId: arrowId, toId: leftId, props: { terminal: 'start', isExact: false, isPrecise: false, normalizedAnchor: { x: 0.5, y: 0.5 }, snap: 'none' } })
	editor.createBinding({ id: createBindingId(), type: 'arrow', fromId: arrowId, toId: rightId, props: { terminal: 'end', isExact: false, isPrecise: false, normalizedAnchor: { x: 0.5, y: 0.5 }, snap: 'none' } })
	editor.zoomToFit({ animation: { duration: 0 } })
}

const components: TLEditorComponents = { OnTheCanvas: DebugOverlay }

function RouterToggle() {
	const editor = useEditor()
	const [, setTick] = useState(0)
	const handleChange = useCallback(
		(type: RouterType) => {
			setActiveRouterType(type)
			debugInfoMap.clear()
			prevRouteMap.clear()
			setTick((t) => t + 1)
			// Nudge all arrows so they re-route
			const arrows = editor.getCurrentPageShapes().filter((s) => s.type === 'arrow')
			for (const a of arrows) editor.updateShape({ ...a })
		},
		[editor]
	)

	return (
		<div
			style={{
				position: 'absolute',
				top: 8,
				right: 8,
				background: 'rgba(0,0,0,0.85)',
				color: '#eee',
				padding: '8px 12px',
				borderRadius: 6,
				fontSize: 12,
				fontFamily: 'monospace',
				zIndex: 1000,
				display: 'flex',
				gap: 6,
				alignItems: 'center',
			}}
		>
			<span style={{ fontWeight: 'bold', marginRight: 4 }}>Router:</span>
			{(['default', 'ruler', 'libavoided'] as const).map((type) => (
				<button
					key={type}
					onClick={() => handleChange(type)}
					style={{
						padding: '3px 8px',
						borderRadius: 4,
						border: 'none',
						cursor: 'pointer',
						fontSize: 11,
						fontFamily: 'monospace',
						background: activeRouterType === type ? '#4af' : '#444',
						color: activeRouterType === type ? '#000' : '#ccc',
						fontWeight: activeRouterType === type ? 'bold' : 'normal',
					}}
				>
					{type}
				</button>
			))}
		</div>
	)
}

export default function ArrowObstacleAvoidanceExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} components={components} shapeUtils={[CustomArrowShapeUtil]}>
				<RouterToggle />
			</Tldraw>
		</div>
	)
}
