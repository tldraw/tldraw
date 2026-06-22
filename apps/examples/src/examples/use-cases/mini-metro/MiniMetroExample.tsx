import { useCallback, useEffect } from 'react'
import {
	Box,
	Editor,
	getIndices,
	TLAnyOverlayUtilConstructor,
	TLDefaultColorStyle,
	TLGeoShapeGeoStyle,
	TLShapeId,
	Tldraw,
	createShapeId,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { GEO_FOR_SHAPE, STATION_R, WORLD } from './constants'
import { getWorld, hud$, publish, resetWorld } from './game-state'
import { MetroTool } from './MetroTool'
import { LinePreviewOverlayUtil } from './overlays/LinePreviewOverlayUtil'
import { PassengerOverlayUtil } from './overlays/PassengerOverlayUtil'
import { TrainOverlayUtil } from './overlays/TrainOverlayUtil'
import RideView from './RideView'
import { linePoints, stepWorld, World } from './sim'
import './mini-metro.css'

// Passengers and trains live on the overlay canvas (they move every frame);
// stations and lines are real tldraw shapes synced from the sim below.
const overlayUtils: TLAnyOverlayUtilConstructor[] = [
	...defaultOverlayUtils,
	PassengerOverlayUtil,
	TrainOverlayUtil,
	LinePreviewOverlayUtil,
]

const customTools = [MetroTool]

const stationShapeId = (id: number) => createShapeId(`mm-station-${id}`)
const lineShapeId = (id: number) => createShapeId(`mm-line-${id}`)

// Mirror the sim's stations and lines into real, locked tldraw shapes. Stations
// are `geo` shapes (one per Mini Metro shape); lines are `line` shapes in the
// tldraw palette. Only structural changes trigger this, so it's cheap.
function syncShapes(editor: Editor, world: World, synced: { stations: Set<number> }) {
	editor.run(
		() => {
			for (const s of world.stations) {
				if (synced.stations.has(s.id)) continue
				synced.stations.add(s.id)
				editor.createShape({
					id: stationShapeId(s.id),
					type: 'geo',
					x: s.x - STATION_R,
					y: s.y - STATION_R,
					isLocked: true,
					meta: { mm: 'station' },
					props: {
						geo: GEO_FOR_SHAPE[s.shape] as TLGeoShapeGeoStyle,
						w: STATION_R * 2,
						h: STATION_R * 2,
						color: 'black',
						fill: 'solid',
						dash: 'solid',
						size: 'm',
					},
				})
			}

			const lineIds: TLShapeId[] = []
			for (const line of world.lines) {
				const pts = linePoints(world, line)
				if (pts.length < 2) continue
				const origin = pts[0]
				const indices = getIndices(pts.length)
				const points = Object.fromEntries(
					pts.map((p, i) => {
						const key = indices[i]
						return [key, { id: key, index: key, x: p.x - origin.x, y: p.y - origin.y }]
					})
				)
				const id = lineShapeId(line.id)
				lineIds.push(id)
				const partial = {
					id,
					type: 'line' as const,
					x: origin.x,
					y: origin.y,
					props: {
						spline: 'line' as const,
						color: line.color as TLDefaultColorStyle,
						size: 'xl' as const,
						dash: 'solid' as const,
						points,
					},
				}
				if (editor.getShape(id)) {
					editor.updateShape(partial)
				} else {
					editor.createShape({ ...partial, isLocked: true, meta: { mm: 'line' } })
				}
			}
			// Keep lines tucked behind the stations they connect.
			if (lineIds.length) editor.sendToBack(lineIds)
		},
		{ history: 'ignore', ignoreShapeLock: true }
	)
}

function deleteGameShapes(editor: Editor) {
	const ids = editor
		.getCurrentPageShapes()
		.filter((s) => s.meta?.mm)
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
		const synced = { stations: new Set<number>() }
		let lastVersion = -1

		const sync = () => {
			const world = getWorld()
			if (world.structureVersion !== lastVersion) {
				lastVersion = world.structureVersion
				syncShapes(editor, world, synced)
			}
		}
		sync()
		fitMap(editor)

		const onTick = (elapsedMs: number) => {
			// Clamp so a backgrounded tab doesn't fast-forward the whole network.
			stepWorld(getWorld(), Math.min(50, elapsedMs))
			publish()
			sync()
		}
		editor.on('tick', onTick)

		const restart = () => {
			resetWorld()
			deleteGameShapes(editor)
			synced.stations.clear()
			lastVersion = -1
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

		// Expose restart for the game-over button.
		;(editor as any).__mmRestart = restart

		return () => {
			editor.off('tick', onTick)
			window.removeEventListener('keydown', onKeyDown)
			deleteGameShapes(editor)
		}
	}, [editor])

	return null
}

function formatTime(ms: number) {
	const total = Math.floor(ms / 1000)
	const m = Math.floor(total / 60)
	const s = total % 60
	return `${m}:${s.toString().padStart(2, '0')}`
}

function Hud() {
	const hud = useValue('mm-hud', () => hud$.get(), [])
	return (
		<div className="mm-hud">
			<div className="mm-hud__stat">
				<span className="mm-hud__value">{hud.score}</span>
				<span className="mm-hud__label">delivered</span>
			</div>
			<div className="mm-hud__stat">
				<span className="mm-hud__value">{formatTime(hud.timeMs)}</span>
				<span className="mm-hud__label">elapsed</span>
			</div>
			<div className="mm-hud__lines">
				{Array.from({ length: hud.linesMax }).map((_, i) => (
					<span
						key={i}
						className={`mm-hud__line ${i < hud.linesUsed ? 'mm-hud__line--used' : ''}`}
					/>
				))}
			</div>
		</div>
	)
}

function Hint() {
	const started = useValue('mm-started', () => hud$.get().linesUsed > 0, [])
	if (started) return null
	return <div className="mm-hint">Drag between stations to connect them with a metro line</div>
}

function GameOver() {
	const editor = useEditor()
	const hud = useValue('mm-gameover', () => hud$.get(), [])
	const onRestart = useCallback(() => (editor as any).__mmRestart?.(), [editor])
	if (!hud.gameOver) return null
	return (
		<div className="mm-modal">
			<div className="mm-modal__panel">
				<h2 className="mm-modal__title">Network overcrowded</h2>
				<p className="mm-modal__sub">
					{hud.score} passengers delivered in {formatTime(hud.timeMs)}
				</p>
				<button className="mm-restart" onClick={onRestart}>
					Play again <kbd>R</kbd>
				</button>
			</div>
		</div>
	)
}

// Stations and lines are the only interactive surface, so hide the editor UI and
// stop double-clicks from dropping stray text shapes onto the map.
const options = { createTextOnCanvasDoubleClick: false }

export default function MiniMetroExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={customTools}
				initialState="metro"
				overlayUtils={overlayUtils}
				options={options}
				hideUi
			>
				<GameRunner />
				<Hud />
				<Hint />
				<RideView />
				<GameOver />
			</Tldraw>
		</div>
	)
}
