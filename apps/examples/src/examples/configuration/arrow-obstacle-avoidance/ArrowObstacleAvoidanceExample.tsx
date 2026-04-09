import React from 'react'
import {
	ArrowShapeUtil,
	Box,
	createShapeId,
	Editor,
	ElbowArrowRouterContext,
	ElbowArrowRouterResult,
	Mat,
	TLEditorComponents,
	TLShape,
	Tldraw,
	track,
	useEditor,
	Vec,
	VecLike,
} from 'tldraw'
import 'tldraw/tldraw.css'

// ---------------------------------------------------------------------------
// A simple obstacle avoidance router using the pluggable elbowRouter API.
// This is a minimal A* implementation that routes elbow arrows around shapes.
// ---------------------------------------------------------------------------

const NON_OBSTACLE_TYPES = new Set(['arrow', 'group', 'draw', 'highlight', 'line'])
const TARGET_CELL_SIZE = 20
const TURN_PENALTY = 200

function obstacleAvoidanceRouter(ctx: ElbowArrowRouterContext): ElbowArrowRouterResult | null {
	const baseRoute = ctx.computeDefaultRoute()
	if (!baseRoute || baseRoute.points.length < 2) return null

	// Only reroute if elbowMidPoint is at default (user hasn't dragged the handle).
	if (ctx.arrow.props.elbowMidPoint !== 0.5) return null

	const padding = ctx.info.options.avoidObstaclesPadding
	const { editor, arrow } = ctx
	const bindings = ctx.bindings

	// Gather obstacles (shapes that aren't arrows, groups, etc.)
	const excludeIds = new Set([arrow.id])
	if (bindings.start) excludeIds.add(bindings.start.toId)
	if (bindings.end) excludeIds.add(bindings.end.toId)

	const pageToArrow = editor.getShapePageTransform(arrow.id).clone().invert()
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
		obstacles.push(Mat.applyToBounds(pageToArrow, pageBounds).expandBy(padding))
	}

	if (obstacles.length === 0) return null

	// Check if route actually intersects any obstacle
	let hasIntersection = false
	for (const obs of obstacles) {
		for (let i = 0; i < baseRoute.points.length - 1; i++) {
			if (segmentIntersectsBox(baseRoute.points[i], baseRoute.points[i + 1], obs)) {
				hasIntersection = true
				break
			}
		}
		if (hasIntersection) break
	}
	if (!hasIntersection) return null

	// Build occupancy grid and run A*
	const allObs = [...obstacles]
	// Include bound shapes so the path doesn't go through them
	if (bindings.start) {
		const b = getBoundBox(editor, bindings.start.toId, pageToArrow)
		if (b) allObs.push(b.expandBy(padding))
	}
	if (bindings.end) {
		const b = getBoundBox(editor, bindings.end.toId, pageToArrow)
		if (b) allObs.push(b.expandBy(padding))
	}

	const start = baseRoute.points[0]
	const end = baseRoute.points[baseRoute.points.length - 1]
	const path = gridAStar(allObs, start, end)
	if (!path) return null

	return { points: path, skipGeometryCasting: true }
}

function getBoundBox(editor: Editor, shapeId: string, pageToArrow: Mat): Box | null {
	const shape = editor.getShape(shapeId as any)
	if (!shape) return null
	const props = shape.props as Record<string, unknown>
	const w = typeof props.w === 'number' ? props.w : 0
	const h = typeof props.h === 'number' ? props.h : 0
	if (w === 0 || h === 0) return null
	const pageBounds = Mat.applyToBounds(
		editor.getShapePageTransform(shapeId as any),
		new Box(0, 0, w, h)
	)
	return Mat.applyToBounds(pageToArrow, pageBounds)
}

