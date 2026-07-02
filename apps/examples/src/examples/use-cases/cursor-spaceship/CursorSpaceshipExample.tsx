import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Atom, Editor, TLComponents, Tldraw, Vec, VecLike, atom, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import {
	SPAWN,
	SUN_KILL_RADIUS,
	SUN_RADIUS,
	asteroidShape,
	beltInBounds,
	driftAt,
	fuelCellsInBounds,
	gravityAt,
	hitsBelt,
	spaceSeed,
	starsInBounds,
} from './space'
import './cursor-spaceship.css'

// [1] Tuning, in world units.
// Fuel drains with thrust — how hard you steer beyond the free orbital drift each
// tick — plus a small idle burn. Coast with the current and you barely sip fuel;
// fight it, chase it, or throw quick turns and the engines gulp. Refill by scooping
// fuel cells; run dry and the engines die, steering cuts out, and the sun takes you.
const FUEL_MAX = 100
const FUEL_DRAIN_IDLE = 0.04
const FUEL_DRAIN_THRUST = 0.012
const THRUST_CAP = 50
const FUEL_PER_CELL = 34
const COLLECT_RADIUS = 22
const FUEL_RESPAWN_MS = 8000
// When the engines die the ship coasts on its momentum and gravity reels it in,
// plus a gentle constant sink so even a far-out stall still decays. MAX_COAST caps
// the velocity carried into the fall so a flick at zero fuel can't fling the wreck.
const STALL_SINK = 0.8
const MAX_COAST = 8

// Ships are cursors, so flying into another player's cursor is a collision: the
// clearly faster ship wins the joust and the slower one is destroyed. A fresh
// spawn gets a brief moment of grace so it can't be instantly re-rammed.
const COLLISION_RADIUS = 24
const VELOCITY_MARGIN = 6
const INVULN_MS = 1500

// Score — points for fuel scooped and ships rammed; a kill is worth ten cells, so
// hunting rivals pays. Each score spawns a "+N" pop that floats up and fades.
const FUEL_POINTS = 10
const KILL_POINTS = 100
const KILL_COOLDOWN_MS = 1500
const SCORE_SYNC_MS = 1500
const FLOAT_LIFE_MS = 900
const FLOAT_RISE = 34
const FUEL_FLOAT_COLOR = '#8ef0c0'
const KILL_FLOAT_COLOR = '#ffd24a'

// Cursor trail (engine exhaust): a laser-style ribbon behind every ship in its
// own color. Tapers to nothing at the tail so the fade is geometric.
const TRAIL_FADE_MS = 2500
const TRAIL_WIDTH = 9
const TRAIL_ALPHA = 0.8
// Low-pass the trail's source and sample it coarsely, so your own trail is as
// smooth and sparse as the throttled ones you see for everyone else — not a jagged
// point-per-frame record of every twitch.
const MIN_TRAIL_DIST = 6
const TRAIL_SMOOTH = 0.4
// A jump bigger than any real move is a respawn teleport: break the trail and burst
// a crash there. Every client sees the same teleport, so everyone sees the crash —
// no extra state synced.
const TRAIL_BREAK_DIST = 240
const CRASH_SPARKS = 18
const CRASH_LIFE_MS = 700
const CRASH_SPEED = 4
const CRASH_FLASH_MS = 320

/** A player's best life, stored in the synced document's meta, keyed by user id. */
interface Score {
	userId: string
	name: string
	color: string
	score: number
	at: number
}

/** A transient "+N" score pop, in screen space, floating up and fading. */
interface FloatPop {
	sx: number
	sy: number
	text: string
	color: string
	t: number
}

interface Game {
	/** Seed for the shared asteroid belt and starfield. */
	seed: number
	/** The ship's position in world space — always the world point under the cursor. */
	ship: Atom<Vec>
	/** False until the player clicks Launch. */
	engaged: Atom<boolean>
	/** How many times this ship has been lost. */
	deaths: Atom<number>
	/** Remaining fuel, 0..FUEL_MAX. */
	fuel: Atom<number>
	/** Points for the current run (fuel + kills); resets to 0 on death. */
	score: Atom<number>
	/** Transient "+N" score pops, spawned on fuel/kills and drained by the renderer. */
	floats: FloatPop[]
	/** Fuel cells taken by any ship (observed from the synced cursors) → the time each
	 * respawns, so the whole room shares one competitive supply. */
	collected: Map<string, number>
}

