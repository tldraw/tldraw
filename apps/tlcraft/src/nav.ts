// A* pathfinding over the terrain grid.
//
// We keep two passability masks the same shape as terrainGrid:
//   - landMask  : 1 = land + non-blocking terrain + no static building, 0 = blocked.
//   - waterMask : 1 = water tile + no building, 0 = blocked. Mountains are
//     blocked in both — nothing crosses a mountain.
//
// Both masks are rebuilt by rebuildNav() whenever terrain or buildings change.
// Pathfinding uses the relevant mask depending on whether the unit traverses
// water (ships) or land.
//
// The open set is a binary min-heap over (cellIndex, f-score). For our grids
// (up to ~24k cells on the largest map) this is well under a millisecond per
// query. Per-tick we keep an O(1) reuse pattern (Map of cellIndex → gScore)
// instead of allocating big buffers each call.

import { COLS, ROWS } from './fog'
import { MAP_BOUNDS } from './map'
import { CELL_SIZE, TERRAIN_MOUNTAIN, TERRAIN_WATER, terrainGrid } from './terrain'

interface NavBuilding {
	cx: number
	cy: number
	halfSize: number
	hp: number
	kind: string
	gateOpen: boolean
}

export let landMask = new Uint8Array(COLS * ROWS)
export let waterMask = new Uint8Array(COLS * ROWS)
let _navVersion = 0
export function getNavVersion(): number {
	return _navVersion
}

export function resizeNav() {
	landMask = new Uint8Array(COLS * ROWS)
	waterMask = new Uint8Array(COLS * ROWS)
}

/** Rebuild both masks from the current terrainGrid plus the supplied alive
 * buildings. Call after terrain changes or after every game tick's
 * syncBuildings (cheap — one pass over the grid + the building list). */
export function rebuildNav(buildings: NavBuilding[]) {
	for (let i = 0; i < terrainGrid.length; i++) {
		const t = terrainGrid[i]
		landMask[i] = t !== TERRAIN_WATER && t !== TERRAIN_MOUNTAIN ? 1 : 0
		waterMask[i] = t === TERRAIN_WATER ? 1 : 0
	}
	for (const b of buildings) {
		if (b.hp <= 0) continue
		if (b.kind === 'gate' && b.gateOpen) continue
		const half = b.halfSize
		const c0 = Math.max(0, Math.floor((b.cx - half - MAP_BOUNDS.minX) / CELL_SIZE))
		const c1 = Math.min(COLS, Math.ceil((b.cx + half - MAP_BOUNDS.minX) / CELL_SIZE))
		const r0 = Math.max(0, Math.floor((b.cy - half - MAP_BOUNDS.minY) / CELL_SIZE))
		const r1 = Math.min(ROWS, Math.ceil((b.cy + half - MAP_BOUNDS.minY) / CELL_SIZE))
		for (let row = r0; row < r1; row++) {
			for (let col = c0; col < c1; col++) {
				const i = row * COLS + col
				landMask[i] = 0
				waterMask[i] = 0
			}
		}
	}
	_navVersion++
}

function colOf(x: number): number {
	return Math.max(0, Math.min(COLS - 1, Math.floor((x - MAP_BOUNDS.minX) / CELL_SIZE)))
}
function rowOf(y: number): number {
	return Math.max(0, Math.min(ROWS - 1, Math.floor((y - MAP_BOUNDS.minY) / CELL_SIZE)))
}
function tileCenterX(col: number): number {
	return MAP_BOUNDS.minX + col * CELL_SIZE + CELL_SIZE / 2
}
function tileCenterY(row: number): number {
	return MAP_BOUNDS.minY + row * CELL_SIZE + CELL_SIZE / 2
}

// 8-direction neighbour offsets. dx, dy, cost — straight = 1, diagonal = √2.
const SQRT2 = Math.SQRT2
const NEIGHBOURS: Array<[number, number, number]> = [
	[-1, -1, SQRT2],
	[0, -1, 1],
	[1, -1, SQRT2],
	[-1, 0, 1],
	[1, 0, 1],
	[-1, 1, SQRT2],
	[0, 1, 1],
	[1, 1, SQRT2],
]

