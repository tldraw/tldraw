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
import { arrivals$, GRID, getWorld, publishWorld, resetWorld } from './game-state'
import { StrandsOverlayUtil } from './overlays/StrandsOverlayUtil'
import { dragGrab, releaseGrab, sliceCut, stepSignals, stepWorld, tryGrab } from './sim'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, StrandsOverlayUtil]

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
	const arrivals = useValue('arrivals', () => arrivals$.get(), [])
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
			<span>Signals delivered: {arrivals}</span>
			<span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
				swipe to cut · drag a loose end onto a peg · R to reset
			</span>
		</div>
	)
}

export default function CatsCradleExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} components={components}>
				<GameRunner />
				<Hud />
			</Tldraw>
		</div>
	)
}
