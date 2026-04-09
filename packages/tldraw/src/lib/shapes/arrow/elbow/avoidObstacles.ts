import { Box, Editor, Mat, TLArrowShape, TLShape, TLShapeId, Vec, VecLike } from '@tldraw/editor'
import { ArrowShapeUtil } from '../ArrowShapeUtil'
import { TLArrowBindings } from '../shared'
import { ElbowArrowRoute } from './definitions'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Target cell size in arrow-space pixels. Grid resolution scales with area. */
const TARGET_CELL_SIZE = 20
/** Minimum grid resolution per axis */
const MIN_GRID_SIZE = 16
/** Maximum grid resolution per axis to cap performance */
const MAX_GRID_SIZE = 64
/** Maximum ratio of A* path length to direct distance before we reject */
const MAX_COST_RATIO = 5
/** Maximum number of obstacles to consider */
const MAX_OBSTACLES = 50
/** Penalty per direction change to minimize bends */
const TURN_PENALTY = 200

/** Shape types that are NOT treated as obstacles */
const NON_OBSTACLE_TYPES = new Set(['arrow', 'group', 'draw', 'highlight', 'line'])

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Reroute an elbow arrow around obstacle shapes using grid-based A* pathfinding.
 *
 * Runs after the elbow router computes its initial route, but BEFORE
 * castPathSegmentIntoGeometry and fixTinyEndNubs. The output satisfies
 * the axis-alignment invariant required by those downstream functions.
 *
 * Mutates route.points in place.
 */
export function avoidObstaclesReroute(
	editor: Editor,
	arrow: TLArrowShape,
	route: ElbowArrowRoute,
	padding: number,
	bindings: TLArrowBindings
): void {
	// Step 1: Early exit
	if (route.points.length < 2) return
	if (!bindings.start && !bindings.end) return

	// If the user has manually dragged the midpoint handle, skip obstacle avoidance
	// and let the normal elbow router's manual midpoint take priority.
	if (arrow.props.elbowMidPoint !== 0.5) return

	// Step 2: Gather obstacles (non-reactive)
	const { obstacles, obstacleIds } = gatherObstacles(editor, arrow, padding, bindings)
	if (obstacles.length === 0) return

	// Step 3: Create reactive deps on ALL gathered obstacles so we recompute
	// when any nearby obstacle changes (e.g. resized to now intersect the route).
	for (const id of obstacleIds) {
		editor.getShape(id)
	}

	// Check if any obstacle actually intersects the current route
	let hasIntersection = false
	for (const obs of obstacles) {
		if (routeIntersectsObstacle(route.points, obs)) {
			hasIntersection = true
			break
		}
	}
	if (!hasIntersection) return

	// Step 4: Try all exit/entry edge combinations and pick the path with fewest bends.
	const boundBoxes = gatherBoundShapeBoxes(editor, arrow, bindings)
	if (boundBoxes.length < 2) return
	const startBox = boundBoxes[0]
	const endBox = boundBoxes[1]

	const shapeOptions = editor.getShapeUtil<ArrowShapeUtil>(arrow.type).options
	const legLength = shapeOptions.expandElbowLegLength[arrow.props.size] * arrow.props.scale

	// Include bound shapes as obstacles for the middle A* path.
	// The middle path must not pass through the start/end shapes.
	const middleObstacles = [
		...obstacles,
		startBox.clone().expandBy(padding),
		endBox.clone().expandBy(padding),
	]

	const allEdges: Edge[] = ['top', 'right', 'bottom', 'left']
	let bestPath: Vec[] | null = null
	let bestScore = Infinity // fewer points = fewer bends = better

	for (const exitEdge of allEdges) {
		for (const entryEdge of allEdges) {
			const exitPt = edgeMidpoint(startBox, exitEdge)
			const exitLegEnd = extendFromEdge(exitPt, exitEdge, legLength)
			const entryPt = edgeMidpoint(endBox, entryEdge)
			const entryLegStart = extendFromEdge(entryPt, entryEdge, legLength)

			const middlePath = gridAStar(exitLegEnd, entryLegStart, middleObstacles)
			if (!middlePath || middlePath.length < 1) continue

			const directDist = manhattanDist(exitLegEnd, entryLegStart)
			if (directDist > 0 && measurePathDist(middlePath) > directDist * MAX_COST_RATIO) continue

			const assembled = assemblePath(
				exitPt,
				exitLegEnd,
				exitEdge,
				middlePath,
				entryLegStart,
				entryPt,
				entryEdge
			)

			let candidate = simplifyCollinear(assembled)
			candidate = smoothPath(candidate, middleObstacles)
			cleanupExitJog(candidate, middleObstacles, 0.01)
			cleanupEntryJog(candidate, middleObstacles, 0.01)
			candidate = simplifyCollinear(candidate)

			// Score: prefer fewer points (bends), break ties with shorter distance
			const score = candidate.length * 10000 + measurePathDist(candidate)
			if (score < bestScore) {
				bestScore = score
				bestPath = candidate
			}
		}
	}

	if (!bestPath || bestPath.length < 2) return
	const path = bestPath

	// Step 10: Write back
	route.points = path
	route.distance = measurePathDist(path)
	route.midpointHandle = null // Recomputed by caller with range info
	route.avoidObstaclesRerouted = true
}