// Minimal binary min-heap over (cellIndex, f). Smaller f is popped first.
class FHeap {
	private values: number[] = []
	private fs: number[] = []
	size(): number {
		return this.values.length
	}
	push(cell: number, f: number) {
		this.values.push(cell)
		this.fs.push(f)
		this.bubbleUp(this.values.length - 1)
	}
	pop(): number {
		const top = this.values[0]
		const last = this.values.length - 1
		if (last > 0) {
			this.values[0] = this.values[last]
			this.fs[0] = this.fs[last]
		}
		this.values.pop()
		this.fs.pop()
		if (this.values.length > 1) this.sinkDown(0)
		return top
	}
	private bubbleUp(i: number) {
		while (i > 0) {
			const parent = (i - 1) >> 1
			if (this.fs[i] >= this.fs[parent]) break
			this.swap(i, parent)
			i = parent
		}
	}
	private sinkDown(i: number) {
		const n = this.values.length
		while (true) {
			const l = i * 2 + 1
			const r = l + 1
			let smallest = i
			if (l < n && this.fs[l] < this.fs[smallest]) smallest = l
			if (r < n && this.fs[r] < this.fs[smallest]) smallest = r
			if (smallest === i) break
			this.swap(i, smallest)
			i = smallest
		}
	}
	private swap(a: number, b: number) {
		const tv = this.values[a]
		this.values[a] = this.values[b]
		this.values[b] = tv
		const tf = this.fs[a]
		this.fs[a] = this.fs[b]
		this.fs[b] = tf
	}
}

function octile(c0: number, r0: number, c1: number, r1: number): number {
	const dx = Math.abs(c1 - c0)
	const dy = Math.abs(r1 - r0)
	return Math.max(dx, dy) + (SQRT2 - 1) * Math.min(dx, dy)
}

/** A* over the requested mask. Returns the path as a list of page-space
 * waypoints from start → goal (inclusive of goal but excluding start), or
 * null if no path exists.
 *
 * If the goal tile is blocked, we search for the closest passable tile to
 * the goal first and path there — so commanding "attack this building" still
 * works when the literal destination tile is the building itself. */
export function pathfind(
	sx: number,
	sy: number,
	gx: number,
	gy: number,
	mode: 'land' | 'water'
): { x: number; y: number }[] | null {
	const mask = mode === 'water' ? waterMask : landMask
	const sc = colOf(sx)
	const sr = rowOf(sy)
	let gc = colOf(gx)
	let gr = rowOf(gy)
	const start = sr * COLS + sc
	let goal = gr * COLS + gc

	// If start is blocked (unit somehow inside terrain), bail. The slide-out
	// logic in game-loop handles this case separately.
	if (!mask[start]) return null

	// If goal is blocked, find the closest passable neighbour to the goal
	// within a small radius. Avoids spending an A* run just to discover we
	// can't reach exactly *into* a wall.
	if (!mask[goal]) {
		const found = findNearestPassable(gc, gr, mask)
		if (!found) return null
		gc = found.col
		gr = found.row
		goal = gr * COLS + gc
	}

	if (start === goal) return [{ x: gx, y: gy }]

	const came = new Map<number, number>()
	const gScore = new Map<number, number>()
	gScore.set(start, 0)
	const open = new FHeap()
	open.push(start, octile(sc, sr, gc, gr))
	const closed = new Uint8Array(COLS * ROWS)

	let iterations = 0
	const MAX_ITER = 4000 // cap on heavy maps; almost always returns much sooner

	while (open.size() > 0 && iterations < MAX_ITER) {
		iterations++
		const current = open.pop()
		if (current === goal) {
			return reconstruct(came, current, gx, gy)
		}
		if (closed[current]) continue
		closed[current] = 1
		const ccol = current % COLS
		const crow = (current - ccol) / COLS
		const currentG = gScore.get(current) ?? 0
		for (const [dc, dr, cost] of NEIGHBOURS) {
			const ncol = ccol + dc
			const nrow = crow + dr
			if (ncol < 0 || ncol >= COLS || nrow < 0 || nrow >= ROWS) continue
			const ni = nrow * COLS + ncol
			if (!mask[ni]) continue
			// Diagonal moves require both orthogonal neighbours to also be
			// passable — otherwise we'd cut through a 1-tile-wide gap diagonally.
			if (dc !== 0 && dr !== 0) {
				if (!mask[crow * COLS + ncol] || !mask[nrow * COLS + ccol]) continue
			}
			if (closed[ni]) continue
			const tentative = currentG + cost
			const prev = gScore.get(ni)
			if (prev !== undefined && tentative >= prev) continue
			gScore.set(ni, tentative)
			came.set(ni, current)
			const f = tentative + octile(ncol, nrow, gc, gr)
			open.push(ni, f)
		}
	}
	return null
}

