import { useSyncDemo } from '@tldraw/sync'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Atom, Editor, TLComponents, Tldraw, Vec, VecLike, atom, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'
import { Maze, generateMaze, moveAvatar, rngFromString } from './maze'
import './cursor-maze.css'

// [1] Maze and player tuning, in world units.
const CELL = 64
const COLS = 45
const ROWS = 31
// The cursor is the player; this is the collision radius around the pointer's
// tip. Tiny, so the tip reaches right up to the walls.
const COLLISION_RADIUS = 2
const ZOOM = 1
const GOAL_RADIUS = CELL * 0.4

// Cursor trail: a fading, tapering laser-style path drawn behind every player's
// cursor in their own color.
const TRAIL_FADE_MS = 600
const TRAIL_WIDTH = 7
const MIN_TRAIL_DIST = 4

/** A finished run. Stored in the synced document's meta, keyed by user id. */
interface Score {
	userId: string
	name: string
	color: string
	timeMs: number
	at: number
}

interface Game {
	maze: Atom<Maze>
	/** The player's position in world space — always the world point under the cursor. */
	avatar: Atom<Vec>
	/** False until the cursor first enters the canvas and grabs the player. */
	engaged: Atom<boolean>
	/** Milliseconds since the run started (rounded to 100ms for a calm display). */
	elapsedMs: Atom<number>
	/** Set once, when the player reaches the exit. */
	finishMs: Atom<number | null>
}

function createGame(roomId: string): Game {
	// Seed from the room id so everyone in the room carves the same maze.
	const maze = generateMaze(COLS, ROWS, CELL, rngFromString(roomId))
	return {
		maze: atom('maze', maze),
		avatar: atom('avatar', maze.start.clone()),
		engaged: atom('engaged', false),
		elapsedMs: atom('elapsedMs', 0),
		finishMs: atom<number | null>('finishMs', null),
	}
}

export default function CursorMazeExample({ roomId }: { roomId: string }) {
	const [game] = useState(() => createGame(roomId))

	// [2] Connect to a sync room. Each player keeps their own camera (camera is
	// session-local, never synced), but tldraw syncs everyone's cursor for free —
	// and because we pin the player under the cursor, your synced cursor IS your
	// collision-resolved maze position. So other players just show up as their
	// cursors threading the same maze, with an off-screen edge hint pointing to
	// anyone outside your view. There's no avatar to draw and no presence to wire
	// up: the cursor is the player.
	const store = useSyncDemo({ roomId })

	// [3] Only the maze and the exit are drawn in world space; the players are the
	// cursors themselves, which tldraw renders and syncs for us.
	const components = useMemo<TLComponents>(
		() => ({ OnTheCanvas: () => <MazeLayer game={game} /> }),
		[game]
	)

	const onMount = useCallback((editor: Editor) => {
		// Lock the camera so nothing but the game can move it, and switch off
		// wheel zoom. The default select tool keeps the cursor an arrow.
		editor.setCameraOptions({ isLocked: true, wheelBehavior: 'none' })
	}, [])

	return (
		<div className="tldraw__editor cursor-maze" onContextMenu={(e) => e.preventDefault()}>
			<Tldraw
				store={store}
				hideUi
				components={components}
				options={{ createTextOnCanvasDoubleClick: false }}
				onMount={onMount}
			>
				<GameRunner game={game} />
				<CursorTrails game={game} />
				<StartCard game={game} />
				<Timer game={game} />
				<Scoreboard />
			</Tldraw>
		</div>
	)
}

function GameRunner({ game }: { game: Game }) {
	const editor = useEditor()

	useEffect(() => {
		// The game engages when the Start button is clicked. Grabbing must not drag
		// the player across the maze, so the first engaged frame only slides the
		// world so the fixed start sits under the cursor.
		let attached = false
		let startTime = 0

		const onTick = () => {
			// Before the cursor grabs on, keep the start cell framed in the middle
			// of the viewport (done here, not in onMount, so the viewport has been
			// measured).
			if (!game.engaged.get()) {
				centerOnStart(editor, game)
				return
			}

			const cam = editor.getCamera()
			const z = cam.z
			const screen = editor.inputs.getCurrentScreenPoint()
			const from = game.avatar.get()

			if (!attached) {
				// The player starts at the fixed start, not wherever the cursor came
				// in — slide the world so the start lands under the cursor. Start the
				// clock now.
				attached = true
				startTime = Date.now()
				editor.setCamera(
					{ x: screen.x / z - from.x, y: screen.y / z - from.y, z },
					{ force: true, immediate: true }
				)
				return
			}

			// Move the player to the world point under the cursor, sliding along
			// walls, then re-pin it under the cursor by moving the world to make up
			// for whatever the walls refused to let it do. The camera only ever
			// moves as a result of a collision — never because the cursor neared a
			// screen edge.
			const maze = game.maze.get()
			const underCursor = new Vec(screen.x / z - cam.x, screen.y / z - cam.y)
			const next = moveAvatar(maze, from, underCursor, COLLISION_RADIUS)
			editor.setCamera(
				{ x: screen.x / z - next.x, y: screen.y / z - next.y, z },
				{ force: true, immediate: true }
			)
			game.avatar.set(next)

			// Run the clock and record a finish the first time we reach the exit.
			if (game.finishMs.get() === null) {
				const elapsed = Date.now() - startTime
				game.elapsedMs.set(elapsed - (elapsed % 100))
				if (Vec.Dist(next, maze.goal) < GOAL_RADIUS) {
					game.finishMs.set(elapsed)
					recordScore(editor, elapsed)
				}
			}
		}

		editor.on('tick', onTick)
		return () => {
			editor.off('tick', onTick)
		}
	}, [editor, game])

	return null
}

