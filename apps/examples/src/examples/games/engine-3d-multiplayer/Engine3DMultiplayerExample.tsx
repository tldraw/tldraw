import { useSyncDemo } from '@tldraw/sync'
import { useEffect, useState } from 'react'
import {
	Box,
	Editor,
	TLDefaultColorStyle,
	TLGeoShape,
	TLShapeId,
	TLShapePartial,
	Tldraw,
	createShapeId,
	uniqueId,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	Column,
	PLAYER_RADIUS,
	Segment,
	castColumns,
	castRay,
	createInput,
	createPlayer,
	peerBillboard,
	rayHitsPoint,
	resetInput,
	updatePlayer,
} from './engine'

// There's a guide at the bottom of this file!

// --- Tunables -------------------------------------------------------------

// The 3D viewport lives in its own *local* editor, so these are that editor's
// page coordinates. (The shared map lives in a separate, synced editor.)
const VIEWPORT = { x: 0, y: 0, w: 640, h: 400 }
const COLUMNS = 80
const COLUMN_W = VIEWPORT.w / COLUMNS
const HEIGHT_K = 26000
// Players are drawn this fraction of a wall's height, standing on the floor, so
// they read as short characters rather than full-height walls.
const PLAYER_VIEW_SCALE = 0.5
const BULLET_DOT_K = 1500 // a bullet's on-screen size in the 3D view = this / depth
const BULLET_DOTS = 48 // pool of 3D bullet sprites

const DAMAGE = 34 // three hits to down a player
const SHOT_RANGE = 800 // page pixels a shot travels
const HIT_RADIUS = PLAYER_RADIUS + 3 // how forgiving aim is
const SHOT_COOLDOWN = 220 // ms between shots
const RESPAWN_MS = 1400
const STALE_MS = 6000 // forget a player whose state hasn't changed for this long

const BODY_R = 9 // map marker radii
const NOSE_R = 4
const BULLET_R = 3 // tiny circle bullets that fly across the shared map

// Player colours are tldraw colour names so the 3D billboard matches the palette.
const PALETTE: TLDefaultColorStyle[] = ['blue', 'red', 'green', 'orange', 'violet', 'light-blue']

// HUD geometry, in the view editor's page coordinates.
const HEALTH = { x: 12, y: 372, w: 160, h: 14 }
const SCORE = { right: 628, y: 12, h: 12, gap: 4, rows: 8 }
const CROSS = { x: VIEWPORT.w / 2, y: VIEWPORT.h / 2 }

// --- Per-player state, carried in each marker shape's meta ----------------

// Every player is one synced ellipse on the map whose meta holds their whole game
// state. Peers read it straight off the shape; no presence or custom messages.
interface PlayerMeta {
	rc: 'player'
	owner: string
	color: TLDefaultColorStyle
	px: number
	py: number
	dirX: number
	dirY: number
	health: number
	hits: number
	// The most recent shot. Peers watch `shot.id` change, then test it against
	// their own position.
	shot: { id: number; ox: number; oy: number; dx: number; dy: number } | null
	// A heartbeat that increments every frame. Peers use it for liveness: it keeps
	// changing even when a player stands still, so only a truly gone player goes stale.
	seq: number
}

// Local-only mutable game state for *this* client.
interface GameState {
	health: number
	hits: number
	color: TLDefaultColorStyle
	shotCounter: number
	lastShot: PlayerMeta['shot']
	lastShotAt: number
	muzzleUntil: number
	damageUntil: number
	respawnAt: number
}

interface Peer {
	owner: string
	px: number
	py: number
	dirX: number
	dirY: number
	health: number
	hits: number
	color: TLDefaultColorStyle
	shot: PlayerMeta['shot']
}

interface ViewIds {
	wallStrips: TLShapeId[]
	spriteStrips: TLShapeId[]
	bulletDots: TLShapeId[]
	frame: TLShapeId
	crossH: TLShapeId
	crossV: TLShapeId
	healthFill: TLShapeId
	scoreRows: TLShapeId[]
}