function gridAStar(obstacles: Box[], start: VecLike, end: VecLike): Vec[] | null {
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
	const margin = Math.max(maxX - minX, maxY - minY) * 0.15
	minX -= margin
	minY -= margin
	maxX += margin
	maxY += margin

	const width = maxX - minX
	const height = maxY - minY
	if (width <= 0 || height <= 0) return null

	const gridCols = Math.max(16, Math.min(64, Math.ceil(width / TARGET_CELL_SIZE)))
	const gridRows = Math.max(16, Math.min(64, Math.ceil(height / TARGET_CELL_SIZE)))
	const cellW = width / gridCols
	const cellH = height / gridRows

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

	// Direction-aware A*
	const NUM_DIRS = 3
	const total = gridCols * gridRows * NUM_DIRS
	const gScore = new Float64Array(total).fill(Infinity)
	const fScore = new Float64Array(total).fill(Infinity)
	const cameFrom = new Int32Array(total).fill(-1)

	const sc = Math.max(0, Math.min(gridCols - 1, Math.floor((start.x - minX) / cellW)))
	const sr = Math.max(0, Math.min(gridRows - 1, Math.floor((start.y - minY) / cellH)))
	const ec = Math.max(0, Math.min(gridCols - 1, Math.floor((end.x - minX) / cellW)))
	const er = Math.max(0, Math.min(gridRows - 1, Math.floor((end.y - minY) / cellH)))
	occupied[sr * gridCols + sc] = 0
	occupied[er * gridCols + ec] = 0

	const idx = (r: number, c: number, d: number) => (r * gridCols + c) * NUM_DIRS + d
	const h = (c: number, r: number) => Math.abs(c - ec) * cellW + Math.abs(r - er) * cellH

	const startState = idx(sr, sc, 2)
	gScore[startState] = 0
	fScore[startState] = h(sc, sr)

	// Simple priority queue (array-based for clarity)
	const open: { idx: number; pri: number }[] = [{ idx: startState, pri: fScore[startState] }]

	const DC = [1, 0, -1, 0]
	const DR = [0, 1, 0, -1]
	const MOVE_DIR = [0, 1, 0, 1]

	while (open.length > 0) {
		// Find min
		let minI = 0
		for (let i = 1; i < open.length; i++) {
			if (open[i].pri < open[minI].pri) minI = i
		}
		const cur = open[minI].idx
		open[minI] = open[open.length - 1]
		open.pop()

		const cd = cur % NUM_DIRS
		const gi = (cur - cd) / NUM_DIRS
		const cr = Math.floor(gi / gridCols)
		const cc = gi % gridCols

		if (cr === er && cc === ec) {
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
			// Prepend start, append end
			path[0] = new Vec(start.x, start.y)
			path[path.length - 1] = new Vec(end.x, end.y)
			return simplify(path)
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
				fScore[ns] = g + h(nc, nr)
				open.push({ idx: ns, pri: fScore[ns] })
			}
		}
	}

	return null
}

function simplify(points: Vec[]): Vec[] {
	const result: Vec[] = [points[0]]
	for (let i = 1; i < points.length; i++) {
		const prev = result[result.length - 1]
		const pprev = result[result.length - 2]
		if (pprev) {
			const sameX = Math.abs(prev.x - points[i].x) < 0.1 && Math.abs(pprev.x - prev.x) < 0.1
			const sameY = Math.abs(prev.y - points[i].y) < 0.1 && Math.abs(pprev.y - prev.y) < 0.1
			if (sameX || sameY) {
				result[result.length - 1] = points[i]
				continue
			}
		}
		result.push(points[i])
	}
	return result
}

function segmentIntersectsBox(p1: VecLike, p2: VecLike, box: Box): boolean {
	const eps = 0.01
	if (Math.abs(p1.y - p2.y) < eps) {
		const y = p1.y
		if (y <= box.minY || y >= box.maxY) return false
		return Math.max(p1.x, p2.x) > box.minX && Math.min(p1.x, p2.x) < box.maxX
	} else {
		const x = p1.x
		if (x <= box.minX || x >= box.maxX) return false
		return Math.max(p1.y, p2.y) > box.minY && Math.min(p1.y, p2.y) < box.maxY
	}
}

// ---------------------------------------------------------------------------
// Configure ArrowShapeUtil with the obstacle avoidance router
// ---------------------------------------------------------------------------

const CustomArrowShapeUtil = ArrowShapeUtil.configure({
	elbowRouter: obstacleAvoidanceRouter,
})

