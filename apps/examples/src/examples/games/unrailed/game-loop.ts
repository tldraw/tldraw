import { Editor, TLDrawShape, TLShape } from 'tldraw'
import {
	BLOCK_RADIUS,
	BRIDGE_COST_IRON,
	CHOP_RADIUS,
	CONNECT_RADIUS,
	CRAFT_MS,
	CRAFT_YIELD_TILES,
	DEADZONE_X,
	DEADZONE_Y,
	LOOKAHEAD_COLS,
	OBSTACLE_CHANCE,
	RIVER_FIRST_COL,
	RIVER_INTERVAL,
	RIVER_WIDTH,
	ROWS,
	SAFE_COLS,
	TILE,
	TRAIN_BASE_SPEED,
	TRAIN_SPEED_RAMP,
	TREE_RATIO,
} from './constants'
import { obstacleMaxHp, publish, tileKey, world } from './game-state'
import { appendPath, pathHead, PathPoint, samplePath } from './path'
import { adoptAsTrack } from './rails'

function dist(a: PathPoint, b: PathPoint) {
	return Math.hypot(b.x - a.x, b.y - a.y)
}

// --- Terrain ------------------------------------------------------------------

function isRiverCol(col: number) {
	if (col < RIVER_FIRST_COL) return false
	return (col - RIVER_FIRST_COL) % RIVER_INTERVAL < RIVER_WIDTH
}

function ensureTerrain() {
	const target = Math.ceil(world.trainS / TILE) + LOOKAHEAD_COLS
	for (let col = world.generatedToCol + 1; col <= target; col++) {
		if (isRiverCol(col)) {
			// A river spans the whole band; it must be bridged to cross.
			for (let row = 0; row < ROWS; row++) world.water.set(tileKey(col, row), { col, row })
		} else if (col >= SAFE_COLS) {
			for (let row = 0; row < ROWS; row++) {
				if (Math.random() > OBSTACLE_CHANCE) continue
				const kind = Math.random() < TREE_RATIO ? 'tree' : 'rock'
				world.obstacles.set(tileKey(col, row), {
					col,
					row,
					kind,
					hp: 1,
					maxHp: obstacleMaxHp(kind),
				})
			}
		}
		world.generatedToCol = col
	}
}

// --- Drawing: turn finished strokes into track or chops ------------------------

function getPagePoints(editor: Editor, shape: TLShape): PathPoint[] {
	const geo = editor.getShapeGeometry(shape)
	const transform = editor.getShapePageTransform(shape.id)
	return transform.applyToPoints(geo.vertices).map((v) => ({ x: v.x, y: v.y }))
}

function polyLength(pts: PathPoint[]) {
	let len = 0
	for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i])
	return len
}

// Does the polyline pass too close to an uncleared obstacle or unbridged water?
function crossesBlocked(pts: PathPoint[]): boolean {
	for (const p of pts) {
		const col = Math.floor(p.x / TILE)
		const row = Math.floor(p.y / TILE)
		const key = tileKey(col, row)
		if (world.obstacles.has(key)) {
			const o = world.obstacles.get(key)!
			if (dist(p, { x: (o.col + 0.5) * TILE, y: (o.row + 0.5) * TILE }) < BLOCK_RADIUS) return true
		}
		if (world.water.has(key) && !world.bridged.has(key)) return true
	}
	return false
}

// Clear every obstacle the stroke passes over; return how many were cleared.
function chopAlong(pts: PathPoint[]): number {
	let cleared = 0
	for (const p of pts) {
		const col = Math.floor(p.x / TILE)
		const row = Math.floor(p.y / TILE)
		const key = tileKey(col, row)
		const o = world.obstacles.get(key)
		if (!o) continue
		if (dist(p, { x: (o.col + 0.5) * TILE, y: (o.row + 0.5) * TILE }) > CHOP_RADIUS) continue
		world.obstacles.delete(key)
		if (o.kind === 'tree') world.wood += 1
		else world.iron += 1
		cleared++
	}
	return cleared
}

function reject(editor: Editor, shape: TLShape, at: PathPoint) {
	editor.deleteShape(shape.id)
	world.flash = { x: at.x, y: at.y, until: world.elapsedMs + 450 }
}

