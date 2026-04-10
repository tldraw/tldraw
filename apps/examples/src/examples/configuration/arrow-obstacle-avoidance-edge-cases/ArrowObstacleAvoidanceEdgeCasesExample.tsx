import React, { useCallback, useRef, useState } from 'react'
import {
	ArrowShapeUtil,
	Box,
	createShapeId,
	Editor,
	ElbowArrowRouterContext,
	ElbowArrowRouterResult,
	Mat,
	TLEditorComponents,
	TLShapeId,
	Tldraw,
	track,
	useEditor,
	Vec,
	VecLike,
} from 'tldraw'
import 'tldraw/tldraw.css'

// ---------------------------------------------------------------------------
// Obstacle avoidance router (same implementation as main example)
// ---------------------------------------------------------------------------

const NON_OBSTACLE_TYPES = new Set(['arrow', 'group', 'draw', 'highlight', 'line'])
const TARGET_CELL_SIZE = 20
const TURN_PENALTY = 200

function getEdgePoint(from: { original: Box }, toward: { original: Box }): Vec {
	const box = from.original
	const other = toward.original
	const dx = other.center.x - box.center.x
	const dy = other.center.y - box.center.y

	if (Math.abs(dx) > Math.abs(dy)) {
		return dx > 0
			? new Vec(box.maxX, box.center.y)
			: new Vec(box.minX, box.center.y)
	} else {
		return dy > 0
			? new Vec(box.center.x, box.maxY)
			: new Vec(box.center.x, box.minY)
	}
}