function createGame(roomId: string): Game {
	return {
		seed: spaceSeed(roomId),
		ship: atom('ship', SPAWN.clone()),
		engaged: atom('engaged', false),
		deaths: atom('deaths', 0),
		fuel: atom('fuel', FUEL_MAX),
		score: atom('score', 0),
		floats: [],
		collected: new Map(),
	}
}

export default function CursorSpaceshipExample({ roomId }: { roomId: string }) {
	const [game] = useState(() => createGame(roomId))

	// [2] Connect to a sync room. tldraw syncs every ship's cursor for free, and
	// because we pin the ship under the cursor, your synced cursor IS your world
	// position — so as the current sweeps you around the sun, everyone else sees
	// your ship orbiting.
	const store = useSyncDemo({ roomId })

	// [3] The sun, starfield, and belt are drawn behind everything on the
	// Background layer; the ships are the cursors themselves.
	const components = useMemo<TLComponents>(
		() => ({ Background: () => <SpaceField game={game} /> }),
		[game]
	)

	const onMount = useCallback((editor: Editor) => {
		// Lock the camera so only the game moves it, and switch off wheel zoom.
		editor.setCameraOptions({ isLocked: true, wheelBehavior: 'none' })
	}, [])

	return (
		<div className="tldraw__editor cursor-spaceship" onContextMenu={(e) => e.preventDefault()}>
			<Tldraw
				store={store}
				hideUi
				components={components}
				options={{ createTextOnCanvasDoubleClick: false }}
				onMount={onMount}
			>
				<GameRunner game={game} />
				<CursorTrails game={game} />
				<FuelGauge game={game} />
				<ScoreHud game={game} />
				<Scoreboard />
				<LaunchCard game={game} />
			</Tldraw>
		</div>
	)
}