/**
 * A fading, laser-style trail behind every cursor, each in that player's own
 * color: your own collision-resolved position plus every collaborator's synced
 * cursor. Nothing about the trail is synced — it's derived entirely from the
 * cursor positions tldraw already gives us, so it adds no presence data. Drawn
 * to a plain canvas so the whole thing is one repaint per frame.
 */
function CursorTrails({ game }: { game: Game }) {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		const ctx = canvas?.getContext('2d')
		if (!canvas || !ctx) return

		// Recent points per player (newest last), in page space, plus their color.
		// Kept across frames so a trail keeps fading after its cursor stops moving.
		const trails = new Map<
			string,
			{ color: string; points: { x: number; y: number; t: number }[] }
		>()

		const draw = () => {
			const now = Date.now()

			// Match the backing store to the container in device pixels.
			const dpr = window.devicePixelRatio || 1
			const w = canvas.clientWidth
			const h = canvas.clientHeight
			if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
				canvas.width = Math.round(w * dpr)
				canvas.height = Math.round(h * dpr)
			}
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			ctx.clearRect(0, 0, w, h)

			// Everyone whose cursor is a player: yourself once you've spawned, and
			// every collaborator (their position is their synced cursor).
			const samples: { userId: string; point: VecLike; color: string }[] = []
			if (game.engaged.get()) {
				samples.push({
					userId: editor.user.getExternalId(),
					point: game.avatar.get(),
					color: editor.user.getColor(),
				})
			}
			for (const c of editor.getCollaborators()) {
				if (c.cursor) samples.push({ userId: c.userId, point: c.cursor, color: c.color })
			}

			// Extend each trail, but only once its cursor has moved a little, so a
			// still cursor lets its trail fade away instead of stacking up points.
			for (const { userId, point, color } of samples) {
				const trail = trails.get(userId) ?? { color, points: [] }
				trail.color = color
				const last = trail.points[trail.points.length - 1]
				if (!last || Math.hypot(point.x - last.x, point.y - last.y) > MIN_TRAIL_DIST) {
					trail.points.push({ x: point.x, y: point.y, t: now })
				}
				trails.set(userId, trail)
			}

			// Age out old points (dropping empty trails), then draw each as a line
			// that thins and fades toward its tail. pageToViewport maps each world
			// point through the current camera into container pixels.
			ctx.lineCap = 'round'
			ctx.lineJoin = 'round'
			for (const [userId, trail] of trails) {
				trail.points = trail.points.filter((p) => now - p.t < TRAIL_FADE_MS)
				if (trail.points.length === 0) {
					trails.delete(userId)
					continue
				}
				ctx.strokeStyle = trail.color
				for (let i = 1; i < trail.points.length; i++) {
					const life = 1 - (now - trail.points[i].t) / TRAIL_FADE_MS
					const a = editor.pageToViewport(trail.points[i - 1])
					const b = editor.pageToViewport(trail.points[i])
					ctx.globalAlpha = Math.max(0, life)
					ctx.lineWidth = TRAIL_WIDTH * life
					ctx.beginPath()
					ctx.moveTo(a.x, a.y)
					ctx.lineTo(b.x, b.y)
					ctx.stroke()
				}
			}
			ctx.globalAlpha = 1
		}

		editor.on('tick', draw)
		return () => {
			editor.off('tick', draw)
		}
	}, [editor, game])

	return <canvas ref={canvasRef} className="cursor-maze__trails" />
}

/** Write this run into the synced document's meta if it beats the player's best. */
function recordScore(editor: Editor, timeMs: number) {
	const userId = editor.user.getExternalId()
	const doc = editor.getDocumentSettings()
	// meta is a loose JsonObject; cast past the Score interface at the boundary.
	const scores = (doc.meta.scores ?? {}) as unknown as Record<string, Score>
	const best = scores[userId]
	if (best && best.timeMs <= timeMs) return
	const nextScores = {
		...scores,
		[userId]: {
			userId,
			// The people menu is hidden, so most players have no name — give them a
			// stable, distinct one derived from their id.
			name: editor.user.getName() || generateName(userId),
			color: editor.user.getColor(),
			timeMs,
			at: Date.now(),
		},
	}
	editor.updateDocumentSettings({
		meta: { ...doc.meta, scores: nextScores } as unknown as (typeof doc)['meta'],
	})
}

