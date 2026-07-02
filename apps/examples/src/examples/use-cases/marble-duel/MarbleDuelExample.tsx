import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Box,
	DefaultColorStyle,
	Editor,
	TLComponents,
	TLGeoShape,
	TLShape,
	TLShapePartial,
	Tldraw,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './marble-duel.css'
import { getObstacles, moveWithBounces } from './physics'

// [1] Tuning, in world units. The arena is a fixed rectangle centered on the origin;
// marbles that leave it (plus a little slack) fall into the void and despawn.
const ARENA_W = 1600
const ARENA_H = 1000
const VOID_PAD = 80

// Emitters can't be aimed — the deploy tilt is the only aim they ever get — so the
// tilt range is what forces the drawing: big enough that a straight shot never
// crosses the middle of the arena, small enough that one good bank lands it.
const EMITTER_R = 32
const HP_MAX = 5
const TILT_MIN = 15
const TILT_MAX = 50

const FIRE_INTERVAL_MS = 1600
const MAX_MARBLES = 8
const MARBLE_R = 9
const MARBLE_SPEED = 380 // per second
const MARBLE_LIFETIME_MS = 12000
// Marbles whose owner disconnected freeze mid-flight; anyone may clear them once
// they're clearly past the lifetime their owner would have enforced.
const STALE_MARBLE_MS = 20000

// Explosion effect timing (local render only — nothing synced).
const FLASH_MS = 350
const SPARK_MS = 800
const SPARK_COUNT = 22

interface EmitterMeta {
	kind: 'emitter'
	owner: string
	dir: number
	hp: number
}

interface MarbleMeta {
	kind: 'marble'
	owner: string
	vx: number
	vy: number
	bornAt: number
}

// Player colors come from the tldraw palette so the marbles (which are real geo
// shapes) match the overlay drawings (which need hex values).
const PLAYER_COLORS = [
	{ name: 'blue', hex: '#4465e9' },
	{ name: 'red', hex: '#e03131' },
	{ name: 'green', hex: '#099268' },
	{ name: 'orange', hex: '#e16919' },
	{ name: 'violet', hex: '#ae3ec9' },
	{ name: 'light-blue', hex: '#4ba1f1' },
	{ name: 'light-green', hex: '#4cb05e' },
	{ name: 'yellow', hex: '#f1ac4b' },
] as const

function colorFor(userId: string) {
	let h = 0
	for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0
	return PLAYER_COLORS[Math.abs(h) % PLAYER_COLORS.length]
}

function isEmitter(shape: TLShape) {
	return shape.meta.kind === 'emitter'
}

function isMarble(shape: TLShape) {
	return shape.meta.kind === 'marble'
}

function outsideArena(x: number, y: number) {
	return Math.abs(x) > ARENA_W / 2 + VOID_PAD || Math.abs(y) > ARENA_H / 2 + VOID_PAD
}

const components: TLComponents = {
	InFrontOfTheCanvas: GameOverlay,
}

export default function MarbleDuelExample({ roomId }: { roomId?: string }) {
	// [2] The whole game syncs through the regular tldraw document: emitters and
	// marbles are real (locked) shapes, and everything players draw is both a
	// drawing and level geometry. No game-specific netcode.
	const store = useSyncDemo({ roomId: roomId ?? 'marble-duel-fallback' })

	const onMount = useCallback((editor: Editor) => {
		// Frame the arena once the viewport has been measured — at mount time it
		// hasn't been, and a zoom now would clamp to the minimum.
		const frameArena = () => {
			if (editor.getViewportScreenBounds().w < 2) return
			editor.zoomToBounds(new Box(-ARENA_W / 2, -ARENA_H / 2, ARENA_W, ARENA_H), {
				inset: 64,
				immediate: true,
			})
			editor.off('tick', frameArena)
		}
		editor.on('tick', frameArena)
	}, [])

	return (
		<div className="tldraw__editor marble-duel">
			<Tldraw store={store} components={components} onMount={onMount}>
				<GameLogic />
				<GameHud />
			</Tldraw>
		</div>
	)
}