function GameRunner({ game }: { game: Game }) {
	const editor = useEditor()

	useEffect(() => {
		// The first engaged frame only slides the world so the fixed spawn sits under
		// the cursor, so launching doesn't yank the ship across space.
		let attached = false
		const killCooldown = new Map<string, number>()
		let lastScoreSync = 0
		let invulnUntil = 0
		let fallVel = new Vec(0, 0)
		const collabTrack = new Map<string, { x: number; y: number; speed: number }>()

		const onTick = () => {
			const now = Date.now()

			// Before launch, frame the sun in the middle of the viewport (done here,
			// not in onMount, so the viewport has been measured).
			if (!game.engaged.get()) {
				const viewport = editor.getViewportScreenBounds()
				editor.setCamera(
					{ x: viewport.w / 2, y: viewport.h / 2, z: 1 },
					{ force: true, immediate: true }
				)
				return
			}

			const cam = editor.getCamera()
			const z = cam.z
			const screen = editor.inputs.getCurrentScreenPoint()
			const from = game.ship.get()

			if (!attached) {
				attached = true
				editor.setCamera(
					{ x: screen.x / z - from.x, y: screen.y / z - from.y, z },
					{ force: true, immediate: true }
				)
				return
			}

			const drift = driftAt(from.x, from.y)
			let next: Vec
			if (game.fuel.get() <= 0) {
				// Out of fuel: engines dead and steering does nothing. The ship coasts on the
				// momentum it had when they cut out while the sun’s gravity accelerates it
				// inward — a decaying fall, not a dead stop or a straight-in beeline. It stays
				// pinned under the cursor, so re-pinning scrolls the star in to swallow you.
				const d = Math.hypot(from.x, from.y) || 0.001
				const grav = gravityAt(from.x, from.y)
				fallVel = new Vec(fallVel.x + grav.x, fallVel.y + grav.y)
				next = new Vec(
					from.x + fallVel.x - (from.x / d) * STALL_SINK,
					from.y + fallVel.y - (from.y / d) * STALL_SINK
				)
			} else {
				// Normal flight: steer to the world point under the cursor, plus the
				// current + gravity drift. Burn a little fuel and scoop up any cell we
				// pass. Re-pinning the ship under the cursor makes the camera absorb the
				// drift, so it scrolls from the orbit and from gravity — never from the
				// cursor nearing a screen edge.
				const underCursor = new Vec(screen.x / z - cam.x, screen.y / z - cam.y)
				next = new Vec(underCursor.x + drift.x, underCursor.y + drift.y)
				// Thrust: how far we steered beyond the free drift this tick, capped so a
				// wild cursor jump can't empty the tank in one frame.
				const thrust = Math.min(
					THRUST_CAP,
					Math.hypot(underCursor.x - from.x, underCursor.y - from.y)
				)
				game.fuel.set(Math.max(0, game.fuel.get() - FUEL_DRAIN_IDLE - FUEL_DRAIN_THRUST * thrust))
				collectFuel(game, editor, next)
				// Remember the velocity we’re carrying, so if the engines cut out we coast on
				// it instead of stopping dead; clamp it so a flick at zero fuel stays graceful.
				const move = new Vec(next.x - from.x, next.y - from.y)
				fallVel = new Vec(fallVel.x * 0.5 + move.x * 0.5, fallVel.y * 0.5 + move.y * 0.5)
				const coastSp = Math.hypot(fallVel.x, fallVel.y)
				if (coastSp > MAX_COAST)
					fallVel = new Vec((fallVel.x / coastSp) * MAX_COAST, (fallVel.y / coastSp) * MAX_COAST)
			}

			// Ram physics: your cursor is your ship, so flying into another player's cursor
			// is a collision. Whoever is clearly faster wins the joust: ram someone slower
			// and you score a kill; get caught slower than an incoming ship and you're lost.
			const mySpeed = Math.hypot(next.x - from.x, next.y - from.y)
			let rammed = false
			for (const c of editor.getCollaborators()) {
				if (!c.cursor) continue
				const prev = collabTrack.get(c.userId)
				const inst = prev ? Math.hypot(c.cursor.x - prev.x, c.cursor.y - prev.y) : 0
				const speed = prev ? prev.speed * 0.8 + inst * 0.2 : 0
				collabTrack.set(c.userId, { x: c.cursor.x, y: c.cursor.y, speed })
				if (Math.hypot(next.x - c.cursor.x, next.y - c.cursor.y) >= COLLISION_RADIUS) continue
				if (speed > mySpeed + VELOCITY_MARGIN) {
					if (now > invulnUntil) rammed = true
				} else if (mySpeed > speed + VELOCITY_MARGIN) {
					// I win the joust — score a kill, but only once per victim per pass.
					const cd = killCooldown.get(c.userId)
					if (!cd || now > cd) {
						killCooldown.set(c.userId, now + KILL_COOLDOWN_MS)
						game.score.set(game.score.get() + KILL_POINTS)
						pushFloat(game, editor, next, `+${KILL_POINTS}`, KILL_FLOAT_COLOR)
					}
				}
			}

			// Touch the sun or the belt, or lose a joust, and you're gone — respawn with a
			// full tank and a brief moment of grace.
			if (
				rammed ||
				Math.hypot(next.x, next.y) < SUN_KILL_RADIUS ||
				hitsBelt(next.x, next.y, game.seed)
			) {
				if (game.score.get() > 0) recordScore(editor, game.score.get())
				game.score.set(0)
				respawn(game)
				fallVel = new Vec(0, 0)
				invulnUntil = now + INVULN_MS
				attached = false
				return
			}

			// Push the score to the room scoreboard now and then (throttled).
			if (game.score.get() > 0 && now - lastScoreSync > SCORE_SYNC_MS) {
				lastScoreSync = now
				recordScore(editor, game.score.get())
			}

			editor.setCamera(
				{ x: screen.x / z - next.x, y: screen.y / z - next.y, z },
				{ force: true, immediate: true }
			)
			game.ship.set(next)
		}

		editor.on('tick', onTick)
		return () => {
			editor.off('tick', onTick)
		}
	}, [editor, game])

	return null
}

/** Refuel from any fuel cell the ship reaches. Because every ship's cursor is synced,
 * a cell another ship reaches counts as taken too — so the whole room competes for
 * the same fuel, and only the ship nearest a cell banks it. */