const NAME_ADJECTIVES = ['Swift', 'Sly', 'Brave', 'Quick', 'Clever', 'Bold', 'Nimble', 'Wily']
const NAME_ANIMALS = ['Fox', 'Otter', 'Hawk', 'Wolf', 'Cat', 'Mole', 'Hare', 'Lynx']

/** A stable "Adjective Animal" name derived from a user id. */
function generateName(userId: string) {
	let h = 0
	for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0
	h = Math.abs(h)
	return `${NAME_ADJECTIVES[h % NAME_ADJECTIVES.length]} ${NAME_ANIMALS[(h >> 3) % NAME_ANIMALS.length]}`
}

function formatTime(ms: number) {
	const totalSeconds = ms / 1000
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = (totalSeconds - minutes * 60).toFixed(1)
	return `${minutes}:${seconds.padStart(4, '0')}`
}

function centerOnStart(editor: Editor, game: Game) {
	const viewport = editor.getViewportScreenBounds()
	const { start } = game.maze.get()
	editor.setCamera(
		{ x: viewport.w / 2 / ZOOM - start.x, y: viewport.h / 2 / ZOOM - start.y, z: ZOOM },
		{ force: true, immediate: true }
	)
}

function MazeLayer({ game }: { game: Game }) {
	const maze = useValue('maze', () => game.maze.get(), [game])
	return (
		<>
			<MazeWalls maze={maze} />
			<GoalMarker maze={maze} />
		</>
	)
}

// Memoized: the walls only change when a new maze is generated, not every frame.
const MazeWalls = memo(function MazeWalls({ maze }: { maze: Maze }) {
	const { cols, rows, cell, solid } = maze
	const w = cols * cell
	const h = rows * cell
	const walls = solid.flatMap((isSolid, i) => {
		if (!isSolid) return []
		const col = i % cols
		const row = Math.floor(i / cols)
		return [<rect key={i} x={col * cell} y={row * cell} width={cell} height={cell} />]
	})
	return (
		<svg className="cursor-maze__board" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
			<rect className="cursor-maze__floor" x={0} y={0} width={w} height={h} />
			<g className="cursor-maze__walls">{walls}</g>
		</svg>
	)
})

function GoalMarker({ maze }: { maze: Maze }) {
	return (
		<div
			className="cursor-maze__goal"
			style={{ left: maze.goal.x, top: maze.goal.y, width: maze.cell, height: maze.cell }}
		>
			🏁
		</div>
	)
}

function StartCard({ game }: { game: Game }) {
	const engaged = useValue('engaged', () => game.engaged.get(), [game])
	if (engaged) return null
	return (
		<div className="cursor-maze__startcard">
			<div className="cursor-maze__title">Cursor maze</div>
			<div className="cursor-maze__subtitle">
				Race your cursor to the 🏁 as fast as you can. You can’t pass through walls — push against
				them and the maze scrolls. Share the link (top right) to race a friend; times land on the
				scoreboard.
			</div>
			<button className="cursor-maze__startbtn" onClick={() => game.engaged.set(true)}>
				Start
			</button>
		</div>
	)
}

function Timer({ game }: { game: Game }) {
	const engaged = useValue('engaged', () => game.engaged.get(), [game])
	const elapsedMs = useValue('elapsedMs', () => game.elapsedMs.get(), [game])
	const finishMs = useValue('finishMs', () => game.finishMs.get(), [game])
	if (!engaged) return null
	return (
		<div className="cursor-maze__timer" data-done={finishMs !== null}>
			{finishMs !== null ? `🏁 ${formatTime(finishMs)}` : formatTime(elapsedMs)}
		</div>
	)
}

function Scoreboard() {
	const editor = useEditor()
	const scores = useValue(
		'scores',
		() => {
			const s = editor.getDocumentSettings().meta.scores as unknown as
				| Record<string, Score>
				| undefined
			return s ? Object.values(s).sort((a, b) => a.timeMs - b.timeMs) : []
		},
		[editor]
	)
	const myId = useValue('myId', () => editor.user.getExternalId(), [editor])
	if (scores.length === 0) return null
	return (
		<div className="cursor-maze__scoreboard">
			<div className="cursor-maze__scoretitle">High scores</div>
			{scores.map((s, i) => (
				<div key={s.userId} className="cursor-maze__scorerow" data-me={s.userId === myId}>
					<span className="cursor-maze__rank">{i + 1}</span>
					<span className="cursor-maze__scoredot" style={{ background: s.color }} />
					<span className="cursor-maze__scorename">{s.name}</span>
					<span className="cursor-maze__scoretime">{formatTime(s.timeMs)}</span>
				</div>
			))}
		</div>
	)
}