// Spawn points, in the shared map's page coordinates.
const SPAWNS = [
	{ x: 80, y: 270 },
	{ x: 460, y: 90 },
	{ x: 110, y: 470 },
	{ x: 450, y: 460 },
]

// --- Scene helpers --------------------------------------------------------

function geo(
	id: TLShapeId,
	x: number,
	y: number,
	props: Partial<TLGeoShape['props']>
): TLShapePartial<TLGeoShape> {
	return { id, type: 'geo', x, y, props }
}

function rect(w: number, h: number, color: TLDefaultColorStyle, fill: 'solid' | 'none' = 'solid') {
	return { geo: 'rectangle', w, h, color, fill, dash: 'solid', size: 's' } as Partial<
		TLGeoShape['props']
	>
}

function ellipse(w: number, color: TLDefaultColorStyle) {
	return { geo: 'ellipse', w, h: w, color, fill: 'solid', dash: 'solid', size: 's' } as Partial<
		TLGeoShape['props']
	>
}

function clamp(v: number, lo: number, hi: number) {
	return Math.max(lo, Math.min(hi, v))
}

// A stable 0..2π phase per player, so different players bob out of sync.
function hashPhase(s: string) {
	let h = 0
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
	return (h % 628) / 100
}

function randomFrom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)]
}

// Build the 3D viewport in the *local* view editor: background, wall column
// rectangles, a set of "sprite" rectangles on top for player characters, a pool of
// circle bullet sprites, a frame, a crosshair, a health bar, and scoreboard rows.
function buildViewScene(editor: Editor): ViewIds {
	const create: TLShapePartial<TLGeoShape>[] = []

	// Sky + floor.
	create.push(
		geo(createShapeId(), VIEWPORT.x, VIEWPORT.y, rect(VIEWPORT.w, VIEWPORT.h / 2, 'light-blue')),
		geo(
			createShapeId(),
			VIEWPORT.x,
			VIEWPORT.y + VIEWPORT.h / 2,
			rect(VIEWPORT.w, VIEWPORT.h / 2, 'grey')
		)
	)

	// Wall strips, then sprite strips, then bullet dots on top.
	const wallStrips: TLShapeId[] = []
	const spriteStrips: TLShapeId[] = []
	const bulletDots: TLShapeId[] = []
	for (let i = 0; i < COLUMNS; i++) {
		const id = createShapeId()
		wallStrips.push(id)
		create.push(
			geo(
				id,
				VIEWPORT.x + i * COLUMN_W,
				VIEWPORT.y + VIEWPORT.h / 2,
				rect(COLUMN_W + 1, 2, 'black')
			)
		)
	}
	for (let i = 0; i < COLUMNS; i++) {
		const id = createShapeId()
		spriteStrips.push(id)
		create.push(geo(id, VIEWPORT.x + i * COLUMN_W, -9999, rect(COLUMN_W + 1, 2, 'black')))
	}
	for (let i = 0; i < BULLET_DOTS; i++) {
		const id = createShapeId()
		bulletDots.push(id)
		create.push(geo(id, -9999, -9999, ellipse(6, 'orange')))
	}

	const frame = createShapeId()
	create.push(
		geo(
			frame,
			VIEWPORT.x - 2,
			VIEWPORT.y - 2,
			rect(VIEWPORT.w + 4, VIEWPORT.h + 4, 'black', 'none')
		)
	)

	const crossH = createShapeId()
	const crossV = createShapeId()
	create.push(
		geo(crossH, CROSS.x - 9, CROSS.y - 1, rect(18, 2, 'black')),
		geo(crossV, CROSS.x - 1, CROSS.y - 9, rect(2, 18, 'black'))
	)

	const healthFill = createShapeId()
	create.push(
		geo(createShapeId(), HEALTH.x, HEALTH.y, rect(HEALTH.w, HEALTH.h, 'black')),
		geo(healthFill, HEALTH.x + 2, HEALTH.y + 2, rect(HEALTH.w - 4, HEALTH.h - 4, 'green'))
	)

	const scoreRows: TLShapeId[] = []
	for (let i = 0; i < SCORE.rows; i++) {
		const id = createShapeId()
		scoreRows.push(id)
		create.push(geo(id, SCORE.right, -9999, rect(1, SCORE.h, 'grey')))
	}

	editor.run(() => editor.createShapes(create), { history: 'ignore' })
	return { wallStrips, spriteStrips, bulletDots, frame, crossH, crossV, healthFill, scoreRows }
}

