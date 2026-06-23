import { useEffect } from 'react'
import {
	Box,
	Editor,
	TLAnyOverlayUtilConstructor,
	TLComponents,
	TLUiComponents,
	Tldraw,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { FIELD, frame$, getWorld, publishWorld, resetWorld } from './game-state'
import { CrowdOverlayUtil } from './overlays/CrowdOverlayUtil'
import { stepWorld } from './sim'
import './viewfinder.css'

const overlayUtils: TLAnyOverlayUtilConstructor[] = [...defaultOverlayUtils, CrowdOverlayUtil]

// Strip the editor UI down to a bare canvas; this game is played entirely by
// moving the camera.
const components: TLComponents = {
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
} satisfies Partial<TLUiComponents>

// The viewfinder is a fixed square in the centre of the screen. To win you must
// frame Wally inside it — and be zoomed in far enough to actually resolve him.
const RETICLE_PX = 240
const RESOLVE_ZOOM = 1.4

function fieldBounds() {
	return new Box(0, 0, FIELD.w, FIELD.h)
}

// Start over: new crowd, unlock the camera the win froze, reframe the field.
function resetGame(editor: Editor) {
	resetWorld()
	editor.setCameraOptions({ ...editor.getCameraOptions(), isLocked: false })
	editor.zoomToBounds(fieldBounds(), { inset: 60, immediate: true })
}

// Headless: owns the simulation loop and the win check, renders nothing.
function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		resetWorld()
		// Drag pans, wheel zooms: the camera is the only controller.
		editor.setCurrentTool('hand')
		editor.zoomToBounds(fieldBounds(), { inset: 60, immediate: true })

		let time = 0
		const onTick = () => {
			const world = getWorld()
			const center = editor.getViewportPageBounds().center
			const focus = { x: center.x, y: center.y }
			const zoom = editor.getZoomLevel()
			const half = RETICLE_PX / 2 / zoom

			time += 1 / 60
			stepWorld(world, focus, half, zoom, time)

			// Win: Wally framed inside the viewfinder, at a zoom that resolves him.
			if (!world.found) {
				const w = world.wally
				if (
					zoom >= RESOLVE_ZOOM &&
					Math.abs(w.x - focus.x) <= half &&
					Math.abs(w.y - focus.y) <= half
				) {
					world.found = true
					// Freeze the moment: lock the camera so the catch holds still.
					editor.setCameraOptions({ ...editor.getCameraOptions(), isLocked: true })
				}
			}

			publishWorld()
		}
		editor.on('tick', onTick)

		// Restart from the keyboard, so you never have to hunt for a button with a
		// hidden cursor.
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') resetGame(editor)
		}
		window.addEventListener('keydown', onKeyDown)

		return () => {
			editor.off('tick', onTick)
			window.removeEventListener('keydown', onKeyDown)
		}
	}, [editor])

	return null
}

// Screen-fixed overlay: the red viewfinder brackets plus the HUD.
function Hud() {
	const found = useValue(
		'found',
		() => {
			frame$.get()
			return getWorld().found
		},
		[]
	)

	return (
		<div className="vf-hud">
			<div className={`vf-reticle ${found ? 'vf-reticle--found' : ''}`}>
				<svg viewBox="0 0 240 240" className="vf-brackets">
					{/* one hand-drawn corner, rotated into all four */}
					{[0, 90, 180, 270].map((deg) => (
						<path
							key={deg}
							d="M 11 53 C 9 31 8 17 13 12 C 18 7 32 9 53 11"
							transform={`rotate(${deg} 120 120)`}
						/>
					))}
				</svg>
			</div>

			<div className="vf-hint">
				{found
					? 'framed — press R to play again'
					: 'somewhere in the crowd, someone is wearing a little red cap'}
			</div>

			{found && <div className="vf-banner">framed.</div>}
		</div>
	)
}

export default function ViewfinderExample() {
	return (
		<div className="tldraw__editor vf-root">
			<Tldraw overlayUtils={overlayUtils} components={components}>
				<GameRunner />
				<Hud />
			</Tldraw>
		</div>
	)
}