// ---------------------------------------------------------------------------
// Edge detection helpers
// ---------------------------------------------------------------------------

type Edge = 'top' | 'right' | 'bottom' | 'left'

function findExitEdge(path: Vec[], startBox: Box, endBox: Box): Edge | null {
	// Find the first point that's outside BOTH boxes (in the "middle" of the path).
	// This avoids picking an edge based on the path re-entering a box at the same Y.
	for (const pt of path) {
		if (!pointInsideBox(pt, startBox) && !pointInsideBox(pt, endBox)) {
			return edgeFromDirection(pt, startBox)
		}
	}
	// Fallback: first point outside start box
	for (const pt of path) {
		if (!pointInsideBox(pt, startBox)) {
			return edgeFromDirection(pt, startBox)
		}
	}
	return null
}

function findEntryEdge(path: Vec[], startBox: Box, endBox: Box): Edge | null {
	// Find the last point that's outside BOTH boxes (in the "middle" of the path).
	for (let i = path.length - 1; i >= 0; i--) {
		if (!pointInsideBox(path[i], startBox) && !pointInsideBox(path[i], endBox)) {
			return edgeFromDirection(path[i], endBox)
		}
	}
	// Fallback: last point outside end box
	for (let i = path.length - 1; i >= 0; i--) {
		if (!pointInsideBox(path[i], endBox)) {
			return edgeFromDirection(path[i], endBox)
		}
	}
	return null
}

function edgeFromDirection(target: VecLike, box: Box): Edge {
	const cx = (box.minX + box.maxX) / 2
	const cy = (box.minY + box.maxY) / 2
	const dx = target.x - cx
	const dy = target.y - cy
	const halfW = (box.maxX - box.minX) / 2
	const halfH = (box.maxY - box.minY) / 2
	const nx = halfW > 0 ? Math.abs(dx) / halfW : 0
	const ny = halfH > 0 ? Math.abs(dy) / halfH : 0

	if (nx > ny) {
		return dx > 0 ? 'right' : 'left'
	} else {
		return dy > 0 ? 'bottom' : 'top'
	}
}

function edgeMidpoint(box: Box, edge: Edge): Vec {
	const cx = (box.minX + box.maxX) / 2
	const cy = (box.minY + box.maxY) / 2
	switch (edge) {
		case 'top':
			return new Vec(cx, box.minY)
		case 'bottom':
			return new Vec(cx, box.maxY)
		case 'left':
			return new Vec(box.minX, cy)
		case 'right':
			return new Vec(box.maxX, cy)
	}
}

function extendFromEdge(pt: Vec, edge: Edge, length: number): Vec {
	switch (edge) {
		case 'top':
			return new Vec(pt.x, pt.y - length)
		case 'bottom':
			return new Vec(pt.x, pt.y + length)
		case 'left':
			return new Vec(pt.x - length, pt.y)
		case 'right':
			return new Vec(pt.x + length, pt.y)
	}
}

function isVerticalEdge(edge: Edge): boolean {
	return edge === 'top' || edge === 'bottom'
}

// ---------------------------------------------------------------------------
// Path assembly
// ---------------------------------------------------------------------------

