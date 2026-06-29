import { useEffect } from 'react'
import {
	TLAnyOverlayUtilConstructor,
	TLComponents,
	TLUiComponents,
	Tldraw,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { GRID, getWorld, publishWorld, resetWorld, scoreA$, scoreB$ } from './game-state'
import { TerritoryOverlayUtil } from './overlays/TerritoryOverlayUtil'
import { dragGrab, releaseGrab, sliceCut, stepSignals, stepWorld, tryGrab } from './sim'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, TerritoryOverlayUtil]

// Strip the editor UI down to a bare canvas for the prototype.
const uiComponents: Partial<TLUiComponents> = {
	Toolbar: null,
	StylePanel: null,
	PageMenu: null,
	MainMenu: null,
	NavigationPanel: null,
	HelpMenu: null,
	ActionsMenu: null,
	QuickActions: null,
	ZoomMenu: null,
	Minimap: null,
}
const components: TLComponents = uiComponents

const GRAB_RADIUS = 26 // screen px to pick up an end
const SNAP_RADIUS = 44 // screen px to re-pin onto a peg

function gridCenter() {
	return {
		x: GRID.x0 + ((GRID.cols - 1) * GRID.spacing) / 2,
		y: GRID.y0 + ((GRID.rows - 1) * GRID.spacing) / 2,
	}
}

// Headless: owns the physics loop and pointer interaction, renders nothing.
function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		resetWorld()
		editor.centerOnPoint(gridCenter())

		const onTick = () => {
			const world = getWorld()
			stepWorld(world)
			stepSignals(world)
			publishWorld()
		}
		editor.on('tick', onTick)

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === 'r') resetWorld()
		}
		window.addEventListener('keydown', onKeyDown)

		const container = editor.getContainer()
		const toPage = (e: PointerEvent) => editor.screenToPage({ x: e.clientX, y: e.clientY })
		let mode: 'idle' | 'drag' | 'slice' = 'idle'
		let last = { x: 0, y: 0 }
		// The active cut's tldraw laser scribble (its own fade behaviour).
		let laser: { sessionId: string; scribbleId: string } | null = null

		const onPointerMove = (e: PointerEvent) => {
			const world = getWorld()
			const p = toPage(e)
			if (mode === 'drag') {
				dragGrab(world, p)
			} else if (mode === 'slice' && laser) {
				sliceCut(world, last, p)
				editor.scribbles.addPointToSession(laser.sessionId, laser.scribbleId, p.x, p.y)
				last = p
			}
		}

		const onPointerUp = (e: PointerEvent) => {
			const world = getWorld()
			if (mode === 'drag') {
				releaseGrab(world, toPage(e), SNAP_RADIUS / editor.getZoomLevel())
			} else if (mode === 'slice' && laser) {
				// Fade the cut out immediately on release for a snappier feel.
				editor.scribbles.stopSession(laser.sessionId)
				laser = null
			}
			mode = 'idle'
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
		}

		const onPointerDown = (e: PointerEvent) => {
			const world = getWorld()
			const p = toPage(e)
			const grabbed = tryGrab(world, p, GRAB_RADIUS / editor.getZoomLevel())
			if (grabbed) {
				mode = 'drag'
			} else {
				mode = 'slice'
				last = p
				// Start a real tldraw laser scribble (same options the laser tool uses).
				const sessionId = editor.scribbles.startSession({
					selfConsume: false,
					idleTimeoutMs: editor.options.laserDelayMs,
					fadeMode: 'grouped',
					fadeEasing: 'ease-in',
				})
				const scribble = editor.scribbles.addScribbleToSession(sessionId, {
					color: 'laser',
					opacity: 0.7,
					size: 4,
					taper: false,
				})
				laser = { sessionId, scribbleId: scribble.id }
				editor.scribbles.addPointToSession(sessionId, scribble.id, p.x, p.y)
			}
			e.stopPropagation()
			e.preventDefault()
			window.addEventListener('pointermove', onPointerMove, true)
			window.addEventListener('pointerup', onPointerUp, true)
		}
		container.addEventListener('pointerdown', onPointerDown, true)

		return () => {
			editor.off('tick', onTick)
			window.removeEventListener('keydown', onKeyDown)
			container.removeEventListener('pointerdown', onPointerDown, true)
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
		}
	}, [editor])

	return null
}

function Hud() {
	const scoreA = useValue('scoreA', () => scoreA$.get(), [])
	const scoreB = useValue('scoreB', () => scoreB$.get(), [])
	const leader = scoreA === scoreB ? 'Tied' : scoreA > scoreB ? 'Red leads' : 'Blue leads'
	return (
		<div
			style={{
				position: 'absolute',
				top: 12,
				left: 12,
				zIndex: 1000,
				pointerEvents: 'none',
				display: 'flex',
				flexDirection: 'column',
				gap: 4,
				font: '600 14px var(--tl-font-ui, sans-serif)',
				color: 'var(--tl-color-text)',
			}}
		>
			<div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
				<span style={{ color: 'var(--tl-color-selection-fill, crimson)' }}>
					<Dot color="crimson" /> Red: {scoreA}
				</span>
				<span>
					<Dot color="dodgerblue" /> Blue: {scoreB}
				</span>
				<span style={{ opacity: 0.7, fontWeight: 400 }}>{leader}</span>
			</div>
			<span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
				swipe to cut an enemy supply line · drag a loose end onto a peg to push your color · R to
				reset
			</span>
		</div>
	)
}

function Dot({ color }: { color: string }) {
	return (
		<span
			style={{
				display: 'inline-block',
				width: 9,
				height: 9,
				borderRadius: 2,
				background: color,
				marginRight: 4,
			}}
		/>
	)
}

export default function SignalTerritoryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} components={components}>
				<GameRunner />
				<Hud />
			</Tldraw>
		</div>
	)
}