function findNearestPassable(
	gc: number,
	gr: number,
	mask: Uint8Array
): { col: number; row: number } | null {
	for (let radius = 1; radius <= 6; radius++) {
		for (let dr = -radius; dr <= radius; dr++) {
			for (let dc = -radius; dc <= radius; dc++) {
				if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue
				const ncol = gc + dc
				const nrow = gr + dr
				if (ncol < 0 || ncol >= COLS || nrow < 0 || nrow >= ROWS) continue
				if (mask[nrow * COLS + ncol]) return { col: ncol, row: nrow }
			}
		}
	}
	return null
}

function reconstruct(
	came: Map<number, number>,
	end: number,
	gx: number,
	gy: number
): { x: number; y: number }[] {
	const cells: number[] = []
	let cur: number | undefined = end
	while (cur !== undefined) {
		cells.push(cur)
		cur = came.get(cur)
	}
	cells.reverse()
	// Skip the first cell (start) — the caller already knows where the unit
	// is. Convert remaining cells to page-space waypoints at tile centres.
	// Replace the last waypoint with the actual goal point for smoother
	// arrival (saves a small detour).
	const out: { x: number; y: number }[] = []
	for (let i = 1; i < cells.length; i++) {
		const c = cells[i]
		const col = c % COLS
		const row = (c - col) / COLS
		out.push({ x: tileCenterX(col), y: tileCenterY(row) })
	}
	if (out.length > 0) {
		out[out.length - 1] = { x: gx, y: gy }
	} else {
		out.push({ x: gx, y: gy })
	}
	return smoothPath(out)
}

/** Line-of-sight smoothing: any waypoint we can walk straight to from the
 * previous accepted waypoint can be skipped. Avoids the corridor-snake
 * effect of raw grid output. */
function smoothPath(path: { x: number; y: number }[]): { x: number; y: number }[] {
	if (path.length <= 2) return path
	const out: { x: number; y: number }[] = []
	let anchorIdx = 0
	let anchor = path[0]
	for (let i = 1; i < path.length; i++) {
		const next = path[i]
		if (i + 1 < path.length && hasStraightWalk(anchor.x, anchor.y, path[i + 1].x, path[i + 1].y)) {
			// Skip the current point — the anchor can see past it.
			continue
		}
		out.push(next)
		anchor = next
		anchorIdx = i
	}
	void anchorIdx
	return out
}

/** Cheap segment-vs-blocking-tiles test. Steps in CELL_SIZE/4 increments and
 * samples landMask at each step. False positives are fine (we'll just keep
 * the extra waypoint); false negatives would clip through walls so we err
 * on the safe side by stepping fine. */
function hasStraightWalk(x0: number, y0: number, x1: number, y1: number): boolean {
	const dx = x1 - x0
	const dy = y1 - y0
	const dist = Math.hypot(dx, dy)
	const step = CELL_SIZE / 4
	const n = Math.ceil(dist / step)
	for (let s = 1; s <= n; s++) {
		const t = s / n
		const x = x0 + dx * t
		const y = y0 + dy * t
		const col = Math.floor((x - MAP_BOUNDS.minX) / CELL_SIZE)
		const row = Math.floor((y - MAP_BOUNDS.minY) / CELL_SIZE)
		if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false
		if (!landMask[row * COLS + col]) return false
	}
	return true
}