/**
 * [3] The simulation. Each client owns its own emitter and marbles: it fires on a
 * cadence, integrates its marbles' motion (bouncing off whatever anyone has drawn),
 * detects its marbles hitting enemy emitters, and applies the damage. Everyone
 * else just watches those shape updates arrive through sync.
 */
function GameLogic() {
	const editor = useEditor()

	useEffect(() => {
		// [4] Your ink is your color. Everything a player draws is created in their
		// player color (and can't be recolored), so every wall on the canvas shows
		// who drew it. Only local mutations are touched — synced shapes arrive with
		// source 'remote' and keep their author's color.
		const myColor = colorFor(editor.user.getExternalId()).name
		editor.setStyleForNextShapes(DefaultColorStyle, myColor)
		const removeBeforeCreate = editor.sideEffects.registerBeforeCreateHandler(
			'shape',
			(shape, source) => {
				if (source !== 'user' || shape.meta.kind) return shape
				if ('color' in shape.props && shape.props.color !== myColor) {
					return { ...shape, props: { ...shape.props, color: myColor } } as typeof shape
				}
				return shape
			}
		)
		const removeBeforeChange = editor.sideEffects.registerBeforeChangeHandler(
			'shape',
			(prev, next, source) => {
				if (source !== 'user' || next.meta.kind) return next
				if (
					'color' in prev.props &&
					'color' in next.props &&
					prev.props.color !== next.props.color
				) {
					return { ...next, props: { ...next.props, color: prev.props.color } } as typeof next
				}
				return next
			}
		)

		let lastFire = 0
		let lastCleanup = 0

		function onTick(elapsed: number) {
			const now = Date.now()
			// Clamp dt so a backgrounded tab resuming doesn't teleport marbles.
			const dt = Math.min(elapsed, 100) / 1000
			const myId = editor.user.getExternalId()
			const shapes = editor.getCurrentPageShapes()
			const emitters = shapes.filter(isEmitter)
			const marbles = shapes.filter(isMarble)
			const myEmitter = emitters.find((s) => s.meta.owner === myId)
			const myMarbles = marbles.filter((s) => s.meta.owner === myId)
			const obstacles = getObstacles(editor)

			// Game mutations skip the undo stack (cmd+z should only undo your
			// drawings) and the shape locks that keep players' hands off the pieces.
			editor.run(
				() => {
					// Fire from the barrel tip, up to the live cap.
					if (myEmitter && now - lastFire >= FIRE_INTERVAL_MS && myMarbles.length < MAX_MARBLES) {
						lastFire = now
						const meta = myEmitter.meta as unknown as EmitterMeta
						const cx = myEmitter.x + EMITTER_R
						const cy = myEmitter.y + EMITTER_R
						const spawnDist = EMITTER_R + MARBLE_R + 8
						editor.createShape<TLGeoShape>({
							type: 'geo',
							x: cx + Math.cos(meta.dir) * spawnDist - MARBLE_R,
							y: cy + Math.sin(meta.dir) * spawnDist - MARBLE_R,
							isLocked: true,
							props: {
								geo: 'ellipse',
								w: MARBLE_R * 2,
								h: MARBLE_R * 2,
								fill: 'solid',
								color: colorFor(myId).name,
							},
							meta: {
								kind: 'marble',
								owner: myId,
								vx: Math.cos(meta.dir) * MARBLE_SPEED,
								vy: Math.sin(meta.dir) * MARBLE_SPEED,
								bornAt: now,
							},
						})
					}

					// Move my marbles.
					for (const marble of myMarbles) {
						const meta = marble.meta as unknown as MarbleMeta
						const cx = marble.x + MARBLE_R
						const cy = marble.y + MARBLE_R
						if (now - meta.bornAt > MARBLE_LIFETIME_MS || outsideArena(cx, cy)) {
							editor.deleteShape(marble.id)
							continue
						}
						const speed = Math.hypot(meta.vx, meta.vy) || MARBLE_SPEED
						const step = moveWithBounces(
							cx,
							cy,
							meta.vx / speed,
							meta.vy / speed,
							speed * dt,
							obstacles
						)

						// A marble touching any emitter but its owner's lands a hit.
						let landed = false
						for (const emitter of emitters) {
							if (emitter.meta.owner === myId) continue
							const ex = emitter.x + EMITTER_R
							const ey = emitter.y + EMITTER_R
							if (Math.hypot(step.x - ex, step.y - ey) < EMITTER_R + MARBLE_R) {
								damageEmitter(editor, emitter)
								editor.deleteShape(marble.id)
								landed = true
								break
							}
						}
						if (landed) continue

						editor.updateShape({
							id: marble.id,
							type: marble.type,
							x: step.x - MARBLE_R,
							y: step.y - MARBLE_R,
							// Only write velocity when it changed — position is the
							// only thing that syncs every tick.
							...(step.bounced
								? { meta: { ...meta, vx: step.dx * speed, vy: step.dy * speed } }
								: null),
						} as TLShapePartial)
					}

					// Sweep up marbles abandoned by disconnected players.
					if (now - lastCleanup > 2000) {
						lastCleanup = now
						for (const marble of marbles) {
							if (
								marble.meta.owner !== myId &&
								now - (marble.meta.bornAt as number) > STALE_MARBLE_MS
							) {
								editor.deleteShape(marble.id)
							}
						}
					}
				},
				{ history: 'ignore', ignoreShapeLock: true }
			)
		}

		editor.on('tick', onTick)
		return () => {
			editor.off('tick', onTick)
			removeBeforeCreate()
			removeBeforeChange()
		}
	}, [editor])

	return null
}