// ---------------------------------------------------------------------------
// Grid overlay
// ---------------------------------------------------------------------------

const PAGE_CELL_SIZE = 20
const GRID_PADDING = 20

const GridOverlay = track(function GridOverlay() {
	const editor = useEditor()
	const shapes = editor
		.getCurrentPageShapes()
		.filter(
			(s) =>
				s.type !== 'arrow' &&
				s.type !== 'group' &&
				s.type !== 'draw' &&
				s.type !== 'highlight' &&
				s.type !== 'line'
		)
	if (shapes.length === 0) return null

	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity
	const shapeBounds: { minX: number; minY: number; maxX: number; maxY: number }[] = []
	for (const shape of shapes) {
		const bounds = editor.getShapePageBounds(shape.id)
		if (!bounds) continue
		shapeBounds.push({ minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY })
		if (bounds.minX < minX) minX = bounds.minX
		if (bounds.minY < minY) minY = bounds.minY
		if (bounds.maxX > maxX) maxX = bounds.maxX
		if (bounds.maxY > maxY) maxY = bounds.maxY
	}
	if (shapeBounds.length === 0) return null

	const margin = Math.max(maxX - minX, maxY - minY) * 0.15
	minX -= margin
	minY -= margin
	maxX += margin
	maxY += margin
	const width = maxX - minX
	const height = maxY - minY
	const gridCols = Math.max(8, Math.min(50, Math.ceil(width / PAGE_CELL_SIZE)))
	const gridRows = Math.max(8, Math.min(50, Math.ceil(height / PAGE_CELL_SIZE)))
	const cellW = width / gridCols
	const cellH = height / gridRows

	const occupied = new Uint8Array(gridCols * gridRows)
	for (const b of shapeBounds) {
		const c0 = Math.max(0, Math.floor((b.minX - GRID_PADDING - minX) / cellW))
		const c1 = Math.min(gridCols - 1, Math.floor((b.maxX + GRID_PADDING - minX) / cellW))
		const r0 = Math.max(0, Math.floor((b.minY - GRID_PADDING - minY) / cellH))
		const r1 = Math.min(gridRows - 1, Math.floor((b.maxY + GRID_PADDING - minY) / cellH))
		for (let r = r0; r <= r1; r++) {
			for (let c = c0; c <= c1; c++) {
				occupied[r * gridCols + c] = 1
			}
		}
	}

	const cells: React.ReactElement[] = []
	for (let row = 0; row < gridRows; row++) {
		for (let col = 0; col < gridCols; col++) {
			const isOccupied = occupied[row * gridCols + col] === 1
			cells.push(
				<rect
					key={`${col}-${row}`}
					x={col * cellW}
					y={row * cellH}
					width={cellW}
					height={cellH}
					fill={isOccupied ? 'rgba(255, 0, 0, 0.12)' : 'transparent'}
					stroke="rgba(0,0,0,0.08)"
					strokeWidth={0.5}
				/>
			)
		}
	}

	return (
		<svg
			style={{
				position: 'absolute',
				left: minX,
				top: minY,
				width,
				height,
				pointerEvents: 'none',
				overflow: 'visible',
			}}
		>
			{cells}
		</svg>
	)
})

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function handleMount(editor: Editor) {
	const leftId = createShapeId('left')
	const middleId = createShapeId('middle')
	const rightId = createShapeId('right')

	editor.createShapes([
		{ id: leftId, type: 'geo', x: 100, y: 200, props: { w: 120, h: 80, geo: 'rectangle' } },
		{ id: middleId, type: 'geo', x: 350, y: 200, props: { w: 120, h: 80, geo: 'rectangle' } },
		{ id: rightId, type: 'geo', x: 600, y: 200, props: { w: 120, h: 80, geo: 'rectangle' } },
	])
}

const components: TLEditorComponents = { OnTheCanvas: GridOverlay }

export default function ArrowObstacleAvoidanceExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} components={components} shapeUtils={[CustomArrowShapeUtil]} />
		</div>
	)
}