// The shared starter level, created once into the synced map by whoever opens an
// empty room. Everyone else just receives these as ordinary synced shapes.
function buildStarterLevel(editor: Editor) {
	const create: TLShapePartial<TLGeoShape>[] = []
	const wall = (x: number, y: number, w: number, h: number, color: TLDefaultColorStyle) =>
		create.push({ id: createShapeId(), type: 'geo', x, y, props: rect(w, h, color) })
	wall(20, 20, 520, 12, 'black') // top
	wall(20, 508, 520, 12, 'black') // bottom
	wall(20, 20, 12, 500, 'black') // left
	wall(508, 20, 12, 500, 'black') // right
	wall(150, 150, 70, 70, 'blue')
	wall(330, 300, 90, 40, 'green')
	wall(250, 90, 12, 150, 'red')
	wall(360, 120, 60, 60, 'violet')
	editor.createShapes(create)
}

interface ScanResult {
	walls: Segment[]
	players: { owner: string; ids: TLShapeId[]; body: PlayerMeta | null }[]
	bullets: { id: TLShapeId; owner: string; x: number; y: number; color: TLDefaultColorStyle }[]
}

// Single pass over the map: collect wall segments, all player shapes grouped by
// owner, and all bullet positions. Engine-owned shapes are tagged `meta.rc`, so
// untagged geo shapes are walls.
function scanScene(editor: Editor): ScanResult {
	const walls: Segment[] = []
	const bullets: ScanResult['bullets'] = []
	const byOwner = new Map<string, { ids: TLShapeId[]; body: PlayerMeta | null }>()

	for (const shape of editor.getCurrentPageShapes()) {
		if (shape.type !== 'geo') continue
		const meta = shape.meta as unknown as Partial<PlayerMeta> & { rc?: string }
		const props = shape.props as TLGeoShape['props']
		if (meta?.rc === 'player' || meta?.rc === 'player-nose') {
			const owner = String(meta.owner)
			const entry = byOwner.get(owner) ?? { ids: [], body: null }
			entry.ids.push(shape.id)
			if (meta.rc === 'player') entry.body = meta as PlayerMeta
			byOwner.set(owner, entry)
			continue
		}
		if (meta?.rc === 'bullet') {
			bullets.push({
				id: shape.id,
				owner: String(meta.owner),
				x: shape.x + BULLET_R,
				y: shape.y + BULLET_R,
				color: (props.color ?? 'orange') as TLDefaultColorStyle,
			})
			continue
		}
		if (meta?.rc) continue // other engine shapes
		const transform = editor.getShapePageTransform(shape)
		const verts = transform.applyToPoints(editor.getShapeGeometry(shape).boundsVertices)
		if (verts.length < 2) continue
		const color = (props.color ?? 'black') as string
		for (let i = 0; i < verts.length; i++) {
			const a = verts[i]
			const b = verts[(i + 1) % verts.length]
			walls.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, color })
		}
	}

	const players = Array.from(byOwner, ([owner, entry]) => ({
		owner,
		ids: entry.ids,
		body: entry.body,
	}))
	return { walls, players, bullets }
}

// --- React glue -----------------------------------------------------------