function damageEmitter(editor: Editor, emitter: TLShape) {
	const hp = (emitter.meta.hp as number) - 1
	if (hp <= 0) {
		editor.deleteShape(emitter.id)
	} else {
		editor.updateShape({
			id: emitter.id,
			type: emitter.type,
			meta: { ...emitter.meta, hp },
		} as TLShapePartial)
	}
}

/**
 * [5] Deploying places your emitter on the emptier side of the arena, aimed
 * roughly across it but tilted by a random angle you can never change — banking
 * shots off drawings is the only aim you get.
 */
function deployEmitter(editor: Editor) {
	const myId = editor.user.getExternalId()
	const emitters = editor.getCurrentPageShapes().filter(isEmitter)
	if (emitters.some((s) => s.meta.owner === myId)) return

	const side = emitters.length % 2 === 0 ? -1 : 1
	const x = side * (ARENA_W / 2 - 150)
	let y = 0
	for (let attempt = 0; attempt < 10; attempt++) {
		y = (Math.random() - 0.5) * (ARENA_H - 320)
		if (emitters.every((e) => Math.hypot(e.x + EMITTER_R - x, e.y + EMITTER_R - y) > 220)) break
	}
	const tilt =
		(TILT_MIN + Math.random() * (TILT_MAX - TILT_MIN)) *
		(Math.PI / 180) *
		(Math.random() < 0.5 ? -1 : 1)
	const dir = Math.atan2(-y, -x) + tilt

	editor.run(
		() => {
			editor.createShape<TLGeoShape>({
				type: 'geo',
				x: x - EMITTER_R,
				y: y - EMITTER_R,
				isLocked: true,
				props: {
					geo: 'ellipse',
					w: EMITTER_R * 2,
					h: EMITTER_R * 2,
					fill: 'semi',
					color: colorFor(myId).name,
					size: 'l',
				},
				meta: { kind: 'emitter', owner: myId, dir, hp: HP_MAX } satisfies EmitterMeta,
			})
		},
		{ history: 'ignore' }
	)
}

/**
 * [6] HUD: a deploy card before you're in (and again after you're destroyed),
 * and an HP readout while your emitter is alive — all derived reactively from
 * the synced shapes, so "destroyed" is just "my emitter stopped existing".
 */