function assemblePath(
	exitPt: Vec,
	exitLegEnd: Vec,
	exitEdge: Edge,
	middlePath: Vec[],
	entryLegStart: Vec,
	entryPt: Vec,
	entryEdge: Edge
): Vec[] {
	const path: Vec[] = [exitPt, exitLegEnd]

	// Connector from exit leg end to first A* cell
	const firstCell = middlePath[0]
	if (needsConnector(exitLegEnd, firstCell)) {
		if (isVerticalEdge(exitEdge)) {
			// Exit leg is vertical → next move should be horizontal
			path.push(new Vec(firstCell.x, exitLegEnd.y))
		} else {
			// Exit leg is horizontal → next move should be vertical
			path.push(new Vec(exitLegEnd.x, firstCell.y))
		}
	}

	// A* middle cells
	for (const cell of middlePath) {
		path.push(cell)
	}

	// Connector from last A* cell to entry leg start
	const lastCell = middlePath[middlePath.length - 1]
	if (needsConnector(lastCell, entryLegStart)) {
		if (isVerticalEdge(entryEdge)) {
			// Entry leg is vertical → connector should be horizontal
			path.push(new Vec(entryLegStart.x, lastCell.y))
		} else {
			// Entry leg is horizontal → connector should be vertical
			path.push(new Vec(lastCell.x, entryLegStart.y))
		}
	}

	path.push(entryLegStart, entryPt)
	return path
}

function needsConnector(a: VecLike, b: VecLike): boolean {
	return Math.abs(a.x - b.x) > 0.01 && Math.abs(a.y - b.y) > 0.01
}

// ---------------------------------------------------------------------------
// Grid A* pathfinding
// ---------------------------------------------------------------------------

