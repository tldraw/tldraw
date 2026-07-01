import { useSyncDemo } from '@tldraw/sync'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Atom, Editor, TLComponents, Tldraw, Vec, VecLike, atom, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import { asteroidsInBounds, moveShip, spaceSeed, starsInBounds } from './space'
import './cursor-spaceship.css'

// [1] Tuning, in world units.
// The current carries every ship "forward" (upward) a little each tick, on top of
// however you steer. Hold still and it flies you on; a rock stops you.
const CURRENT = new Vec(0, -3)
// Gather asteroids this far beyond the ship's path when resolving collision, so a
// fast flick of the cursor can't tunnel past one.
const COLLISION_MARGIN = 110

// Cursor trail (engine exhaust): a laser-style ribbon behind every ship in its
// own color. Tapers to nothing at the tail so the fade is geometric.
const TRAIL_FADE_MS = 2500
const TRAIL_WIDTH = 9
const TRAIL_ALPHA = 0.8
const MIN_TRAIL_DIST = 4

interface Game {
	/** Seed for the shared asteroid field and starfield. */
	seed: number
	/** The ship's position in world space — always the world point under the cursor. */
	ship: Atom<Vec>
	/** False until the player clicks Launch. */
	engaged: Atom<boolean>
}

function createGame(roomId: string): Game {
	return {
		seed: spaceSeed(roomId),
		ship: atom('ship', new Vec(0, 0)),
		engaged: atom('engaged', false),
	}
}

export default function CursorSpaceshipExample({ roomId }: { roomId: string }) {
	const [game] = useState(() => createGame(roomId))

	// [2] Connect to a sync room. tldraw syncs every ship's cursor for free, and
	// because we pin the ship under the cursor, your synced cursor IS your world
	// position — so as the current carries you, everyone else sees your ship fly.
	const store = useSyncDemo({ roomId })

	// [3] The starfield and asteroids are drawn behind everything on the Background
	// layer; the ships are the cursors themselves.
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

		const onTick = () => {
			// Before launch, frame the spawn in the middle of the viewport (done here,
			// not in onMount, so the viewport has been measured).
			if (!game.engaged.get()) {
				const viewport = editor.getViewportScreenBounds()
				const spawn = game.ship.get()
				editor.setCamera(
					{ x: viewport.w / 2 - spawn.x, y: viewport.h / 2 - spawn.y, z: 1 },
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

			// The ship wants to be at the world point under the cursor, plus the
			// current's push this tick. Resolve that against the rocks (sliding), then
			// re-pin the ship under the cursor by moving the world to absorb whatever
			// the ship actually did — so the camera scrolls both from the current and
			// from bumping a rock, never from the cursor nearing a screen edge.
			const underCursor = new Vec(screen.x / z - cam.x, screen.y / z - cam.y)
			const target = new Vec(underCursor.x + CURRENT.x, underCursor.y + CURRENT.y)
			const near = asteroidsInBounds(
				Math.min(from.x, target.x) - COLLISION_MARGIN,
				Math.min(from.y, target.y) - COLLISION_MARGIN,
				Math.max(from.x, target.x) + COLLISION_MARGIN,
				Math.max(from.y, target.y) + COLLISION_MARGIN,
				game.seed
			)
			const next = moveShip(from, target, near)
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

/**
 * The starfield and asteroid field, drawn behind everything each frame. Both are
 * generated on the fly from the seed for whatever region is on screen, so the
 * field is endless and identical for everyone in the room. Drawing to a canvas in
 * screen space (via pageToViewport) keeps it cheap no matter how far you fly.
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

			// Asteroids — a shaded circle each.
			for (const a of asteroidsInBounds(vp.minX, vp.minY, vp.maxX, vp.maxY, game.seed)) {
				const p = editor.pageToViewport(a)
				const r = a.r * z
				const grad = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.35, r * 0.1, p.x, p.y, r)
				grad.addColorStop(0, '#5b6377')
				grad.addColorStop(1, '#2b3040')
				ctx.fillStyle = grad
				ctx.beginPath()
				ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
				ctx.fill()
			}
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
 * color: your own position plus every collaborator's synced cursor. Nothing about
 * it is synced — it's derived entirely from the cursor positions tldraw already
 * gives us. Each trail is one filled ribbon that narrows to a point at its tail,
 * painted with a single fill so a self-crossing path stays solid.
 */
function CursorTrails({ game }: { game: Game }) {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		const ctx = canvas?.getContext('2d')
		if (!canvas || !ctx) return

		// Recent points per player (newest last), in page space, plus their color.
		const trails = new Map<
			string,
			{ color: string; points: { x: number; y: number; t: number }[] }
		>()

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

			// Every ship: yourself once you've launched, and every collaborator.
			const samples: { userId: string; point: VecLike; color: string }[] = []
			if (game.engaged.get()) {
				samples.push({
					userId: editor.user.getExternalId(),
					point: game.ship.get(),
					color: editor.user.getColor(),
				})
			}
			for (const c of editor.getCollaborators()) {
				if (c.cursor) samples.push({ userId: c.userId, point: c.cursor, color: c.color })
			}

			for (const { userId, point, color } of samples) {
				const trail = trails.get(userId) ?? { color, points: [] }
				trail.color = color
				const last = trail.points[trail.points.length - 1]
				if (!last || Math.hypot(point.x - last.x, point.y - last.y) > MIN_TRAIL_DIST) {
					trail.points.push({ x: point.x, y: point.y, t: now })
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
				const edges = spine.map((s, i) => {
					const a = spine[Math.max(0, i - 1)]
					const b = spine[Math.min(spine.length - 1, i + 1)]
					let nx = a.y - b.y
					let ny = b.x - a.x
					const len = Math.hypot(nx, ny) || 1
					nx = (nx / len) * s.half
					ny = (ny / len) * s.half
					return { lx: s.x + nx, ly: s.y + ny, rx: s.x - nx, ry: s.y - ny }
				})
				ctx.fillStyle = trail.color
				ctx.beginPath()
				for (const s of spine) {
					ctx.moveTo(s.x + s.half, s.y)
					ctx.arc(s.x, s.y, s.half, 0, Math.PI * 2, true)
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
		}

		editor.on('tick', draw)
		return () => {
			editor.off('tick', draw)
		}
	}, [editor, game])

	return <canvas ref={canvasRef} className="cursor-spaceship__trails" />
}

function LaunchCard({ game }: { game: Game }) {
	const engaged = useValue('engaged', () => game.engaged.get(), [game])
	if (engaged) return null
	return (
		<div className="cursor-spaceship__launchcard">
			<div className="cursor-spaceship__title">Cursor spaceship</div>
			<div className="cursor-spaceship__subtitle">
				Your cursor is the ship. A current carries you forward through an endless asteroid field —
				steer to weave through the rocks; bump one and you slide around it. Share the link (top
				right) to fly with a friend.
			</div>
			<button className="cursor-spaceship__launchbtn" onClick={() => game.engaged.set(true)}>
				Launch
			</button>
		</div>
	)
}