function GameHud() {
	const editor = useEditor()
	const myEmitter = useValue(
		'my emitter',
		() => {
			const myId = editor.user.getExternalId()
			return editor.getCurrentPageShapes().find((s) => isEmitter(s) && s.meta.owner === myId)
		},
		[editor]
	)
	const [deployedOnce, setDeployedOnce] = useState(false)
	useEffect(() => {
		if (myEmitter) setDeployedOnce(true)
	}, [myEmitter])

	if (myEmitter) {
		const hp = myEmitter.meta.hp as number
		const hex = colorFor(myEmitter.meta.owner as string).hex
		return (
			<div className="marble-duel__hud marble-duel__chip">
				<span className="marble-duel__chip-label">Your emitter</span>
				{Array.from({ length: HP_MAX }, (_, i) => (
					<span
						key={i}
						className="marble-duel__pip"
						style={{ background: i < hp ? hex : undefined }}
					/>
				))}
			</div>
		)
	}

	return (
		<div className="marble-duel__hud marble-duel__card">
			<div className="marble-duel__title">
				{deployedOnce ? 'Your emitter was destroyed!' : 'Marble duel'}
			</div>
			<p>
				Your emitter fires marbles in a fixed direction — you can never aim it. Draw lines and
				shapes to bank your marbles into the enemy emitter, and to deflect theirs away from yours.
				Anything on the canvas bounces marbles.
			</p>
			<button className="marble-duel__deploy" onClick={() => deployEmitter(editor)}>
				{deployedOnce ? 'Redeploy' : 'Deploy emitter'}
			</button>
		</div>
	)
}

/**
 * [7] The overlay: arena border, turret barrels, HP arcs, and hit/explosion
 * effects — a screen-space canvas redrawn on every tick. Effects are derived by
 * watching the synced shapes change (an emitter losing HP flashes, an emitter
 * vanishing explodes), so every client sees them with nothing extra synced.
 */