function processStroke(editor: Editor, shape: TLDrawShape) {
	const pts = getPagePoints(editor, shape)
	if (pts.length < 2) {
		editor.deleteShape(shape.id)
		return
	}
	const head = pathHead(world.path)
	const dStart = dist(pts[0], head)
	const dEnd = dist(pts[pts.length - 1], head)

	if (Math.min(dStart, dEnd) > CONNECT_RADIUS) {
		// Not connected to the track head → it's a chop gesture.
		chopAlong(pts)
		editor.deleteShape(shape.id)
		return
	}

	// Track: orient so the stroke runs head → forward, and translate the whole
	// shape so it joins the head exactly (closing any small gap).
	const oriented = dEnd < dStart ? pts.slice().reverse() : pts
	const off = { x: head.x - oriented[0].x, y: head.y - oriented[0].y }
	const poly = oriented.map((p) => ({ x: p.x + off.x, y: p.y + off.y }))

	if (crossesBlocked(poly)) return reject(editor, shape, poly[Math.floor(poly.length / 2)])
	const len = polyLength(poly)
	if (len > world.budget * TILE + 1) return reject(editor, shape, head)

	world.budget -= len / TILE
	appendPath(world.path, poly)
	editor.updateShape({ id: shape.id, type: 'draw', x: shape.x + off.x, y: shape.y + off.y })
	adoptAsTrack(editor, shape.id)
}

function processBridge(editor: Editor, shape: TLShape) {
	const bounds = editor.getShapePageBounds(shape.id)
	if (!bounds) {
		editor.deleteShape(shape.id)
		return
	}
	// Which water tiles does this rectangle cover?
	const covered: string[] = []
	for (const w of world.water.values()) {
		const tx = w.col * TILE
		const ty = w.row * TILE
		const overlaps =
			bounds.minX < tx + TILE && bounds.maxX > tx && bounds.minY < ty + TILE && bounds.maxY > ty
		if (overlaps) covered.push(tileKey(w.col, w.row))
	}
	if (covered.length === 0 || world.iron < BRIDGE_COST_IRON) {
		return reject(editor, shape, bounds.center)
	}
	world.iron -= BRIDGE_COST_IRON
	for (const key of covered) world.bridged.add(key)
	editor.updateShape({
		id: shape.id,
		type: 'geo',
		isLocked: true,
		meta: { unrailed: 'bridge' },
		props: { color: 'orange', fill: 'solid', dash: 'solid' },
	})
	// Resume drawing track.
	world.tool = 'draw'
	editor.setCurrentTool('draw')
}

function processNewShapes(editor: Editor) {
	editor.run(
		() => {
			for (const shape of editor.getCurrentPageShapes()) {
				if (shape.meta?.unrailed) continue
				if (shape.type === 'draw' && (shape as TLDrawShape).props.isComplete) {
					processStroke(editor, shape as TLDrawShape)
				} else if (shape.type === 'geo') {
					processBridge(editor, shape)
				}
			}
		},
		{ history: 'ignore', ignoreShapeLock: true }
	)
}

// --- Train + economy ----------------------------------------------------------

function craft(dtMs: number) {
	world.craftT += dtMs
	if (world.craftT < CRAFT_MS) return
	world.craftT -= CRAFT_MS
	if (world.wood >= 1 && world.iron >= 1) {
		world.wood -= 1
		world.iron -= 1
		world.budget += CRAFT_YIELD_TILES
	}
}

function moveTrain(dt: number) {
	const speedPx = (TRAIN_BASE_SPEED + (world.trainS / TILE) * TRAIN_SPEED_RAMP) * TILE
	const next = world.trainS + speedPx * dt
	if (next >= world.path.length) {
		world.trainS = world.path.length
		world.gameOver = true
	} else {
		world.trainS = next
	}
}

function updateCamera(editor: Editor) {
	// Hold the camera still while drawing so strokes don't smear.
	if (world.pointerDown) return
	const front = samplePath(world.path, world.trainS)
	const vp = editor.getViewportPageBounds()
	const ix = vp.width * DEADZONE_X
	const iy = vp.height * DEADZONE_Y
	let dx = 0
	let dy = 0
	if (front.x > vp.maxX - ix) dx = front.x - (vp.maxX - ix)
	else if (front.x < vp.minX + ix) dx = front.x - (vp.minX + ix)
	if (front.y > vp.maxY - iy) dy = front.y - (vp.maxY - iy)
	else if (front.y < vp.minY + iy) dy = front.y - (vp.minY + iy)
	if (dx || dy) {
		const cam = editor.getCamera()
		editor.setCamera({ x: cam.x - dx, y: cam.y - dy, z: cam.z })
	}
}

export function runGameTick(editor: Editor, dtMs: number) {
	if (world.gameOver) {
		publish()
		return
	}
	world.elapsedMs += dtMs

	ensureTerrain()
	if (world.pendingScan) {
		processNewShapes(editor)
		world.pendingScan = false
	}
	craft(dtMs)
	moveTrain(dtMs / 1000)
	updateCamera(editor)

	if (world.flash && world.elapsedMs > world.flash.until) world.flash = null

	publish()
}
