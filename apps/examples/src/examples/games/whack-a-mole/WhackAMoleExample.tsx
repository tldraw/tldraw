import { useEffect } from 'react'
import {
	TLAnyOverlayUtilConstructor,
	TLComponents,
	Tldraw,
	TLUiComponents,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { frame$, getWorld, misses$, resetWorld, score$ } from './game-state'
import { BoardOverlayUtil } from './overlays/BoardOverlayUtil'
import { dragGrab, releaseGrab, stepWorld, tryGrab } from './sim'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, BoardOverlayUtil]

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

// Headless: owns the game loop and block dragging, renders nothing itself.
function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		resetWorld()
		editor.centerOnPoint({ x: 0, y: 120 })

		let last = performance.now()
		const onTick = () => {
			const now = performance.now()
			const dt = Math.min(0.05, (now - last) / 1000) // clamp to survive tab stalls
			last = now
			stepWorld(getWorld(), dt)
			frame$.set(frame$.get() + 1)
		}
		editor.on('tick', onTick)

		const container = editor.getContainer()
		const toPage = (e: PointerEvent) => editor.screenToPage({ x: e.clientX, y: e.clientY })

		// Track the latest pointer motion so a release can launch the block with a
		// flick velocity (page units per second).
		let vel = { x: 0, y: 0 }
		let prev = { x: 0, y: 0 }
		let prevT = 0

		const onPointerMove = (e: PointerEvent) => {
			const p = toPage(e)
			const now = performance.now()
			const dt = (now - prevT) / 1000
			if (dt > 0 && dt < 0.1) {
				vel = { x: (p.x - prev.x) / dt, y: (p.y - prev.y) / dt }
			}
			prev = p
			prevT = now
			dragGrab(getWorld(), p)
		}
		const onPointerUp = () => {
			releaseGrab(getWorld(), vel.x, vel.y)
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
		}
		const onPointerDown = (e: PointerEvent) => {
			const p = toPage(e)
			// Only intercept when grabbing a block; otherwise let the canvas pan.
			if (!tryGrab(getWorld(), p)) return
			vel = { x: 0, y: 0 }
			prev = p
			prevT = performance.now()
			e.stopPropagation()
			e.preventDefault()
			window.addEventListener('pointermove', onPointerMove, true)
			window.addEventListener('pointerup', onPointerUp, true)
		}
		container.addEventListener('pointerdown', onPointerDown, true)

		return () => {
			editor.off('tick', onTick)
			container.removeEventListener('pointerdown', onPointerDown, true)
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
		}
	}, [editor])

	return null
}

function Hud() {
	const score = useValue('score', () => score$.get(), [])
	const misses = useValue('misses', () => misses$.get(), [])
	return (
		<div
			style={{
				position: 'absolute',
				top: 12,
				left: 12,
				zIndex: 1000,
				pointerEvents: 'none',
				font: '600 18px "Shantell Sans", "Comic Sans MS", system-ui, sans-serif',
				color: 'var(--color-text)',
			}}
		>
			<div>Bonked: {score}</div>
			<div style={{ opacity: 0.6 }}>Missed: {misses}</div>
		</div>
	)
}

export default function WhackAMoleExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} components={components}>
				<GameRunner />
				<Hud />
			</Tldraw>
		</div>
	)
}