function GameOverlay() {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		const ctx = canvas?.getContext('2d')
		if (!canvas || !ctx) return

		const lastSeen = new Map<string, { x: number; y: number; hp: number; hex: string }>()
		let flashes: { x: number; y: number; t: number; hex: string }[] = []
		let sparks: { x: number; y: number; vx: number; vy: number; t: number; hex: string }[] = []

		function explodeAt(x: number, y: number, hex: string, now: number) {
			flashes.push({ x, y, t: now, hex })
			for (let i = 0; i < SPARK_COUNT; i++) {
				const angle = (i / SPARK_COUNT) * Math.PI * 2 + Math.random() * 0.4
				const speed = 3 + Math.random() * 4
				sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, t: now, hex })
			}
		}

		const draw = () => {
			const now = Date.now()
			const dpr = window.devicePixelRatio || 1
			const w = canvas.clientWidth
			const h = canvas.clientHeight
			if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
				canvas.width = Math.round(w * dpr)
				canvas.height = Math.round(h * dpr)
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			ctx.clearRect(0, 0, w, h)

			const z = editor.getZoomLevel()
			const myId = editor.user.getExternalId()

			// Arena border — beyond it, marbles fall into the void.
			const corner = editor.pageToViewport({ x: -ARENA_W / 2, y: -ARENA_H / 2 })
			ctx.setLineDash([10, 10])
			ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
			ctx.lineWidth = Math.max(1, 1.5 * z)
			ctx.strokeRect(corner.x, corner.y, ARENA_W * z, ARENA_H * z)
			ctx.setLineDash([])

			const emitters = editor.getCurrentPageShapes().filter(isEmitter)
			const seen = new Set<string>()

			for (const emitter of emitters) {
				seen.add(emitter.id)
				const meta = emitter.meta as unknown as EmitterMeta
				const hex = colorFor(meta.owner).hex
				const cx = emitter.x + EMITTER_R
				const cy = emitter.y + EMITTER_R
				const p = editor.pageToViewport({ x: cx, y: cy })

				// A dropped HP means someone landed a hit — flash the ring.
				const prev = lastSeen.get(emitter.id)
				if (prev && meta.hp < prev.hp) flashes.push({ x: cx, y: cy, t: now, hex })
				lastSeen.set(emitter.id, { x: cx, y: cy, hp: meta.hp, hex })

				// A stubby barrel showing the fixed firing direction. No aim preview —
				// where a shot ends up is something you learn by watching it bounce.
				const tip = editor.pageToViewport({
					x: cx + Math.cos(meta.dir) * (EMITTER_R + 16),
					y: cy + Math.sin(meta.dir) * (EMITTER_R + 16),
				})
				ctx.strokeStyle = hex
				ctx.lineCap = 'round'
				ctx.lineWidth = 8 * z
				ctx.beginPath()
				ctx.moveTo(p.x, p.y)
				ctx.lineTo(tip.x, tip.y)
				ctx.stroke()

				// Remaining HP as a single thin arc that shrinks as hits land.
				ctx.strokeStyle = hex
				ctx.lineWidth = 3 * z
				ctx.beginPath()
				ctx.arc(
					p.x,
					p.y,
					(EMITTER_R + 8) * z,
					-Math.PI / 2,
					-Math.PI / 2 + (Math.PI * 2 * meta.hp) / HP_MAX
				)
				ctx.stroke()

				if (meta.owner === myId) {
					ctx.fillStyle = hex
					ctx.font = `600 ${12 * z}px system-ui, sans-serif`
					ctx.textAlign = 'center'
					ctx.textBaseline = 'bottom'
					ctx.fillText('YOU', p.x, p.y - (EMITTER_R + 14) * z)
				}
			}

			// An emitter that vanished was destroyed — explode where it stood.
			for (const [id, info] of lastSeen) {
				if (!seen.has(id)) {
					lastSeen.delete(id)
					explodeAt(info.x, info.y, info.hex, now)
				}
			}

			// Hit flashes: a ring punching outward.
			flashes = flashes.filter((f) => now - f.t < FLASH_MS)
			for (const f of flashes) {
				const age = (now - f.t) / FLASH_MS
				const p = editor.pageToViewport(f)
				ctx.globalAlpha = (1 - age) * 0.8
				ctx.strokeStyle = f.hex
				ctx.lineWidth = 3 * z
				ctx.beginPath()
				ctx.arc(p.x, p.y, (EMITTER_R * 0.5 + EMITTER_R * 1.6 * age) * z, 0, Math.PI * 2)
				ctx.stroke()
			}

			// Explosion debris: sparks flung out, slowing and fading.
			sparks = sparks.filter((s) => now - s.t < SPARK_MS)
			for (const s of sparks) {
				s.x += s.vx
				s.y += s.vy
				s.vx *= 0.92
				s.vy *= 0.92
				const life = 1 - (now - s.t) / SPARK_MS
				const p = editor.pageToViewport(s)
				ctx.globalAlpha = Math.max(0, life)
				ctx.fillStyle = s.hex
				ctx.beginPath()
				ctx.arc(p.x, p.y, (1.5 + 3.5 * life) * z, 0, Math.PI * 2)
				ctx.fill()
			}
			ctx.globalAlpha = 1
		}

		editor.on('tick', draw)
		draw()
		return () => {
			editor.off('tick', draw)
		}
	}, [editor])

	return <canvas ref={canvasRef} className="marble-duel__overlay" />
}

/*
[1]
All the game tuning lives here. Distances are in page (world) units; the tick
runs at the editor's tick rate and motion is scaled by elapsed time.

[2]
The entire multiplayer model is "the game pieces are shapes". Emitters and
marbles are locked geo shapes with game data in `meta`, so tldraw sync carries
the whole game state; drawings are obstacles for everyone symmetrically.

[3]
Each client simulates only what it owns. Marbles carry their velocity in meta,
and only their owner integrates and updates them — everyone else receives the
updates. Hits are detected by the marble's owner, who writes the damage onto
the enemy emitter shape. `ignoreShapeLock` lets the game update its locked
pieces; `history: 'ignore'` keeps the simulation out of the undo stack.

[4]
Ink enforcement uses store side effects, which only run for local changes —
remote shapes arrive with source 'remote' and keep their author's color. The
before-create handler recolors anything you draw; the before-change handler
rejects recoloring outright, so you can't repaint your ink (or the enemy's).
`setStyleForNextShapes` just makes the toolbar preview match.

[5]
Sides alternate as players deploy, so a duel naturally faces the players
across the arena.

[6]
There's no separate "game over" state to sync: your emitter shape existing is
you being alive.

[7]
`InFrontOfTheCanvas` renders in screen space above the shapes and below the UI,
so the overlay maps page points through `pageToViewport` each frame and pans
and zooms with the camera for free.
*/