function obstacleAvoidanceRouter(ctx: ElbowArrowRouterContext): ElbowArrowRouterResult | null {
	if (ctx.arrow.props.elbowMidPoint !== 0.5) return null

	const padding = ctx.info.options.avoidObstaclesPadding
	const { editor, arrow, info } = ctx
	const bindings = ctx.bindings

	const start = getEdgePoint(info.A, info.B)
	const end = getEdgePoint(info.B, info.A)

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

	const regionMinX = Math.min(start.x, end.x)
	const regionMaxX = Math.max(start.x, end.x)
	const regionMinY = Math.min(start.y, end.y)
	const regionMaxY = Math.max(start.y, end.y)
	let hasObstacleInRegion = false
	for (const obs of obstacles) {
		if (obs.maxX > regionMinX && obs.minX < regionMaxX && obs.maxY > regionMinY && obs.minY < regionMaxY) {
			hasObstacleInRegion = true
			break
		}
	}
	if (!hasObstacleInRegion) return null

	const allObs = [...obstacles]
	if (bindings.start) {
		const b = getBoundBox(editor, bindings.start.toId, pageToArrow)
		if (b) allObs.push(b.expandBy(padding))
	}
	if (bindings.end) {
		const b = getBoundBox(editor, bindings.end.toId, pageToArrow)
		if (b) allObs.push(b.expandBy(padding))
	}

	const path = gridAStar(allObs, start, end)
	if (!path || path.length < 2) return null

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

	const open: { idx: number; pri: number }[] = [{ idx: startState, pri: fScore[startState] }]

	const DC = [1, 0, -1, 0]
	const DR = [0, 1, 0, -1]
	const MOVE_DIR = [0, 1, 0, 1]

	while (open.length > 0) {
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

const CustomArrowShapeUtil = ArrowShapeUtil.configure({
	elbowRouter: obstacleAvoidanceRouter,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _nextId = 0
function nextId(prefix = 'edge-case') {
	return createShapeId(`${prefix}-${_nextId++}`)
}

function createArrowBetween(editor: Editor, startId: TLShapeId, endId: TLShapeId) {
	const startBounds = editor.getShapePageBounds(startId)
	const endBounds = editor.getShapePageBounds(endId)
	if (!startBounds || !endBounds) return

	const arrowId = nextId('arrow')
	const pos = Vec.Min(startBounds.center, endBounds.center)

	editor.createShape({
		id: arrowId,
		type: 'arrow',
		x: pos.x,
		y: pos.y,
		props: {
			kind: 'elbow',
			start: { x: 0, y: 0 },
			end: { x: 10, y: 10 },
		},
	})
	editor.createBindings([
		{
			fromId: arrowId,
			toId: startId,
			type: 'arrow',
			props: {
				terminal: 'start' as const,
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
				snap: 'center' as const,
			},
		},
		{
			fromId: arrowId,
			toId: endId,
			type: 'arrow',
			props: {
				terminal: 'end' as const,
				normalizedAnchor: { x: 0.5, y: 0.5 },
				isExact: false,
				isPrecise: false,
				snap: 'center' as const,
			},
		},
	])
	return arrowId
}

// ---------------------------------------------------------------------------
// Scenario builders — each creates a specific edge case at a given offset
// ---------------------------------------------------------------------------

type Scenario = {
	name: string
	description: string
	build: (editor: Editor, ox: number, oy: number) => void
}

const SCENARIOS: Scenario[] = [
	{
		name: 'Narrow gap',
		description:
			'Obstacle between shapes with only a 10px gap. Grid cells are 20px — can the path fit?',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obstacle = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 100, h: 80, geo: 'rectangle' } },
				{
					id: obstacle,
					type: 'geo',
					x: ox + 110,
					y: oy - 20,
					props: { w: 80, h: 120, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 200, y: oy, props: { w: 100, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Touching shapes',
		description: 'Obstacle directly touching both source and target (0px gap).',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obstacle = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 100, h: 80, geo: 'rectangle' } },
				{
					id: obstacle,
					type: 'geo',
					x: ox + 100,
					y: oy,
					props: { w: 100, h: 80, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 200, y: oy, props: { w: 100, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Overlapping shapes',
		description: 'Source and target overlap each other with obstacle between.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obstacle = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 120, h: 80, geo: 'rectangle' } },
				{
					id: obstacle,
					type: 'geo',
					x: ox + 80,
					y: oy + 10,
					props: { w: 60, h: 60, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 100, y: oy, props: { w: 120, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Horizontally aligned',
		description: 'Three shapes perfectly aligned on Y axis — tests horizontal routing preference.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obs1 = nextId()
			const obs2 = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
				{
					id: obs1,
					type: 'geo',
					x: ox + 140,
					y: oy,
					props: { w: 80, h: 80, geo: 'rectangle' },
				},
				{
					id: obs2,
					type: 'geo',
					x: ox + 280,
					y: oy,
					props: { w: 80, h: 80, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 420, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Vertically aligned',
		description: 'Shapes stacked vertically — tests vertical routing preference.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obs = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 60, geo: 'rectangle' } },
				{
					id: obs,
					type: 'geo',
					x: ox,
					y: oy + 100,
					props: { w: 80, h: 60, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox, y: oy + 200, props: { w: 80, h: 60, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Enclosed target',
		description: 'Target is surrounded by obstacles on all sides. Should gracefully fallback.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			// Walls around target
			const top = nextId()
			const bottom = nextId()
			const left = nextId()
			const right = nextId()
			const cx = ox + 250
			const cy = oy + 40
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy + 20, props: { w: 80, h: 60, geo: 'rectangle' } },
				{ id: b, type: 'geo', x: cx, y: cy, props: { w: 60, h: 60, geo: 'rectangle' } },
				// Walls
				{
					id: top,
					type: 'geo',
					x: cx - 20,
					y: cy - 40,
					props: { w: 100, h: 20, geo: 'rectangle' },
				},
				{
					id: bottom,
					type: 'geo',
					x: cx - 20,
					y: cy + 80,
					props: { w: 100, h: 20, geo: 'rectangle' },
				},
				{
					id: left,
					type: 'geo',
					x: cx - 40,
					y: cy - 20,
					props: { w: 20, h: 120, geo: 'rectangle' },
				},
				{
					id: right,
					type: 'geo',
					x: cx + 80,
					y: cy - 20,
					props: { w: 20, h: 120, geo: 'rectangle' },
				},
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Non-rectangular shapes',
		description: 'Circle and diamond obstacles — tests AABB over-padding.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const circle = nextId()
			const diamond = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
				{
					id: circle,
					type: 'geo',
					x: ox + 140,
					y: oy - 10,
					props: { w: 100, h: 100, geo: 'ellipse' },
				},
				{
					id: diamond,
					type: 'geo',
					x: ox + 300,
					y: oy - 10,
					props: { w: 100, h: 100, geo: 'diamond' },
				},
				{ id: b, type: 'geo', x: ox + 460, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Multiple arrows same pair',
		description: 'Two arrows between the same shapes — tests if paths overlap or separate.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obs = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
				{
					id: obs,
					type: 'geo',
					x: ox + 140,
					y: oy,
					props: { w: 80, h: 80, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 280, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Chain A -> B -> C',
		description: 'Arrow chain through intermediate shapes. Moving B should reroute both arrows.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const c = nextId()
			const obs = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 60, geo: 'rectangle' } },
				{ id: b, type: 'geo', x: ox + 200, y: oy, props: { w: 80, h: 60, geo: 'rectangle' } },
				{ id: c, type: 'geo', x: ox + 400, y: oy, props: { w: 80, h: 60, geo: 'rectangle' } },
				{
					id: obs,
					type: 'geo',
					x: ox + 100,
					y: oy + 80,
					props: { w: 200, h: 40, geo: 'rectangle' },
				},
			])
			createArrowBetween(editor, a, b)
			createArrowBetween(editor, b, c)
		},
	},
	{
		name: 'Large obstacle',
		description: 'One very large obstacle between two small shapes.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const big = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy + 80, props: { w: 60, h: 40, geo: 'rectangle' } },
				{
					id: big,
					type: 'geo',
					x: ox + 100,
					y: oy,
					props: { w: 200, h: 200, geo: 'rectangle' },
				},
				{
					id: b,
					type: 'geo',
					x: ox + 340,
					y: oy + 80,
					props: { w: 60, h: 40, geo: 'rectangle' },
				},
			])
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'Maze-like dense',
		description: 'Many small obstacles forming a maze — stress test for A* pathfinding.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const shapes: Parameters<Editor['createShapes']>[0] = [
				{ id: a, type: 'geo', x: ox, y: oy + 60, props: { w: 50, h: 40, geo: 'rectangle' } },
				{
					id: b,
					type: 'geo',
					x: ox + 400,
					y: oy + 60,
					props: { w: 50, h: 40, geo: 'rectangle' },
				},
			]
			// Create a grid of small obstacles with gaps
			for (let row = 0; row < 3; row++) {
				for (let col = 0; col < 5; col++) {
					// Leave some gaps for pathfinding
					if ((row + col) % 2 === 0) continue
					shapes.push({
						id: nextId(),
						type: 'geo',
						x: ox + 80 + col * 60,
						y: oy + row * 55,
						props: { w: 40, h: 35, geo: 'rectangle' },
					})
				}
			}
			editor.createShapes(shapes)
			createArrowBetween(editor, a, b)
		},
	},
	{
		name: 'With vs without avoidance',
		description: 'Same layout, one arrow with avoidance ON and one OFF for comparison.',
		build(editor, ox, oy) {
			const a = nextId()
			const b = nextId()
			const obs = nextId()
			editor.createShapes([
				{ id: a, type: 'geo', x: ox, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
				{
					id: obs,
					type: 'geo',
					x: ox + 140,
					y: oy,
					props: { w: 80, h: 80, geo: 'rectangle' },
				},
				{ id: b, type: 'geo', x: ox + 280, y: oy, props: { w: 80, h: 80, geo: 'rectangle' } },
			])
			createArrowBetween(editor, a, b)
			createArrowBetween(editor, a, b)
		},
	},
]

// ---------------------------------------------------------------------------
// Grid overlay (reused from main example)
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
		shapeBounds.push({
			minX: bounds.minX,
			minY: bounds.minY,
			maxX: bounds.maxX,
			maxY: bounds.maxY,
		})
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
// Controls
// ---------------------------------------------------------------------------

function Controls({
	onLoadScenario,
	showGrid,
	setShowGrid,
}: {
	onLoadScenario: (index: number | 'all') => void
	showGrid: boolean
	setShowGrid: (v: boolean) => void
}) {
	const editor = useEditor()

	return (
		<div
			style={{
				position: 'absolute',
				top: 60,
				left: 10,
				zIndex: 1000,
				display: 'flex',
				flexDirection: 'column',
				gap: 6,
				maxHeight: 'calc(100vh - 80px)',
				overflowY: 'auto',
				background: 'white',
				borderRadius: 8,
				padding: 8,
				boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
				fontSize: 12,
				width: 220,
			}}
		>
			<div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>Edge cases</div>
			<label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
				<input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
				Show debug grid
			</label>
			<hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #eee' }} />
			<button onClick={() => onLoadScenario('all')} style={{ ...btnStyle, fontWeight: 'bold' }}>
				Load all scenarios
			</button>
			{SCENARIOS.map((s, i) => (
				<button key={i} onClick={() => onLoadScenario(i)} style={btnStyle} title={s.description}>
					{s.name}
				</button>
			))}
		</div>
	)
}

const btnStyle: React.CSSProperties = {
	padding: '4px 8px',
	fontSize: 11,
	cursor: 'pointer',
	textAlign: 'left',
	border: '1px solid #ddd',
	borderRadius: 4,
	background: '#fafafa',
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export default function ArrowObstacleAvoidanceEdgeCasesExample() {
	const editorRef = useRef<Editor | null>(null)
	const [showGrid, setShowGrid] = useState(true)

	const handleMount = useCallback((editor: Editor) => {
		editorRef.current = editor
		// Default new arrows to elbow kind
		editor.sideEffects.registerBeforeCreateHandler('shape', (shape) => {
			if (shape.type === 'arrow') {
				return {
					...shape,
					props: { ...shape.props, kind: 'elbow' },
				}
			}
			return shape
		})
	}, [])

	const loadScenario = useCallback((index: number | 'all') => {
		const editor = editorRef.current
		if (!editor) return
		// Clear existing shapes
		const ids = Array.from(editor.getCurrentPageShapeIds())
		if (ids.length > 0) editor.deleteShapes(ids)
		_nextId = 0

		if (index === 'all') {
			// Layout all scenarios in a grid, 3 per row
			const cols = 3
			const spacingX = 600
			const spacingY = 350
			SCENARIOS.forEach((s, i) => {
				const col = i % cols
				const row = Math.floor(i / cols)
				s.build(editor, col * spacingX + 40, row * spacingY + 40)
			})
			editor.zoomToFit({ animation: { duration: 300 } })
		} else {
			SCENARIOS[index].build(editor, 100, 100)
			editor.zoomToFit({ animation: { duration: 300 } })
		}
	}, [])

	const components: TLEditorComponents = {
		OnTheCanvas: showGrid ? GridOverlay : undefined,
	}

	return (
		<div className="tldraw__editor">
			<Tldraw onMount={handleMount} components={components} shapeUtils={[CustomArrowShapeUtil]}>
				<Controls onLoadScenario={loadScenario} showGrid={showGrid} setShowGrid={setShowGrid} />
			</Tldraw>
		</div>
	)
}