function collectFuel(game: Game, editor: Editor, ship: Vec) {
	const now = Date.now()
	const collaborators = editor.getCollaborators()

	// A cell my ship is over: bank it if no other ship is closer, then mark it taken
	// so it's gone for everyone.
	for (const cell of fuelCellsInBounds(
		ship.x - COLLECT_RADIUS,
		ship.y - COLLECT_RADIUS,
		ship.x + COLLECT_RADIUS,
		ship.y + COLLECT_RADIUS,
		game.seed
	)) {
		const respawnAt = game.collected.get(cell.key)
		if (respawnAt && now < respawnAt) continue
		const myDist = Math.hypot(ship.x - cell.x, ship.y - cell.y)
		if (myDist >= COLLECT_RADIUS) continue
		let nearest = true
		for (const c of collaborators) {
			if (c.cursor && Math.hypot(c.cursor.x - cell.x, c.cursor.y - cell.y) < myDist) {
				nearest = false
				break
			}
		}
		if (nearest) {
			game.fuel.set(Math.min(FUEL_MAX, game.fuel.get() + FUEL_PER_CELL))
			game.score.set(game.score.get() + FUEL_POINTS)
			pushFloat(game, editor, cell, `+${FUEL_POINTS}`, FUEL_FLOAT_COLOR)
		}
		game.collected.set(cell.key, now + FUEL_RESPAWN_MS)
	}

	// A cell another ship reaches vanishes for me too — that's the competition.
	for (const c of collaborators) {
		if (!c.cursor) continue
		for (const cell of fuelCellsInBounds(
			c.cursor.x - COLLECT_RADIUS,
			c.cursor.y - COLLECT_RADIUS,
			c.cursor.x + COLLECT_RADIUS,
			c.cursor.y + COLLECT_RADIUS,
			game.seed
		)) {
			const respawnAt = game.collected.get(cell.key)
			if (respawnAt && now < respawnAt) continue
			if (Math.hypot(c.cursor.x - cell.x, c.cursor.y - cell.y) < COLLECT_RADIUS) {
				game.collected.set(cell.key, now + FUEL_RESPAWN_MS)
			}
		}
	}
}

/** Reset the ship to the ring with a full tank after a death. */
function respawn(game: Game) {
	game.ship.set(SPAWN.clone())
	game.fuel.set(FUEL_MAX)
	game.deaths.set(game.deaths.get() + 1)
}

/** Record this life on the room scoreboard if it beats the player's best. Scores live
 * in the synced document's meta, so they persist for the room and everyone sees them. */
function recordScore(editor: Editor, score: number) {
	const userId = editor.user.getExternalId()
	const doc = editor.getDocumentSettings()
	// meta is a loose JsonObject; cast past the Score interface at the boundary.
	const scores = (doc.meta.scores ?? {}) as unknown as Record<string, Score>
	const best = scores[userId]
	if (best && best.score >= score) return
	const nextScores = {
		...scores,
		[userId]: {
			userId,
			// The people menu is hidden, so give nameless pilots a stable call sign.
			name: editor.user.getName() || callSign(userId),
			color: editor.user.getColor(),
			score,
			at: Date.now(),
		},
	}
	editor.updateDocumentSettings({
		meta: { ...doc.meta, scores: nextScores } as unknown as (typeof doc)['meta'],
	})
}

/** Spawn a "+N" score pop at a world point — captured in screen space so it floats
 * straight up regardless of where the camera then scrolls. */
function pushFloat(game: Game, editor: Editor, at: VecLike, text: string, color: string) {
	const p = editor.pageToViewport(at)
	game.floats.push({ sx: p.x, sy: p.y, text, color, t: Date.now() })
}

const CALLSIGN_ADJECTIVES = ['Cosmic', 'Rogue', 'Solar', 'Astro', 'Lunar', 'Stellar', 'Ion', 'Nova']
const CALLSIGN_NOUNS = [
	'Comet',
	'Nomad',
	'Ranger',
	'Drifter',
	'Voyager',
	'Falcon',
	'Pilot',
	'Orbit',
]

/** A stable "Adjective Noun" call sign derived from a user id. */
function callSign(userId: string) {
	let h = 0
	for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0
	h = Math.abs(h)
	return `${CALLSIGN_ADJECTIVES[h % CALLSIGN_ADJECTIVES.length]} ${CALLSIGN_NOUNS[(h >> 3) % CALLSIGN_NOUNS.length]}`
}

/**
 * The sun, starfield, and asteroid belt, drawn behind everything each frame. The
 * belt and stars are generated on the fly from the seed for whatever region is on
 * screen, so they're identical for everyone in the room. Drawing to a canvas in
 * screen space (via pageToViewport) keeps it cheap no matter where you orbit.
 */
