import { useCallback, useEffect } from 'react'
import {
	Box,
	Editor,
	GeoShapeGeoStyle,
	TLAnyOverlayUtilConstructor,
	TLEventInfo,
	Tldraw,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { BRIDGE_COST_IRON, ROWS, TILE } from './constants'
import { runGameTick } from './game-loop'
import {
	budget$,
	distance$,
	gameOver$,
	iron$,
	resetWorld,
	tool$,
	ToolMode,
	wood$,
	world,
} from './game-state'
import { HeadHintOverlayUtil } from './overlays/HeadHintOverlayUtil'
import { TerrainOverlayUtil } from './overlays/TerrainOverlayUtil'
import { TrackOverlayUtil } from './overlays/TrackOverlayUtil'
import { TrainOverlayUtil } from './overlays/TrainOverlayUtil'
import { createStarterTrack } from './rails'
import './unrailed.css'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [
	...defaultOverlayUtils,
	TerrainOverlayUtil,
	TrackOverlayUtil,
	HeadHintOverlayUtil,
	TrainOverlayUtil,
]

function setTool(editor: Editor, mode: ToolMode) {
	world.tool = mode
	tool$.set(mode)
	if (mode === 'bridge') {
		editor.setStyleForNextShapes(GeoShapeGeoStyle, 'rectangle')
		editor.setCurrentTool('geo')
	} else {
		editor.setCurrentTool('draw')
	}
}

function startGame(editor: Editor) {
	resetWorld()
	const ids = editor.getCurrentPageShapes().map((s) => s.id)
	editor.run(
		() => {
			if (ids.length) editor.deleteShapes(ids)
			createStarterTrack(editor)
		},
		{ history: 'ignore', ignoreShapeLock: true }
	)
	setTool(editor, 'draw')
	// Frame the opening. Zoom stays unlocked so the player can scout ahead.
	editor.zoomToBounds(new Box(0, -TILE, 20 * TILE, (ROWS + 2) * TILE), { immediate: true })
}

function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		const onTick = (elapsedMs: number) => {
			runGameTick(editor, Math.min(50, elapsedMs))
		}
		editor.on('tick', onTick)

		// Track pointer state: hold the camera still mid-stroke, and process the
		// drawn shape once the stroke finishes.
		const onEvent = (info: TLEventInfo) => {
			if (info.type !== 'pointer') return
			if (info.name === 'pointer_down') world.pointerDown = true
			else if (info.name === 'pointer_up') {
				world.pointerDown = false
				world.pendingScan = true
			}
		}
		editor.on('event', onEvent)

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return
			const t = e.target as HTMLElement | null
			if (t?.matches('input, textarea, [contenteditable="true"]')) return
			if (e.code === 'KeyR') startGame(editor)
			else if (e.code === 'Digit1') setTool(editor, 'draw')
			else if (e.code === 'Digit2') setTool(editor, 'bridge')
		}
		window.addEventListener('keydown', onKeyDown)

		return () => {
			editor.off('tick', onTick)
			editor.off('event', onEvent)
			window.removeEventListener('keydown', onKeyDown)
			world.pointerDown = false
		}
	}, [editor])

	return null
}

function Toolbar() {
	const editor = useEditor()
	const tool = useValue('tool', () => tool$.get(), [])
	return (
		<div className="unrailed-toolbar">
			<button
				className={'unrailed-tool' + (tool === 'draw' ? ' is-active' : '')}
				onClick={() => setTool(editor, 'draw')}
				title="Draw track (1)"
			>
				✏️ Draw <kbd>1</kbd>
			</button>
			<button
				className={'unrailed-tool' + (tool === 'bridge' ? ' is-active' : '')}
				onClick={() => setTool(editor, 'bridge')}
				title={`Bridge over water — ${BRIDGE_COST_IRON} iron (2)`}
			>
				🌉 Bridge <kbd>2</kbd>
			</button>
		</div>
	)
}

function HUD() {
	const editor = useEditor()
	const wood = useValue('wood', () => wood$.get(), [])
	const iron = useValue('iron', () => iron$.get(), [])
	const budget = useValue('budget', () => budget$.get(), [])
	const distance = useValue('distance', () => distance$.get(), [])
	const gameOver = useValue('gameOver', () => gameOver$.get(), [])

	const onRestart = useCallback(() => startGame(editor), [editor])

	return (
		<>
			<div className="unrailed-hud">
				<div className="unrailed-hud__stats">
					<span className="unrailed-stat" title="Wood — draw over trees">
						🌲 <strong>{wood}</strong>
					</span>
					<span className="unrailed-stat" title="Iron — draw over rocks">
						⛰️ <strong>{iron}</strong>
					</span>
					<span className="unrailed-stat" title="Track you can still draw (tiles)">
						🛤️ <strong>{budget}</strong>
					</span>
					<span className="unrailed-stat unrailed-stat--dist" title="Tiles travelled">
						🚂 <strong>{distance}</strong>
					</span>
					<button className="unrailed-btn" onClick={onRestart}>
						Restart
					</button>
				</div>
				<div className="unrailed-hud__hint">
					<strong>Draw</strong> from the glowing ring to lay track · draw over 🌲/⛰️ to harvest ·
					drag a 🌉 <strong>Bridge</strong> across water · scroll to zoom · <kbd>R</kbd> restart
				</div>
			</div>
			{gameOver && (
				<div className="unrailed-gameover">
					<div className="unrailed-gameover__card">
						<h2>Off the rails!</h2>
						<p>You travelled {distance} tiles.</p>
						<button className="unrailed-btn unrailed-btn--primary" onClick={onRestart}>
							Play again
						</button>
					</div>
				</div>
			)}
		</>
	)
}

const tldrawOptions = { createTextOnCanvasDoubleClick: false }

export default function UnrailedExample() {
	return (
		<div className="tldraw__editor unrailed-root">
			<Tldraw hideUi overlayUtils={overlayUtils} options={tldrawOptions} onMount={startGame}>
				<GameRunner />
				<Toolbar />
				<HUD />
			</Tldraw>
		</div>
	)
}
