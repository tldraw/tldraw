import { useCallback, useEffect } from 'react'
import {
	Box,
	Editor,
	TLAnyOverlayUtilConstructor,
	Tldraw,
	createShapeId,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { AI_DELAY_MS, CELL_INSET, COLOR_FOR_OWNER, STONES_EACH, WORLD } from './constants'
import { getWorld, hud$, publish, resetWorld } from './game-state'
import { DiagramOverlayUtil } from './overlays/DiagramOverlayUtil'
import { aiMove, cells, tickClock, World } from './sim'
import { insetPolygon } from './voronoi'
import { VoronoiCellShapeUtil } from './VoronoiCellShapeUtil'
import { VoronoiTool } from './VoronoiTool'
import './voronoi.css'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, DiagramOverlayUtil]
const customTools = [VoronoiTool]
const customShapeUtils = [VoronoiCellShapeUtil]

// Recreate the cell shapes from scratch on each structural change. The diagram
// changes only when a site is placed (a turn), so this is cheap and infrequent.
function syncCells(editor: Editor, world: World) {
	editor.run(
		() => {
			const prev = editor
				.getCurrentPageShapes()
				.filter((s) => s.meta?.vor === 'cell')
				.map((s) => s.id)
			if (prev.length) editor.deleteShapes(prev)

			const ids = []
			for (const { site, poly } of cells(world)) {
				if (poly.length < 3) continue
				const inset = insetPolygon(poly, CELL_INSET)
				const ox = inset[0].x
				const oy = inset[0].y
				const id = createShapeId(`vor-cell-${world.structureVersion}-${site.id}`)
				ids.push(id)
				editor.createShape({
					id,
					type: 'voronoi-cell',
					x: ox,
					y: oy,
					isLocked: true,
					meta: { vor: 'cell' },
					props: {
						color: COLOR_FOR_OWNER[site.owner],
						points: inset.map((p) => ({ x: p.x - ox, y: p.y - oy })),
					},
				})
			}
			if (ids.length) editor.sendToBack(ids)
		},
		{ history: 'ignore', ignoreShapeLock: true }
	)
}

function deleteGameShapes(editor: Editor) {
	const ids = editor
		.getCurrentPageShapes()
		.filter((s) => s.meta?.vor)
		.map((s) => s.id)
	if (ids.length) editor.run(() => editor.deleteShapes(ids), { ignoreShapeLock: true })
}

function fitMap(editor: Editor) {
	const bounds = new Box(WORLD.minX, WORLD.minY, WORLD.maxX - WORLD.minX, WORLD.maxY - WORLD.minY)
	editor.zoomToBounds(bounds, { inset: 48, animation: { duration: 0 } })
}

function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		resetWorld()
		deleteGameShapes(editor)
		let lastVersion = -1
		let aiTimer = 0

		const sync = () => {
			const world = getWorld()
			if (world.structureVersion !== lastVersion) {
				lastVersion = world.structureVersion
				syncCells(editor, world)
			}
		}
		sync()
		fitMap(editor)
		publish()

		const onTick = (elapsedMs: number) => {
			const world = getWorld()
			// Clamp so a backgrounded tab can't drain a whole clock at once. The
			// clocks only run once the first stone is placed, so reading the hint is
			// free; after that it's bullet.
			const dt = Math.min(50, elapsedMs)
			const started = world.youLeft < STONES_EACH || world.aiLeft < STONES_EACH
			if (started) tickClock(world, dt)
			if (!world.gameOver && world.turn === 'ai') {
				aiTimer += dt
				if (aiTimer >= AI_DELAY_MS) {
					aiMove(world)
					aiTimer = 0
				}
			} else {
				aiTimer = 0
			}
			publish()
			sync()
		}
		editor.on('tick', onTick)

		const restart = () => {
			resetWorld()
			deleteGameShapes(editor)
			lastVersion = -1
			aiTimer = 0
			sync()
			fitMap(editor)
		}

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return
			const target = e.target as HTMLElement | null
			if (target?.matches('input, textarea, [contenteditable="true"]')) return
			if (e.key.toLowerCase() === 'r' && hud$.get().gameOver) restart()
		}
		window.addEventListener('keydown', onKeyDown)
		;(editor as any).__vorRestart = restart

		return () => {
			editor.off('tick', onTick)
			window.removeEventListener('keydown', onKeyDown)
			deleteGameShapes(editor)
		}
	}, [editor])

	return null
}