function SpaceField({ game }: { game: Game }) {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		const ctx = canvas?.getContext('2d')
		if (!canvas || !ctx) return

		const draw = () => {
			const dpr = window.devicePixelRatio || 1
			const w = canvas.clientWidth
			const h = canvas.clientHeight
			if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
				canvas.width = Math.round(w * dpr)
				canvas.height = Math.round(h * dpr)
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			// The Background layer replaces tldraw's default, so paint deep space here.
			ctx.fillStyle = '#0b1020'
			ctx.fillRect(0, 0, w, h)

			const vp = editor.getViewportPageBounds()
			const z = editor.getZoomLevel()

			// Stars.
			ctx.fillStyle = '#c9d3f0'
			for (const s of starsInBounds(vp.minX, vp.minY, vp.maxX, vp.maxY, game.seed)) {
				const p = editor.pageToViewport(s)
				ctx.globalAlpha = 0.35 + s.size * 0.25
				ctx.beginPath()
				ctx.arc(p.x, p.y, s.size * z, 0, Math.PI * 2)
				ctx.fill()
			}
			ctx.globalAlpha = 1

			// Fuel cells — a green cargo crate each, skipping ones just collected.
			const now = Date.now()
			for (const cell of fuelCellsInBounds(vp.minX, vp.minY, vp.maxX, vp.maxY, game.seed)) {
				const respawnAt = game.collected.get(cell.key)
				if (respawnAt && now < respawnAt) continue
				const p = editor.pageToViewport(cell)
				const s = 10 * z
				// a faint glow so the crate reads against deep space
				const glow = ctx.createRadialGradient(p.x, p.y, s, p.x, p.y, s * 2.8)
				glow.addColorStop(0, 'rgba(90, 230, 160, 0.3)')
				glow.addColorStop(1, 'rgba(90, 230, 160, 0)')
				ctx.fillStyle = glow
				ctx.beginPath()
				ctx.arc(p.x, p.y, s * 2.8, 0, Math.PI * 2)
				ctx.fill()
				// the crate itself, given a slight deterministic tumble
				const spin =
					((Math.abs(Math.round(cell.x) * 73856093 + Math.round(cell.y) * 19349663) % 1000) / 1000 -
						0.5) *
					0.7
				ctx.save()
				ctx.translate(p.x, p.y)
				ctx.rotate(spin)
				const body = ctx.createLinearGradient(-s, -s, s, s)
				body.addColorStop(0, '#5fe6a8')
				body.addColorStop(1, '#1c9463')
				ctx.fillStyle = body
				ctx.fillRect(-s, -s, s * 2, s * 2)
				ctx.lineWidth = Math.max(1, 1.4 * z)
				ctx.strokeStyle = '#0b3a28'
				ctx.strokeRect(-s, -s, s * 2, s * 2)
				// cross-straps + a top highlight to sell the shipping crate
				ctx.strokeStyle = 'rgba(8, 40, 28, 0.5)'
				ctx.lineWidth = Math.max(1, z)
				ctx.beginPath()
				ctx.moveTo(-s, 0)
				ctx.lineTo(s, 0)
				ctx.moveTo(0, -s)
				ctx.lineTo(0, s)
				ctx.stroke()
				ctx.strokeStyle = 'rgba(225, 255, 240, 0.55)'
				ctx.beginPath()
				ctx.moveTo(-s + 1, -s + 1)
				ctx.lineTo(s - 1, -s + 1)
				ctx.stroke()
				ctx.restore()
			}

			// Belt asteroids — a jagged, sharp-edged rock each, dark and menacing.
			for (const rock of beltInBounds(vp.minX, vp.minY, vp.maxX, vp.maxY, game.seed)) {
				const p = editor.pageToViewport(rock)
				const r = rock.r * z
				const shape = asteroidShape(rock, 9)
				ctx.beginPath()
				for (let i = 0; i < shape.length; i++) {
					const vx = p.x + shape[i].x * r
					const vy = p.y + shape[i].y * r
					if (i === 0) ctx.moveTo(vx, vy)
					else ctx.lineTo(vx, vy)
				}
				ctx.closePath()
				const grad = ctx.createRadialGradient(p.x - r * 0.4, p.y - r * 0.4, r * 0.1, p.x, p.y, r)
				grad.addColorStop(0, '#6b7285')
				grad.addColorStop(1, '#282d3b')
				ctx.fillStyle = grad
				ctx.fill()
				ctx.lineWidth = Math.max(1, z)
				ctx.strokeStyle = '#0f121b'
				ctx.stroke()
			}

			// The sun at the world origin: a hot core with a wide glow.
			const sun = editor.pageToViewport({ x: 0, y: 0 })
			const sr = SUN_RADIUS * z
			const glow = ctx.createRadialGradient(sun.x, sun.y, sr * 0.2, sun.x, sun.y, sr * 3.2)
			glow.addColorStop(0, 'rgba(255, 240, 200, 0.9)')
			glow.addColorStop(0.28, 'rgba(255, 176, 80, 0.5)')
			glow.addColorStop(1, 'rgba(255, 140, 40, 0)')
			ctx.fillStyle = glow
			ctx.beginPath()
			ctx.arc(sun.x, sun.y, sr * 3.2, 0, Math.PI * 2)
			ctx.fill()
			const core = ctx.createRadialGradient(
				sun.x - sr * 0.3,
				sun.y - sr * 0.3,
				sr * 0.1,
				sun.x,
				sun.y,
				sr
			)
			core.addColorStop(0, '#fffdf5')
			core.addColorStop(1, '#ffb54a')
			ctx.fillStyle = core
			ctx.beginPath()
			ctx.arc(sun.x, sun.y, sr, 0, Math.PI * 2)
			ctx.fill()
		}

		editor.on('tick', draw)
		draw()
		return () => {
			editor.off('tick', draw)
		}
	}, [editor, game])

	return <canvas ref={canvasRef} className="cursor-spaceship__field" />
}