function gridAStar(start: VecLike, end: VecLike, obstacles: Box[]): Vec[] | null {
	// Compute grid bounds from start, end, and all obstacles
	let minX = Math.min(start.x, end.x)
	let minY = Math.min(start.y, end.y)
	let maxX = Math.max(start.x, end.x)
	let maxY = Math.max(start.y, end.y)

	for (const obs of obstacles) {
		if (obs.minX < minX) minX = obs.minX
		if (obs.minY < minY) minY = obs.minY
		if (obs.maxX > maxX) maxX = obs.maxX
		if (obs.maxY > maxY) maxY = obs.maxY
	}

	// 15% margin so paths can route around outer obstacles
	const margin = Math.max(maxX - minX, maxY - minY) * 0.15
	minX -= margin
	minY -= margin
	maxX += margin
	maxY += margin

	const width = maxX - minX
	const height = maxY - minY
	if (width <= 0 || height <= 0) return null

	// Dynamic grid resolution
	const gridCols = Math.max(
		MIN_GRID_SIZE,
		Math.min(MAX_GRID_SIZE, Math.ceil(width / TARGET_CELL_SIZE))
	)
	const gridRows = Math.max(
		MIN_GRID_SIZE,
		Math.min(MAX_GRID_SIZE, Math.ceil(height / TARGET_CELL_SIZE))
	)
	const cellW = width / gridCols
	const cellH = height / gridRows

	// Build occupancy grid
	const occupied = new Uint8Array(gridCols * gridRows)
	for (const obs of obstacles) {
		const c0 = Math.max(0, Math.floor((obs.minX - minX) / cellW))
		const c1 = Math.min(gridCols - 1, Math.floor((obs.maxX - minX) / cellW))
		const r0 = Math.max(0, Math.floor((obs.minY - minY) / cellH))
		const r1 = Math.min(gridRows - 1, Math.floor((obs.maxY - minY) / cellH))
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				occupied[r * gridCols + c] = 1
			}
		}
	}

	// Start/end cells
	const clampC = (v: number) => Math.max(0, Math.min(gridCols - 1, v))
	const clampR = (v: number) => Math.max(0, Math.min(gridRows - 1, v))
	const sc = clampC(Math.floor((start.x - minX) / cellW))
	const sr = clampR(Math.floor((start.y - minY) / cellH))
	const ec = clampC(Math.floor((end.x - minX) / cellW))
	const er = clampR(Math.floor((end.y - minY) / cellH))

	// Ensure start/end cells are passable
	occupied[sr * gridCols + sc] = 0
	occupied[er * gridCols + ec] = 0

	// Direction-aware A*: 3 states per cell (horiz=0, vert=1, start=2)
	const NUM_DIRS = 3
	const total = gridCols * gridRows * NUM_DIRS
	const gScore = new Float64Array(total).fill(Infinity)
	const fScore = new Float64Array(total).fill(Infinity)
	const cameFrom = new Int32Array(total).fill(-1)

	const idx = (r: number, c: number, d: number) => (r * gridCols + c) * NUM_DIRS + d
	const heuristic = (c: number, r: number) => Math.abs(c - ec) * cellW + Math.abs(r - er) * cellH

	const startState = idx(sr, sc, 2)
	gScore[startState] = 0
	fScore[startState] = heuristic(sc, sr)

	const open = new MinHeap()
	open.push(startState, 0)

	const DC = [1, 0, -1, 0]
	const DR = [0, 1, 0, -1]
	const MOVE_DIR = [0, 1, 0, 1] // 0=horiz, 1=vert

	while (open.size > 0) {
		const cur = open.pop()!
		const cd = cur % NUM_DIRS
		const gi = (cur - cd) / NUM_DIRS
		const cr = Math.floor(gi / gridCols)
		const cc = gi % gridCols

		if (cr === er && cc === ec) {
			// Reconstruct
			const path: Vec[] = []
			let s = cur
			while (s !== -1) {
				const d = s % NUM_DIRS
				const g = (s - d) / NUM_DIRS
				const row = Math.floor(g / gridCols)
				const col = g % gridCols
				path.push(new Vec(minX + (col + 0.5) * cellW, minY + (row + 0.5) * cellH))
				s = cameFrom[s]
			}
			path.reverse()
			return path
		}

		for (let dir = 0; dir < 4; dir++) {
			const nr = cr + DR[dir]
			const nc = cc + DC[dir]
			if (nr < 0 || nr >= gridRows || nc < 0 || nc >= gridCols) continue
			if (occupied[nr * gridCols + nc]) continue

			const nd = MOVE_DIR[dir]
			const ns = idx(nr, nc, nd)
			const moveCost = dir % 2 === 0 ? cellW : cellH
			const turnCost = cd !== 2 && cd !== nd ? TURN_PENALTY : 0
			const g = gScore[cur] + moveCost + turnCost

			if (g < gScore[ns]) {
				cameFrom[ns] = cur
				gScore[ns] = g
				fScore[ns] = g + heuristic(nc, nr)
				open.push(ns, fScore[ns])
			}
		}
	}

	return null
}

/** Minimal binary min-heap */
class MinHeap {
	private heap: { idx: number; pri: number }[] = []
	get size() {
		return this.heap.length
	}
	push(idx: number, pri: number) {
		this.heap.push({ idx, pri })
		this._up(this.heap.length - 1)
	}
	pop(): number | undefined {
		if (this.heap.length === 0) return undefined
		const top = this.heap[0]
		const last = this.heap.pop()!
		if (this.heap.length > 0) {
			this.heap[0] = last
			this._down(0)
		}
		return top.idx
	}
	private _up(i: number) {
		while (i > 0) {
			const p = (i - 1) >> 1
			if (this.heap[p].pri <= this.heap[i].pri) break
			;[this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]]
			i = p
		}
	}
	private _down(i: number) {
		const n = this.heap.length
		while (true) {
			let s = i
			const l = 2 * i + 1
			const r = 2 * i + 2
			if (l < n && this.heap[l].pri < this.heap[s].pri) s = l
			if (r < n && this.heap[r].pri < this.heap[s].pri) s = r
			if (s === i) break
			;[this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]]
			i = s
		}
	}
}

// ---------------------------------------------------------------------------
// Obstacle gathering (non-reactive)
// ---------------------------------------------------------------------------