function formatClock(ms: number) {
	const s = Math.max(0, ms) / 1000
	return s >= 10 ? Math.ceil(s).toString() : s.toFixed(1)
}

function Clock({
	side,
	timeMs,
	pct,
	stones,
	active,
}: {
	side: 'you' | 'ai'
	timeMs: number
	pct: number
	stones: number
	active: boolean
}) {
	const low = active && timeMs <= 5000
	const className = [
		'vor-clock',
		`vor-clock--${side}`,
		active ? 'is-active' : '',
		low ? 'is-low' : '',
	].join(' ')
	return (
		<div className={className}>
			<span className="vor-clock__time">{formatClock(timeMs)}</span>
			<span className="vor-clock__meta">
				{pct}%
				<span className="vor-clock__stones">
					{Array.from({ length: stones }).map((_, i) => (
						<span key={i} className={`vor-dot vor-dot--${side}`} />
					))}
				</span>
			</span>
		</div>
	)
}

function Hud() {
	const hud = useValue('vor-hud', () => hud$.get(), [])
	return (
		<>
			<div className="vor-strip">
				<div className="vor-strip__seg vor-strip__seg--you" style={{ width: `${hud.youPct}%` }} />
				<div
					className="vor-strip__seg vor-strip__seg--neutral"
					style={{ width: `${hud.neutralPct}%` }}
				/>
				<div className="vor-strip__seg vor-strip__seg--ai" style={{ width: `${hud.aiPct}%` }} />
			</div>
			<Clock
				side="you"
				timeMs={hud.youTimeMs}
				pct={hud.youPct}
				stones={hud.youLeft}
				active={!hud.gameOver && hud.turn === 'you'}
			/>
			<Clock
				side="ai"
				timeMs={hud.aiTimeMs}
				pct={hud.aiPct}
				stones={hud.aiLeft}
				active={!hud.gameOver && hud.turn === 'ai'}
			/>
		</>
	)
}

function Hint() {
	const started = useValue('vor-started', () => hud$.get().started, [])
	if (started) return null
	return (
		<div className="vor-hint">
			Click to drop a site and claim the area nearest to it. Your clock starts on your first move —
			place fast and out-control the board, or flag and lose.
		</div>
	)
}

function GameOver() {
	const editor = useEditor()
	const hud = useValue('vor-gameover', () => hud$.get(), [])
	const onRestart = useCallback(() => (editor as any).__vorRestart?.(), [editor])
	if (!hud.gameOver) return null
	const title =
		hud.winner === 'you' ? 'You win' : hud.winner === 'ai' ? 'Opponent wins' : 'Tie game'
	const sub =
		hud.flagged === 'you'
			? 'You ran out of time'
			: hud.flagged === 'ai'
				? 'Your opponent ran out of time'
				: `You controlled ${hud.youPct}% to the opponent’s ${hud.aiPct}%`
	return (
		<div className="vor-modal">
			<div className="vor-modal__panel">
				<h2 className="vor-modal__title">{title}</h2>
				<p className="vor-modal__sub">{sub}</p>
				<button className="vor-restart" onClick={onRestart}>
					Play again <kbd>R</kbd>
				</button>
			</div>
		</div>
	)
}

// The board is the only interactive surface, so hide the editor UI and stop
// double-clicks from dropping stray text shapes onto it.
const options = { createTextOnCanvasDoubleClick: false }

export default function VoronoiExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={customTools}
				shapeUtils={customShapeUtils}
				initialState="voronoi"
				overlayUtils={overlayUtils}
				options={options}
				hideUi
			>
				<GameRunner />
				<Hud />
				<Hint />
				<GameOver />
			</Tldraw>
		</div>
	)
}