/**
 * A tapering engine-exhaust trail behind every ship, each in that player's own
 * color: your own position plus every collaborator's synced cursor. Nothing here is
 * synced — it's derived entirely from the cursor positions tldraw already gives us.
 * The source is low-passed and sampled coarsely, so a trail is smooth and matches
 * the throttled resolution everyone else's does, and each trail is one filled ribbon
 * that narrows to a point at its tail (a single fill, so a self-crossing loop stays
 * solid). A ship vanishing (a respawn teleport) breaks its trail and bursts a crash
 * of debris there — and because that teleport is visible to everyone, so is the crash.
 */
function CursorTrails({ game }: { game: Game }) {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		const ctx = canvas?.getContext('2d')
		if (!canvas || !ctx) return

		// Recent points per player (newest last) in page space, plus the color, a
		// low-passed source position (sm), and the last raw reading (to spot a
		// collaborator's respawn teleport).
		const trails = new Map<
			string,
			{
				color: string
				points: { x: number; y: number; t: number }[]
				sm: Vec
				lastRaw: Vec
			}
		>()
		// Crash debris and flash rings, in world space, spawned wherever a ship
		// vanishes — so every client renders the same burst with nothing synced.
		let sparks: { x: number; y: number; vx: number; vy: number; t: number; color: string }[] = []
		let flashes: { x: number; y: number; t: number; color: string }[] = []
		let lastDeaths = game.deaths.get()

		const draw = () => {
			const now = Date.now()
			const z = editor.getZoomLevel()

			const dpr = window.devicePixelRatio || 1
			const w = canvas.clientWidth
			const h = canvas.clientHeight
			if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
				canvas.width = Math.round(w * dpr)
				canvas.height = Math.round(h * dpr)
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			ctx.clearRect(0, 0, w, h)

			// Every ship: yourself once you've launched, and every collaborator.
			const localId = editor.user.getExternalId()
			const samples: { userId: string; point: VecLike; color: string }[] = []
			if (game.engaged.get()) {
				samples.push({ userId: localId, point: game.ship.get(), color: editor.user.getColor() })
			}
			for (const c of editor.getCollaborators()) {
				if (c.cursor) samples.push({ userId: c.userId, point: c.cursor, color: c.color })
			}

			// Your own death is exact — the death counter ticked; a collaborator's is
			// inferred from their cursor jumping farther than any real move could.
			const deaths = game.deaths.get()
			const localDied = deaths !== lastDeaths
			lastDeaths = deaths

			for (const { userId, point, color } of samples) {
				const trail = trails.get(userId) ?? {
					color,
					points: [],
					sm: new Vec(point.x, point.y),
					lastRaw: new Vec(point.x, point.y),
				}
				trail.color = color

				const teleported =
					userId === localId
						? localDied
						: Math.hypot(point.x - trail.lastRaw.x, point.y - trail.lastRaw.y) > TRAIL_BREAK_DIST
				trail.lastRaw = new Vec(point.x, point.y)

				if (teleported) {
					// Burst a crash where the trail ended, then cut it and re-seat the
					// smoother at the respawn point so no line bridges the gap.
					const tail = trail.points[trail.points.length - 1]
					if (tail) {
						flashes.push({ x: tail.x, y: tail.y, t: now, color })
						for (let i = 0; i < CRASH_SPARKS; i++) {
							const ang = (i / CRASH_SPARKS) * Math.PI * 2 + Math.random() * 0.5
							const sp = CRASH_SPEED * (0.4 + Math.random())
							sparks.push({
								x: tail.x,
								y: tail.y,
								vx: Math.cos(ang) * sp,
								vy: Math.sin(ang) * sp,
								t: now,
								color,
							})
						}
					}
					trail.points = []
					trail.sm = new Vec(point.x, point.y)
				}

				// Low-pass the source, then sample it coarsely: a smooth, sparse trail
				// rather than a jagged point-per-frame one.
				trail.sm = new Vec(
					trail.sm.x + (point.x - trail.sm.x) * TRAIL_SMOOTH,
					trail.sm.y + (point.y - trail.sm.y) * TRAIL_SMOOTH
				)
				const last = trail.points[trail.points.length - 1]
				if (!last || Math.hypot(trail.sm.x - last.x, trail.sm.y - last.y) > MIN_TRAIL_DIST) {
					trail.points.push({ x: trail.sm.x, y: trail.sm.y, t: now })
				}
				trails.set(userId, trail)
			}

			ctx.globalAlpha = TRAIL_ALPHA
			for (const [userId, trail] of trails) {
				trail.points = trail.points.filter((p) => now - p.t < TRAIL_FADE_MS)
				if (trail.points.length < 2) {
					if (trail.points.length === 0) trails.delete(userId)
					continue
				}
				const spine = trail.points.map((p) => {
					const v = editor.pageToViewport(p)
					return { x: v.x, y: v.y, half: (TRAIL_WIDTH / 2) * (1 - (now - p.t) / TRAIL_FADE_MS) }
				})
				const edges = spine.map((sv, i) => {
					const a = spine[Math.max(0, i - 1)]
					const b = spine[Math.min(spine.length - 1, i + 1)]
					let nx = a.y - b.y
					let ny = b.x - a.x
					const len = Math.hypot(nx, ny) || 1
					nx = (nx / len) * sv.half
					ny = (ny / len) * sv.half
					return { lx: sv.x + nx, ly: sv.y + ny, rx: sv.x - nx, ry: sv.y - ny }
				})
				ctx.fillStyle = trail.color
				ctx.beginPath()
				for (const sv of spine) {
					ctx.moveTo(sv.x + sv.half, sv.y)
					ctx.arc(sv.x, sv.y, sv.half, 0, Math.PI * 2, true)
				}
				for (let i = 1; i < edges.length; i++) {
					const p = edges[i - 1]
					const q = edges[i]
					ctx.moveTo(p.lx, p.ly)
					ctx.lineTo(q.lx, q.ly)
					ctx.lineTo(q.rx, q.ry)
					ctx.lineTo(p.rx, p.ry)
					ctx.closePath()
				}
				ctx.fill()
			}
			ctx.globalAlpha = 1

			// Crash flash: a quick white ring punching outward. Drop the dead ones first, so
			// a long-delayed frame (a backgrounded tab resuming) never draws a stale ring.
			flashes = flashes.filter((f) => now - f.t < CRASH_FLASH_MS)
			for (const f of flashes) {
				const age = (now - f.t) / CRASH_FLASH_MS
				const p = editor.pageToViewport(f)
				ctx.globalAlpha = Math.max(0, 1 - age) * 0.7
				ctx.strokeStyle = '#ffffff'
				ctx.lineWidth = 2 * z
				ctx.beginPath()
				ctx.arc(p.x, p.y, (6 + 42 * age) * z, 0, Math.PI * 2)
				ctx.stroke()
			}

			// Crash debris: colored sparks flung out, slowing and fading. Drop the dead ones
			// first, so `life` stays positive and the arc radius never goes negative.
			sparks = sparks.filter((sp) => now - sp.t < CRASH_LIFE_MS)
			for (const sp of sparks) {
				sp.x += sp.vx
				sp.y += sp.vy
				sp.vx *= 0.9
				sp.vy *= 0.9
				const life = 1 - (now - sp.t) / CRASH_LIFE_MS
				const p = editor.pageToViewport(sp)
				ctx.globalAlpha = Math.max(0, life)
				ctx.fillStyle = sp.color
				ctx.beginPath()
				ctx.arc(p.x, p.y, (1 + 3 * life) * z, 0, Math.PI * 2)
				ctx.fill()
			}
			ctx.globalAlpha = 1

			// Score pops: "+N" text floating up and fading where you scored.
			game.floats = game.floats.filter((f) => now - f.t < FLOAT_LIFE_MS)
			ctx.textAlign = 'center'
			ctx.textBaseline = 'middle'
			ctx.font = `600 ${15 * z}px system-ui, sans-serif`
			ctx.lineWidth = 3 * z
			ctx.strokeStyle = 'rgba(6, 10, 22, 0.75)'
			for (const f of game.floats) {
				const age = (now - f.t) / FLOAT_LIFE_MS
				const py = f.sy - age * FLOAT_RISE
				ctx.globalAlpha = Math.max(0, 1 - age)
				ctx.strokeText(f.text, f.sx, py)
				ctx.fillStyle = f.color
				ctx.fillText(f.text, f.sx, py)
			}
			ctx.globalAlpha = 1
		}

		editor.on('tick', draw)
		return () => {
			editor.off('tick', draw)
		}
	}, [editor, game])

	return <canvas ref={canvasRef} className="cursor-spaceship__trails" />
}