function gatherObstacles(
	editor: Editor,
	arrow: TLArrowShape,
	padding: number,
	bindings: TLArrowBindings
): { obstacles: Box[]; obstacleIds: TLShapeId[] } {
	const excludeIds = new Set<TLShapeId>()
	excludeIds.add(arrow.id)
	if (bindings.start) excludeIds.add(bindings.start.toId)
	if (bindings.end) excludeIds.add(bindings.end.toId)

	const arrowPageTransform = computePageTransform(editor, arrow.id)
	if (!arrowPageTransform) return { obstacles: [], obstacleIds: [] }
	const pageToArrow = arrowPageTransform.clone().invert()

	const obstacles: Box[] = []
	const obstacleIds: TLShapeId[] = []

	// Use getCurrentPageShapeIds() which is reactive only on shape add/remove,
	// not on every property change. Individual shapes are read non-reactively.
	const shapeIds = editor.getCurrentPageShapeIds()
	for (const id of shapeIds) {
		if (excludeIds.has(id)) continue

		const shape = editor.store.unsafeGetWithoutCapture(id) as TLShape | undefined
		if (!shape) continue
		if (NON_OBSTACLE_TYPES.has(shape.type)) continue

		const props = shape.props as unknown as Record<string, unknown>
		const w = typeof props.w === 'number' ? props.w : 0
		const h = typeof props.h === 'number' ? props.h : 0
		if (w === 0 || h === 0) continue

		const shapeTransform = computePageTransform(editor, shape.id)
		if (!shapeTransform) continue

		const pageBounds = Mat.applyToBounds(shapeTransform, new Box(0, 0, w, h))
		const arrowBounds = Mat.applyToBounds(pageToArrow, pageBounds)
		obstacles.push(arrowBounds.expandBy(padding))
		obstacleIds.push(shape.id)

		if (obstacles.length >= MAX_OBSTACLES) break
	}

	return { obstacles, obstacleIds }
}

function gatherBoundShapeBoxes(
	editor: Editor,
	arrow: TLArrowShape,
	bindings: TLArrowBindings
): Box[] {
	const arrowPageTransform = computePageTransform(editor, arrow.id)
	if (!arrowPageTransform) return []
	const pageToArrow = arrowPageTransform.clone().invert()

	const boxes: Box[] = []
	const ids: TLShapeId[] = []
	if (bindings.start) ids.push(bindings.start.toId)
	if (bindings.end) ids.push(bindings.end.toId)

	for (const id of ids) {
		const shape = editor.store.unsafeGetWithoutCapture(id) as TLShape | undefined
		if (!shape) continue
		const props = shape.props as unknown as Record<string, unknown>
		const w = typeof props.w === 'number' ? props.w : 0
		const h = typeof props.h === 'number' ? props.h : 0
		if (w === 0 || h === 0) continue

		const shapeTransform = computePageTransform(editor, id)
		if (!shapeTransform) continue

		const pageBounds = Mat.applyToBounds(shapeTransform, new Box(0, 0, w, h))
		boxes.push(Mat.applyToBounds(pageToArrow, pageBounds))
	}

	return boxes
}

function computePageTransform(editor: Editor, shapeId: TLShapeId): Mat | null {
	const shape = editor.store.unsafeGetWithoutCapture(shapeId) as TLShape | undefined
	if (!shape) return null

	let a = 1,
		b = 0,
		c = 0,
		d = 1
	if (shape.rotation) {
		const cos = Math.cos(shape.rotation)
		const sin = Math.sin(shape.rotation)
		a = cos
		b = sin
		c = -sin
		d = cos
	}
	const local = new Mat(a, b, c, d, shape.x, shape.y)

	const parentId = shape.parentId
	if (typeof parentId === 'string' && parentId.startsWith('page:')) return local

	const parentTransform = computePageTransform(editor, parentId as TLShapeId)
	if (!parentTransform) return local

	return Mat.Compose(parentTransform, local)
}

// ---------------------------------------------------------------------------
// Path simplification and smoothing
// ---------------------------------------------------------------------------