export default function Engine3DMultiplayerExample({
	roomId = 'tldraw-3d-shooter',
}: {
	roomId?: string
}) {
	const store = useSyncDemo({ roomId })
	const [mapEditor, setMapEditor] = useState<Editor | null>(null)
	const [viewEditor, setViewEditor] = useState<Editor | null>(null)

	useEffect(() => {
		if (!mapEditor || !viewEditor) return

		// Purge junk left in the room by earlier sessions: stray bullets, plus any
		// LOCKED player shapes (this code never locks shapes, so a locked engine shape
		// is a stale orphan that ordinary pruning can't remove). Force past the lock.
		const junk = mapEditor
			.getCurrentPageShapes()
			.filter((s) => {
				const rc = (s.meta as { rc?: string } | undefined)?.rc
				return rc === 'bullet' || ((rc === 'player' || rc === 'player-nose') && s.isLocked)
			})
			.map((s) => s.id)
		if (junk.length) {
			mapEditor.run(() => mapEditor.deleteShapes(junk), {
				ignoreShapeLock: true,
				history: 'ignore',
			})
		}

		// One client seeds the level into an empty room; the rest receive it via sync.
		if (mapEditor.getCurrentPageShapes().length === 0) buildStarterLevel(mapEditor)
		mapEditor.zoomToBounds(new Box(0, 0, 540, 540), { inset: 24, immediate: true })
		viewEditor.zoomToBounds(new Box(-10, -10, VIEWPORT.w + 20, VIEWPORT.h + 20), {
			inset: 16,
			immediate: true,
		})
		viewEditor.setCameraOptions({ isLocked: true })

		return runGame(mapEditor, viewEditor)
	}, [mapEditor, viewEditor])

	return (
		<div style={{ position: 'absolute', inset: 0, display: 'flex', background: '#101012' }}>
			<div style={{ position: 'relative', flex: '1 1 0', minWidth: 0 }}>
				<Tldraw store={store} onMount={(editor) => setMapEditor(editor)} />
			</div>
			<div
				style={{ position: 'relative', flex: '1 1 0', minWidth: 0, borderLeft: '2px solid #000' }}
			>
				<Tldraw hideUi onMount={(editor) => setViewEditor(editor)} />
			</div>
		</div>
	)
}

// --- The game loop --------------------------------------------------------

