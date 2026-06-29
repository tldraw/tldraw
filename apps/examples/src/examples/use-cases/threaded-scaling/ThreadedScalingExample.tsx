import { useEffect } from 'react'
import {
	Box,
	TLAnyOverlayUtilConstructor,
	TLComponents,
	TLUiComponents,
	Tldraw,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { allMatched, frame$, getWorld, matchedCount, publishWorld, resetWorld } from './game-state'
import { ThreadOverlayUtil } from './overlays/ThreadOverlayUtil'
import { dragNode, grabNode, initPuzzle, releaseNode, stepWorld } from './sim'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, ThreadOverlayUtil]

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

const GRAB_MARGIN = 16 // extra screen px around a node to start a resize

// Headless: owns the ease loop and pointer interaction, renders nothing.
function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		const reset = () => {
			resetWorld()
			initPuzzle(getWorld())
			publishWorld()
		}
		reset()
		editor.setCurrentTool('hand')
		// Frame both groups with some breathing room.
		editor.zoomToBounds(new Box(-740, -330, 1100, 760), { inset: 64 })

		const onTick = () => {
			stepWorld(getWorld())
			publishWorld()
		}
		editor.on('tick', onTick)

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key.toLowerCase() === 'r') reset()
		}
		window.addEventListener('keydown', onKeyDown)

		const container = editor.getContainer()
		const toPage = (e: PointerEvent) => editor.screenToPage({ x: e.clientX, y: e.clientY })

		const onPointerMove = (e: PointerEvent) => {
			dragNode(getWorld(), toPage(e))
		}
		const onPointerUp = () => {
			releaseNode(getWorld())
			window.removeEventListener('pointermove', onPointerMove, true)
			window.removeEventListener('pointerup', onPointerUp, true)
		}
		const onPointerDown = (e: PointerEvent) => {
			const grabbed = grabNode(getWorld(), toPage(e), GRAB_MARGIN / editor.getZoomLevel())
			if (!grabbed) return // let the hand tool pan the view
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
	const matched = useValue(
		'matched',
		() => {
			frame$.get()
			return matchedCount()
		},
		[]
	)
	const total = useValue('total', () => getWorld().nodes.length, [])
	const won = useValue(
		'won',
		() => {
			frame$.get()
			return allMatched()
		},
		[]
	)

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
				<span>
					Matched: {matched} / {total}
				</span>
				{won && (
					<span style={{ color: 'var(--tl-color-text)', opacity: 0.9 }}>
						✓ solved — R for a fresh start
					</span>
				)}
			</div>
			<span style={{ opacity: 0.6, fontWeight: 400, fontSize: 12 }}>
				drag a circle to resize it · the size flows in along the threads, draining nearby circles
				most and distant ones least · route size through the graph to land every circle on its
				dashed ring · R to reset
			</span>
		</div>
	)
}

export default function ThreadedScalingExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw overlayUtils={overlayUtils} components={components}>
				<GameRunner />
				<Hud />
			</Tldraw>
		</div>
	)
}