function simplifyCollinear(points: Vec[]): Vec[] {
	const result: Vec[] = []
	const eps = 0.01

	for (const p0 of points) {
		const p1 = result[result.length - 1]
		const p2 = result[result.length - 2]

		if (!p1 || !p2) {
			result.push(p0)
		} else {
			const d1x = Math.abs(p0.x - p1.x)
			const d1y = Math.abs(p0.y - p1.y)
			const d2x = Math.abs(p0.x - p2.x)
			const d2y = Math.abs(p0.y - p2.y)

			if (d1x < eps && d1y < eps) {
				// Duplicate point — skip
			} else if (d1x < eps && d2x < eps) {
				// All same x. Merge unless p0 extends past p2 on the far side of p1
				// (a genuine zigzag detour). Overshoots that come back are always merged.
				const p0PastP2 = (p1.y > p2.y && p0.y < p2.y - eps) || (p1.y < p2.y && p0.y > p2.y + eps)
				if (p0PastP2) {
					result.push(p0)
				} else {
					p1.y = p0.y
				}
			} else if (d1y < eps && d2y < eps) {
				// All same y. Same logic for horizontal segments.
				const p0PastP2 = (p1.x > p2.x && p0.x < p2.x - eps) || (p1.x < p2.x && p0.x > p2.x + eps)
				if (p0PastP2) {
					result.push(p0)
				} else {
					p1.x = p0.x
				}
			} else {
				result.push(p0)
			}
		}
	}

	return result
}

function smoothPath(points: Vec[], obstacles: Box[]): Vec[] {
	if (points.length <= 4) return points

	const result = [...points]
	let changed = true
	let passes = 0
	const eps = 0.01

	while (changed && passes < 20) {
		changed = false
		passes++
		// Protect first point (exit position on shape) and last two points (entry leg direction).
		// We'll clean up exit/entry jogs separately in a direction-preserving pass.
		let i = 1
		while (i < result.length - 3) {
			const a = result[i]
			const c = result[i + 2]

			const sameX = Math.abs(a.x - c.x) < eps
			const sameY = Math.abs(a.y - c.y) < eps

			if (sameX || sameY) {
				// A and C are axis-aligned — check if direct segment is clear
				if (!segmentHitsAny(a, c, obstacles)) {
					result.splice(i + 1, 1)
					changed = true
					continue // re-check same i since array shrank
				}
			} else {
				// A and C differ in both axes — try two L-path corners
				const corner1 = new Vec(a.x, c.y)
				const corner2 = new Vec(c.x, a.y)

				if (!segmentHitsAny(a, corner1, obstacles) && !segmentHitsAny(corner1, c, obstacles)) {
					result.splice(i + 1, 1, corner1)
					changed = true
					i++ // advance — replacement, not deletion, can't re-check same i
					continue
				}

				if (!segmentHitsAny(a, corner2, obstacles) && !segmentHitsAny(corner2, c, obstacles)) {
					result.splice(i + 1, 1, corner2)
					changed = true
					i++ // advance — replacement, not deletion
					continue
				}
			}

			i++
		}

		// Additional aggressive pass: skip-3 smoothing to remove longer unnecessary segments
		if (!changed && result.length > 5) {
			i = 1
			while (i < result.length - 3) {
				const a = result[i]
				const d = result[i + 3]

				const sameX = Math.abs(a.x - d.x) < eps
				const sameY = Math.abs(a.y - d.y) < eps

				// If we can skip 2 intermediate points without hitting obstacles, do it
				if ((sameX || sameY) && !segmentHitsAny(a, d, obstacles)) {
					result.splice(i + 1, 2)
					changed = true
					continue
				}

				i++
			}
		}
	}

	// Direction-preserving jog cleanup for exit and entry legs.
	// Shortens exit/entry legs to match the A* path without changing the segment direction.
	cleanupExitJog(result, obstacles, eps)
	cleanupEntryJog(result, obstacles, eps)

	return simplifyCollinear(result)
}

/**
 * Clean up a jog between the exit leg and the first middle segment.
 * E.g. (3,42)→(3,78)→(-8,78)→(-8,64) can become (3,42)→(3,64) if the shortcut is clear.
 * Preserves the exit direction (axis of the first segment).
 */