function runGame(mapEditor: Editor, viewEditor: Editor) {
	const myId = uniqueId()
	const spawn = randomFrom(SPAWNS)
	const player = createPlayer(spawn.x, spawn.y)
	const input = createInput()
	const shooting = { current: false } // space held = fire on cooldown
	const seenShots = new Map<string, number>() // last resolved shot id per peer
	// Liveness keyed by my own clock: when a peer's state last *changed*. This avoids
	// comparing wall-clock times across machines, which clock skew would break.
	const liveness = new Map<string, { sig: string; last: number }>()
	let clock = 0
	let seq = 0 // heartbeat written into my marker every frame

	const color = randomFrom(PALETTE)
	const game: GameState = {
		health: 100,
		hits: 0,
		color,
		shotCounter: 0,
		lastShot: null,
		lastShotAt: -9999,
		muzzleUntil: 0,
		damageUntil: 0,
		respawnAt: 0,
	}

	const bodyId = createShapeId()
	const noseId = createShapeId()
	// My in-flight bullets (cosmetic tracers; damage is resolved instantly in fire()).
	const bullets: {
		id: TLShapeId
		ox: number
		oy: number
		dx: number
		dy: number
		traveled: number
		maxDist: number
	}[] = []

	function alive() {
		return game.health > 0
	}

	function respawn() {
		const s = randomFrom(SPAWNS)
		player.x = s.x
		player.y = s.y
		game.health = 100
	}

	function spawnBullet(ox: number, oy: number, dx: number, dy: number, maxDist: number) {
		const id = createShapeId()
		bullets.push({ id, ox, oy, dx, dy, traveled: 0, maxDist })
		mapEditor.run(
			() =>
				mapEditor.createShapes([
					{
						id,
						type: 'geo',
						x: ox - BULLET_R,
						y: oy - BULLET_R,
						props: ellipse(BULLET_R * 2, game.color),
						meta: { rc: 'bullet', owner: myId } as any,
					},
				]),
			{ history: 'ignore' }
		)
	}

	function advanceBullets(dt: number) {
		if (!bullets.length) return
		const updates: TLShapePartial<TLGeoShape>[] = []
		const done: TLShapeId[] = []
		for (let i = bullets.length - 1; i >= 0; i--) {
			const b = bullets[i]
			b.traveled += 1.1 * dt
			if (b.traveled >= b.maxDist) {
				done.push(b.id)
				bullets.splice(i, 1)
				continue
			}
			updates.push({
				id: b.id,
				type: 'geo',
				x: b.ox + b.dx * b.traveled - BULLET_R,
				y: b.oy + b.dy * b.traveled - BULLET_R,
			})
		}
		mapEditor.run(
			() => {
				if (updates.length) mapEditor.updateShapes(updates)
				if (done.length) mapEditor.deleteShapes(done)
			},
			{ history: 'ignore' }
		)
	}

	function fire(peers: Peer[], walls: Segment[]) {
		game.lastShotAt = clock
		game.muzzleUntil = clock + 90
		const id = ++game.shotCounter
		game.lastShot = { id, ox: player.x, oy: player.y, dx: player.dirX, dy: player.dirY }
		const wallDist = castRay(player.x, player.y, player.dirX, player.dirY, walls).dist
		let bestT = Infinity
		let hit = false
		for (const p of peers) {
			if (p.health <= 0) continue
			const t = rayHitsPoint(player.x, player.y, player.dirX, player.dirY, p.px, p.py, HIT_RADIUS)
			if (t !== null && t < bestT) {
				bestT = t
				hit = true
			}
		}
		// Stop the bullet tracer at whatever it reaches first: a player, a wall, or range.
		let stopDist = Math.min(SHOT_RANGE, wallDist)
		if (hit && bestT <= SHOT_RANGE && bestT < wallDist) {
			game.hits++
			stopDist = bestT
		}
		spawnBullet(player.x, player.y, player.dirX, player.dirY, stopDist)
	}

	function takeIncomingShots(peers: Peer[], walls: Segment[]) {
		for (const p of peers) {
			const shot = p.shot
			if (!shot) continue
			const last = seenShots.get(p.owner)
			seenShots.set(p.owner, shot.id)
			if (last === undefined || shot.id === last) continue // first sight or already handled
			if (!alive()) continue
			const t = rayHitsPoint(shot.ox, shot.oy, shot.dx, shot.dy, player.x, player.y, HIT_RADIUS)
			if (t === null || t > SHOT_RANGE) continue
			const wallDist = castRay(shot.ox, shot.oy, shot.dx, shot.dy, walls).dist
			if (t >= wallDist) continue // a wall stopped the shot
			game.health -= DAMAGE
			game.damageUntil = clock + 180
			if (game.health <= 0) {
				game.health = 0
				game.respawnAt = clock + RESPAWN_MS
			}
		}
	}

	// Turn the raw player groups into live peers, and collect stale ones to prune.
	function resolvePeers(players: ScanResult['players']): { peers: Peer[]; stale: TLShapeId[] } {
		const peers: Peer[] = []
		const stale: TLShapeId[] = []
		for (const p of players) {
			if (p.owner === myId || !p.body) continue
			const b = p.body
			if (!Number.isFinite(Number(b.px)) || !Number.isFinite(Number(b.py))) continue
			const sig = String(b.seq ?? 0) // heartbeat: changes every frame while connected
			const rec = liveness.get(p.owner)
			if (!rec) {
				liveness.set(p.owner, { sig, last: clock })
			} else if (rec.sig !== sig) {
				rec.sig = sig
				rec.last = clock
			} else if (clock - rec.last > STALE_MS) {
				liveness.delete(p.owner)
				stale.push(...p.ids) // hasn't moved in a long time: treat as gone
				continue
			}
			peers.push({
				owner: p.owner,
				px: Number(b.px),
				py: Number(b.py),
				dirX: Number(b.dirX),
				dirY: Number(b.dirY),
				health: Number(b.health),
				hits: Number(b.hits) || 0,
				color: b.color,
				shot: b.shot ?? null,
			})
		}
		return { peers, stale }
	}

	function writeMyShapes(dead: boolean) {
		seq++
		const body: TLShapePartial<TLGeoShape> = {
			id: bodyId,
			type: 'geo',
			x: player.x - BODY_R,
			y: player.y - BODY_R,
			props: ellipse(BODY_R * 2, dead ? 'grey' : game.color),
			meta: {
				rc: 'player',
				owner: myId,
				color: game.color,
				px: player.x,
				py: player.y,
				dirX: player.dirX,
				dirY: player.dirY,
				health: game.health,
				hits: game.hits,
				shot: game.lastShot,
				seq,
			} as any,
		}
		const nose: TLShapePartial<TLGeoShape> = {
			id: noseId,
			type: 'geo',
			x: player.x + player.dirX * 13 - NOSE_R,
			y: player.y + player.dirY * 13 - NOSE_R,
			props: ellipse(NOSE_R * 2, 'black'),
			meta: { rc: 'player-nose', owner: myId } as any,
		}
		// Recreate if my marker is missing (e.g. a peer pruned it after a network gap);
		// otherwise update. This is the single create/update path for my shapes.
		const exists = !!mapEditor.getShape(bodyId)
		mapEditor.run(
			() => (exists ? mapEditor.updateShapes([body, nose]) : mapEditor.createShapes([body, nose])),
			{ history: 'ignore' }
		)
	}

	// Walls (always) into the base strips; players (when in front of the wall) into
	// the sprite strips on top: shorter, on the floor, rounded, with a bobbing hop.
	function reconcileView(wallCols: Column[], spriteCols: Column[], dead: boolean) {
		const updates: TLShapePartial<TLGeoShape>[] = []
		for (let i = 0; i < COLUMNS; i++) {
			const x = VIEWPORT.x + i * COLUMN_W
			const wc = wallCols[i]
			const h = wc.dist === Infinity ? 2 : clamp(HEIGHT_K / wc.dist, 2, VIEWPORT.h)
			updates.push({
				id: ids.wallStrips[i],
				type: 'geo',
				x,
				y: VIEWPORT.y + (VIEWPORT.h - h) / 2,
				props: {
					w: COLUMN_W + 1,
					h,
					color: (dead ? 'grey' : wc.dist === Infinity ? 'grey' : wc.color) as TLDefaultColorStyle,
				},
			})

			const sc = spriteCols[i]
			const show = !dead && !!sc.peerId && sc.dist < wc.dist
			if (!show) {
				updates.push({
					id: ids.spriteStrips[i],
					type: 'geo',
					x,
					y: -9999,
					props: { w: COLUMN_W + 1, h: 2 },
				})
				continue
			}
			const baseH = clamp(HEIGHT_K / sc.dist, 2, VIEWPORT.h)
			const floorY = VIEWPORT.y + (VIEWPORT.h + baseH) / 2 // bottom of a full slice here
			const u = clamp(sc.u ?? 0.5, 0, 1)
			const profile = Math.sin(u * Math.PI) // rounded: tall in the middle, short at the edges
			const playerH = Math.max(3, baseH * PLAYER_VIEW_SCALE * (0.4 + 0.6 * profile))
			const hop =
				Math.abs(Math.sin(clock * 0.009 + hashPhase(sc.peerId!))) * Math.min(9, baseH * 0.05)
			updates.push({
				id: ids.spriteStrips[i],
				type: 'geo',
				x,
				y: floorY - hop - playerH,
				props: { w: COLUMN_W + 1, h: playerH, color: sc.color as TLDefaultColorStyle },
			})
		}
		viewEditor.run(() => viewEditor.updateShapes(updates), { history: 'ignore' })
	}

	// Project every bullet on the map into the 3D view as a circle that shrinks with
	// distance and is hidden behind walls.
	function renderBulletDots(projectiles: ScanResult['bullets'], wallCols: Column[]) {
		const updates: TLShapePartial<TLGeoShape>[] = []
		const det = player.planeX * player.dirY - player.dirX * player.planeY
		let slot = 0
		if (Math.abs(det) > 1e-9) {
			const invDet = 1 / det
			for (const b of projectiles) {
				if (slot >= BULLET_DOTS) break
				const relX = b.x - player.x
				const relY = b.y - player.y
				const camX = invDet * (player.dirY * relX - player.dirX * relY)
				const depth = invDet * (-player.planeY * relX + player.planeX * relY)
				if (depth <= 1) continue // behind the camera
				const screenX = (VIEWPORT.w / 2) * (1 + camX / depth)
				if (screenX < -10 || screenX > VIEWPORT.w + 10) continue
				const col = clamp(Math.floor(screenX / COLUMN_W), 0, COLUMNS - 1)
				if (wallCols[col].dist < depth) continue // behind a wall
				const size = clamp(BULLET_DOT_K / depth, 2, 28)
				updates.push({
					id: ids.bulletDots[slot],
					type: 'geo',
					x: VIEWPORT.x + screenX - size / 2,
					y: VIEWPORT.y + VIEWPORT.h / 2 - size / 2,
					props: { w: size, h: size, color: b.color },
				})
				slot++
			}
		}
		for (let i = slot; i < BULLET_DOTS; i++) {
			updates.push({ id: ids.bulletDots[i], type: 'geo', x: -9999, y: -9999 })
		}
		viewEditor.run(() => viewEditor.updateShapes(updates), { history: 'ignore' })
	}

	function updateHud(scoreboard: { color: TLDefaultColorStyle; hits: number }[]) {
		const updates: TLShapePartial<TLGeoShape>[] = []
		const hp = clamp(game.health, 0, 100)
		updates.push({
			id: ids.healthFill,
			type: 'geo',
			x: HEALTH.x + 2,
			y: HEALTH.y + 2,
			props: {
				w: Math.max(0.5, (hp / 100) * (HEALTH.w - 4)),
				h: HEALTH.h - 4,
				color: hp > 50 ? 'green' : hp > 25 ? 'orange' : 'red',
			},
		})
		const crossColor: TLDefaultColorStyle = clock < game.muzzleUntil ? 'orange' : 'black'
		updates.push({ id: ids.crossH, type: 'geo', props: { color: crossColor } })
		updates.push({ id: ids.crossV, type: 'geo', props: { color: crossColor } })
		updates.push({
			id: ids.frame,
			type: 'geo',
			props: { color: (clock < game.damageUntil ? 'red' : 'black') as TLDefaultColorStyle },
		})
		for (let i = 0; i < SCORE.rows; i++) {
			const row = scoreboard[i]
			if (!row) {
				updates.push({
					id: ids.scoreRows[i],
					type: 'geo',
					x: SCORE.right,
					y: -9999,
					props: { w: 1 },
				})
				continue
			}
			const w = Math.min(180, 22 + row.hits * 16)
			updates.push({
				id: ids.scoreRows[i],
				type: 'geo',
				x: SCORE.right - w,
				y: SCORE.y + i * (SCORE.h + SCORE.gap),
				props: { w, h: SCORE.h, color: row.color },
			})
		}
		viewEditor.run(() => viewEditor.updateShapes(updates), { history: 'ignore' })
	}

	const runFrame = (elapsedMs: number) => {
		const dt = Math.min(50, elapsedMs)
		clock += elapsedMs

		const { walls, players, bullets: projectiles } = scanScene(mapEditor)
		const { peers, stale } = resolvePeers(players)
		// Reap bullets whose owner is gone (a crashed/closed peer), plus stale players,
		// so nothing transient persists in the room.
		const liveOwners = new Set([myId, ...peers.map((p) => p.owner)])
		const orphanBullets = projectiles.filter((b) => !liveOwners.has(b.owner)).map((b) => b.id)
		const toDelete = [...stale, ...orphanBullets]
		if (toDelete.length) {
			mapEditor.run(() => mapEditor.deleteShapes(toDelete), {
				ignoreShapeLock: true,
				history: 'ignore',
			})
		}

		takeIncomingShots(peers, walls)

		const dead = !alive()
		if (dead) {
			if (clock >= game.respawnAt) respawn()
		} else {
			updatePlayer(player, walls, input, dt)
			if (shooting.current && clock - game.lastShotAt >= SHOT_COOLDOWN) fire(peers, walls)
		}
		advanceBullets(dt)

		const wallCols = castColumns(player, walls, COLUMNS)
		const billboards = peers
			.filter((p) => p.health > 0)
			.map((p) => peerBillboard(player.x, player.y, p.px, p.py, p.color, p.owner))
		reconcileView(wallCols, castColumns(player, billboards, COLUMNS), dead)
		renderBulletDots(projectiles, wallCols)

		writeMyShapes(dead)

		const scoreboard = [
			{ color: game.color, hits: game.hits },
			...peers.map((p) => ({ color: p.color, hits: p.hits })),
		].sort((a, b) => b.hits - a.hits)
		updateHud(scoreboard)
	}

	const onTick = (elapsedMs: number) => {
		try {
			runFrame(elapsedMs)
		} catch (err) {
			// A single bad frame must never freeze the game by killing the tick loop.
			console.error('3D shooter tick error', err)
		}
	}

	// My marker (body + facing nose) is created lazily by writeMyShapes on the first
	// frame, which also recreates it if it ever goes missing — one create/update path.
	const ids = buildViewScene(viewEditor)
	mapEditor.on('tick', onTick)

	// Continuous keyboard state, captured on window so we beat tldraw's shortcuts.
	const onKey = (e: KeyboardEvent, down: boolean) => {
		const target = e.target as HTMLElement | null
		if (target?.matches('input, textarea, [contenteditable="true"]')) return
		let handled = true
		switch (e.code) {
			case 'KeyW':
			case 'ArrowUp':
				input.forward = down
				break
			case 'KeyS':
			case 'ArrowDown':
				input.back = down
				break
			case 'KeyA':
				input.strafeLeft = down
				break
			case 'KeyD':
				input.strafeRight = down
				break
			case 'ArrowLeft':
				input.turnLeft = down
				break
			case 'ArrowRight':
				input.turnRight = down
				break
			case 'Space':
				shooting.current = down
				break
			default:
				handled = false
		}
		if (handled) {
			e.preventDefault()
			e.stopPropagation()
		}
	}
	const onKeyDown = (e: KeyboardEvent) => onKey(e, true)
	const onKeyUp = (e: KeyboardEvent) => onKey(e, false)
	window.addEventListener('keydown', onKeyDown, { capture: true })
	window.addEventListener('keyup', onKeyUp, { capture: true })

	return () => {
		mapEditor.off('tick', onTick)
		window.removeEventListener('keydown', onKeyDown, { capture: true })
		window.removeEventListener('keyup', onKeyUp, { capture: true })
		resetInput(input)
		mapEditor.run(() => mapEditor.deleteShapes([bodyId, noseId, ...bullets.map((b) => b.id)]), {
			history: 'ignore',
		})
		const viewShapes = viewEditor.getCurrentPageShapes().map((s) => s.id)
		viewEditor.run(() => viewEditor.deleteShapes(viewShapes), { history: 'ignore' })
	}
}