function FuelGauge({ game }: { game: Game }) {
	const engaged = useValue('engaged', () => game.engaged.get(), [game])
	const fuel = useValue('fuel', () => game.fuel.get(), [game])
	if (!engaged) return null
	const pct = Math.max(0, Math.min(100, fuel))
	return (
		<div className="cursor-spaceship__fuel">
			<div className="cursor-spaceship__fuel-label">Fuel</div>
			<div className="cursor-spaceship__fuel-track">
				<div
					className="cursor-spaceship__fuel-fill"
					style={{ width: `${pct}%`, background: pct < 25 ? '#ff5a45' : '#5ce39a' }}
				/>
			</div>
		</div>
	)
}

function ScoreHud({ game }: { game: Game }) {
	const engaged = useValue('engaged', () => game.engaged.get(), [game])
	const score = useValue('score', () => game.score.get(), [game])
	if (!engaged) return null
	return (
		<div className="cursor-spaceship__score">
			<span className="cursor-spaceship__score-label">Score</span>
			<span className="cursor-spaceship__score-value">{score.toLocaleString()}</span>
		</div>
	)
}

/** The room's persistent scoreboard, read reactively from the synced document meta. */
function Scoreboard() {
	const editor = useEditor()
	const scores = useValue(
		'scores',
		() => {
			const s = editor.getDocumentSettings().meta.scores as unknown as
				| Record<string, Score>
				| undefined
			if (!s) return []
			return Object.values(s)
				.filter((e) => typeof e.score === 'number')
				.sort((a, b) => b.score - a.score)
		},
		[editor]
	)
	const myId = useValue('myId', () => editor.user.getExternalId(), [editor])
	if (scores.length === 0) return null
	return (
		<div className="cursor-spaceship__scoreboard">
			<div className="cursor-spaceship__scoretitle">Top scores</div>
			{scores.slice(0, 8).map((s, i) => (
				<div key={s.userId} className="cursor-spaceship__scorerow" data-me={s.userId === myId}>
					<span className="cursor-spaceship__rank">{i + 1}</span>
					<span className="cursor-spaceship__scoredot" style={{ background: s.color }} />
					<span className="cursor-spaceship__scorename">{s.name}</span>
					<span className="cursor-spaceship__scoretime">{s.score.toLocaleString()}</span>
				</div>
			))}
		</div>
	)
}

function LaunchCard({ game }: { game: Game }) {
	const engaged = useValue('engaged', () => game.engaged.get(), [game])
	if (engaged) return null
	return (
		<div className="cursor-spaceship__launchcard">
			<button className="cursor-spaceship__launchbtn" onClick={() => game.engaged.set(true)}>
				Launch
			</button>
		</div>
	)
}