function cleanupExitJog(result: Vec[], obstacles: Box[], eps: number) {
	if (result.length < 4) return
	const p0 = result[0]
	const p1 = result[1]
	const exitIsVertical = Math.abs(p0.x - p1.x) < eps
	const exitIsHorizontal = Math.abs(p0.y - p1.y) < eps

	// Walk forward from the exit leg, looking for the furthest point we can
	// connect to via an L-corner that preserves exit direction.
	for (let k = 2; k < result.length - 1; k++) {
		const pk = result[k]
		// Already aligned with exit — no jog to fix
		if (exitIsVertical && Math.abs(p0.x - pk.x) < eps) return
		if (exitIsHorizontal && Math.abs(p0.y - pk.y) < eps) return

		// Try an L-corner from p0 to pk that preserves exit direction
		let corner: Vec
		if (exitIsVertical) {
			corner = new Vec(p0.x, pk.y)
		} else if (exitIsHorizontal) {
			corner = new Vec(pk.x, p0.y)
		} else {
			return
		}

		if (!segmentHitsAny(p0, corner, obstacles) && !segmentHitsAny(corner, pk, obstacles)) {
			// Replace everything between p0 and pk with the corner
			result.splice(1, k - 1, corner)
			return
		}
	}
}

/**
 * Clean up a jog between the last middle segment and the entry leg.
 * Handles both simple jogs like (509,64)→(503,64)→(503,42)
 * and multi-point jogs like (510,-151)→(510,-78)→(504,-78)→(504,-42).
 * Preserves the entry direction (axis of the last segment).
 */
function cleanupEntryJog(result: Vec[], obstacles: Box[], eps: number) {
	if (result.length < 4) return
	const pN = result[result.length - 1]
	const pN1 = result[result.length - 2]
	const entryIsVertical = Math.abs(pN.x - pN1.x) < eps
	const entryIsHorizontal = Math.abs(pN.y - pN1.y) < eps

	// Walk backwards from the entry leg, looking for the furthest point we can
	// connect to via an L-corner that preserves entry direction.
	for (let k = result.length - 3; k >= 1; k--) {
		const pk = result[k]
		// Already aligned with entry — no jog to fix
		if (entryIsVertical && Math.abs(pN.x - pk.x) < eps) return
		if (entryIsHorizontal && Math.abs(pN.y - pk.y) < eps) return

		// Try an L-corner from pk to pN that preserves entry direction
		let corner: Vec
		if (entryIsVertical) {
			corner = new Vec(pN.x, pk.y)
		} else if (entryIsHorizontal) {
			corner = new Vec(pk.x, pN.y)
		} else {
			return
		}

		if (!segmentHitsAny(pk, corner, obstacles) && !segmentHitsAny(corner, pN, obstacles)) {
			// Replace everything between pk and pN with the corner
			result.splice(k + 1, result.length - k - 2, corner)
			return
		}
	}
}

// ---------------------------------------------------------------------------
// Geometry utilities
// ---------------------------------------------------------------------------

function routeIntersectsObstacle(points: Vec[], obstacle: Box): boolean {
	for (let i = 0; i < points.length - 1; i++) {
		if (segmentIntersectsBox(points[i], points[i + 1], obstacle)) return true
	}
	return false
}

function segmentHitsAny(p1: VecLike, p2: VecLike, obstacles: Box[]): boolean {
	for (const obs of obstacles) {
		if (segmentIntersectsBox(p1, p2, obs)) return true
	}
	return false
}

/** Axis-aligned segment vs box intersection. Only handles horizontal/vertical segments. */
function segmentIntersectsBox(p1: VecLike, p2: VecLike, box: Box): boolean {
	const eps = 0.01
	const isHorizontal = Math.abs(p1.y - p2.y) < eps

	if (isHorizontal) {
		const y = p1.y
		if (y <= box.minY || y >= box.maxY) return false
		const segMin = Math.min(p1.x, p2.x)
		const segMax = Math.max(p1.x, p2.x)
		return segMax > box.minX && segMin < box.maxX
	} else {
		const x = p1.x
		if (x <= box.minX || x >= box.maxX) return false
		const segMin = Math.min(p1.y, p2.y)
		const segMax = Math.max(p1.y, p2.y)
		return segMax > box.minY && segMin < box.maxY
	}
}

function pointInsideBox(pt: VecLike, box: Box): boolean {
	return pt.x >= box.minX && pt.x <= box.maxX && pt.y >= box.minY && pt.y <= box.maxY
}

function manhattanDist(a: VecLike, b: VecLike): number {
	return Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
}

function measurePathDist(points: VecLike[]): number {
	let d = 0
	for (let i = 0; i < points.length - 1; i++) {
		d += Math.abs(points[i + 1].x - points[i].x) + Math.abs(points[i + 1].y - points[i].y)
	}
	return d
}