/*
This is the multiplayer sibling of the "3D engine made of shapes" example. Everything
on screen — players, bullets, and the HUD — is a tldraw shape; there are no DOM
overlays.

Two stores, on purpose:

- The shared MAP (left) is a synced editor (useSyncDemo). Walls are ordinary geo
  shapes, so drawing/moving/recolouring one is multiplayer for free. Players are also
  shapes here: each client owns one ellipse (plus a small "nose" for facing) whose
  meta carries its whole game state — position, health, hits, and last shot. Peers
  read that straight off the shape, so no presence or custom messages are needed.
  Bullets are tiny circle shapes too. A client prunes a peer whose state hasn't
  changed for a while (measured against its own clock, so clock skew can't misfire),
  which cleans up after someone leaves.

- The 3D VIEW (right) is a separate, *local* editor. Its column rectangles, player
  sprites, bullet dots, and HUD are rewritten every frame inside
  editor.run(fn, { history: 'ignore' }); keeping it local means that churn never
  hits the network.

Rendering: walls fill the base strips. Each peer becomes a billboard (engine.ts
peerBillboard) cast in a second pass and drawn on top of the wall behind it — shorter
than a wall, standing on the floor, rounded, with a bobbing hop, so players read as
characters. Every bullet on the map is projected into the view (Doom-style sprite
transform) as a circle that shrinks with distance and is hidden behind walls.

Shooting: damage is instant (hitscan). When you fire you record the shot in your
shape's meta and send a bullet tracer; each peer notices the new shot id and tests it
against its own position, applying the hit. Both sides run the same maths.

Move with WASD, turn with the arrow keys, shoot with space. Open the example in two
tabs (use "Copy link" to share the room) to play against yourself.
*/
